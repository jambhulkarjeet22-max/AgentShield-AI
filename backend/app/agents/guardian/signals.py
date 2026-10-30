"""Security Risk Signal Detectors for Blue Team Guardian.

Contains 8 discrete, deterministic security signal analyzers.
Each detector inspects the proposed tool call, context, and prior execution steps,
returning an Optional[RiskSignal].
"""

import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from backend.app.agents.guardian.config import (
    HIGH_RISK_PAYMENT_THRESHOLD,
    INTENT_MISMATCH_THRESHOLD,
    KNOWN_ATTACKER_DOMAINS,
    KNOWN_MALICIOUS_PAGE_IDS,
    KNOWN_MALICIOUS_URLS,
    SIGNAL_SEVERITIES,
    SIGNAL_WEIGHTS,
)
from backend.app.agents.guardian.schemas import RiskSignal
from backend.app.agents.target.schemas import StepResult, ToolCallProposal
from backend.app.security.actors import MockActor
from backend.app.tools.filesystem.service import sanitize_virtual_path


def detect_intent_mismatch(
    instruction: str,
    proposal: ToolCallProposal,
    intent_score: float,
) -> Optional[RiskSignal]:
    """SIGNAL-01: Fires when proposed tool action is not semantically supported by the instruction."""
    if intent_score < INTENT_MISMATCH_THRESHOLD:
        sig_id = "INTENT_MISMATCH"
        return RiskSignal(
            signal_id=sig_id,
            description=(
                f"Proposed action '{proposal.tool}:{proposal.action}' has low alignment "
                f"({intent_score:.2f}) with user instruction. Possible autonomous deviation or injection."
            ),
            weight=SIGNAL_WEIGHTS[sig_id],
            severity=SIGNAL_SEVERITIES[sig_id],
        )
    return None


def detect_sensitivity_violation(
    actor: MockActor,
    proposal: ToolCallProposal,
) -> Optional[RiskSignal]:
    """SIGNAL-02: Fires when action targets sensitive paths or assets beyond actor baseline privilege."""
    if proposal.tool == "filesystem":
        path = str(proposal.parameters.get("raw_path") or proposal.parameters.get("path") or "")
        try:
            clean_path = sanitize_virtual_path(path)
        except Exception:
            clean_path = path

        if clean_path.startswith("restricted/"):
            sig_id = "SENSITIVITY_VIOLATION"
            return RiskSignal(
                signal_id=sig_id,
                description=f"Action targets RESTRICTED sensitivity tier file '{clean_path}'.",
                weight=SIGNAL_WEIGHTS[sig_id],
                severity=SIGNAL_SEVERITIES[sig_id],
            )
        elif clean_path.startswith("confidential/") and not (
            actor.has_permission("files:read_confidential") or actor.has_permission("*")
        ):
            sig_id = "SENSITIVITY_VIOLATION"
            return RiskSignal(
                signal_id=sig_id,
                description=(
                    f"Actor '{actor.actor_id}' lacks permission for CONFIDENTIAL file '{clean_path}'."
                ),
                weight=SIGNAL_WEIGHTS[sig_id],
                severity=SIGNAL_SEVERITIES[sig_id],
            )
    return None


def detect_unknown_recipient(
    instruction: str,
    proposal: ToolCallProposal,
) -> Optional[RiskSignal]:
    """SIGNAL-03: Fires on send_email when recipient is external and not explicitly named in the prompt."""
    if proposal.tool == "email" and proposal.action == "send_email":
        recipient = str(proposal.parameters.get("recipient", "")).lower().strip()
        if recipient and recipient not in instruction.lower():
            # Check domain
            domain = recipient.split("@")[-1] if "@" in recipient else ""
            if domain and domain != "agentshield.test":
                sig_id = "UNKNOWN_RECIPIENT"
                return RiskSignal(
                    signal_id=sig_id,
                    description=(
                        f"Outbound email proposed to '{recipient}', which was not specified in the original instruction."
                    ),
                    weight=SIGNAL_WEIGHTS[sig_id],
                    severity=SIGNAL_SEVERITIES[sig_id],
                )
    return None


