"""Risk Scoring Engine for Blue Team Guardian.

Synthesizes intent alignment and individual risk signals into a composite
risk score (0.0 to 100.0) and issues an authoritative GuardianDecision.
"""

from typing import List

from backend.app.agents.guardian.config import (
    ALLOW_THRESHOLD,
    BLOCK_THRESHOLD,
)
from backend.app.agents.guardian.intent import IntentVerifier
from backend.app.agents.guardian.schemas import (
    GuardianDecision,
    GuardianVerdict,
    RiskSignal,
)
from backend.app.agents.guardian.signals import (
    detect_attacker_domain,
    detect_intent_mismatch,
    detect_large_payment,
    detect_malicious_context,
    detect_sensitivity_violation,
    detect_step_velocity_anomaly,
    detect_unknown_recipient,
    detect_user_forbidden_action,
    detect_write_after_browse,
)
from backend.app.agents.target.schemas import StepResult, ToolCallProposal
from backend.app.core.logging import get_logger
from backend.app.security.actors import MockActor

logger = get_logger("agentshield.agents.guardian.scorer")


class RiskScorer:
    """Evaluates proposed actions against security signals and assigns deterministic risk scores."""

    @classmethod
    def evaluate(
        cls,
        actor: MockActor,
        proposal: ToolCallProposal,
        instruction: str,
        prior_steps: List[StepResult],
    ) -> GuardianVerdict:
        """Run all detectors, compute composite score, and render verdict."""
        # 1. Compute Intent Alignment
        intent_score = IntentVerifier.score(instruction, proposal)

        # 2. Collect Risk Signals
        triggered_signals: List[RiskSignal] = []

        # SIGNAL-00: Explicit user negative constraints (Action strictly forbidden by user)
        sig = detect_user_forbidden_action(instruction, proposal)
        if sig:
            triggered_signals.append(sig)

        sig = detect_intent_mismatch(instruction, proposal, intent_score)
        if sig:
            triggered_signals.append(sig)

        sig = detect_sensitivity_violation(actor, proposal)
        if sig:
            triggered_signals.append(sig)

        sig = detect_unknown_recipient(instruction, proposal)
        if sig:
            triggered_signals.append(sig)

        sig = detect_large_payment(proposal)
        if sig:
            triggered_signals.append(sig)

        sig = detect_malicious_context(prior_steps)
        if sig:
            triggered_signals.append(sig)

        sig = detect_step_velocity_anomaly(instruction, prior_steps)
        if sig:
            triggered_signals.append(sig)

        sig = detect_attacker_domain(proposal)
        if sig:
            triggered_signals.append(sig)

        sig = detect_write_after_browse(proposal, prior_steps)
        if sig:
            triggered_signals.append(sig)

        # 3. Calculate Total Score (capped at 100.0)
        raw_score = sum(s.weight for s in triggered_signals)
        risk_score = min(100.0, max(0.0, round(raw_score, 1)))

        # 4. Determine Verdict
        if any(s.signal_id == "USER_FORBIDDEN_ACTION" for s in triggered_signals):
            # User explicitly forbade this action: strict mandatory BLOCK. Cannot be approved.
            verdict = GuardianDecision.BLOCK
            risk_score = 100.0
        elif risk_score >= BLOCK_THRESHOLD:
            verdict = GuardianDecision.BLOCK
        elif risk_score >= ALLOW_THRESHOLD:
            verdict = GuardianDecision.REQUIRE_APPROVAL
        else:
            verdict = GuardianDecision.ALLOW

        # 5. Synthesize Explanation
        if not triggered_signals:
            explanation = (
                f"Action '{proposal.tool}:{proposal.action}' approved. "
                f"Intent alignment is {intent_score:.2f} with zero high-risk indicators."
            )
        else:
            signal_descs = [f"[{s.signal_id}] {s.description}" for s in triggered_signals]
            explanation = (
                f"Risk score {risk_score:.1f}/100.0 ({verdict.value}). "
                f"Triggered signals: {'; '.join(signal_descs)}"
            )

        logger.info(
            "Guardian evaluated %s:%s -> %s (Score: %.1f, Signals: %d)",
            proposal.tool,
            proposal.action,
            verdict.value,
            risk_score,
            len(triggered_signals),
        )

        return GuardianVerdict(
            verdict=verdict,
            risk_score=risk_score,
            signals_triggered=triggered_signals,
            explanation=explanation,
            intent_alignment=intent_score,
        )

