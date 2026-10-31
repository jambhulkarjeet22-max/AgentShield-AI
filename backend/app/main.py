"""AgentShield AI - FastAPI Application Entry Point.

Autonomous Multi-Agent Cybersecurity Defence System (Red Team vs Blue Team).
"""

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.endpoints.health import HealthResponse, get_health
from backend.app.api.v1.router import api_v1_router
from backend.app.core.config import settings
from backend.app.core.exceptions import register_exception_handlers
from backend.app.core.logging import get_logger, setup_logging

logger = get_logger("agentshield.main")


class RequestLoggingMiddleware:
    """Pure ASGI middleware for structured request and latency logging."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                process_time_ms = (time.perf_counter() - start_time) * 1000
                headers = list(message.get("headers", []))
                headers.append((b"x-process-time-ms", f"{process_time_ms:.2f}".encode()))
                message["headers"] = headers

                path = scope.get("path", "")
                is_health = path.endswith("/health")
                if not is_health or settings.DEBUG:
                    status_code = message.get("status", 200)
                    logger.info(
                        "HTTP %s %s completed %d in %.2fms",
                        scope.get("method", "GET"),
                        path,
                        status_code,
                        process_time_ms,
                        extra={
                            "method": scope.get("method", "GET"),
                            "path": path,
                            "status_code": status_code,
                            "duration_ms": round(process_time_ms, 2),
                        },
                    )
            await send(message)

        await self.app(scope, receive, send_wrapper)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan management for startup and graceful shutdown."""
    setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
    logger.info(
        "Starting %s v%s in %s environment (debug=%s)",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.APP_ENV,
        settings.DEBUG,
    )
    # Ensure database schema is initialized (SQLite zero-config fallback or relational DB)
    try:
        from backend.app.db.base import Base
        import backend.app.db.models  # noqa: F401 - registers all SQLAlchemy models
        from backend.app.db.session import get_engine
        engine = get_engine()
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema verified and tables initialized successfully.")
    except Exception as exc:
        logger.warning("Database table initialization check: %s", exc)

    try:
        from backend.app.services.langfuse_service import langfuse_service
        if langfuse_service.is_active():
            logger.info("Langfuse Observability initialized and active.")
    except Exception as lf_err:
        logger.warning("Langfuse startup notice: %s", lf_err)

    yield
    try:
        from backend.app.services.langfuse_service import langfuse_service
        langfuse_service.flush()
    except Exception:
        pass
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
