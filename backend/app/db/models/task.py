"""SQLAlchemy 2.0 ORM models for Target Agent tasks and execution steps."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base, utc_now


class TaskModel(Base):
    """Database model representing a Target Agent business task."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    actor_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), index=True, default="PENDING", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    context: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationships
    steps: Mapped[List["TaskStepModel"]] = relationship(
        "TaskStepModel",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="TaskStepModel.step_number",
    )
    guardian_decisions: Mapped[List["GuardianDecisionModel"]] = relationship(
        "GuardianDecisionModel",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    approval_requests: Mapped[List["ApprovalRequestModel"]] = relationship(
        "ApprovalRequestModel",
        back_populates="task",
        cascade="all, delete-orphan",
    )


class TaskStepModel(Base):
    """Database model representing a single step executed during a task."""

    __tablename__ = "task_steps"
    __table_args__ = (
        UniqueConstraint("task_id", "step_number", name="uq_task_step_number"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    tool: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    policy_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    policy_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    output: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationship
    task: Mapped["TaskModel"] = relationship("TaskModel", back_populates="steps")

