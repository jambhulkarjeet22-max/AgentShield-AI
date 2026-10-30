"""Security Policy Validator enforcing strict deterministic guardrails before every tool call."""

from dataclasses import dataclass
from typing import Optional

from backend.app.agents.target.config import AVAILABLE_TOOLS, PROHIBITED_AUTONOMOUS_ACTIONS
from backend.app.agents.target.schemas import ToolCallProposal
from backend.app.core.logging import get_logger
from backend.app.security.actors import MockActor
from backend.app.tools.filesystem.service import sanitize_virtual_path

logger = get_logger("agentshield.agents.target.policy")


@dataclass(frozen=True)
class PolicyValidationResult:
    """Outcome of pre-execution policy inspection."""

    is_allowed: bool
    reason: Optional[str] = None


class PolicyValidator:
    """Central deterministic policy inspection layer for Target Agent tool calls."""

    @classmethod
    def validate_proposal(cls, actor: MockActor, proposal: ToolCallProposal) -> PolicyValidationResult:
        tool = proposal.tool.lower().strip()
        action = proposal.action.lower().strip()
        action_key = f"{tool}:{action}"

        # 1. Prohibited Autonomous Action Boundary
        # Autonomous agents can NEVER authorize payments or execute arbitrary system commands
        if action_key in PROHIBITED_AUTONOMOUS_ACTIONS or "authorize" in action:
            msg = (
                f"Security Policy Violation: Autonomous execution of '{action_key}' is strictly prohibited. "
                "Explicit human administrator authorization is required."
            )
            logger.warning("POLICY BLOCK: %s for actor %s", msg, actor.actor_id)
            return PolicyValidationResult(is_allowed=False, reason=msg)

        # 2. Unknown Tool / Action Verification
        if tool not in AVAILABLE_TOOLS:
            msg = f"Security Policy Violation: Tool '{tool}' is not an authorized mock cyber tool."
            logger.warning("POLICY BLOCK: %s", msg)
            return PolicyValidationResult(is_allowed=False, reason=msg)

        # 3. Tool-Specific Policy and Boundary Checks
        if tool == "filesystem":
            return cls._validate_filesystem(actor, action, proposal.parameters)
        elif tool == "email":
            return cls._validate_email(actor, action, proposal.parameters)
        elif tool == "browser":
            return cls._validate_browser(actor, action, proposal.parameters)
        elif tool == "payments":
            return cls._validate_payments(actor, action, proposal.parameters)

        return PolicyValidationResult(is_allowed=True)

    @classmethod
    def _validate_filesystem(cls, actor: MockActor, action: str, params: dict) -> PolicyValidationResult:
        if action == "write_file":
            path = params.get("path", "")
            try:
                clean_path = sanitize_virtual_path(path)
            except Exception as e:
                return PolicyValidationResult(
                    is_allowed=False,
                    reason=f"Filesystem path validation failed: {str(e)}",
                )

            # Enforce sandbox boundary: Target Agent can ONLY write to sandbox/
            if not clean_path.startswith("sandbox/"):
                return PolicyValidationResult(
                    is_allowed=False,
                    reason="Security Policy Violation: File writing is strictly confined to 'sandbox/'.",
                )

            # Check write permission
            if not (actor.has_permission("files:write_sandbox") or actor.has_permission("*")):
                return PolicyValidationResult(
                    is_allowed=False,
                    reason="Security Policy Violation: Actor lacks 'files:write_sandbox' permission.",
                )

        elif action == "read_file":
            raw_path = params.get("raw_path", "")
            try:
                clean_path = sanitize_virtual_path(raw_path)
            except Exception as e:
                return PolicyValidationResult(
                    is_allowed=False,
                    reason=f"Path traversal or invalid path blocked: {str(e)}",
                )

            # Sensitivity checks
            if clean_path.startswith("confidential/") and not (
                actor.has_permission("files:read_confidential") or actor.has_permission("*")
            ):
                return PolicyValidationResult(
                    is_allowed=False,
                    reason="Security Policy Violation: Actor lacks permission to inspect CONFIDENTIAL files.",
                )
            if clean_path.startswith("restricted/") and not (
                actor.has_permission("files:read_restricted") or actor.has_permission("*")
            ):
                return PolicyValidationResult(
                    is_allowed=False,
                    reason="Security Policy Violation: Actor lacks permission to inspect RESTRICTED files.",
                )

        return PolicyValidationResult(is_allowed=True)

    @classmethod
    def _validate_email(cls, actor: MockActor, action: str, params: dict) -> PolicyValidationResult:
        if action == "send_email":
            if not (actor.has_permission("email:send") or actor.has_permission("*")):
                return PolicyValidationResult(
                    is_allowed=False,
                    reason="Security Policy Violation: Actor lacks 'email:send' permission.",
                )
        elif action in ("read_message", "list_messages"):
            if not (actor.has_permission("email:read") or actor.has_permission("email:list") or actor.has_permission("*")):
                return PolicyValidationResult(
                    is_allowed=False,
                    reason="Security Policy Violation: Actor lacks email read/list permissions.",
                )
        return PolicyValidationResult(is_allowed=True)

    @classmethod
    def _validate_browser(cls, actor: MockActor, action: str, params: dict) -> PolicyValidationResult:
        if not (actor.has_permission("browser:open") or actor.has_permission("browser:list") or actor.has_permission("*")):
            return PolicyValidationResult(
                is_allowed=False,
                reason="Security Policy Violation: Actor lacks browser tool permissions.",
            )
        return PolicyValidationResult(is_allowed=True)

    @classmethod
    def _validate_payments(cls, actor: MockActor, action: str, params: dict) -> PolicyValidationResult:
        if action == "create_payment_request":
            if not (actor.has_permission("payments:create") or actor.has_permission("*")):
                return PolicyValidationResult(
                    is_allowed=False,
                    reason="Security Policy Violation: Actor lacks 'payments:create' permission.",
                )
        elif action in ("list_payments", "get_payment"):
            if not (actor.has_permission("payments:read") or actor.has_permission("payments:list") or actor.has_permission("*")):
                return PolicyValidationResult(
                    is_allowed=False,
                    reason="Security Policy Violation: Actor lacks payments read/list permissions.",
                )
        return PolicyValidationResult(is_allowed=True)

