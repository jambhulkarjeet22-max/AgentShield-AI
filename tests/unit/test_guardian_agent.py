"""Unit tests for the Blue Team Guardian — intent verification, signals, scorer, and approval store."""

import pytest

from backend.app.agents.guardian import (
    ApprovalStatus,
    BlueTeamGuardian,
    GuardianDecision,
    RiskScorer,
    approval_store,
    guardian_decision_store,
)
from backend.app.agents.guardian.config import (
    ALLOW_THRESHOLD,
    BLOCK_THRESHOLD,
    HIGH_RISK_PAYMENT_THRESHOLD,
)
from backend.app.agents.guardian.intent import IntentVerifier
from backend.app.agents.guardian.signals import (
    detect_attacker_domain,
    detect_intent_mismatch,
    detect_large_payment,
    detect_malicious_context,
    detect_sensitivity_violation,
    detect_step_velocity_anomaly,
    detect_unknown_recipient,
    detect_write_after_browse,
)
from backend.app.agents.target.schemas import StepResult, ToolCallProposal
from backend.app.security.actors import MOCK_ACTORS


class TestIntentVerifier:
    """Verify semantic keyword alignment between instruction and proposed tool calls."""

    def test_intent_verifier_high_alignment_email(self):
        proposal = ToolCallProposal(tool="email", action="read_message", parameters={"message_id": "msg-001"})
        score = IntentVerifier.score("Please check my email inbox and read the latest message", proposal)
        assert score >= 0.7

    def test_intent_verifier_high_alignment_filesystem(self):
        proposal = ToolCallProposal(tool="filesystem", action="read_file", parameters={"raw_path": "public/company_handbook.txt"})
        score = IntentVerifier.score("Read the employee handbook file from public directory", proposal)
        assert score >= 0.7

    def test_intent_verifier_zero_alignment_mismatch(self):
        proposal = ToolCallProposal(tool="payments", action="create_payment_request", parameters={"amount": 500})
        score = IntentVerifier.score("Check my inbox for emails from compliance", proposal)
        assert score < 0.3

    def test_intent_verifier_empty_instruction(self):
        proposal = ToolCallProposal(tool="browser", action="list_pages", parameters={})
        score = IntentVerifier.score("", proposal)
        assert score == 0.0

    def test_intent_verifier_parameter_boost(self):
        # Even if 'browse' keyword is missing, the presence of the specific URL fragment boosts score
        proposal = ToolCallProposal(tool="browser", action="open_url", parameters={"url": "http://internal.company.local/wiki"})
        score = IntentVerifier.score("Visit the internal company wiki", proposal)
        assert score > 0.4


