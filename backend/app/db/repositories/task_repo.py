"""Repository for Target Agent task and step database persistence."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from backend.app.agents.target.schemas import StepResult, TaskResponse, TaskStatus
from backend.app.db.models.task import TaskModel, TaskStepModel


class TaskRepository:
    """Provides database CRUD operations for Target Agent tasks and execution steps."""

    def __init__(self, session: Session):
        self.session = session

    def save_task(self, task: TaskResponse) -> TaskResponse:
        """Create or update a task and synchronize its execution steps."""
        existing = self.session.get(TaskModel, task.task_id)

        created_dt = (
            datetime.fromisoformat(task.created_at)
            if isinstance(task.created_at, str)
            else task.created_at
        )
        completed_dt = (
            datetime.fromisoformat(task.completed_at)
            if task.completed_at and isinstance(task.completed_at, str)
            else task.completed_at
        )

        if not existing:
            existing = TaskModel(
                id=task.task_id,
                actor_id=task.actor_id,
                role=task.role,
                instruction=task.instruction,
                status=task.status.value if isinstance(task.status, TaskStatus) else str(task.status),
                created_at=created_dt,
                completed_at=completed_dt,
                summary=task.summary,
                error=task.error,
            )
            self.session.add(existing)
        else:
            existing.status = task.status.value if isinstance(task.status, TaskStatus) else str(task.status)
            existing.completed_at = completed_dt
            existing.summary = task.summary
            existing.error = task.error

        # Synchronize steps
        existing_step_numbers = {s.step_number for s in existing.steps}
        for step in task.steps:
            if step.step_number not in existing_step_numbers:
                step_dt = (
                    datetime.fromisoformat(step.timestamp)
                    if isinstance(step.timestamp, str)
                    else step.timestamp
                )
                step_pk = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"step-{existing.id}-{step.step_number}"))
                step_model = TaskStepModel(
                    id=step_pk,
                    task_id=existing.id,
                    step_number=step.step_number,
                    tool=step.tool,
                    action=step.action,
                    parameters=step.parameters or {},
                    policy_allowed=step.policy_allowed,
                    policy_reason=step.policy_reason,
                    status=step.status,
                    output=step.output,
                    error=step.error,
                    timestamp=step_dt,
                )
                self.session.add(step_model)

        self.session.flush()
        return self._to_schema(existing)

    def get_task(self, task_id: str) -> Optional[TaskResponse]:
        """Retrieve a task by ID including all steps."""
        stmt = (
            select(TaskModel)
            .where(TaskModel.id == task_id)
            .options(selectinload(TaskModel.steps))
        )
        model = self.session.execute(stmt).scalar_one_or_none()
        if not model:
            return None
        return self._to_schema(model)

    def list_tasks(
        self,
        actor_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[TaskResponse]:
        """List tasks ordered by creation time descending."""
        stmt = (
            select(TaskModel)
            .options(selectinload(TaskModel.steps))
            .order_by(TaskModel.created_at.desc())
        )
        if actor_id:
            stmt = stmt.where(func.lower(TaskModel.actor_id) == actor_id.lower())
        if status:
            stmt = stmt.where(TaskModel.status == status)

        stmt = stmt.offset(offset).limit(limit)
        models = self.session.execute(stmt).scalars().all()
        return [self._to_schema(m) for m in models]

    def count(self, actor_id: Optional[str] = None) -> int:
        """Count tasks with optional actor filter."""
        stmt = select(func.count(TaskModel.id))
        if actor_id:
            stmt = stmt.where(func.lower(TaskModel.actor_id) == actor_id.lower())
        return self.session.execute(stmt).scalar_one()

    def delete_task(self, task_id: str) -> bool:
        """Delete task and cascaded steps."""
        model = self.session.get(TaskModel, task_id)
        if model:
            self.session.delete(model)
            self.session.flush()
            return True
        return False

    @staticmethod
    def _to_schema(model: TaskModel) -> TaskResponse:
        """Convert ORM model to TaskResponse Pydantic schema."""
        steps = [
            StepResult(
                step_number=s.step_number,
                timestamp=s.timestamp.isoformat() if isinstance(s.timestamp, datetime) else str(s.timestamp),
                tool=s.tool,
                action=s.action,
                parameters=s.parameters or {},
                policy_allowed=s.policy_allowed,
                policy_reason=s.policy_reason,
                status=s.status,
                output=s.output,
                error=s.error,
            )
            for s in sorted(model.steps, key=lambda x: x.step_number)
        ]

        return TaskResponse(
            task_id=model.id,
            actor_id=model.actor_id,
            role=model.role,
            instruction=model.instruction,
            status=TaskStatus(model.status) if model.status in TaskStatus._value2member_map_ else TaskStatus.PENDING,
            created_at=model.created_at.isoformat() if isinstance(model.created_at, datetime) else str(model.created_at),
            completed_at=model.completed_at.isoformat() if model.completed_at else None,
            summary=model.summary,
            error=model.error,
            steps=steps,
        )

