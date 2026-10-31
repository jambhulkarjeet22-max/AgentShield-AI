"""LLM provider subsystem for Target AI Agent."""

import socket
from urllib.parse import urlparse
from backend.app.agents.target.llm.base import BaseLLMProvider
from backend.app.agents.target.llm.mock import DeterministicMockPlanner
from backend.app.agents.target.llm.openai import OpenAICompatibleProvider
from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("agentra.agents.target.llm")


def _is_local_endpoint_open(url: str, timeout: float = 0.5) -> bool:
    """Check whether a localhost endpoint (like Ollama) is actively accepting connections."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def get_llm_provider() -> BaseLLMProvider:
    """Factory selecting the active LLM provider based on application configuration.

    If a local endpoint is configured (e.g. Ollama at localhost:11434) but the server
    is not currently running, automatically falls back to DeterministicMockPlanner
    to prevent campaign request timeouts and 500 internal server errors.
    """
    provider_name = settings.LLM_PROVIDER.lower().strip()
    if provider_name == "openai" and settings.LLM_API_KEY:
        base_url = (settings.LLM_BASE_URL or "https://api.openai.com/v1").rstrip("/")
        # If pointing to localhost (e.g. Ollama), test port reachability first
        if "localhost" in base_url or "127.0.0.1" in base_url:
            if not _is_local_endpoint_open(base_url):
                logger.warning(
                    "Local LLM server at %s is not reachable. Gracefully falling back to DeterministicMockPlanner.",
                    base_url,
                )
                return DeterministicMockPlanner()
        return OpenAICompatibleProvider()

    return DeterministicMockPlanner()


__all__ = [
    "BaseLLMProvider",
    "DeterministicMockPlanner",
    "OpenAICompatibleProvider",
    "get_llm_provider",
]
