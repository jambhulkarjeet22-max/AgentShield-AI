"""SQLAlchemy 2.0 ORM models for Blue Team Guardian decisions and approval requests."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base, utc_now


class GuardianDecisionModel(Base):
    """Database model representing an authoritative Blue Team Guardian evaluation record."""

    __tablename__ = "guardian_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    step_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    tool: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    verdict: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    intent_alignment: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    signals_triggered: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    ml_advisory: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="Stores ML advisory signals: probability, margin, label, fallback_reason",
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)

    # Relationship
    task: Mapped[Optional["TaskModel"]] = relationship("TaskModel", back_populates="guardian_decisions")


class ApprovalRequestModel(Base):
    """Database model representing an action requiring human/administrator approval."""

    __tablename__ = "guardian_approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    step_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    tool: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), index=True, default="PENDING", nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    decided_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    task: Mapped[Optional["TaskModel"]] = relationship("TaskModel", back_populates="approval_requests")

