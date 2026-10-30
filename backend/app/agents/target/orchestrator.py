"""Target Agent Orchestrator managing planning, policy inspection, execution, and summarization."""

from datetime import datetime, timezone
from typing import Optional

from backend.app.agents.guardian import BlueTeamGuardian, GuardianDecision
from backend.app.agents.target.config import MAX_TOOL_CALLS_PER_TASK
from backend.app.agents.target.executor import ToolExecutor
from backend.app.agents.target.llm import get_llm_provider
from backend.app.agents.target.policy import PolicyValidator
from backend.app.agents.target.schemas import (
    StepResult,
    TaskResponse,
    TaskStatus,
    TaskSubmissionRequest,
)
from backend.app.agents.target.state import task_state_store
from backend.app.core.logging import get_logger
from backend.app.security.actors import MockActor
from backend.app.security.audit import audit_service

logger = get_logger("agentshield.agents.target.orchestrator")


class TargetAgentOrchestrator:
    """Coordinates lifecycle of a business task submitted to the Target Agent."""

    @classmethod
    async def run_task(
        cls,
        actor: MockActor,
        request: TaskSubmissionRequest,
    ) -> TaskResponse:
        """Execute a business task through the Target Agent pipeline."""
        task = TaskResponse(
            actor_id=actor.actor_id,
            role=actor.role.value,
            instruction=request.instruction,
            status=TaskStatus.PENDING,
        )
        task_state_store.save_task(task)

        logger.info("Target Agent received task [%s] from %s: '%s'", task.task_id, actor.actor_id, request.instruction)

        # Record task submission in system audit logger
        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="target_agent",
            action="submit_task",
            resource=task.task_id,
            status="ALLOWED",
            details={"instruction": request.instruction},
        )

        llm_provider = get_llm_provider()

        # Step 1: Planning
        task.status = TaskStatus.PLANNING
        task_state_store.save_task(task)

        try:
            proposals = await llm_provider.plan_task(
                instruction=request.instruction,
                context=request.context,
            )
        except Exception as e:
            logger.exception("Task [%s] planning failed: %s", task.task_id, str(e))
            task.status = TaskStatus.FAILED
            task.error = f"Planning failed: {str(e)}"
            task.completed_at = datetime.now(timezone.utc).isoformat()
            task_state_store.save_task(task)
            return task

        # Step 2: Execution & Policy Guardrails
        task.status = TaskStatus.RUNNING
        task_state_store.save_task(task)

        step_idx = 1
        blocked_count = 0

        for proposal in proposals:
            # Check maximum tool call limit to prevent runaway loops
            if step_idx > MAX_TOOL_CALLS_PER_TASK:
                logger.warning("Task [%s] exceeded tool call limit (%d)", task.task_id, MAX_TOOL_CALLS_PER_TASK)
                task.status = TaskStatus.BLOCKED
                task.error = f"Execution exceeded maximum permitted tool call limit ({MAX_TOOL_CALLS_PER_TASK})."
                break

            # 1. Pre-execution Security Policy Inspection
            policy_check = PolicyValidator.validate_proposal(actor, proposal, instruction=request.instruction)
            if not policy_check.is_allowed:
                blocked_count += 1
                step_res = StepResult(
                    step_number=step_idx,
                    tool=proposal.tool,
                    action=proposal.action,
                    parameters=proposal.parameters,
                    policy_allowed=False,
                    policy_reason=policy_check.reason,
                    status="BLOCKED",
                )
                task.steps.append(step_res)
                step_idx += 1
                continue

            # 2. Blue Team Guardian Real-Time Inspection
            guardian_verdict = BlueTeamGuardian.evaluate(
                actor=actor,
                proposal=proposal,
                instruction=request.instruction,
                prior_steps=task.steps,
                task_id=task.task_id,
                step_number=step_idx,
            )

            if guardian_verdict.verdict == GuardianDecision.BLOCK:
                blocked_count += 1
                step_res = StepResult(
                    step_number=step_idx,
                    tool=proposal.tool,
                    action=proposal.action,
                    parameters=proposal.parameters,
                    policy_allowed=True,
                    policy_reason=guardian_verdict.explanation,
                    status="GUARDIAN_BLOCKED",
                    guardian_verdict=guardian_verdict,
                )
                task.steps.append(step_res)
                step_idx += 1
                continue

            elif guardian_verdict.verdict == GuardianDecision.REQUIRE_APPROVAL:
                approval_req = BlueTeamGuardian.create_approval_request(
                    task_id=task.task_id,
                    step_number=step_idx,
                    proposal=proposal,
                    verdict=guardian_verdict,
                )
                step_res = StepResult(
                    step_number=step_idx,
                    tool=proposal.tool,
                    action=proposal.action,
                    parameters=proposal.parameters,
                    policy_allowed=True,
                    policy_reason=f"Action held for human administrator approval ({approval_req.approval_id}).",
                    status="PENDING_APPROVAL",
                    guardian_verdict=guardian_verdict,
                )
                task.steps.append(step_res)
                step_idx += 1
                continue

            # 3. Execution against Phase 2 Mock Tool Service
            step_res = await ToolExecutor.execute(
                actor=actor,
                proposal=proposal,
                step_number=step_idx,
            )
            step_res.guardian_verdict = guardian_verdict
            task.steps.append(step_res)
            step_idx += 1

        # Step 3: Summarization
        try:
            summary = await llm_provider.summarize_results(
                instruction=request.instruction,
                steps=task.steps,
            )
            task.summary = summary
        except Exception as e:
            logger.warning("Task [%s] summarization failed: %s", task.task_id, str(e))
            task.summary = f"Execution completed with {len(task.steps)} steps."

        # Final Status Assignment
        if task.status != TaskStatus.BLOCKED:
            if any(s.status == "PENDING_APPROVAL" for s in task.steps):
                task.status = TaskStatus.AWAITING_APPROVAL
            elif blocked_count > 0 and blocked_count == len(task.steps):
                task.status = TaskStatus.BLOCKED
                task.error = "All proposed tool actions were blocked by security policies."
            else:
                task.status = TaskStatus.COMPLETED

        task.completed_at = datetime.now(timezone.utc).isoformat()
        task_state_store.save_task(task)

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="target_agent",
            action="complete_task",
            resource=task.task_id,
            status="ALLOWED" if task.status == TaskStatus.COMPLETED else "DENIED",
            details={
                "status": task.status.value,
                "step_count": len(task.steps),
                "blocked_count": blocked_count,
            },
        )

        logger.info("Task [%s] finished with status %s", task.task_id, task.status.value)
        return task

