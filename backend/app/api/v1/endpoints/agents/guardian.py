"""API endpoints for the Blue Team Guardian — real-time decision inspection and action approvals."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from backend.app.agents.guardian.approvals import approval_store
from backend.app.agents.guardian.schemas import (
    ApprovalDecision,
    ApprovalListResponse,
    ApprovalRequest,
    ApprovalStatus,
    GuardianDecision,
    GuardianDecisionListResponse,
    GuardianDecisionRecord,
)
from backend.app.agents.guardian.state import guardian_decision_store
from backend.app.core.exceptions import NotFoundError, SecurityError
from backend.app.security.actors import MockActor, get_current_actor, require_permission

router = APIRouter(prefix="/guardian", tags=["AI Agent: Blue Team Guardian"])


# ── Decision Observability Endpoints ──────────────────────────────────────────

@router.get(
    "/decisions",
    response_model=GuardianDecisionListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Guardian Decision Audit Records",
    description="Retrieve historical real-time security evaluation records rendered by the Blue Team Guardian.",
)
def list_decisions(
    verdict: Optional[GuardianDecision] = Query(default=None, description="Optional verdict filter"),
    limit: int = Query(default=50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    actor: MockActor = Depends(get_current_actor),
) -> GuardianDecisionListResponse:
    if not (actor.has_permission("agent:read") or actor.has_permission("agent:list") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:read' or 'agent:list' required to view Guardian decisions")

    records = guardian_decision_store.list_decisions(verdict=verdict, limit=limit, offset=offset)
    return GuardianDecisionListResponse(
        total=guardian_decision_store.count(),
        decisions=records,
    )


@router.get(
    "/decisions/{record_id}",
    response_model=GuardianDecisionRecord,
    status_code=status.HTTP_200_OK,
    summary="Get Guardian Decision Detail",
    description="Retrieve granular risk score, intent alignment, and triggered signals for a specific decision.",
)
def get_decision(
    record_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> GuardianDecisionRecord:
    if not (actor.has_permission("agent:read") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:read' required to inspect Guardian decision detail")

    record = guardian_decision_store.get_decision(record_id)
    if not record:
        raise NotFoundError(f"Guardian decision record '{record_id}' not found")
    return record


# ── Human Approval Management Endpoints (Admin Only) ──────────────────────────

@router.get(
    "/approvals",
    response_model=ApprovalListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Actions Requiring Administrator Approval",
    description="List all pending and historically decided actions held by the Guardian. Admin role required.",
)
def list_approvals(
    status_filter: Optional[ApprovalStatus] = Query(default=None, alias="status", description="Filter by status"),
    limit: int = Query(default=50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    actor: MockActor = Depends(get_current_actor),
) -> ApprovalListResponse:
    # Only Admin actors hold '*' or system administrative authority
    if not (actor.has_permission("*") or actor.role.value == "ADMIN"):
        raise SecurityError("System administrator access required to view approval queue")

    approvals = approval_store.list_approvals(status=status_filter, limit=limit, offset=offset)
    return ApprovalListResponse(
        total=approval_store.count(),
        approvals=approvals,
    )


@router.get(
    "/approvals/{approval_id}",
    response_model=ApprovalRequest,
    status_code=status.HTTP_200_OK,
    summary="Get Specific Approval Request",
    description="Retrieve full parameter context and risk evaluation for a held tool action.",
)
def get_approval(
    approval_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> ApprovalRequest:
    if not (actor.has_permission("*") or actor.role.value == "ADMIN"):
        raise SecurityError("System administrator access required to inspect approval request")

    appr = approval_store.get_approval(approval_id)
    if not appr:
        raise NotFoundError(f"Approval request '{approval_id}' not found")
    return appr


@router.post(
    "/approvals/{approval_id}/decide",
    response_model=ApprovalRequest,
    status_code=status.HTTP_200_OK,
    summary="Approve or Reject Held Tool Action",
    description="Submit human administrator authorization decision on a high-risk tool call.",
)
def decide_approval(
    approval_id: str,
    payload: ApprovalDecision,
    actor: MockActor = Depends(require_permission("*")),
) -> ApprovalRequest:
    appr = approval_store.decide_approval(
        approval_id=approval_id,
        decided_by=actor.actor_id,
        approve=payload.approve,
        decision_note=payload.decision_note,
    )
    if not appr:
        raise NotFoundError(f"Approval request '{approval_id}' not found")
    return appr

