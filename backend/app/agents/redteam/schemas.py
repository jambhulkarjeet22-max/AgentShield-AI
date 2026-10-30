"""Pydantic schemas for Red Team campaign execution, attack results, and evaluation."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class AttackCategory(str, Enum):
    """Taxonomy of simulated adversarial attack categories."""

    PROMPT_INJECTION_EMAIL = "prompt_injection_email"
    PROMPT_INJECTION_WEB = "prompt_injection_web"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    PAYMENT_FRAUD = "payment_fraud"
    TOOL_ABUSE = "tool_abuse"
    LOOP_EXHAUSTION = "loop_exhaustion"


class AttackOutcome(str, Enum):
    """Result classification for a single simulated attack attempt."""

    DEFENCE_HELD = "DEFENCE_HELD"      # Attack blocked as expected — defence succeeded
    ATTACK_SUCCESS = "ATTACK_SUCCESS"  # Attack landed — defence FAILED (security regression)
    ERROR = "ERROR"                    # Infrastructure error during attack execution


class CampaignStatus(str, Enum):
    """Lifecycle states of a Red Team attack campaign."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AttackDescriptor(BaseModel):
    """Read-only catalogue entry describing a named attack."""

    attack_id: str = Field(description="Unique attack identifier, e.g. PI-EMAIL-001")
    attack_name: str = Field(description="Human-readable attack name")
    category: AttackCategory = Field(description="Attack taxonomy category")
    description: str = Field(description="What this attack does and what defence it tests")
    expected_outcome: AttackOutcome = Field(
        default=AttackOutcome.DEFENCE_HELD,
        description="Expected result — always DEFENCE_HELD for prohibited actions",
    )


class AttackResult(BaseModel):
    """Observed result of a single executed attack attempt."""

    attack_id: str = Field(description="Attack identifier from the catalog")
    attack_name: str = Field(description="Human-readable attack name")
    category: AttackCategory = Field(description="Attack taxonomy category")
    payload: str = Field(description="Adversarial instruction string submitted to Target Agent")
    target_task_id: str = Field(description="Task ID returned by Target Agent API")
    target_task_status: str = Field(description="Final task status from Target Agent")
    steps_total: int = Field(default=0, description="Total steps executed by Target Agent")
    steps_blocked: int = Field(default=0, description="Steps blocked by PolicyValidator")
    guardian_blocks: int = Field(default=0, description="Steps blocked by Blue Team Guardian")
    steps_succeeded: int = Field(default=0, description="Steps that reached SUCCESS status")
    steps_errored: int = Field(default=0, description="Steps that reached ERROR status")
    outcome: AttackOutcome = Field(description="Final evaluation verdict")
    evaluation_notes: str = Field(description="Human-readable explanation of the evaluation verdict")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Timestamp of attack execution",
    )
    raw_step_data: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Raw step result records from Target Agent (for audit trail)",
    )


class CampaignRequest(BaseModel):
    """Request payload to launch a new Red Team attack campaign."""

    campaign_name: str = Field(
        min_length=3,
        max_length=200,
        description="Descriptive name for this campaign",
    )
    categories: List[AttackCategory] = Field(
        min_length=1,
        description="Which attack categories to include in this campaign",
    )
    target_actor_key: str = Field(
        description="Mock API key the Target Agent will execute tasks under (the victim actor)",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Optional narrative describing campaign objectives",
    )

    @field_validator("campaign_name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Campaign name cannot be empty or only whitespace")
        return clean

    @field_validator("target_actor_key")
    @classmethod
    def validate_actor_key(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Target actor key cannot be empty")
        return clean


class CampaignResponse(BaseModel):
    """Full result of a completed or in-progress Red Team campaign."""

    campaign_id: str = Field(
        default_factory=lambda: f"campaign-{uuid.uuid4().hex[:10]}",
        description="Unique campaign identifier",
    )
    campaign_name: str = Field(description="Campaign display name")
    description: Optional[str] = Field(default=None)
    status: CampaignStatus = Field(default=CampaignStatus.PENDING)
    launched_by: str = Field(description="Actor ID that launched this campaign")
    target_actor_key_hint: str = Field(description="Redacted hint of target actor key (first 12 chars)")
    categories: List[AttackCategory] = Field(description="Attack categories included")
    started_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
    completed_at: Optional[str] = Field(default=None)
    total_attacks: int = Field(default=0)
    defences_held: int = Field(default=0, description="Count of attacks successfully contained")
    attacks_landed: int = Field(
        default=0,
        description="Count of attacks that breached the defence (MUST remain 0)",
    )
    errors: int = Field(default=0, description="Infrastructure errors during campaign")
    attack_results: List[AttackResult] = Field(default_factory=list)
    summary: Optional[str] = Field(default=None)
    error: Optional[str] = Field(default=None)


class CampaignListResponse(BaseModel):
    """Paginated list of Red Team campaign records."""

    total: int
    campaigns: List[CampaignResponse]

