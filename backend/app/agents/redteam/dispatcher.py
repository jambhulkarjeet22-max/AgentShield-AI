"""Attack Dispatcher — submits adversarial payloads to the Target Agent API or directly in-process.

Security constraints:
  - Always authenticates as UNTRUSTED_AGENT or the configured victim actor.
  - Submits to /api/v1/agents/target/tasks (HTTP) or TargetAgentOrchestrator.run_task (in-process).
  - Returns raw TaskResponse data as a dict; does NOT interpret tool output as instructions.
  - The adversarial payload is submitted as the 'instruction' string — never executed.
"""

from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:
    from fastapi.testclient import TestClient

from backend.app.agents.redteam.config import (
    REDTEAM_ACTOR_API_KEY,
    TARGET_AGENT_TASK_ENDPOINT,
)
from backend.app.core.logging import get_logger

logger = get_logger("agentra.agents.redteam.dispatcher")


class DispatchError(Exception):
    """Raised when the Target Agent API returns an unexpected error response."""


class AttackDispatcher:
    """Submits adversarial payloads to the Target Agent via HTTP or in-process.

    Args:
        client: Optional FastAPI TestClient bound to the running application (for tests).
        target_actor_key: The API key the Target Agent will act as (the victim actor).
                          Defaults to the REDTEAM_ACTOR_API_KEY.
    """

    def __init__(
        self,
        client: Optional[TestClient] = None,
        target_actor_key: Optional[str] = None,
    ) -> None:
        self._client = client
        # The Target Agent executes on behalf of the victim actor key.
        # The Red Team dispatcher itself always identifies as the redteam actor,
        # but the payload instructs the Target Agent with the victim key.
        self._target_actor_key = target_actor_key or REDTEAM_ACTOR_API_KEY

    async def submit_attack_async(self, payload: str, attack_id: str) -> Dict[str, Any]:
        """Submit an adversarial instruction asynchronously directly to the Target Agent in-process.

        Avoids nested TestClient lifecycles, event loop deadlocks, and ECONNRESET errors
        when running inside an active ASGI server like Uvicorn.
        """
        logger.info(
            "Dispatching attack %s -> Target Agent in-process (victim key: %s...)",
            attack_id,
            self._target_actor_key[:12],
        )

        if self._client is not None:
            return self.submit_attack(payload, attack_id)

        from backend.app.agents.target.orchestrator import TargetAgentOrchestrator
        from backend.app.agents.target.schemas import TaskSubmissionRequest
        from backend.app.security.actors import get_mock_actor

        victim_actor = get_mock_actor(self._target_actor_key)
        if not victim_actor or not (
            victim_actor.has_permission("agent:submit") or victim_actor.has_permission("*")
        ):
            logger.warning(
                "Target actor %s lacks 'agent:submit' permission — rejecting at auth boundary.",
                getattr(victim_actor, "actor_id", "unknown"),
            )
            return {
                "http_status": 403,
                "body": {"detail": "Actor lacks permission 'agent:submit'"},
                "raw_text": "Forbidden: actor lacks agent:submit",
            }

        try:
            task_req = TaskSubmissionRequest(instruction=payload)
            task_res = await TargetAgentOrchestrator.run_task(actor=victim_actor, request=task_req)
            return {
                "http_status": 201,
                "body": task_res.model_dump(),
                "raw_text": task_res.model_dump_json(),
            }
        except Exception as exc:
            logger.exception("Target Agent execution error during attack %s: %s", attack_id, exc)
            raise DispatchError(f"Target Agent execution failed: {exc}") from exc

    def submit_attack(self, payload: str, attack_id: str) -> Dict[str, Any]:
        """Submit an adversarial instruction to the Target Agent via TestClient and return raw response dict.

        Args:
            payload: Adversarial natural-language instruction (inert string — never executed).
            attack_id: Identifier logged for audit traceability.

        Returns:
            The TaskResponse JSON as a dict.

        Raises:
            DispatchError: If the HTTP response indicates an unexpected server error (5xx).
        """
        if self._client is None:
            raise DispatchError("Cannot call synchronous submit_attack without an injected TestClient fixture.")

        logger.info(
            "Dispatching attack %s → Target Agent (victim key: %s...)",
            attack_id,
            self._target_actor_key[:12],
        )

        try:
            response = self._client.post(
                TARGET_AGENT_TASK_ENDPOINT,
                json={"instruction": payload},
                headers={"X-API-Key": self._target_actor_key},
            )
        except Exception as exc:
            raise DispatchError(
                f"HTTP client error during attack {attack_id}: {exc}"
            ) from exc

        # 4xx responses (auth / validation failures) are valid defence outcomes —
        # the evaluator handles them. Only 5xx is a genuine infrastructure failure.
        if response.status_code >= 500:
            raise DispatchError(
                f"Target Agent returned server error {response.status_code} for attack {attack_id}. "
                f"Body: {response.text[:300]}"
            )

        logger.info(
            "Attack %s received HTTP %d from Target Agent.",
            attack_id,
            response.status_code,
        )
        return {
            "http_status": response.status_code,
            "body": response.json() if response.status_code < 400 else {},
            "raw_text": response.text,
        }
