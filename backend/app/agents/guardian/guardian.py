"""Blue Team Guardian — Autonomous Security Decision Engine.

Intercepts Target Agent tool proposals between PolicyValidator and ToolExecutor,
enforcing intent verification, multi-signal anomaly detection, and risk scoring.
"""

from typing import List

from backend.app.agents.guardian.approvals import approval_store
from backend.app.agents.guardian.schemas import (
    ApprovalRequest,
    GuardianDecision,
    GuardianVerdict,
)
from backend.app.agents.guardian.scorer import RiskScorer
from backend.app.agents.guardian.state import guardian_decision_store
from backend.app.agents.target.schemas import StepResult, ToolCallProposal
from backend.app.core.logging import get_logger
from backend.app.security.actors import MockActor
from backend.app.security.audit import audit_service

logger = get_logger("agentshield.agents.guardian")


class BlueTeamGuardian:
    """Main security interface for real-time proactive agent inspection."""

    @classmethod
    def evaluate(
        cls,
        actor: MockActor,
        proposal: ToolCallProposal,
        instruction: str,
        prior_steps: List[StepResult],
        task_id: str,
        step_number: int,
    ) -> GuardianVerdict:
        """Evaluate a proposed tool call and issue an authoritative verdict.

        Records the verdict in the GuardianDecisionStore and writes a structured
        audit event.
        """
        verdict = RiskScorer.evaluate(
            actor=actor,
            proposal=proposal,
            instruction=instruction,
            prior_steps=prior_steps,
        )

        # Record in in-memory decision store
        guardian_decision_store.record_decision(
            task_id=task_id,
            step_number=step_number,
            actor_id=actor.actor_id,
            proposal=proposal,
            verdict=verdict,
        )

        # Audit event
        audit_status = (
            "ALLOWED" if verdict.verdict == GuardianDecision.ALLOW
            else "DENIED" if verdict.verdict == GuardianDecision.BLOCK
            else "WARNING"
        )
        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="blue_guardian",
            action=f"eval:{proposal.tool}:{proposal.action}",
            resource=task_id,
            status=audit_status,
            details={
                "step": step_number,
                "verdict": verdict.verdict.value,
                "risk_score": verdict.risk_score,
                "signals": [s.signal_id for s in verdict.signals_triggered],
                "intent_alignment": verdict.intent_alignment,
            },
        )

        return verdict

    @classmethod
    def create_approval_request(
        cls,
        task_id: str,
        step_number: int,
        proposal: ToolCallProposal,
        verdict: GuardianVerdict,
    ) -> ApprovalRequest:
        """Escalate an action requiring human approval to the ApprovalStore."""
        return approval_store.create_approval(
            task_id=task_id,
            step_number=step_number,
            proposal=proposal,
            verdict=verdict,
        )

