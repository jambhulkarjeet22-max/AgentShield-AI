"""Langfuse Observability & Tracing Service for AgentShield AI.

Provides multi-agent telemetry, LLM generation tracking, security guardrail scoring,
and evaluation metrics to the Langfuse Cloud platform.
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("agentshield.services.langfuse")

_langfuse_instance = None
_initialized = False


def get_langfuse() -> Optional[Any]:
    """Return the active Langfuse client instance or None if disabled/unconfigured."""
    global _langfuse_instance, _initialized
    if _initialized:
        return _langfuse_instance

    import sys
    if settings.is_testing or "pytest" in sys.modules:
        _initialized = True
        return None

    if not settings.LANGFUSE_ENABLED:
        logger.info("Langfuse tracing is disabled via configuration.")
        _initialized = True
        return None

    secret_key = settings.LANGFUSE_SECRET_KEY
    public_key = settings.LANGFUSE_PUBLIC_KEY
    host = settings.LANGFUSE_HOST or settings.LANGFUSE_BASE_URL or "https://cloud.langfuse.com"

    if not secret_key or not public_key:
        logger.warning("Langfuse keys missing; tracing disabled.")
        _initialized = True
        return None

    try:
        from langfuse import Langfuse

        _langfuse_instance = Langfuse(
            secret_key=secret_key,
            public_key=public_key,
            host=host,
        )
        logger.info("Langfuse client successfully initialized for host: %s", host)
    except Exception as exc:
        logger.warning("Failed to initialize Langfuse client: %s", exc)
        _langfuse_instance = None

    _initialized = True
    return _langfuse_instance


class LangfuseService:
    """High-level tracing and evaluation operations for AgentShield."""

    @classmethod
    def get_langfuse(cls) -> Optional[Any]:
        """Accessor for underlying Langfuse client."""
        return get_langfuse()

    @classmethod
    def is_active(cls) -> bool:
        """Check if Langfuse client is currently active."""
        client = get_langfuse()
        return client is not None

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Return diagnostic status of Langfuse integration."""
        client = get_langfuse()
        host = settings.LANGFUSE_HOST or settings.LANGFUSE_BASE_URL or "https://cloud.langfuse.com"
        pk = settings.LANGFUSE_PUBLIC_KEY
        pk_hint = (pk[:10] + "..." + pk[-4:]) if pk and len(pk) > 14 else (pk or "None")

        return {
            "enabled": settings.LANGFUSE_ENABLED,
            "configured": client is not None,
            "host": host,
            "public_key_hint": pk_hint,
            "dashboard_url": host,
            "traces_url": f"{host.rstrip('/')}/traces",
        }

    @classmethod
    def flush(cls) -> None:
        """Flush pending traces to Langfuse backend."""
        client = get_langfuse()
        if client:
            try:
                client.flush()
            except Exception as e:
                logger.debug("Langfuse flush warning: %s", e)

    @classmethod
    def trace_guardian_evaluation(
        cls,
        *,
        actor_id: str,
        role: str,
        task_id: str,
        step_number: int,
        proposal: Any,
        verdict: Any,
        instruction: str = "",
    ) -> None:
        """Record Blue Team Guardian security decision as an observable guardrail trace."""
        client = get_langfuse()
        if not client:
            return

        try:
            from langfuse import propagate_attributes

            tool_name = getattr(proposal, "tool", "unknown")
            action_name = getattr(proposal, "action", "unknown")
            params = getattr(proposal, "parameters", {})
            decision_val = getattr(verdict, "verdict", None)
            decision_str = getattr(decision_val, "value", str(decision_val))
            risk_score = getattr(verdict, "risk_score", 0)
            explanation = getattr(verdict, "explanation", "")

            # Observability tag set
            tags = ["guardian", "security-policy", f"tool:{tool_name}"]
            if decision_str == "ALLOW":
                tags.append("verdict:allow")
            else:
                tags.append("verdict:block")

            metadata = {
                "task_id": task_id,
                "step_number": step_number,
                "role": role,
                "tool": tool_name,
                "action": action_name,
                "parameters": params,
                "risk_score": risk_score,
                "explanation": explanation,
                "intent_alignment": getattr(verdict, "intent_alignment", "UNKNOWN"),
            }

            if hasattr(verdict, "ml_advisory") and verdict.ml_advisory:
                metadata["ml_advisory"] = {
                    "is_injection": verdict.ml_advisory.is_injection,
                    "probability": verdict.ml_advisory.probability,
                    "confidence": verdict.ml_advisory.confidence,
                }

            # Create trace and attach scores within active observation span
            with propagate_attributes(
                user_id=actor_id,
                session_id=task_id,
                tags=tags,
                trace_name=f"guardian:eval:{tool_name}:{action_name}",
                metadata=metadata,
            ):
                with client.start_as_current_observation(
                    name=f"guardian:eval:{tool_name}:{action_name}",
                    as_type="guardrail",
                    input={
                        "actor_id": actor_id,
                        "instruction": instruction,
                        "proposal": {"tool": tool_name, "action": action_name, "parameters": params},
                    },
                    output={
                        "verdict": decision_str,
                        "risk_score": risk_score,
                        "explanation": explanation,
                    },
                    metadata=metadata,
                ):
                    score_val = 1.0 if decision_str == "ALLOW" else 0.0
                    client.score_current_trace(
                        name="guardrail_verdict",
                        value=score_val,
                        comment=f"Guardian decision: {decision_str}. {explanation[:120]}",
                    )
                    client.score_current_trace(
                        name="risk_score",
                        value=float(risk_score),
                        comment=f"Calculated composite risk score: {risk_score}/100",
                    )

        except Exception as e:
            logger.debug("Failed to record Langfuse guardian trace: %s", e)

    @classmethod
    def trace_campaign_summary(
        cls,
        *,
        campaign: Any,
        results: List[Any],
    ) -> None:
        """Trace a Red Team adversarial campaign execution and attach overall defense scores."""
        client = get_langfuse()
        if not client:
            return

        try:
            from langfuse import propagate_attributes

            campaign_id = getattr(campaign, "campaign_id", "unknown")
            campaign_name = getattr(campaign, "campaign_name", "Adversarial Campaign")
            launched_by = getattr(campaign, "launched_by", "admin")
            total = getattr(campaign, "total_attacks", len(results))
            defended = getattr(campaign, "defences_held", sum(1 for r in results if getattr(r, "defended", False)))
            breached = getattr(campaign, "attacks_landed", total - defended)

            defense_rate = (defended / total) if total > 0 else 1.0

            cats = [getattr(c, "value", str(c)) for c in getattr(campaign, "categories", [])]
            tags = ["redteam", "campaign", f"defended:{defended}", f"breached:{breached}"] + cats

            metadata = {
                "campaign_id": campaign_id,
                "campaign_name": campaign_name,
                "total_attacks": total,
                "defences_held": defended,
                "attacks_landed": breached,
                "categories": cats,
                "started_at": getattr(campaign, "started_at", None),
                "completed_at": getattr(campaign, "completed_at", None),
            }

            with propagate_attributes(
                user_id=launched_by,
                session_id=campaign_id,
                tags=tags,
                trace_name=f"redteam:campaign:{campaign_name}",
                metadata=metadata,
            ):
                with client.start_as_current_observation(
                    name=f"redteam:campaign:{campaign_name}",
                    as_type="agent",
                    input={
                        "campaign_name": campaign_name,
                        "categories": cats,
                        "launched_by": launched_by,
                    },
                    output={
                        "total_attacks": total,
                        "defences_held": defended,
                        "attacks_landed": breached,
                        "defense_rate": defense_rate,
                    },
                    metadata=metadata,
                ):
                    client.score_current_trace(
                        name="defense_rate",
                        value=defense_rate,
                        comment=f"Overall Red vs Blue defense rate: {defended}/{total} attacks neutralized.",
                    )
                    client.score_current_trace(
                        name="breaches_prevented",
                        value=float(defended),
                        comment=f"Total attacks successfully blocked by Guardian: {defended}",
                    )

            cls.flush()
        except Exception as e:
            logger.debug("Failed to record Langfuse campaign trace: %s", e)

    @classmethod
    def trace_llm_generation(
        cls,
        *,
        model: str,
        system_prompt: str,
        user_prompt: str,
        output_content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Trace an LLM inference call as an observable generation."""
        client = get_langfuse()
        if not client:
            return

        try:
            from langfuse import propagate_attributes

            with propagate_attributes(
                tags=["target-agent", "llm-inference", f"model:{model}"],
                trace_name=f"llm:generate:{model}",
                metadata=metadata or {},
            ):
                with client.start_as_current_observation(
                    name=f"chat-completion-{model}",
                    as_type="generation",
                    model=model,
                    input=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    output=output_content,
                    metadata=metadata or {},
                ):
                    pass
        except Exception as e:
            logger.debug("Failed to record Langfuse LLM generation trace: %s", e)


langfuse_service = LangfuseService
