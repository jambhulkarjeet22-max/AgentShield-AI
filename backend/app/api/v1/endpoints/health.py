"""System health check endpoint."""

from datetime import datetime, timezone
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from backend.app.core.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str = Field(default="healthy", description="Current service health status")
    app: str = Field(description="Application name")
    version: str = Field(description="Application version")
    environment: str = Field(description="Runtime environment")
    timestamp: str = Field(description="ISO-8601 UTC timestamp")


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health Check",
    description="Returns the operational health, version, and environment of Agentra AI.",
    tags=["System"],
)
async def get_health() -> HealthResponse:
    """Return system health status."""
    return HealthResponse(
        status="healthy",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

