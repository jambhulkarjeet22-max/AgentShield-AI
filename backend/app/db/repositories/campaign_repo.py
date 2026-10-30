"""Repository for Red Team campaign and attack result database persistence."""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from backend.app.agents.redteam.schemas import (
    AttackCategory,
    AttackOutcome,
    AttackResult,
    CampaignResponse,
    CampaignStatus,
)
from backend.app.db.models.campaign import CampaignAttackResultModel, CampaignModel


class CampaignRepository:
    """Provides database CRUD operations for Red Team campaigns and attack evaluation results."""

    def __init__(self, session: Session):
        self.session = session

    def save_campaign(self, campaign: CampaignResponse) -> CampaignResponse:
        """Create or update a campaign and persist its individual attack results."""
        existing = self.session.get(CampaignModel, campaign.campaign_id)

        started_dt = (
            datetime.fromisoformat(campaign.started_at)
            if isinstance(campaign.started_at, str)
            else campaign.started_at
        )
        completed_dt = (
            datetime.fromisoformat(campaign.completed_at)
            if campaign.completed_at and isinstance(campaign.completed_at, str)
            else campaign.completed_at
        )

        categories_raw = [
            c.value if isinstance(c, AttackCategory) else str(c)
            for c in campaign.categories
        ]

        if not existing:
            existing = CampaignModel(
                id=campaign.campaign_id,
                name=campaign.campaign_name,
                description=campaign.description,
                status=campaign.status.value if isinstance(campaign.status, CampaignStatus) else str(campaign.status),
                launched_by=campaign.launched_by,
                target_actor_key_hint=campaign.target_actor_key_hint,
                categories=categories_raw,
                started_at=started_dt,
                completed_at=completed_dt,
                total_attacks=campaign.total_attacks,
                defences_held=campaign.defences_held,
                failed_to_trigger=campaign.failed_to_trigger,
                attacks_landed=campaign.attacks_landed,
                errors=campaign.errors,
                summary=campaign.summary,
                error=campaign.error,
            )
            self.session.add(existing)
        else:
            existing.name = campaign.campaign_name
            existing.description = campaign.description
            existing.status = campaign.status.value if isinstance(campaign.status, CampaignStatus) else str(campaign.status)
            existing.completed_at = completed_dt
            existing.total_attacks = campaign.total_attacks
            existing.defences_held = campaign.defences_held
            existing.failed_to_trigger = campaign.failed_to_trigger
            existing.attacks_landed = campaign.attacks_landed
            existing.errors = campaign.errors
            existing.summary = campaign.summary
            existing.error = campaign.error

        # Synchronize attack results
        existing_attack_ids = {a.attack_id for a in existing.attack_results}
        for res in campaign.attack_results:
            if res.attack_id not in existing_attack_ids:
                ts_dt = (
                    datetime.fromisoformat(res.timestamp)
                    if isinstance(res.timestamp, str)
                    else res.timestamp
                )
                att_pk = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"att-{existing.id}-{res.attack_id}"))
                att_model = CampaignAttackResultModel(
                    id=att_pk,
                    campaign_id=existing.id,
                    attack_id=res.attack_id,
                    attack_name=res.attack_name,
                    category=res.category.value if isinstance(res.category, AttackCategory) else str(res.category),
                    payload=res.payload,
                    target_task_id=res.target_task_id,
                    target_task_status=res.target_task_status,
                    steps_total=res.steps_total,
                    steps_blocked=res.steps_blocked,
                    guardian_blocks=res.guardian_blocks,
                    steps_succeeded=res.steps_succeeded,
                    steps_errored=res.steps_errored,
                    outcome=res.outcome.value if isinstance(res.outcome, AttackOutcome) else str(res.outcome),
                    evaluation_notes=res.evaluation_notes,
                    raw_step_data=res.raw_step_data,
                    timestamp=ts_dt,
                )
                self.session.add(att_model)

        self.session.flush()
        return self._to_schema(existing)

    def get_campaign(self, campaign_id: str) -> Optional[CampaignResponse]:
        """Retrieve a campaign by ID including all attack results."""
        stmt = (
            select(CampaignModel)
            .where(CampaignModel.id == campaign_id)
            .options(selectinload(CampaignModel.attack_results))
        )
        model = self.session.execute(stmt).scalar_one_or_none()
        if not model:
            return None
        return self._to_schema(model)

    def list_campaigns(self, limit: int = 50, offset: int = 0) -> List[CampaignResponse]:
        """List campaigns ordered by started_at descending."""
        stmt = (
            select(CampaignModel)
            .options(selectinload(CampaignModel.attack_results))
            .order_by(CampaignModel.started_at.desc())
            .offset(offset)
            .limit(limit)
        )
        models = self.session.execute(stmt).scalars().all()
        return [self._to_schema(m) for m in models]

    def count(self) -> int:
        """Count total recorded campaigns."""
        stmt = select(func.count(CampaignModel.id))
        return self.session.execute(stmt).scalar_one()

    def delete_campaign(self, campaign_id: str) -> bool:
        """Delete a campaign and cascaded attack results."""
        model = self.session.get(CampaignModel, campaign_id)
        if model:
            self.session.delete(model)
            self.session.flush()
            return True
        return False

    @staticmethod
    def _to_schema(model: CampaignModel) -> CampaignResponse:
        """Convert ORM model to CampaignResponse Pydantic schema."""
        categories = [
            AttackCategory(c) if c in AttackCategory._value2member_map_ else AttackCategory.TOOL_ABUSE
            for c in (model.categories or [])
        ]
        attack_results = [
            AttackResult(
                attack_id=a.attack_id,
                attack_name=a.attack_name,
                category=AttackCategory(a.category) if a.category in AttackCategory._value2member_map_ else AttackCategory.TOOL_ABUSE,
                payload=a.payload,
                target_task_id=a.target_task_id,
                target_task_status=a.target_task_status,
                steps_total=a.steps_total,
                steps_blocked=a.steps_blocked,
                guardian_blocks=a.guardian_blocks,
                steps_succeeded=a.steps_succeeded,
                steps_errored=a.steps_errored,
                outcome=AttackOutcome(a.outcome) if a.outcome in AttackOutcome._value2member_map_ else AttackOutcome.DEFENCE_HELD,
                evaluation_notes=a.evaluation_notes,
                raw_step_data=a.raw_step_data,
                timestamp=a.timestamp.isoformat() if isinstance(a.timestamp, datetime) else str(a.timestamp),
            )
            for a in model.attack_results
        ]

        return CampaignResponse(
            campaign_id=model.id,
            campaign_name=model.name,
            description=model.description,
            status=CampaignStatus(model.status) if model.status in CampaignStatus._value2member_map_ else CampaignStatus.PENDING,
            launched_by=model.launched_by,
            target_actor_key_hint=model.target_actor_key_hint,
            categories=categories,
            started_at=model.started_at.isoformat() if isinstance(model.started_at, datetime) else str(model.started_at),
            completed_at=model.completed_at.isoformat() if model.completed_at else None,
            total_attacks=model.total_attacks,
            defences_held=model.defences_held,
            failed_to_trigger=model.failed_to_trigger,
            attacks_landed=model.attacks_landed,
            errors=model.errors,
            attack_results=attack_results,
            summary=model.summary,
            error=model.error,
        )

