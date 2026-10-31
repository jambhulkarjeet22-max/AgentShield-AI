"""OpenAI-compatible external LLM provider using existing httpx client."""

import json
from typing import Any, Dict, List, Optional
import httpx

from backend.app.agents.target.config import TARGET_AGENT_TOOLS_CATALOG
from backend.app.agents.target.llm.base import BaseLLMProvider
from backend.app.agents.target.schemas import StepResult, ToolCallProposal
from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("agentshield.agents.target.openai_provider")


class OpenAICompatibleProvider(BaseLLMProvider):
    """Integrates with OpenAI-compatible chat completion endpoints."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or settings.LLM_API_KEY
        self.base_url = (base_url or settings.LLM_BASE_URL or "https://api.openai.com/v1").rstrip("/")
        self.model = model or settings.LLM_MODEL or "gpt-4o-mini"

    async def plan_task(
        self,
        instruction: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[ToolCallProposal]:
        """Send prompt to LLM and parse JSON tool proposals."""
        if not self.api_key:
            raise ValueError("LLM_API_KEY is not configured for external OpenAI provider")

        system_prompt = (
            "You are the Target Business AI Agent in AgentShield AI.\n"
            "Your role is to plan legitimate business workflows using ONLY the provided mock tools.\n"
            "Respond ONLY with a JSON array of tool call proposals: "
            '[{"tool": "...", "action": "...", "parameters": {...}}].\n'
            f"Available tools catalog:\n{json.dumps(TARGET_AGENT_TOOLS_CATALOG, indent=2)}"
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        user_prompt = f"Task: {instruction}\nContext: {json.dumps(context or {})}"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.0,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"].strip()

        # Send LLM generation trace to Langfuse
        try:
            from backend.app.services.langfuse_service import langfuse_service
            langfuse_service.trace_llm_generation(
                model=self.model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_content=content,
                metadata={"usage": data.get("usage", {})},
            )
        except Exception:
            pass

        # Clean json backticks if present
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        parsed = json.loads(content)
        if not isinstance(parsed, list):
            raise ValueError("Expected a JSON array of tool proposals from LLM")

        return [ToolCallProposal(**item) for item in parsed]

    async def summarize_results(
        self,
        instruction: str,
        steps: List[StepResult],
    ) -> str:
        """Ask LLM to synthesize final task summary."""
        if not self.api_key:
            return f"Completed {len(steps)} steps for instruction: '{instruction}'."

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        steps_summary = [
            {"step": s.step_number, "action": f"{s.tool}:{s.action}", "status": s.status, "output": s.output}
            for s in steps
        ]
        system_prompt = "You are a cybersecurity reporting assistant. Summarize the steps concisely."
        user_prompt = f"Original Instruction: {instruction}\nSteps: {json.dumps(steps_summary, default=str)}"
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            summary = data["choices"][0]["message"]["content"].strip()

            # Send LLM summarization trace to Langfuse
            try:
                from backend.app.services.langfuse_service import langfuse_service
                langfuse_service.trace_llm_generation(
                    model=self.model,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    output_content=summary,
                    metadata={"usage": data.get("usage", {})},
                )
            except Exception:
                pass

            return summary
