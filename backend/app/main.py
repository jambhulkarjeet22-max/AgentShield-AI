"""AgentShield AI - FastAPI Application Entry Point.

Autonomous Multi-Agent Cybersecurity Defence System (Red Team vs Blue Team).
"""

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.api.v1.endpoints.health import HealthResponse, get_health
from backend.app.api.v1.router import api_v1_router
from backend.app.core.config import settings
from backend.app.core.exceptions import register_exception_handlers
from backend.app.core.logging import get_logger, setup_logging

logger = get_logger("agentshield.main")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for structured request and latency logging."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        response: Response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000

        # Inject latency header
        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"

        # Avoid polluting logs for repetitive health check probes in non-debug mode
        is_health = request.url.path.endswith("/health")
        if not is_health or settings.DEBUG:
            logger.info(
                "HTTP %s %s completed %d in %.2fms",
                request.method,
                request.url.path,
                response.status_code,
                process_time_ms,
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(process_time_ms, 2),
                },
            )

        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan management for startup and graceful shutdown."""
    # Startup
    setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
    logger.info(
        "Starting %s v%s in %s environment (debug=%s)",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.APP_ENV,
        settings.DEBUG,
    )
    yield
    # Shutdown
    logger.info("Shutting down %s", settings.APP_NAME)


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "AgentShield AI - Autonomous Multi-Agent Cybersecurity Defence System. "
            "Simulating dynamic Red Team vs Blue Team scenarios in isolated mock environments."
        ),
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    # 1. Register Centralized Exception Handlers
    register_exception_handlers(app)

    # 2. Add CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )

    # 3. Add Request Logging Middleware
    app.add_middleware(RequestLoggingMiddleware)

    # 4. Root Health Endpoint (Direct GET /health requirement)
    app.add_api_route(
        "/health",
        get_health,
        methods=["GET"],
        response_model=HealthResponse,
        summary="Root Health Check",
        tags=["System"],
    )

    # 5. Root Welcome & Meta Endpoint
    @app.get(
        "/",
        summary="Service Root",
        tags=["System"],
        status_code=status.HTTP_200_OK,
    )
    async def root():
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.APP_ENV,
            "status": "operational",
            "docs": "/docs" if not settings.is_production else None,
            "api_v1": settings.API_V1_PREFIX,
        }

    # 6. Mount Versioned API Routes (/api/v1)
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