class TestRiskSignals:
    """Verify each of the 8 deterministic risk signal detectors."""

    def test_signal_intent_mismatch_fires(self):
        proposal = ToolCallProposal(tool="payments", action="create_payment_request", parameters={})
        sig = detect_intent_mismatch("Look at the picture", proposal, intent_score=0.1)
        assert sig is not None
        assert sig.signal_id == "INTENT_MISMATCH"
        assert sig.weight > 0

    def test_signal_intent_mismatch_does_not_fire_on_aligned(self):
        proposal = ToolCallProposal(tool="email", action="list_messages", parameters={})
        sig = detect_intent_mismatch("Check my email", proposal, intent_score=0.9)
        assert sig is None

    def test_signal_sensitivity_violation_restricted(self):
        proposal = ToolCallProposal(tool="filesystem", action="read_file", parameters={"raw_path": "restricted/keys.txt"})
        sig = detect_sensitivity_violation(MOCK_ACTORS["employee"], proposal)
        assert sig is not None
        assert sig.signal_id == "SENSITIVITY_VIOLATION"
        assert sig.severity == "CRITICAL"

    def test_signal_sensitivity_violation_confidential_unauthorized(self):
        proposal = ToolCallProposal(tool="filesystem", action="read_file", parameters={"raw_path": "confidential/passwords.txt"})
        sig = detect_sensitivity_violation(MOCK_ACTORS["employee"], proposal)
        assert sig is not None
        assert sig.signal_id == "SENSITIVITY_VIOLATION"

    def test_signal_sensitivity_violation_confidential_authorized(self):
        proposal = ToolCallProposal(tool="filesystem", action="read_file", parameters={"raw_path": "confidential/passwords.txt"})
        sig = detect_sensitivity_violation(MOCK_ACTORS["analyst"], proposal)
        assert sig is None

    def test_signal_unknown_recipient_fires(self):
        proposal = ToolCallProposal(tool="email", action="send_email", parameters={"recipient": "external-adversary@evil.test"})
        sig = detect_unknown_recipient("Send a summary report", proposal)
        assert sig is not None
        assert sig.signal_id == "UNKNOWN_RECIPIENT"

    def test_signal_unknown_recipient_does_not_fire_if_in_prompt(self):
        proposal = ToolCallProposal(tool="email", action="send_email", parameters={"recipient": "partner@vendor.test"})
        sig = detect_unknown_recipient("Email partner@vendor.test with the confirmation", proposal)
        assert sig is None

    def test_signal_large_payment_fires(self):
        proposal = ToolCallProposal(tool="payments", action="create_payment_request", parameters={"amount": 25000.0})
        sig = detect_large_payment(proposal)
        assert sig is not None
        assert sig.signal_id == "LARGE_PAYMENT"

    def test_signal_large_payment_does_not_fire_below_threshold(self):
        proposal = ToolCallProposal(tool="payments", action="create_payment_request", parameters={"amount": 500.0})
        sig = detect_large_payment(proposal)
        assert sig is None

    def test_signal_malicious_context_fires(self):
        prior_steps = [
            StepResult(
                step_number=1,
                tool="browser",
                action="open_url",
                parameters={"url": "https://tech-forum.test/threads/agent-review"},
                policy_allowed=True,
                status="SUCCESS",
            )
        ]
        sig = detect_malicious_context(prior_steps)
        assert sig is not None
        assert sig.signal_id == "MALICIOUS_CONTEXT"

    def test_signal_malicious_context_does_not_fire_for_trusted(self):
        prior_steps = [
            StepResult(
                step_number=1,
                tool="browser",
                action="open_url",
                parameters={"url": "http://internal.company.local/wiki"},
                policy_allowed=True,
                status="SUCCESS",
            )
        ]
        sig = detect_malicious_context(prior_steps)
        assert sig is None

    def test_signal_step_velocity_anomaly_fires(self):
        prior_steps = [
            StepResult(step_number=i, tool="filesystem", action="list_files", parameters={}, policy_allowed=True, status="SUCCESS")
            for i in range(1, 6)
        ]
        sig = detect_step_velocity_anomaly("help me", prior_steps)
        assert sig is not None
        assert sig.signal_id == "STEP_VELOCITY_ANOMALY"

    def test_signal_attacker_domain_fires(self):
        proposal = ToolCallProposal(tool="browser", action="open_url", parameters={"url": "https://exfiltrate-collector.attacker.test/creds"})
        sig = detect_attacker_domain(proposal)
        assert sig is not None
        assert sig.signal_id == "ATTACKER_DOMAIN"

    def test_signal_write_after_browse_fires(self):
        prior_steps = [
            StepResult(
                step_number=1,
                tool="browser",
                action="open_url",
                parameters={"url": "https://cve.mitre.org.test/cve-feed"},
                policy_allowed=True,
                status="SUCCESS",
            )
        ]
        proposal = ToolCallProposal(tool="filesystem", action="write_file", parameters={"path": "sandbox/cve_notes.txt"})
        sig = detect_write_after_browse(proposal, prior_steps)
        assert sig is not None
        assert sig.signal_id == "WRITE_AFTER_BROWSE"


