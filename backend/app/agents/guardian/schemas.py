"""Pydantic schemas and data models for Blue Team Guardian security decisions and approvals."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GuardianDecision(str, Enum):
    """Binding verdict issued by the Blue Team Guardian."""

    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"


class RiskSignal(BaseModel):
    """Individual security signal contributing to the total risk score."""

    signal_id: str = Field(description="Signal identifier, e.g. INTENT_MISMATCH")
    description: str = Field(description="Human-readable explanation of why this signal triggered")
    weight: float = Field(description="Points added to total risk score")
    severity: str = Field(description="Severity tier: LOW, MEDIUM, HIGH, CRITICAL")


class MLInferenceMetadata(BaseModel):
    """Metadata regarding ML prompt injection advisory inference."""

    service_available: bool = Field(description="Whether ML service responded")
    is_suspicious: bool = Field(description="Advisory prompt injection flag")
    probability: float = Field(description="Estimated injection probability")
    decision_margin: float = Field(description="Decision margin from linear model")
    label: str = Field(description="SAFE, SUSPICIOUS, or UNAVAILABLE")
    fallback_reason: Optional[str] = Field(default=None, description="Fallback reason if offline")


class GuardianVerdict(BaseModel):
    """Detailed verdict returned by the Blue Team Guardian for a single tool proposal."""

    verdict: GuardianDecision = Field(description="Decision: ALLOW, BLOCK, or REQUIRE_APPROVAL")
    risk_score: float = Field(ge=0.0, le=100.0, description="Composite risk score (0.0 to 100.0)")
    signals_triggered: List[RiskSignal] = Field(default_factory=list, description="Triggered risk signals")
    explanation: str = Field(description="Human-readable explanation synthesizing the decision")
    intent_alignment: float = Field(ge=0.0, le=1.0, description="Instruction-to-action intent alignment score")
    ml_advisory: Optional[MLInferenceMetadata] = Field(
        default=None,
        description="Optional advisory ML prompt injection inference metadata",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Timestamp of evaluation",
    )


class ApprovalStatus(str, Enum):
    """Lifecycle status of an action requiring administrator approval."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ApprovalRequest(BaseModel):
    """Record of a tool action placed on hold awaiting human/admin decision."""

    approval_id: str = Field(
        default_factory=lambda: f"appr-{uuid.uuid4().hex[:10]}",
        description="Unique approval request ID",
    )
    task_id: str = Field(description="Associated Target Agent task ID")
    step_number: int = Field(description="Step number within the task execution sequence")
    tool: str = Field(description="Tool proposed (email, filesystem, browser, payments)")
    action: str = Field(description="Action proposed")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action arguments")
    risk_score: float = Field(description="Calculated risk score")
    explanation: str = Field(description="Guardian explanation for requiring approval")
    requested_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Submission timestamp",
    )
    status: ApprovalStatus = Field(default=ApprovalStatus.PENDING, description="Current approval status")
    decided_by: Optional[str] = Field(default=None, description="Actor ID who approved or rejected")
    decided_at: Optional[str] = Field(default=None, description="Decision timestamp")
    decision_note: Optional[str] = Field(default=None, description="Optional note provided by decider")


class ApprovalDecision(BaseModel):
    """Payload submitted by administrator to approve or reject a pending action."""

    approve: bool = Field(description="True to approve, False to reject")
    decision_note: Optional[str] = Field(default=None, description="Contextual explanation for approval/rejection")


class GuardianDecisionRecord(BaseModel):
    """Persistent audit entry of a Guardian evaluation."""

    record_id: str = Field(
        default_factory=lambda: f"gdec-{uuid.uuid4().hex[:10]}",
        description="Unique decision record ID",
    )
    task_id: str = Field(description="Target Agent task ID")
    step_number: int = Field(description="Step sequence number")
    actor_id: str = Field(description="Actor attempting the task")
    tool: str = Field(description="Tool proposed")
    action: str = Field(description="Action proposed")
    verdict: GuardianDecision = Field(description="Issued verdict")
    risk_score: float = Field(description="Calculated risk score")
    signals_triggered: List[str] = Field(default_factory=list, description="IDs of triggered signals")
    explanation: str = Field(description="Synthesized decision explanation")
    intent_alignment: float = Field(description="Computed intent alignment")
    ml_advisory: Optional[MLInferenceMetadata] = Field(
        default=None,
        description="Optional advisory ML prompt injection inference metadata",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Record timestamp",
    )


class GuardianDecisionListResponse(BaseModel):
    """Paginated list of Guardian decision audit records."""

    total: int = Field(description="Total record count")
    decisions: List[GuardianDecisionRecord] = Field(description="List of records")


class ApprovalListResponse(BaseModel):
    """List of pending and historical approval requests."""

    total: int = Field(description="Total approval count")
    approvals: List[ApprovalRequest] = Field(description="List of approval requests")

