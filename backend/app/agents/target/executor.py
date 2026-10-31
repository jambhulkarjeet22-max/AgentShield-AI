"""Tool executor interfacing the Target Agent directly with Phase 2 mock tool services."""

from typing import Any
from backend.app.agents.target.schemas import StepResult, ToolCallProposal
from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger
from backend.app.security.actors import MockActor
from backend.app.security.audit import audit_service
from backend.app.tools.browser.service import mock_browser_service
from backend.app.tools.email.models import SendEmailRequest
from backend.app.tools.email.service import mock_email_service
from backend.app.tools.filesystem.models import FileCreateUpdateRequest
from backend.app.tools.filesystem.service import mock_filesystem_service
from backend.app.tools.payments.models import CreatePaymentPayload
from backend.app.tools.payments.service import mock_payment_service

logger = get_logger("agentra.agents.target.executor")


class ToolExecutor:
    """Executes validated tool proposals against verified mock tool services."""

    @classmethod
    async def execute(
        cls,
        actor: MockActor,
        proposal: ToolCallProposal,
        step_number: int,
    ) -> StepResult:
        tool = proposal.tool.lower().strip()
        action = proposal.action.lower().strip()
        params = proposal.parameters

        logger.info(
            "Executing step %d: %s:%s for actor %s",
            step_number,
            tool,
            action,
            actor.actor_id,
        )

        try:
            output = await cls._dispatch(actor, tool, action, params)
            # Record execution in audit logger
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool=tool,
                action=f"agent_exec:{action}",
                resource=str(params.get("raw_path") or params.get("path") or params.get("message_id") or params.get("url") or "general"),
                status="ALLOWED",
                details={"step": step_number, "tool": tool, "action": action},
            )
            return StepResult(
                step_number=step_number,
                tool=tool,
                action=action,
                parameters=params,
                policy_allowed=True,
                status="SUCCESS",
                output=output,
            )
        except AppException as e:
            logger.warning("Step %d execution error: %s (%s)", step_number, e.message, type(e).__name__)
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool=tool,
                action=f"agent_exec:{action}",
                resource="unknown",
                status="DENIED" if e.status_code == 403 else "FAILED",
                details={"step": step_number, "error": e.message},
            )
            return StepResult(
                step_number=step_number,
                tool=tool,
                action=action,
                parameters=params,
                policy_allowed=True,
                status="ERROR",
                error=e.message,
            )
        except Exception as e:
            logger.exception("Unexpected error in step %d: %s", step_number, str(e))
            return StepResult(
                step_number=step_number,
                tool=tool,
                action=action,
                parameters=params,
                policy_allowed=True,
                status="ERROR",
                error=f"Unexpected error: {str(e)}",
            )

    @classmethod
    async def _dispatch(cls, actor: MockActor, tool: str, action: str, params: dict) -> Any:
        # 1. Email Service
        if tool == "email":
            if action == "list_messages":
                res = mock_email_service.list_messages(
                    actor=actor,
                    folder=params.get("folder", "inbox"),
                    limit=params.get("limit", 50),
                    offset=params.get("offset", 0),
                )
                return res.model_dump()
            elif action == "read_message":
                msg_id = params.get("message_id") or params.get("id", "")
                res = mock_email_service.get_message(actor=actor, message_id=msg_id)
                return res.model_dump()
            elif action == "send_email":
                req = SendEmailRequest(
                    recipient=params.get("recipient", ""),
                    subject=params.get("subject", ""),
                    body=params.get("body", ""),
                )
                res = mock_email_service.send_message(actor=actor, request=req)
                return res.model_dump()

        # 2. Filesystem Service
        elif tool == "filesystem":
            if action == "list_files":
                res = mock_filesystem_service.list_files(actor=actor, folder=params.get("folder"))
                return res.model_dump()
            elif action == "read_file":
                raw_path = params.get("raw_path") or params.get("path", "")
                res = mock_filesystem_service.read_file(actor=actor, raw_path=raw_path)
                return res.model_dump()
            elif action == "write_file":
                req = FileCreateUpdateRequest(
                    path=params.get("path", ""),
                    content=params.get("content", ""),
                )
                res = mock_filesystem_service.create_or_update_file(actor=actor, request=req)
                return res.model_dump()

        # 3. Browser Service
        elif tool == "browser":
            if action == "list_pages":
                res = mock_browser_service.list_pages(actor=actor)
                return res.model_dump()
            elif action == "get_page":
                page_id = params.get("page_id") or params.get("id", "")
                res = mock_browser_service.get_page(actor=actor, page_id=page_id)
                return res.model_dump()
            elif action == "open_url":
                url = params.get("url", "")
                res = mock_browser_service.open_url(actor=actor, url=url)
                return res.model_dump()

        # 4. Payments Service
        elif tool == "payments":
            if action == "list_payments":
                res = mock_payment_service.list_payments(
                    actor=actor,
                    status=params.get("status"),
                    limit=params.get("limit", 50),
                    offset=params.get("offset", 0),
                )
                return res.model_dump()
            elif action == "get_payment":
                tx_id = params.get("transaction_id") or params.get("id", "")
                res = mock_payment_service.get_payment(actor=actor, transaction_id=tx_id)
                return res.model_dump()
            elif action == "create_payment_request":
                req = CreatePaymentPayload(
                    amount=params.get("amount", 0.0),
                    currency=params.get("currency", "USD"),
                    recipient=params.get("recipient", ""),
                    description=params.get("description", ""),
                )
                res = mock_payment_service.create_payment_request(actor=actor, payload=req)
                return res.model_dump()

        raise ValueError(f"Unknown action '{action}' for tool '{tool}'")

