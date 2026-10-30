"""API endpoints for the Mock Email System."""

from fastapi import APIRouter, Depends, Query, status

from backend.app.security.actors import MockActor, get_current_actor
from backend.app.tools.email.models import (
    EmailListResponse,
    EmailMessage,
    SendEmailRequest,
)
from backend.app.tools.email.service import mock_email_service

router = APIRouter(prefix="/email", tags=["Mock Tool: Email"])


@router.get(
    "/messages",
    response_model=EmailListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Simulated Emails",
    description="Retrieve a paginated list of simulated emails from the specified mailbox folder.",
)
async def list_messages(
    folder: str = Query(default="inbox", description="Target mailbox folder (e.g. inbox, sent)"),
    limit: int = Query(default=50, ge=1, le=100, description="Max messages to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    actor: MockActor = Depends(get_current_actor),
) -> EmailListResponse:
    return mock_email_service.list_messages(actor=actor, folder=folder, limit=limit, offset=offset)


@router.get(
    "/messages/{message_id}",
    response_model=EmailMessage,
    status_code=status.HTTP_200_OK,
    summary="Read Simulated Email",
    description="Read a simulated email by its unique message ID. Content is strictly inert text.",
)
async def get_message(
    message_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> EmailMessage:
    return mock_email_service.get_message(actor=actor, message_id=message_id)


@router.post(
    "/send",
    response_model=EmailMessage,
    status_code=status.HTTP_201_CREATED,
    summary="Send Simulated Email",
    description="Send a simulated email stored in the local mock environment. Never sends real emails.",
)
async def send_message(
    payload: SendEmailRequest,
    actor: MockActor = Depends(get_current_actor),
) -> EmailMessage:
    return mock_email_service.send_message(actor=actor, request=payload)

