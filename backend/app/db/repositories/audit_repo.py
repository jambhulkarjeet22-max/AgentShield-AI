"""Repository for system-wide security audit log database persistence."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.models.audit import AuditLogModel
from backend.app.security.audit import AuditLogEntry


class AuditRepository:
    """Provides database CRUD and filtering operations for security audit logs."""

    def __init__(self, session: Session):
        self.session = session

    def save_audit_log(self, entry: AuditLogEntry) -> AuditLogEntry:
        """Persist an audit log entry."""
        ts_dt = (
            datetime.fromisoformat(entry.timestamp)
            if isinstance(entry.timestamp, str)
            else entry.timestamp
        )

        model = AuditLogModel(
            id=entry.id,
            actor_id=entry.actor_id,
            role=entry.role,
            tool=entry.tool,
            action=entry.action,
            resource=entry.resource,
            status=entry.status,
            details=entry.details or {},
            timestamp=ts_dt,
        )
        self.session.add(model)
        self.session.flush()
        return self._to_schema(model)

    def list_audit_logs(
        self,
        tool: Optional[str] = None,
        actor_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditLogEntry]:
        """Query audit logs with multi-field filtering and reverse chronological ordering."""
        stmt = select(AuditLogModel).order_by(AuditLogModel.timestamp.desc())

        if tool:
            stmt = stmt.where(func.lower(AuditLogModel.tool) == tool.lower())
        if actor_id:
            stmt = stmt.where(func.lower(AuditLogModel.actor_id) == actor_id.lower())
        if status:
            stmt = stmt.where(func.upper(AuditLogModel.status) == status.upper())

        stmt = stmt.offset(offset).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [self._to_schema(m) for m in models]

    def count(
        self,
        tool: Optional[str] = None,
        actor_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> int:
        """Count audit logs matching filter criteria."""
        stmt = select(func.count(AuditLogModel.id))
        if tool:
            stmt = stmt.where(func.lower(AuditLogModel.tool) == tool.lower())
        if actor_id:
            stmt = stmt.where(func.lower(AuditLogModel.actor_id) == actor_id.lower())
        if status:
            stmt = stmt.where(func.upper(AuditLogModel.status) == status.upper())
        return self.session.execute(stmt).scalar_one()

    @staticmethod
    def _to_schema(model: AuditLogModel) -> AuditLogEntry:
        return AuditLogEntry(
            id=model.id,
            timestamp=model.timestamp.isoformat() if isinstance(model.timestamp, datetime) else str(model.timestamp),
            actor_id=model.actor_id,
            role=model.role,
            tool=model.tool,
            action=model.action,
            resource=model.resource,
            status=model.status,
            details=model.details or {},
        )

