"""API endpoints for the Mock Browser System."""

from fastapi import APIRouter, Depends, status

from backend.app.security.actors import MockActor, get_current_actor
from backend.app.tools.browser.models import (
    OpenPageRequest,
    WebPage,
    WebPageListResponse,
)
from backend.app.tools.browser.service import mock_browser_service

router = APIRouter(prefix="/browser", tags=["Mock Tool: Browser"])


@router.get(
    "/pages",
    response_model=WebPageListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Simulated Web Pages",
    description="Retrieve the catalog of registered simulated web pages.",
)
async def list_pages(
    actor: MockActor = Depends(get_current_actor),
) -> WebPageListResponse:
    return mock_browser_service.list_pages(actor=actor)


@router.get(
    "/pages/{page_id}",
    response_model=WebPage,
    status_code=status.HTTP_200_OK,
    summary="Get Simulated Page by ID",
    description="Retrieve a simulated web page by its page ID. Content is strictly inert text; scripts never run.",
)
async def get_page(
    page_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> WebPage:
    return mock_browser_service.get_page(actor=actor, page_id=page_id)


@router.post(
    "/open",
    response_model=WebPage,
    status_code=status.HTTP_200_OK,
    summary="Open Simulated Web Page",
    description="Open a simulated webpage by ID or URL. Real outbound network requests are strictly forbidden.",
)
async def open_page(
    payload: OpenPageRequest,
    actor: MockActor = Depends(get_current_actor),
) -> WebPage:
    if payload.page_id:
        return mock_browser_service.get_page(actor=actor, page_id=payload.page_id)
    return mock_browser_service.open_url(actor=actor, url=payload.url)  # type: ignore[arg-type]

