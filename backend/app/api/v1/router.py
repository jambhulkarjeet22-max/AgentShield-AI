"""API v1 master router."""

from fastapi import APIRouter
from backend.app.api.v1.endpoints import health
from backend.app.api.v1.endpoints.agents.router import agents_router
from backend.app.api.v1.endpoints.tools.router import tools_router

api_v1_router = APIRouter()

# Register endpoint routers
api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(tools_router)
api_v1_router.include_router(agents_router)
