"""Agents master router mounting AI agent endpoints."""

from fastapi import APIRouter
from backend.app.api.v1.endpoints.agents import target, redteam

agents_router = APIRouter(prefix="/agents")

# Mount Target Agent endpoints (Phase 3)
agents_router.include_router(target.router)

# Mount Red Team Agent endpoints (Phase 4)
agents_router.include_router(redteam.router)

