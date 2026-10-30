"""Thread-safe store for pending administrator approval requests."""

import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.agents.guardian.schemas import (
    ApprovalRequest,
    ApprovalStatus,
    GuardianVerdict,
)
from backend.app.agents.target.schemas import ToolCallProposal


class ApprovalStore:
    """In-memory store managing human/administrator approval requests for high-risk actions."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._approvals: Dict[str, ApprovalRequest] = {}

    def create_approval(
        self,
        task_id: str,
        step_number: int,
        proposal: ToolCallProposal,
        verdict: GuardianVerdict,
    ) -> ApprovalRequest:
        """Create and record an approval request for a tool call requiring human authorization."""
        req = ApprovalRequest(
            task_id=task_id,
            step_number=step_number,
            tool=proposal.tool,
            action=proposal.action,
            parameters=proposal.parameters,
            risk_score=verdict.risk_score,
            explanation=verdict.explanation,
        )
        with self._lock:
            self._approvals[req.approval_id] = req
        return req

    def get_approval(self, approval_id: str) -> Optional[ApprovalRequest]:
        with self._lock:
            return self._approvals.get(approval_id)

    def decide_approval(
        self,
        approval_id: str,
        decided_by: str,
        approve: bool,
        decision_note: Optional[str] = None,
    ) -> Optional[ApprovalRequest]:
        """Apply administrator decision to a pending approval request."""
        with self._lock:
            req = self._approvals.get(approval_id)
            if not req:
                return None
            req.status = ApprovalStatus.APPROVED if approve else ApprovalStatus.REJECTED
            req.decided_by = decided_by
            req.decided_at = datetime.now(timezone.utc).isoformat()
            req.decision_note = decision_note
            return req

    def list_approvals(
        self,
        status: Optional[ApprovalStatus] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ApprovalRequest]:
        with self._lock:
            items = list(self._approvals.values())

        if status:
            items = [a for a in items if a.status == status]

        sorted_items = sorted(items, key=lambda a: a.requested_at, reverse=True)
        return sorted_items[offset : offset + limit]

    def count(self) -> int:
        with self._lock:
            return len(self._approvals)

    def reset(self) -> None:
        """Clear all approvals (used by testing fixtures)."""
        with self._lock:
            self._approvals.clear()


approval_store = ApprovalStore()

