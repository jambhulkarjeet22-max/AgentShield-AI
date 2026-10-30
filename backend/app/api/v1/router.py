"""API v1 master router."""

from fastapi import APIRouter
from backend.app.api.v1.endpoints import health

api_v1_router = APIRouter()

# Register endpoint routers
api_v1_router.include_router(health.router, tags=["Health"])

