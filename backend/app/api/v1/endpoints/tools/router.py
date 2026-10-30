"""Tools master router mounting all simulated cyber tool endpoints."""

from fastapi import APIRouter

from backend.app.api.v1.endpoints.tools import audit, browser, email, files, payments

tools_router = APIRouter(prefix="/tools")

# Register individual mock tool routers
tools_router.include_router(email.router)
tools_router.include_router(files.router)
tools_router.include_router(browser.router)
tools_router.include_router(payments.router)
tools_router.include_router(audit.router)