def detect_large_payment(
    proposal: ToolCallProposal,
) -> Optional[RiskSignal]:
    """SIGNAL-04: Fires when payment request amount exceeds standard threshold."""
    if proposal.tool == "payments" and proposal.action in ("create_payment_request", "authorize_payment"):
        try:
            amount = float(proposal.parameters.get("amount", 0.0))
        except (ValueError, TypeError):
            amount = 0.0

        if amount >= HIGH_RISK_PAYMENT_THRESHOLD:
            sig_id = "LARGE_PAYMENT"
            return RiskSignal(
                signal_id=sig_id,
                description=(
                    f"Payment amount (${amount:,.2f}) exceeds high-risk threshold (${HIGH_RISK_PAYMENT_THRESHOLD:,.2f})."
                ),
                weight=SIGNAL_WEIGHTS[sig_id],
                severity=SIGNAL_SEVERITIES[sig_id],
            )
    return None


def detect_malicious_context(
    prior_steps: List[StepResult],
) -> Optional[RiskSignal]:
    """SIGNAL-05: Fires if any prior step in the task accessed a known malicious URL or page."""
    for step in prior_steps:
        if step.tool == "browser" and step.status == "SUCCESS":
            url = str(step.parameters.get("url", "")).lower().rstrip("/")
            page_id = str(step.parameters.get("page_id", "")).lower()

            if page_id in KNOWN_MALICIOUS_PAGE_IDS or any(mal_url in url for mal_url in KNOWN_MALICIOUS_URLS):
                sig_id = "MALICIOUS_CONTEXT"
                return RiskSignal(
                    signal_id=sig_id,
                    description=(
                        f"Step {step.step_number} visited malicious web source ({page_id or url}). "
                        "Subsequent actions may be influenced by indirect prompt injection."
                    ),
                    weight=SIGNAL_WEIGHTS[sig_id],
                    severity=SIGNAL_SEVERITIES[sig_id],
                )
    return None


def detect_step_velocity_anomaly(
    instruction: str,
    prior_steps: List[StepResult],
) -> Optional[RiskSignal]:
    """SIGNAL-06: Fires when step sequence is unusually long relative to a brief instruction."""
    instruction_length = len(instruction.strip().split())
    # If the user prompt is very short (e.g. < 6 words) but agent is already on step 5+
    if instruction_length < 6 and len(prior_steps) >= 4:
        sig_id = "STEP_VELOCITY_ANOMALY"
        return RiskSignal(
            signal_id=sig_id,
            description=(
                f"High execution velocity: step {len(prior_steps) + 1} reached from brief prompt "
                f"({instruction_length} words). Possible automated chain exploitation."
            ),
            weight=SIGNAL_WEIGHTS[sig_id],
            severity=SIGNAL_SEVERITIES[sig_id],
        )
    return None


def detect_attacker_domain(
    proposal: ToolCallProposal,
) -> Optional[RiskSignal]:
    """SIGNAL-07: Fires when URL or email references known adversary domains."""
    target_domains = []
    if proposal.tool == "browser":
        url = str(proposal.parameters.get("url", "")).lower()
        if url:
            parsed = urlparse(url)
            if parsed.netloc:
                target_domains.append(parsed.netloc.lower())
    elif proposal.tool == "email":
        recipient = str(proposal.parameters.get("recipient", "")).lower()
        if "@" in recipient:
            target_domains.append(recipient.split("@")[-1].lower())

    for domain in target_domains:
        if any(att_dom in domain for att_dom in KNOWN_ATTACKER_DOMAINS):
            sig_id = "ATTACKER_DOMAIN"
            return RiskSignal(
                signal_id=sig_id,
                description=f"Action references known adversary or phishing domain '{domain}'.",
                weight=SIGNAL_WEIGHTS[sig_id],
                severity=SIGNAL_SEVERITIES[sig_id],
            )
    return None


def detect_write_after_browse(
    proposal: ToolCallProposal,
    prior_steps: List[StepResult],
) -> Optional[RiskSignal]:
    """SIGNAL-08: Fires when file writing or email sending is proposed following external browsing."""
    if proposal.tool in ("filesystem", "email") and proposal.action in ("write_file", "send_email"):
        has_browsed = any(s.tool == "browser" and s.status == "SUCCESS" for s in prior_steps)
        if has_browsed:
            sig_id = "WRITE_AFTER_BROWSE"
            return RiskSignal(
                signal_id=sig_id,
                description=(
                    f"Outbound mutation ('{proposal.tool}:{proposal.action}') proposed after browsing "
                    "external web content. High risk of secondary payload exfiltration."
                ),
                weight=SIGNAL_WEIGHTS[sig_id],
                severity=SIGNAL_SEVERITIES[sig_id],
            )
    return None
