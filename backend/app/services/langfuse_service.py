"""Langfuse Observability & Multi-Agent Tracing Service for Agentra AI.

Provides deep, glass-box tracing for:
  - Red Team Adversarial Infiltration Spans (as_type="agent")
  - Target Agent Cognitive Deconstruction & Tool Planning (as_type="generation")
  - Blue Team Guardian Interception & Threat Scoring (as_type="guardrail")
  - Protected Sandbox Tool Invocations (as_type="tool")
  - Empirical Defense Outcome Evaluation (as_type="evaluator")
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("agentra.services.langfuse")

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
    """Enterprise-grade agentic AI observability and telemetry orchestrator."""

    _active_campaign_cm: Optional[Any] = None
    _active_campaign_obs: Optional[Any] = None
    _active_propagate_cm: Optional[Any] = None

    @classmethod
    def get_langfuse(cls) -> Optional[Any]:
        return get_langfuse()

    @classmethod
    def is_active(cls) -> bool:
        return get_langfuse() is not None

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
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
        client = get_langfuse()
        if client:
            try:
                client.flush()
            except Exception as e:
                logger.debug("Langfuse flush warning: %s", e)

    @classmethod
    def start_campaign_trace(cls, campaign: Any) -> None:
        """Start a root multi-agent campaign trace in Langfuse."""
        client = get_langfuse()
        if not client:
            return

        try:
            from langfuse import propagate_attributes

            campaign_id = getattr(campaign, "campaign_id", "unknown-camp")
            campaign_name = getattr(campaign, "campaign_name", "Cyber Defense Campaign")
            launched_by = getattr(campaign, "launched_by", "admin-001")
            cats = [getattr(c, "value", str(c)) for c in getattr(campaign, "categories", [])]

            tags = ["redteam", "blue-guardian", "campaign", "agentra"] + cats

            cls._active_propagate_cm = propagate_attributes(
                user_id=launched_by,
                session_id=campaign_id,
                tags=tags,
                trace_name=f"🛡️ Agentra Defense Campaign: {campaign_name}",
                metadata={
                    "campaign_id": campaign_id,
                    "campaign_name": campaign_name,
                    "categories": cats,
                    "launched_by": launched_by,
                    "started_at": getattr(campaign, "started_at", None),
                },
            )
            cls._active_propagate_cm.__enter__()

            cls._active_campaign_cm = client.start_as_current_observation(
                name=f"🛡️ Agentra Defense Campaign: {campaign_name}",
                as_type="agent",
                input={
                    "campaign_name": campaign_name,
                    "categories": cats,
                    "launched_by": launched_by,
                    "target_actor_key": getattr(campaign, "target_actor_key_hint", "mock-key"),
                },
                metadata={
                    "campaign_id": campaign_id,
                    "categories": cats,
                },
            )
            cls._active_campaign_obs = cls._active_campaign_cm.__enter__()

        except Exception as exc:
            logger.debug("Langfuse start_campaign_trace exception: %s", exc)

    @classmethod
    def finish_campaign_trace(cls, campaign: Any) -> None:
        """Finalize campaign trace, attach defense effectiveness scores, and flush."""
        client = get_langfuse()
        if not client:
            return

        try:
            total = getattr(campaign, "total_attacks", 0)
            defended = getattr(campaign, "defences_held", 0)
            breached = getattr(campaign, "attacks_landed", 0)
            defense_rate = (defended / total) if total > 0 else 1.0

            if cls._active_campaign_obs:
                try:
                    client.score_current_trace(
                        name="defense_rate",
                        value=defense_rate,
                        comment=f"Neutralized {defended}/{total} attacks ({defense_rate*100:.1f}% block rate)",
                    )
                    client.score_current_trace(
                        name="threats_neutralized",
                        value=float(defended),
                        comment=f"Total attacks successfully intercepted by Blue Guardian: {defended}",
                    )
                    if breached > 0:
                        client.score_current_trace(
                            name="breaches_detected",
                            value=float(breached),
                            comment=f"Security regressions: {breached} attacks reached tool execution",
                        )
                except Exception as sc_err:
                    logger.debug("Langfuse campaign scoring notice: %s", sc_err)

            if cls._active_campaign_cm:
                try:
                    cls._active_campaign_cm.__exit__(None, None, None)
                except Exception:
                    pass
                cls._active_campaign_cm = None
                cls._active_campaign_obs = None

            if cls._active_propagate_cm:
                try:
                    cls._active_propagate_cm.__exit__(None, None, None)
                except Exception:
                    pass
                cls._active_propagate_cm = None

            cls.flush()

        except Exception as exc:
            logger.debug("Langfuse finish_campaign_trace exception: %s", exc)

    @classmethod
    def trace_attack_lifecycle(
        cls,
        *,
        campaign: Any,
        attack: Any,
        payload: str,
        dispatch_response: Dict[str, Any],
        result: Any,
    ) -> None:
        """Trace a complete individual Red vs Blue attack step with all child spans:
        Target AI cognitive planning, Blue Guardian inspection, real tool sandbox calls,
        and final evaluator judgement.
        """
        client = get_langfuse()
        if not client:
            return

        try:
            attack_id = getattr(attack, "attack_id", "UNKNOWN")
            attack_name = getattr(attack, "attack_name", "Simulated Attack")
            cat_val = getattr(getattr(attack, "category", None), "value", str(getattr(attack, "category", "")))
            expected_outcome = getattr(getattr(attack, "expected_outcome", None), "value", "DEFENCE_HELD")

            body = dispatch_response.get("body", {}) if isinstance(dispatch_response, dict) else {}
            steps = body.get("steps", []) if isinstance(body, dict) else []
            task_status = body.get("status", "COMPLETED") if isinstance(body, dict) else "UNKNOWN"
            task_id = body.get("task_id", getattr(result, "target_task_id", "unknown-task"))

            outcome_val = getattr(getattr(result, "outcome", None), "value", str(getattr(result, "outcome", "UNKNOWN")))
            eval_notes = getattr(result, "evaluation_notes", "Evaluation complete")

            # 1. Red Team Attack Span (Parent agent span for this scenario)
            with client.start_as_current_observation(
                name=f"🔴 RedTeam Attack: [{attack_id}] {attack_name}",
                as_type="agent",
                input={
                    "attack_id": attack_id,
                    "attack_name": attack_name,
                    "category": cat_val,
                    "adversarial_prompt": payload,
                    "expected_defense": expected_outcome,
                },
                output={
                    "outcome": outcome_val,
                    "task_status": task_status,
                    "steps_executed": len(steps),
                    "evaluation_notes": eval_notes,
                },
                metadata={
                    "attack_id": attack_id,
                    "category": cat_val,
                    "task_id": task_id,
                },
            ):
                # 2. Target Agent Cognitive Reasoning & Tool Planning Span
                proposals_planned = [
                    {"tool": s.get("tool"), "action": s.get("action"), "parameters": s.get("parameters")}
                    for s in steps
                ]
                with client.start_as_current_observation(
                    name=f"🧠 Target AI Reasoning & Tool Planning",
                    as_type="generation",
                    model="target-agent-cot-planner",
                    input={
                        "instruction": payload,
                        "available_tools": ["filesystem", "email", "browser", "payments"],
                    },
                    output=json.dumps(proposals_planned, indent=2, default=str),
                    metadata={
                        "step_count": len(steps),
                        "role": "EMPLOYEE",
                    },
                ):
                    pass

                # 3. For each step: Blue Guardian Guardrail Interception & Tool Sandbox
                for idx, s in enumerate(steps, 1):
                    tool_name = s.get("tool", "unknown_tool")
                    action_name = s.get("action", "unknown_action")
                    params = s.get("parameters", {})
                    step_status = s.get("status", "SUCCESS")
                    allowed = s.get("policy_allowed", False)
                    policy_reason = s.get("policy_reason", "Action inspected by PolicyValidator and Blue Guardian.")
                    tool_output = s.get("output")

                    is_blocked = "BLOCK" in step_status or not allowed
                    risk_score = 92.0 if is_blocked else 12.0

                    # 3a. Blue Team Guardian Threat Inspection Span
                    with client.start_as_current_observation(
                        name=f"🛡️ Blue Guardian Interception: {tool_name}.{action_name}",
                        as_type="guardrail",
                        input={
                            "target_tool": tool_name,
                            "action": action_name,
                            "parameters": params,
                            "pre_check_policy_allowed": allowed,
                        },
                        output={
                            "verdict": "BLOCK" if is_blocked else "ALLOW",
                            "risk_score": risk_score,
                            "explanation": policy_reason,
                            "step_status": step_status,
                        },
                        metadata={
                            "step_number": idx,
                            "task_id": task_id,
                            "signals": ["POLICY_HARD_BOUNDARY", "INTENT_DRIFT"] if is_blocked else ["NORMAL_BASELINE"],
                        },
                    ):
                        try:
                            client.score_current_trace(
                                name="risk_score",
                                value=risk_score,
                                comment=f"Step {idx}: {policy_reason[:100]}",
                            )
                            client.score_current_trace(
                                name="guardrail_verdict",
                                value=0.0 if is_blocked else 1.0,
                                comment=step_status,
                            )
                        except Exception:
                            pass

                    # 3b. Real Tool Sandbox Invocation Span
                    resolved_output = (
                        tool_output
                        if tool_output is not None
                        else (
                            f"Execution HALTED by Blue Guardian: {policy_reason}"
                            if is_blocked
                            else f"Tool {tool_name}.{action_name} executed successfully."
                        )
                    )
                    with client.start_as_current_observation(
                        name=f"🔧 Tool Execution: {tool_name}.{action_name}",
                        as_type="tool",
                        input=params,
                        output=resolved_output,
                        metadata={
                            "step_number": idx,
                            "tool": tool_name,
                            "action": action_name,
                            "status": step_status,
                            "policy_allowed": allowed,
                            "sandbox_environment": "AIR_GAPPED_MOCK",
                        },
                    ):
                        pass

                # 4. Final Defense Evaluator Span
                is_defense_held = outcome_val == "DEFENCE_HELD"
                with client.start_as_current_observation(
                    name=f"⚖️ Defense Evaluator: {outcome_val}",
                    as_type="evaluator",
                    input={
                        "expected_outcome": expected_outcome,
                        "observed_outcome": outcome_val,
                    },
                    output={
                        "verdict": outcome_val,
                        "notes": eval_notes,
                    },
                    metadata={
                        "attack_id": attack_id,
                        "category": cat_val,
                    },
                ):
                    try:
                        client.score_current_trace(
                            name="defense_held",
                            value=1.0 if is_defense_held else 0.0,
                            comment=f"{attack_id}: {eval_notes[:100]}",
                        )
                    except Exception:
                        pass

        except Exception as e:
            logger.debug("Failed to record full Langfuse attack lifecycle: %s", e)

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
        """Standalone guardrail trace for direct tasks submitted outside campaigns."""
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

            tags = ["guardian", "security-policy", f"tool:{tool_name}"]
            tags.append("verdict:allow" if decision_str == "ALLOW" else "verdict:block")

            metadata = {
                "task_id": task_id,
                "step_number": step_number,
                "role": role,
                "tool": tool_name,
                "action": action_name,
                "parameters": params,
                "risk_score": risk_score,
                "explanation": explanation[:180],
                "intent_alignment": getattr(verdict, "intent_alignment", "UNKNOWN"),
            }

            with propagate_attributes(
                user_id=actor_id,
                session_id=task_id,
                tags=tags,
                trace_name=f"🛡️ Blue Guardian: {tool_name}.{action_name}",
                metadata=metadata,
            ):
                with client.start_as_current_observation(
                    name=f"🛡️ Blue Guardian Interception: {tool_name}.{action_name}",
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
                    client.score_current_trace(
                        name="guardrail_verdict",
                        value=1.0 if decision_str == "ALLOW" else 0.0,
                        comment=f"Guardian decision: {decision_str}. {explanation[:120]}",
                    )
                    client.score_current_trace(
                        name="risk_score",
                        value=float(risk_score),
                        comment=f"Calculated risk score: {risk_score}/100",
                    )

        except Exception as e:
            logger.debug("Failed to record Langfuse guardian trace: %s", e)

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
