"""Agents master router mounting AI agent endpoints."""

from fastapi import APIRouter
from backend.app.api.v1.endpoints.agents import target

agents_router = APIRouter(prefix="/agents")

# Mount Target Agent endpoints
agents_router.include_router(target.router)

