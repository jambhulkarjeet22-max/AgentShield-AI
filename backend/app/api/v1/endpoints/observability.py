"""Langfuse Observability & Agent Tracing API Endpoints."""

from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from backend.app.services.langfuse_service import langfuse_service

router = APIRouter(prefix="/observability", tags=["Observability"])


class ObservabilityStatusResponse(BaseModel):
    """Schema for Langfuse observability status."""

    enabled: bool = Field(description="Whether Langfuse tracing is enabled")
    configured: bool = Field(description="Whether valid keys are configured and client is initialized")
    host: str = Field(description="Langfuse backend host")
    public_key_hint: str = Field(description="Masked public key identifier")
    dashboard_url: str = Field(description="URL to the Langfuse Cloud dashboard")
    traces_url: str = Field(description="Direct URL to view traces")
    timestamp: str = Field(description="Current server timestamp")


@router.get(
    "/status",
    response_model=ObservabilityStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Langfuse Observability Status",
    description="Check the connectivity and configuration status of Langfuse LLM/Agent tracing.",
)
async def get_observability_status() -> ObservabilityStatusResponse:
    """Return live status of the Langfuse integration."""
    st = langfuse_service.get_status()
    return ObservabilityStatusResponse(
        enabled=st["enabled"],
        configured=st["configured"],
        host=st["host"],
        public_key_hint=st["public_key_hint"],
        dashboard_url=st["dashboard_url"],
        traces_url=st["traces_url"],
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post(
    "/flush",
    status_code=status.HTTP_200_OK,
    summary="Flush Traces",
    description="Forces immediate transmission of all pending Langfuse traces.",
)
async def flush_traces() -> Dict[str, Any]:
    """Force flush pending traces."""
    langfuse_service.flush()
    return {"status": "ok", "message": "Flushed Langfuse trace queue."}


@router.post(
    "/test",
    status_code=status.HTTP_200_OK,
    summary="Send Heartbeat Test Trace",
    description="Generates an on-demand heartbeat verification trace and transmits it to Langfuse.",
)
async def send_test_trace() -> Dict[str, Any]:
    """Emit a test verification trace to Langfuse Cloud."""
    client = langfuse_service.get_langfuse()
    if not client:
        return {"status": "disabled", "message": "Langfuse client is not initialized or configured."}

    try:
        from langfuse import propagate_attributes

        now_str = datetime.now(timezone.utc).isoformat()
        with propagate_attributes(
            user_id="admin-001",
            tags=["manual-test", "heartbeat", "agentra"],
            trace_name="agentra:heartbeat:ping",
            metadata={"source": "api_test_endpoint", "timestamp": now_str},
        ):
            client.score_current_trace(
                name="heartbeat_status",
                value=1.0,
                comment=f"Manual heartbeat verification ping from Agentra at {now_str}",
            )
        langfuse_service.flush()
        return {"status": "success", "message": "Heartbeat trace sent to Langfuse Cloud.", "timestamp": now_str}
    except Exception as e:
        return {"status": "error", "message": str(e)}

