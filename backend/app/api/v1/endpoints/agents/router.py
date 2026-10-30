"""Agents master router mounting AI agent endpoints."""

from fastapi import APIRouter
from backend.app.api.v1.endpoints.agents import target, redteam, guardian

agents_router = APIRouter(prefix="/agents")

# Mount Target Agent endpoints (Phase 3)
agents_router.include_router(target.router)

# Mount Red Team Agent endpoints (Phase 4)
agents_router.include_router(redteam.router)

# Mount Blue Team Guardian endpoints (Phase 5)
agents_router.include_router(guardian.router)

