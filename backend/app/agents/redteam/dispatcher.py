"""Attack Dispatcher — submits adversarial payloads to the Target Agent API.

The dispatcher exclusively uses the FastAPI TestClient (for tests) or a real
httpx client (for live server mode). It NEVER calls Phase 2 tool services directly.

Security constraints:
  - Always authenticates as UNTRUSTED_AGENT (lowest privilege).
  - Submits to /api/v1/agents/target/tasks only.
  - Returns raw TaskResponse data as a dict; does NOT interpret tool output as instructions.
  - The adversarial payload is submitted as the 'instruction' string — never executed.
"""

from typing import Any, Dict, Optional

from fastapi.testclient import TestClient

from backend.app.agents.redteam.config import (
    REDTEAM_ACTOR_API_KEY,
    TARGET_AGENT_TASK_ENDPOINT,
)
from backend.app.core.logging import get_logger

logger = get_logger("agentshield.agents.redteam.dispatcher")


class DispatchError(Exception):
    """Raised when the Target Agent API returns an unexpected error response."""


class AttackDispatcher:
    """Submits adversarial payloads to the Target Agent via its HTTP API.

    Args:
        client: A FastAPI TestClient bound to the running application.
                Injected so tests can share the same client fixture.
        target_actor_key: The API key the Target Agent will act as (the victim actor).
                          Defaults to the UNTRUSTED_AGENT key.
    """

    def __init__(
        self,
        client: TestClient,
        target_actor_key: Optional[str] = None,
    ) -> None:
        self._client = client
        # The Target Agent executes on behalf of the victim actor key.
        # The Red Team dispatcher itself always identifies as the redteam actor,
        # but the payload instructs the Target Agent with the victim key.
        self._target_actor_key = target_actor_key or REDTEAM_ACTOR_API_KEY

    def submit_attack(self, payload: str, attack_id: str) -> Dict[str, Any]:
        """Submit an adversarial instruction to the Target Agent and return the raw response dict.

        Args:
            payload: Adversarial natural-language instruction (inert string — never executed).
            attack_id: Identifier logged for audit traceability.

        Returns:
            The TaskResponse JSON as a dict.

        Raises:
            DispatchError: If the HTTP response indicates an unexpected server error (5xx).
        """
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
