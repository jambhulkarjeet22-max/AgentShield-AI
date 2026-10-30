"""Red Team Campaign Orchestrator — coordinates full adversarial campaign execution.

Flow:
    CampaignRequest
        → AttackPlanner (select attacks for categories)
        → for each attack:
            → AttackDispatcher (submit payload to Target Agent API)
            → AttackEvaluator (judge defence outcome)
        → aggregate into CampaignResponse
        → CampaignStateStore (persist)
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi.testclient import TestClient

from backend.app.agents.redteam.dispatcher import AttackDispatcher, DispatchError
from backend.app.agents.redteam.evaluator import AttackEvaluator
from backend.app.agents.redteam.planner import AttackPlanner
from backend.app.agents.redteam.schemas import (
    AttackOutcome,
    CampaignRequest,
    CampaignResponse,
    CampaignStatus,
)
from backend.app.agents.redteam.state import campaign_state_store
from backend.app.core.logging import get_logger
from backend.app.security.actors import MockActor
from backend.app.security.audit import audit_service

logger = get_logger("agentshield.agents.redteam.orchestrator")


class RedTeamOrchestrator:
    """Coordinates end-to-end execution of a Red Team attack campaign."""

    @classmethod
    def run_campaign(
        cls,
        actor: MockActor,
        request: CampaignRequest,
        client: TestClient,
    ) -> CampaignResponse:
        """Execute all attacks in the campaign and return an aggregated result.

        Args:
            actor: The authenticated actor launching this campaign (Analyst or Admin).
            request: Campaign configuration (categories, name, target actor key).
            client: FastAPI TestClient bound to the running app for HTTP dispatch.

        Returns:
            CampaignResponse with all AttackResult records populated.
        """
        # Redact key for storage — expose only first 12 chars as a hint
        key_hint = (request.target_actor_key[:12] + "...") if len(request.target_actor_key) > 12 else request.target_actor_key

        campaign = CampaignResponse(
            campaign_name=request.campaign_name,
            description=request.description,
            status=CampaignStatus.RUNNING,
            launched_by=actor.actor_id,
            target_actor_key_hint=key_hint,
            categories=request.categories,
        )
        campaign_state_store.save_campaign(campaign)

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="redteam_agent",
            action="launch_campaign",
            resource=campaign.campaign_id,
            status="ALLOWED",
            details={
                "campaign_name": campaign.campaign_name,
                "categories": [c.value for c in request.categories],
            },
        )

        logger.info(
            "Red Team campaign [%s] started by %s. Categories: %s",
            campaign.campaign_id,
            actor.actor_id,
            [c.value for c in request.categories],
        )

        # Select attacks
        attacks = AttackPlanner.get_attacks_for_categories(request.categories)
        campaign.total_attacks = len(attacks)
        campaign_state_store.save_campaign(campaign)

        dispatcher = AttackDispatcher(
            client=client,
            target_actor_key=request.target_actor_key,
        )

        for attack in attacks:
            logger.info(
                "Campaign [%s]: executing attack %s (%s)",
                campaign.campaign_id,
                attack.attack_id,
                attack.attack_name,
            )

            try:
                dispatch_response = dispatcher.submit_attack(
                    payload=attack.build_payload(),
                    attack_id=attack.attack_id,
                )
                result = AttackEvaluator.evaluate(attack, dispatch_response)
            except DispatchError as exc:
                logger.error(
                    "Campaign [%s]: dispatch error for attack %s: %s",
                    campaign.campaign_id,
                    attack.attack_id,
                    str(exc),
                )
                from backend.app.agents.redteam.schemas import AttackResult
                result = AttackResult(
                    attack_id=attack.attack_id,
                    attack_name=attack.attack_name,
                    category=attack.category,
                    payload=attack.build_payload(),
                    target_task_id="dispatch_error",
                    target_task_status="ERROR",
                    outcome=AttackOutcome.ERROR,
                    evaluation_notes=f"Dispatch infrastructure error: {str(exc)}",
                )

            # Accumulate campaign counters
            if result.outcome == AttackOutcome.DEFENCE_HELD:
                campaign.defences_held += 1
            elif result.outcome == AttackOutcome.ATTACK_SUCCESS:
                campaign.attacks_landed += 1
                logger.error(
                    "SECURITY REGRESSION in campaign [%s]: attack %s LANDED. %s",
                    campaign.campaign_id,
                    attack.attack_id,
                    result.evaluation_notes,
                )
            else:
                campaign.errors += 1

            campaign.attack_results.append(result)

            # Audit each attack result
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="redteam_agent",
                action=f"attack:{attack.attack_id}",
                resource=campaign.campaign_id,
                status="ALLOWED" if result.outcome != AttackOutcome.ATTACK_SUCCESS else "FAILED",
                details={
                    "attack_name": attack.attack_name,
                    "outcome": result.outcome.value,
                    "steps_blocked": result.steps_blocked,
                    "steps_succeeded": result.steps_succeeded,
                },
            )

        # Finalise campaign
        campaign.completed_at = datetime.now(timezone.utc).isoformat()
        campaign.status = CampaignStatus.COMPLETED
        campaign.summary = cls._build_campaign_summary(campaign)
        campaign_state_store.save_campaign(campaign)

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="redteam_agent",
            action="complete_campaign",
            resource=campaign.campaign_id,
            status="ALLOWED" if campaign.attacks_landed == 0 else "FAILED",
            details={
                "total_attacks": campaign.total_attacks,
                "defences_held": campaign.defences_held,
                "attacks_landed": campaign.attacks_landed,
            },
        )

        logger.info(
            "Campaign [%s] completed: %d/%d defences held, %d landed, %d errors.",
            campaign.campaign_id,
            campaign.defences_held,
            campaign.total_attacks,
            campaign.attacks_landed,
            campaign.errors,
        )
        return campaign

    @classmethod
    def _build_campaign_summary(cls, campaign: CampaignResponse) -> str:
        """Generate a human-readable campaign outcome summary."""
        if campaign.attacks_landed == 0:
            verdict = (
                f"✅ ALL DEFENCES HELD: {campaign.defences_held}/{campaign.total_attacks} "
                f"attacks successfully contained. No security boundary was breached."
            )
        else:
            verdict = (
                f"🚨 SECURITY REGRESSION DETECTED: {campaign.attacks_landed} attack(s) landed. "
                f"Immediate investigation required."
            )

        lines = [
            f"### Red Team Campaign: '{campaign.campaign_name}'",
            f"- **Total attacks executed**: {campaign.total_attacks}",
            f"- **Defences held**: {campaign.defences_held}",
            f"- **Attacks landed** (MUST be 0): {campaign.attacks_landed}",
            f"- **Infrastructure errors**: {campaign.errors}",
            "",
            verdict,
        ]
        return "\n".join(lines)

