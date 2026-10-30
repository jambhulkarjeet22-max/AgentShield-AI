"""LLM provider subsystem for Target AI Agent."""

from backend.app.agents.target.llm.base import BaseLLMProvider
from backend.app.agents.target.llm.mock import DeterministicMockPlanner
from backend.app.agents.target.llm.openai import OpenAICompatibleProvider
from backend.app.core.config import settings


def get_llm_provider() -> BaseLLMProvider:
    """Factory selecting the active LLM provider based on application configuration."""
    provider_name = settings.LLM_PROVIDER.lower().strip()
    if provider_name == "openai" and settings.LLM_API_KEY:
        return OpenAICompatibleProvider()
    return DeterministicMockPlanner()


__all__ = [
    "BaseLLMProvider",
    "DeterministicMockPlanner",
    "OpenAICompatibleProvider",
    "get_llm_provider",
]

