"""Pydantic schemas and models for Target AI Agent task execution and observability."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class TaskStatus(str, Enum):
    """Lifecycle states of an autonomous business task."""

    PENDING = "PENDING"
    PLANNING = "PLANNING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"


class ToolCallProposal(BaseModel):
    """Structured proposal for an action against an available mock tool."""

    tool: str = Field(description="Target tool category (email, filesystem, browser, payments)")
    action: str = Field(description="Action name (e.g. read_file, send_email, list_messages)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action arguments")


class StepResult(BaseModel):
    """Observed result and audit record of a single executed task step."""

    step_number: int = Field(description="Sequential step index")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Execution timestamp",
    )
    tool: str = Field(description="Tool invoked")
    action: str = Field(description="Action invoked")
    parameters: Dict[str, Any] = Field(description="Input arguments provided to tool")
    policy_allowed: bool = Field(description="Whether policy guardrails permitted execution")
    policy_reason: Optional[str] = Field(default=None, description="Explanation if blocked by policy")
    status: str = Field(description="Step status: SUCCESS, BLOCKED, GUARDIAN_BLOCKED, PENDING_APPROVAL, or ERROR")
    output: Optional[Any] = Field(default=None, description="Inert data returned by tool service")
    error: Optional[str] = Field(default=None, description="Error message if step failed")
    guardian_verdict: Optional[Any] = Field(
        default=None,
        description="Blue Team Guardian risk verdict (Phase 5+)",
    )


class TaskSubmissionRequest(BaseModel):
    """Payload to submit a business task to the Target Agent."""

    instruction: str = Field(
        min_length=3,
        max_length=10000,
        description="Natural language business task description",
    )
    context: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional execution context or initial variables",
    )

    @field_validator("instruction")
    @classmethod
    def sanitize_instruction(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Task instruction cannot be empty or only whitespace")
        return clean


class TaskResponse(BaseModel):
    """Comprehensive response detailing a task's execution lifecycle and output."""

    task_id: str = Field(
        default_factory=lambda: f"task-{uuid.uuid4().hex[:10]}",
        description="Unique task identifier",
    )
    actor_id: str = Field(description="Actor that originated the task")
    role: str = Field(description="Role of the originating actor")
    instruction: str = Field(description="Original business task instruction")
    status: TaskStatus = Field(default=TaskStatus.PENDING, description="Current lifecycle state")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Submission timestamp",
    )
    completed_at: Optional[str] = Field(default=None, description="Completion timestamp")
    steps: List[StepResult] = Field(default_factory=list, description="Sequence of execution steps")
    summary: Optional[str] = Field(default=None, description="Final task completion summary")
    error: Optional[str] = Field(default=None, description="High-level error description if failed")


class TaskListResponse(BaseModel):
    """Paginated list of task execution records."""

    total: int = Field(description="Total task count")
    tasks: List[TaskResponse] = Field(description="List of tasks")

