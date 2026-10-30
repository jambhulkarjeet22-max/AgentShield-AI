"""Red Team Agent package — adversarial campaign orchestration against the Target Agent."""

from backend.app.agents.redteam.schemas import (
    AttackCategory,
    AttackOutcome,
    AttackResult,
    CampaignRequest,
    CampaignResponse,
    CampaignStatus,
    CampaignListResponse,
    AttackDescriptor,
)
from backend.app.agents.redteam.state import campaign_state_store

__all__ = [
    "AttackCategory",
    "AttackOutcome",
    "AttackResult",
    "CampaignRequest",
    "CampaignResponse",
    "CampaignStatus",
    "CampaignListResponse",
    "AttackDescriptor",
    "campaign_state_store",
]

