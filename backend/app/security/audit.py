"""Structured audit logging service for simulated tool environment operations."""

import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.core.logging import get_logger

logger = get_logger("agentshield.audit")


class AuditLogEntry(BaseModel):
    """Structured audit record for all mock tool actions."""

    id: str = Field(default_factory=lambda: f"audit-{uuid.uuid4().hex[:12]}")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO-8601 UTC timestamp",
    )
    actor_id: str = Field(description="Identifier of the executing mock actor")
    role: str = Field(description="Role assigned to the executing mock actor")
    tool: str = Field(description="Target tool (email, filesystem, browser, payments)")
    action: str = Field(description="Specific action performed (e.g. read_file, send_email)")
    resource: str = Field(description="Target resource identifier or path")
    status: str = Field(description="Execution result: ALLOWED, DENIED, or FAILED")
    details: Dict[str, Any] = Field(default_factory=dict, description="Sanitized contextual metadata")


class AuditService:
    """Thread-safe in-memory audit log store with search and reset capabilities."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._logs: List[AuditLogEntry] = []

    def record(
        self,
        actor_id: str,
        role: str,
        tool: str,
        action: str,
        resource: str,
        status: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLogEntry:
        """Create and store an audit log entry."""
        entry = AuditLogEntry(
            actor_id=actor_id,
            role=role,
            tool=tool,
            action=action,
            resource=resource,
            status=status,
            details=details or {},
        )
        with self._lock:
            self._logs.append(entry)

        # Also emit to application structured logger
        logger.info(
            "AUDIT [%s] %s by %s (%s) on %s/%s",
            status,
            action,
            actor_id,
            role,
            tool,
            resource,
            extra={
                "audit_id": entry.id,
                "actor_id": actor_id,
                "role": role,
                "tool": tool,
                "action": action,
                "resource": resource,
                "audit_status": status,
                "details": details or {},
            },
        )
        return entry

    def list_logs(
        self,
        tool: Optional[str] = None,
        actor_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditLogEntry]:
        """Query stored audit logs with optional filters."""
        with self._lock:
            filtered = self._logs
            if tool:
                filtered = [e for e in filtered if e.tool.lower() == tool.lower()]
            if actor_id:
                filtered = [e for e in filtered if e.actor_id.lower() == actor_id.lower()]
            if status:
                filtered = [e for e in filtered if e.status.upper() == status.upper()]

            # Return newest first
            sorted_logs = list(reversed(filtered))
            return sorted_logs[offset : offset + limit]

    def count(self) -> int:
        """Return total number of recorded audit logs."""
        with self._lock:
            return len(self._logs)

    def reset(self) -> None:
        """Clear all audit logs (for testing resets)."""
        with self._lock:
            self._logs.clear()


# Global audit service singleton
audit_service = AuditService()

