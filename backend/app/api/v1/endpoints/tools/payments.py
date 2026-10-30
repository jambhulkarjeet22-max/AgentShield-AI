"""API endpoints for the Mock Payment System."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status

from backend.app.security.actors import MockActor, get_current_actor
from backend.app.tools.payments.models import (
    AuthorizePaymentPayload,
    CreatePaymentPayload,
    PaymentListResponse,
    PaymentRequest,
)
from backend.app.tools.payments.service import mock_payment_service

router = APIRouter(prefix="/payments", tags=["Mock Tool: Payments"])


@router.get(
    "",
    response_model=PaymentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Simulated Payments",
    description="View mock payment requests and transactions with optional status filter.",
)
async def list_payments(
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status (e.g. PENDING)"),
    limit: int = Query(default=50, ge=1, le=100, description="Max payments to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    actor: MockActor = Depends(get_current_actor),
) -> PaymentListResponse:
    return mock_payment_service.list_payments(actor=actor, status=status_filter, limit=limit, offset=offset)


@router.get(
    "/{transaction_id}",
    response_model=PaymentRequest,
    status_code=status.HTTP_200_OK,
    summary="Get Payment Transaction Details",
    description="Retrieve details of a specific simulated payment by transaction ID.",
)
async def get_payment(
    transaction_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> PaymentRequest:
    return mock_payment_service.get_payment(actor=actor, transaction_id=transaction_id)


@router.post(
    "/request",
    response_model=PaymentRequest,
    status_code=status.HTTP_201_CREATED,
    summary="Create Simulated Payment Request",
    description="Initiate a simulated payment request in PENDING state. Validates amounts and recipient.",
)
async def create_payment_request(
    payload: CreatePaymentPayload,
    actor: MockActor = Depends(get_current_actor),
) -> PaymentRequest:
    return mock_payment_service.create_payment_request(actor=actor, payload=payload)


@router.post(
    "/{transaction_id}/authorize",
    response_model=PaymentRequest,
    status_code=status.HTTP_200_OK,
    summary="Authorize Simulated Payment",
    description="Authorize and execute a pending payment. Requires payments:authorize permission and valid authorization code.",
)
async def authorize_payment(
    transaction_id: str,
    payload: AuthorizePaymentPayload,
    actor: MockActor = Depends(get_current_actor),
) -> PaymentRequest:
    return mock_payment_service.authorize_payment(
        actor=actor,
        transaction_id=transaction_id,
        payload=payload,
    )

