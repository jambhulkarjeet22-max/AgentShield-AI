"""Attack Planner — selects and sequences attack instances for a campaign.

The planner is fully deterministic: given the same list of AttackCategory values,
it always returns the same ordered sequence of BaseAttack instances.
No randomness, no external calls, no LLM required.
"""

from typing import List

from backend.app.agents.redteam.attacks.base import BaseAttack
from backend.app.agents.redteam.attacks.loop_exhaustion import ChainedReadLoop, RunawayToolCallLoop
from backend.app.agents.redteam.attacks.payment_fraud import (
    DirectPaymentAuthorizationInjection,
    EmbeddedPaymentAuthorizationInjection,
    OversizedPaymentCreation,
)
from backend.app.agents.redteam.attacks.privilege_escalation import (
    ReadConfidentialFileEscalation,
    ReadRestrictedFileEscalation,
    WriteOutsideSandboxEscalation,
)
from backend.app.agents.redteam.attacks.prompt_injection import (
    CEOFraudEmailInjection,
    SystemOverrideEmailInjection,
)
from backend.app.agents.redteam.attacks.tool_abuse import (
    DatabaseDropToolAbuse,
    ProhibitedFilesystemDeleteAbuse,
    UnknownSystemToolAbuse,
)
from backend.app.agents.redteam.attacks.webpage_injection import (
    FakePatchPageInjection,
    ForumPagePromptInjection,
)
from backend.app.agents.redteam.config import MAX_ATTACKS_PER_CAMPAIGN
from backend.app.agents.redteam.schemas import AttackCategory, AttackDescriptor
from backend.app.core.logging import get_logger

logger = get_logger("agentra.agents.redteam.planner")

# Master ordered registry of all available attacks, grouped by category.
# Order within each category is deterministic (execution order for campaigns).
_ATTACK_REGISTRY: List[BaseAttack] = [
    # Category 1: Prompt Injection via Email
    CEOFraudEmailInjection(),
    SystemOverrideEmailInjection(),
    # Category 2: Prompt Injection via Webpage
    ForumPagePromptInjection(),
    FakePatchPageInjection(),
    # Category 3: Privilege Escalation
    ReadConfidentialFileEscalation(),
    WriteOutsideSandboxEscalation(),
    ReadRestrictedFileEscalation(),
    # Category 4: Payment Fraud
    DirectPaymentAuthorizationInjection(),
    EmbeddedPaymentAuthorizationInjection(),
    OversizedPaymentCreation(),
    # Category 5: Tool Abuse
    UnknownSystemToolAbuse(),
    DatabaseDropToolAbuse(),
    ProhibitedFilesystemDeleteAbuse(),
    # Category 6: Loop Exhaustion
    RunawayToolCallLoop(),
    ChainedReadLoop(),
]


class AttackPlanner:
    """Selects and sequences attack instances for a campaign configuration."""

    @classmethod
    def get_attacks_for_categories(
        cls,
        categories: List[AttackCategory],
    ) -> List[BaseAttack]:
        """Return ordered list of attacks whose category is in the requested set.

        Always returns attacks in the deterministic registry order.
        Enforces MAX_ATTACKS_PER_CAMPAIGN ceiling.
        """
        selected = [a for a in _ATTACK_REGISTRY if a.category in categories]
        if len(selected) > MAX_ATTACKS_PER_CAMPAIGN:
            logger.warning(
                "Attack count %d exceeds MAX_ATTACKS_PER_CAMPAIGN=%d; truncating.",
                len(selected),
                MAX_ATTACKS_PER_CAMPAIGN,
            )
            selected = selected[:MAX_ATTACKS_PER_CAMPAIGN]
        logger.info(
            "AttackPlanner selected %d attacks for categories: %s",
            len(selected),
            [c.value for c in categories],
        )
        return selected

    @classmethod
    def get_full_catalog(cls) -> List[AttackDescriptor]:
        """Return descriptors for every attack in the registry (all categories)."""
        return [a.to_descriptor() for a in _ATTACK_REGISTRY]

    @classmethod
    def total_attack_count(cls) -> int:
        """Return the total number of registered attacks."""
        return len(_ATTACK_REGISTRY)

