"""API endpoints for the Target AI Agent."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status

from backend.app.agents.target.orchestrator import TargetAgentOrchestrator
from backend.app.agents.target.schemas import (
    StepResult,
    TaskListResponse,
    TaskResponse,
    TaskSubmissionRequest,
)
from backend.app.agents.target.state import task_state_store
from backend.app.core.exceptions import NotFoundError, SecurityError
from backend.app.security.actors import MockActor, get_current_actor, require_permission

router = APIRouter(prefix="/target", tags=["AI Agent: Target Agent"])


@router.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Business Task to Target Agent",
    description="Submit a natural language instruction for autonomous planning, validation, and execution.",
)
async def submit_task(
    payload: TaskSubmissionRequest,
    actor: MockActor = Depends(require_permission("agent:submit")),
) -> TaskResponse:
    return await TargetAgentOrchestrator.run_task(actor=actor, request=payload)


@router.get(
    "/tasks",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Target Agent Execution History",
    description="Retrieve execution history of tasks processed by the Target Agent.",
)
async def list_tasks(
    actor_id: Optional[str] = Query(default=None, description="Optional actor filter"),
    limit: int = Query(default=50, ge=1, le=100, description="Max tasks to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    actor: MockActor = Depends(get_current_actor),
) -> TaskListResponse:
    if not (actor.has_permission("agent:list") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:list' required to view agent execution history")

    tasks = task_state_store.list_tasks(actor_id=actor_id, limit=limit, offset=offset)
    return TaskListResponse(total=task_state_store.count(), tasks=tasks)


@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Target Agent Task Status",
    description="Inspect lifecycle status, summary, and results for a specific task.",
)
async def get_task(
    task_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> TaskResponse:
    if not (actor.has_permission("agent:read") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:read' required to inspect task status")

    task = task_state_store.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task '{task_id}' not found in execution registry")
    return task


@router.get(
    "/tasks/{task_id}/steps",
    response_model=List[StepResult],
    status_code=status.HTTP_200_OK,
    summary="Get Granular Task Execution Steps",
    description="Inspect step-by-step tool actions, parameter payloads, policy verdicts, and outputs.",
)
async def get_task_steps(
    task_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> List[StepResult]:
    if not (actor.has_permission("agent:read") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:read' required to inspect task steps")

    task = task_state_store.get_task(task_id)
    if not task:
        raise NotFoundError(f"Task '{task_id}' not found in execution registry")
    return task.steps

