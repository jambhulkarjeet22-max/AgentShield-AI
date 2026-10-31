"""Blue Team Guardian — Autonomous Security Decision Engine.

Intercepts Target Agent tool proposals between PolicyValidator and ToolExecutor,
enforcing intent verification, multi-signal anomaly detection, and risk scoring.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

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
from backend.app.services.ml_client import MLClient

logger = get_logger("agentra.agents.guardian")


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
        ml_client: Optional[MLClient] = None,
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
            ml_client=ml_client,
        )

        # Record in in-memory decision store
        guardian_decision_store.record_decision(
            task_id=task_id,
            step_number=step_number,
            actor_id=actor.actor_id,
            proposal=proposal,
            verdict=verdict,
        )

        # Sync decision to Convex Cloud DB if configured
        try:
            from backend.app.db.convex_client import convex_client
            convex_client.sync_decision({
                "decision_id": f"dec-{uuid.uuid4().hex[:12]}",
                "task_id": task_id,
                "step_number": step_number,
                "verdict": verdict.verdict.value,
                "risk_score": verdict.risk_score,
                "explanation": verdict.explanation or "",
                "signals": [s.model_dump() for s in verdict.signals_triggered],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        except Exception:
            pass

        # Send guardrail evaluation trace to Langfuse
        try:
            from backend.app.services.langfuse_service import langfuse_service
            langfuse_service.trace_guardian_evaluation(
                actor_id=actor.actor_id,
                role=actor.role.value,
                task_id=task_id,
                step_number=step_number,
                proposal=proposal,
                verdict=verdict,
            )
        except Exception:
            pass

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
                "ml_advisory": verdict.ml_advisory.model_dump() if verdict.ml_advisory else None,
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
