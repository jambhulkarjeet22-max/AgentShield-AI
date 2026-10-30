"""SQLAlchemy 2.0 ORM models for Red Team campaigns and attack evaluation results."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base, utc_now


class CampaignModel(Base):
    """Database model representing a Red Team adversarial attack campaign."""

    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True, default="PENDING", nullable=False)
    launched_by: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    target_actor_key_hint: Mapped[str] = mapped_column(String(32), nullable=False)
    categories: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_attacks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    defences_held: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_to_trigger: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attacks_landed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    errors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    attack_results: Mapped[List["CampaignAttackResultModel"]] = relationship(
        "CampaignAttackResultModel",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class CampaignAttackResultModel(Base):
    """Database model representing a single attack execution within a campaign."""

    __tablename__ = "campaign_attack_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    campaign_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    attack_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    attack_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    target_task_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    target_task_status: Mapped[str] = mapped_column(String(32), nullable=False)
    steps_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    steps_blocked: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    guardian_blocks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    steps_succeeded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    steps_errored: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    evaluation_notes: Mapped[str] = mapped_column(Text, nullable=False)
    raw_step_data: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationship
    campaign: Mapped["CampaignModel"] = relationship("CampaignModel", back_populates="attack_results")

