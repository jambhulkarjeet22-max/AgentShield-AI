"""HTTP Client for communicating with the standalone ML Prompt Injection Prediction Microservice.

Provides fail-fast timeouts, graceful fallback when the service is offline or unreachable,
and structured inference results for Blue Team Guardian advisory evaluation.
"""

import time
from typing import Optional
import httpx
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("agentshield.services.ml_client")


class MLInferenceResult(BaseModel):
    """Structured result returned by the ML client, with fallback indicators."""

    available: bool = Field(
        default=True,
        description="Whether the ML service responded successfully",
    )
    is_suspicious: bool = Field(
        default=False,
        description="Boolean indicator of prompt injection suspicion",
    )
    probability: float = Field(
        default=0.0,
        description="Estimated probability of adversarial prompt injection (0.0 to 1.0)",
    )
    decision_margin: float = Field(
        default=0.0,
        description="Decision margin from the linear model (w^T * x + b)",
    )
    risk_score: float = Field(
        default=0.0,
        description="Risk score (0.0 to 100.0) from ML model",
    )
    label: str = Field(
        default="SAFE",
        description="Verdict label: SAFE, SUSPICIOUS, or UNAVAILABLE",
    )
    fallback_reason: Optional[str] = Field(
        default=None,
        description="Explanation if service was unavailable or fallback triggered",
    )
    latency_ms: float = Field(
        default=0.0,
        description="Round-trip inference latency in milliseconds",
    )


class MLClient:
    """Client for querying the ML prompt injection prediction service."""

    CIRCUIT_COOLDOWN_SECONDS: float = 10.0

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        transport: Optional[httpx.BaseTransport] = None,
    ):
        self.base_url = (base_url or settings.ML_SERVICE_URL).rstrip("/")
        if timeout_seconds is not None:
            self.timeout_seconds = timeout_seconds
        elif settings.is_testing:
            self.timeout_seconds = 0.1
        else:
            self.timeout_seconds = settings.ML_SERVICE_TIMEOUT_SECONDS
        self.transport = transport
        self._circuit_open_until: float = 0.0

    def reset_circuit_breaker(self) -> None:
        """Reset circuit breaker to attempt live queries immediately."""
        self._circuit_open_until = 0.0

    def predict(self, text: str) -> MLInferenceResult:
        """Submit text to ML microservice /predict endpoint with fail-safe fallback.

        If the ML microservice is unreachable, times out, or fails, returns an
        MLInferenceResult with available=False and zeroed scores so downstream
        security engines continue functioning deterministically without interruption.
        """
        if not settings.ML_SERVICE_ENABLED:
            return MLInferenceResult(
                available=False,
                label="DISABLED",
                fallback_reason="ML service is disabled in application configuration.",
            )

        now = time.time()
        if now < self._circuit_open_until:
            return MLInferenceResult(
                available=False,
                label="UNAVAILABLE",
                fallback_reason="Circuit breaker: ML service is temporarily offline.",
            )

        if not text or not text.strip():
            return MLInferenceResult(
                available=True,
                is_suspicious=False,
                probability=0.0,
                decision_margin=-5.0,
                risk_score=0.0,
                label="SAFE",
            )

        start_time = time.perf_counter()
        target_url = f"{self.base_url}/predict"

        try:
            with httpx.Client(
                timeout=httpx.Timeout(self.timeout_seconds),
                transport=self.transport,
            ) as client:
                response = client.post(
                    target_url,
                    json={"text": text},
                )

            latency = round((time.perf_counter() - start_time) * 1000, 2)

            if response.status_code == 200:
                data = response.json()
                prob = float(data.get("calibrated_probability", data.get("probability", 0.0)))
                margin = float(data.get("decision_margin", 0.0))
                is_suspicious = bool(data.get("is_suspicious", False))
                label = str(data.get("label", "SAFE"))
                risk_score = float(data.get("risk_score", 0.0))

                return MLInferenceResult(
                    available=True,
                    is_suspicious=is_suspicious,
                    probability=prob,
                    decision_margin=margin,
                    risk_score=risk_score,
                    label=label,
                    latency_ms=latency,
                )

            logger.warning(
                "ML service returned non-200 status (%d): %s. Falling back to deterministic guardrails.",
                response.status_code,
                response.text[:200],
            )
            return MLInferenceResult(
                available=False,
                label="UNAVAILABLE",
                fallback_reason=f"ML service returned HTTP {response.status_code}",
                latency_ms=latency,
            )

        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            self._circuit_open_until = time.time() + self.CIRCUIT_COOLDOWN_SECONDS
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            logger.warning(
                "ML service connection failed at %s (%s). Circuit breaker opened for %.0fs. Falling back gracefully.",
                target_url,
                type(exc).__name__,
                self.CIRCUIT_COOLDOWN_SECONDS,
            )
            return MLInferenceResult(
                available=False,
                label="UNAVAILABLE",
                fallback_reason=f"Connection failure: {type(exc).__name__}",
                latency_ms=latency,
            )

        except httpx.TimeoutException as exc:
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            logger.warning(
                "ML service request timed out after %.2fs. Falling back gracefully.",
                self.timeout_seconds,
            )
            return MLInferenceResult(
                available=False,
                label="TIMEOUT",
                fallback_reason=f"Inference timed out after {self.timeout_seconds:.1f}s",
                latency_ms=latency,
            )

        except Exception as exc:
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            logger.warning(
                "Unexpected error querying ML service: %s. Falling back gracefully.",
                exc,
            )
            return MLInferenceResult(
                available=False,
                label="ERROR",
                fallback_reason=f"Unexpected client exception: {str(exc)}",
                latency_ms=latency,
            )


# Global default client instance
_default_ml_client: Optional[MLClient] = None


def get_ml_client() -> MLClient:
    """Return the global MLClient instance."""
    global _default_ml_client
    if _default_ml_client is None:
        _default_ml_client = MLClient()
    return _default_ml_client


def set_ml_client(client: Optional[MLClient]) -> None:
    """Override the global MLClient instance (useful for test mocks and fixtures)."""
    global _default_ml_client
    _default_ml_client = client
