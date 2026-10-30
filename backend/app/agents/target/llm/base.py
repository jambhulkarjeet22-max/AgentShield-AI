"""Abstract base interface for LLM planning and summarization providers."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from backend.app.agents.target.schemas import StepResult, ToolCallProposal


class BaseLLMProvider(ABC):
    """Abstract interface decoupling the Target Agent from specific LLM vendors."""

    @abstractmethod
    async def plan_task(
        self,
        instruction: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[ToolCallProposal]:
        """Decompose a natural language business instruction into structured tool proposals."""
        pass

    @abstractmethod
    async def summarize_results(
        self,
        instruction: str,
        steps: List[StepResult],
    ) -> str:
        """Synthesize collected tool results into a coherent final task summary."""
        pass