class TestRiskScorerAndVerdicts:
    """Verify combination of risk signals into total scores and verdicts."""

    def test_scorer_allow_verdict_low_score(self):
        proposal = ToolCallProposal(tool="filesystem", action="read_file", parameters={"raw_path": "public/company_handbook.txt"})
        verdict = RiskScorer.evaluate(
            actor=MOCK_ACTORS["employee"],
            proposal=proposal,
            instruction="Read the company handbook from public files",
            prior_steps=[],
        )
        assert verdict.verdict == GuardianDecision.ALLOW
        assert verdict.risk_score < ALLOW_THRESHOLD
        assert len(verdict.signals_triggered) == 0

    def test_scorer_block_verdict_high_score(self):
        # Combine intent mismatch (25) + sensitivity violation (35) + malicious context (30) = 90.0 >= 80.0
        proposal = ToolCallProposal(
            tool="filesystem",
            action="read_file",
            parameters={"raw_path": "restricted/system_keys.txt"},
        )
        prior_steps = [
            StepResult(
                step_number=1,
                tool="browser",
                action="open_url",
                parameters={"url": "https://tech-forum.test/threads/agent-review"},
                policy_allowed=True,
                status="SUCCESS",
            )
        ]
        verdict = RiskScorer.evaluate(
            actor=MOCK_ACTORS["employee"],
            proposal=proposal,
            instruction="Check the latest weather update in Tokyo",
            prior_steps=prior_steps,
        )
        assert verdict.verdict == GuardianDecision.BLOCK
        assert verdict.risk_score >= BLOCK_THRESHOLD
        assert any(s.signal_id == "INTENT_MISMATCH" for s in verdict.signals_triggered)
        assert any(s.signal_id == "SENSITIVITY_VIOLATION" for s in verdict.signals_triggered)
        assert any(s.signal_id == "MALICIOUS_CONTEXT" for s in verdict.signals_triggered)

    def test_scorer_require_approval_verdict(self):
        # Large payment + intent alignment triggers REQUIRE_APPROVAL (60-79 score range)
        # SENSITIVITY_VIOLATION (35) + INTENT_MISMATCH (25) = 60 -> exactly threshold
        proposal = ToolCallProposal(
            tool="filesystem",
            action="read_file",
            parameters={"raw_path": "confidential/passwords.txt"},
        )
        verdict = RiskScorer.evaluate(
            actor=MOCK_ACTORS["employee"],
            proposal=proposal,
            instruction="What is the weather outside?",
            prior_steps=[],
        )
        # Score is 35 (sensitivity) + 25 (intent mismatch) = 60.0 -> REQUIRE_APPROVAL
        assert verdict.verdict == GuardianDecision.REQUIRE_APPROVAL
        assert ALLOW_THRESHOLD <= verdict.risk_score < BLOCK_THRESHOLD

    def test_scorer_capped_at_100(self):
        # Accumulate many high-weight signals
        prior_steps = [
            StepResult(step_number=1, tool="browser", action="open_url", parameters={"url": "https://tech-forum.test/threads/agent-review"}, policy_allowed=True, status="SUCCESS"),
            StepResult(step_number=2, tool="filesystem", action="list_files", parameters={}, policy_allowed=True, status="SUCCESS"),
            StepResult(step_number=3, tool="filesystem", action="list_files", parameters={}, policy_allowed=True, status="SUCCESS"),
            StepResult(step_number=4, tool="filesystem", action="list_files", parameters={}, policy_allowed=True, status="SUCCESS"),
        ]
        proposal = ToolCallProposal(
            tool="filesystem",
            action="read_file",
            parameters={"raw_path": "restricted/system_keys.txt"},
        )
        verdict = RiskScorer.evaluate(
            actor=MOCK_ACTORS["employee"],
            proposal=proposal,
            instruction="hi",
            prior_steps=prior_steps,
        )
        assert verdict.risk_score <= 100.0


class TestApprovalStoreAndDecisionStore:
    """Verify in-memory state stores for decisions and approvals."""

    def test_approval_lifecycle(self):
        proposal = ToolCallProposal(tool="payments", action="create_payment_request", parameters={"amount": 15000.0})
        verdict = RiskScorer.evaluate(MOCK_ACTORS["employee"], proposal, "Transfer 15000 USD", [])
        
        req = approval_store.create_approval(
            task_id="task-test-01",
            step_number=1,
            proposal=proposal,
            verdict=verdict,
        )
        assert req.status == ApprovalStatus.PENDING
        assert approval_store.get_approval(req.approval_id) is not None

        # Admin decides to approve
        decided = approval_store.decide_approval(
            approval_id=req.approval_id,
            decided_by="admin-001",
            approve=True,
            decision_note="Validated with executive team",
        )
        assert decided is not None
        assert decided.status == ApprovalStatus.APPROVED
        assert decided.decided_by == "admin-001"

    def test_decision_store_records(self):
        proposal = ToolCallProposal(tool="email", action="list_messages", parameters={})
        verdict = RiskScorer.evaluate(MOCK_ACTORS["employee"], proposal, "Check inbox", [])
        rec = guardian_decision_store.record_decision(
            task_id="task-test-02",
            step_number=1,
            actor_id="employee-001",
            proposal=proposal,
            verdict=verdict,
        )
        assert rec is not None
        assert rec.verdict == GuardianDecision.ALLOW
        assert guardian_decision_store.get_decision(rec.record_id) is not None
