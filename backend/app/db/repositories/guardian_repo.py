"""Repository for Blue Team Guardian decisions and approval queue database persistence."""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.agents.guardian.schemas import (
    ApprovalRequest,
    ApprovalStatus,
    GuardianDecision,
    GuardianDecisionRecord,
    MLInferenceMetadata,
)
from backend.app.db.models.guardian import ApprovalRequestModel, GuardianDecisionModel


class GuardianRepository:
    """Provides database operations for Guardian security evaluations and admin approvals."""

    def __init__(self, session: Session):
        self.session = session

    # ── Decision Records ──────────────────────────────────────────────────────

    def save_decision(self, record: GuardianDecisionRecord) -> GuardianDecisionRecord:
        """Persist a Guardian decision audit record with ML advisory metadata."""
        ts_dt = (
            datetime.fromisoformat(record.timestamp)
            if isinstance(record.timestamp, str)
            else record.timestamp
        )

        ml_dict = (
            record.ml_advisory.model_dump()
            if isinstance(record.ml_advisory, MLInferenceMetadata)
            else record.ml_advisory
        )

        model = GuardianDecisionModel(
            id=record.record_id,
            task_id=record.task_id,
            step_number=record.step_number,
            actor_id=record.actor_id,
            tool=record.tool,
            action=record.action,
            verdict=record.verdict.value if isinstance(record.verdict, GuardianDecision) else str(record.verdict),
            risk_score=record.risk_score,
            intent_alignment=record.intent_alignment,
            signals_triggered=record.signals_triggered or [],
            explanation=record.explanation,
            ml_advisory=ml_dict,
            timestamp=ts_dt,
        )
        self.session.add(model)
        self.session.flush()
        return self._decision_to_schema(model)

    def get_decision(self, record_id: str) -> Optional[GuardianDecisionRecord]:
        """Fetch a single Guardian decision record by ID."""
        model = self.session.get(GuardianDecisionModel, record_id)
        if not model:
            return None
        return self._decision_to_schema(model)

    def list_decisions(
        self,
        verdict: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[GuardianDecisionRecord]:
        """List decision records with optional verdict filter."""
        stmt = select(GuardianDecisionModel).order_by(GuardianDecisionModel.timestamp.desc())
        if verdict:
            stmt = stmt.where(GuardianDecisionModel.verdict == verdict)
        stmt = stmt.offset(offset).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [self._decision_to_schema(m) for m in models]

    def count_decisions(self) -> int:
        """Count total recorded Guardian decisions."""
        stmt = select(func.count(GuardianDecisionModel.id))
        return self.session.execute(stmt).scalar_one()

    # ── Approval Requests ─────────────────────────────────────────────────────

    def save_approval(self, approval: ApprovalRequest) -> ApprovalRequest:
        """Create a new approval request in the queue."""
        req_dt = (
            datetime.fromisoformat(approval.requested_at)
            if isinstance(approval.requested_at, str)
            else approval.requested_at
        )
        dec_dt = (
            datetime.fromisoformat(approval.decided_at)
            if approval.decided_at and isinstance(approval.decided_at, str)
            else approval.decided_at
        )

        model = ApprovalRequestModel(
            id=approval.approval_id,
            task_id=approval.task_id,
            step_number=approval.step_number,
            tool=approval.tool,
            action=approval.action,
            parameters=approval.parameters or {},
            risk_score=approval.risk_score,
            explanation=approval.explanation,
            status=approval.status.value if isinstance(approval.status, ApprovalStatus) else str(approval.status),
            requested_at=req_dt,
            decided_by=approval.decided_by,
            decided_at=dec_dt,
            decision_note=approval.decision_note,
        )
        self.session.add(model)
        self.session.flush()
        return self._approval_to_schema(model)

    def get_approval(self, approval_id: str) -> Optional[ApprovalRequest]:
        """Fetch an approval request by ID."""
        model = self.session.get(ApprovalRequestModel, approval_id)
        if not model:
            return None
        return self._approval_to_schema(model)

    def list_approvals(
        self,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ApprovalRequest]:
        """List approval requests ordered by request time descending."""
        stmt = select(ApprovalRequestModel).order_by(ApprovalRequestModel.requested_at.desc())
        if status:
            stmt = stmt.where(ApprovalRequestModel.status == status)
        stmt = stmt.offset(offset).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [self._approval_to_schema(m) for m in models]

    def update_approval(
        self,
        approval_id: str,
        status: ApprovalStatus,
        decided_by: str,
        note: Optional[str] = None,
    ) -> Optional[ApprovalRequest]:
        """Approve or reject a pending approval request."""
        model = self.session.get(ApprovalRequestModel, approval_id)
        if not model:
            return None

        model.status = status.value if isinstance(status, ApprovalStatus) else str(status)
        model.decided_by = decided_by
        model.decided_at = datetime.now(timezone.utc)
        model.decision_note = note
        self.session.flush()
        return self._approval_to_schema(model)

    def count_approvals(self, status: Optional[str] = None) -> int:
        """Count total approval requests."""
        stmt = select(func.count(ApprovalRequestModel.id))
        if status:
            stmt = stmt.where(ApprovalRequestModel.status == status)
        return self.session.execute(stmt).scalar_one()

    # ── Mappers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _decision_to_schema(model: GuardianDecisionModel) -> GuardianDecisionRecord:
        ml_meta = None
        if model.ml_advisory:
            ml_meta = MLInferenceMetadata(**model.ml_advisory)

        return GuardianDecisionRecord(
            record_id=model.id,
            task_id=model.task_id or "",
            step_number=model.step_number,
            actor_id=model.actor_id,
            tool=model.tool,
            action=model.action,
            verdict=GuardianDecision(model.verdict) if model.verdict in GuardianDecision._value2member_map_ else GuardianDecision.ALLOW,
            risk_score=model.risk_score,
            signals_triggered=model.signals_triggered or [],
            explanation=model.explanation,
            intent_alignment=model.intent_alignment,
            ml_advisory=ml_meta,
            timestamp=model.timestamp.isoformat() if isinstance(model.timestamp, datetime) else str(model.timestamp),
        )

    @staticmethod
    def _approval_to_schema(model: ApprovalRequestModel) -> ApprovalRequest:
        return ApprovalRequest(
            approval_id=model.id,
            task_id=model.task_id or "",
            step_number=model.step_number,
            tool=model.tool,
            action=model.action,
            parameters=model.parameters or {},
            risk_score=model.risk_score,
            explanation=model.explanation,
            requested_at=model.requested_at.isoformat() if isinstance(model.requested_at, datetime) else str(model.requested_at),
            status=ApprovalStatus(model.status) if model.status in ApprovalStatus._value2member_map_ else ApprovalStatus.PENDING,
            decided_by=model.decided_by,
            decided_at=model.decided_at.isoformat() if model.decided_at else None,
            decision_note=model.decision_note,
        )

