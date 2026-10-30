"""API endpoints for audit logs and environment reset."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from backend.app.core.exceptions import SecurityError
from backend.app.security.actors import MockActor, get_current_actor
from backend.app.security.audit import AuditLogEntry, audit_service
from backend.app.tools import reset_all_mock_tools

router = APIRouter(tags=["Mock Tools: Audit & Control"])


class AuditLogsResponse(BaseModel):
    """Response containing audit log records."""

    total: int = Field(description="Total count of matching audit log entries")
    logs: List[AuditLogEntry] = Field(description="Audit log records")


class ResetResponse(BaseModel):
    """Response indicating mock tool state reset."""

    success: bool = True
    message: str = "All mock cyber tools have been reset to default seed state"


@router.get(
    "/audit-logs",
    response_model=AuditLogsResponse,
    status_code=status.HTTP_200_OK,
    summary="Query Audit Logs",
    description="Inspect audit trail of all mock tool interactions. Requires audit:read or admin permission.",
)
async def get_audit_logs(
    tool: Optional[str] = Query(default=None, description="Filter by tool (email, filesystem, browser, payments)"),
    actor_id: Optional[str] = Query(default=None, description="Filter by actor ID"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status (ALLOWED, DENIED, FAILED)"),
    limit: int = Query(default=100, ge=1, le=500, description="Max logs to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    actor: MockActor = Depends(get_current_actor),
) -> AuditLogsResponse:
    if not actor.has_permission("audit:read") and not actor.has_permission("*"):
        raise SecurityError("Permission 'audit:read' required to inspect audit logs")

    logs = audit_service.list_logs(
        tool=tool,
        actor_id=actor_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return AuditLogsResponse(total=audit_service.count(), logs=logs)


@router.post(
    "/reset",
    response_model=ResetResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset All Mock Tools",
    description="Restore all mock emails, files, browser pages, payment records, and audit logs to initial seed state.",
)
async def reset_tools(
    actor: MockActor = Depends(get_current_actor),
) -> ResetResponse:
    # Requires admin permission or test/development role
    if not actor.has_permission("*") and not actor.has_permission("tools:reset"):
        raise SecurityError("Admin permission required to reset simulated tool environment")

    reset_all_mock_tools()
    return ResetResponse()

