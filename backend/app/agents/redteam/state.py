"""Thread-safe in-memory campaign state store for the Red Team Agent."""

import threading
from typing import Dict, List, Optional

from backend.app.agents.redteam.schemas import CampaignResponse


class CampaignStateStore:
    """Stores execution state and history for Red Team attack campaigns."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._campaigns: Dict[str, CampaignResponse] = {}

    def save_campaign(self, campaign: CampaignResponse) -> CampaignResponse:
        with self._lock:
            self._campaigns[campaign.campaign_id] = campaign
        return campaign

    def get_campaign(self, campaign_id: str) -> Optional[CampaignResponse]:
        with self._lock:
            return self._campaigns.get(campaign_id)

    def list_campaigns(
        self,
        limit: int = 50,
        offset: int = 0,
    ) -> List[CampaignResponse]:
        with self._lock:
            items = list(self._campaigns.values())
        sorted_items = sorted(items, key=lambda c: c.started_at, reverse=True)
        return sorted_items[offset : offset + limit]

    def count(self) -> int:
        with self._lock:
            return len(self._campaigns)

    def reset(self) -> None:
        """Clear all campaigns — used by test fixtures to restore a clean state."""
        with self._lock:
            self._campaigns.clear()


campaign_state_store = CampaignStateStore()

