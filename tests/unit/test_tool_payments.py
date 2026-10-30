"""Unit tests for the Mock Payment System with authorization and amount validation."""

import pytest
from backend.app.core.exceptions import NotFoundError, SecurityError, ValidationError
from backend.app.security.actors import MOCK_ACTORS
from backend.app.tools.payments.models import (
    AuthorizePaymentPayload,
    CreatePaymentPayload,
    PaymentStatus,
)
from backend.app.tools.payments.service import (
    VALID_PAYMENT_AUTH_CODE,
    mock_payment_service,
)


def test_list_payments_and_filter():
    """Verify listing payments and filtering by status."""
    actor = MOCK_ACTORS["employee"]
    all_res = mock_payment_service.list_payments(actor=actor)
    assert all_res.total >= 3

    pending_res = mock_payment_service.list_payments(actor=actor, status="PENDING")
    assert all(p.status == PaymentStatus.PENDING for p in pending_res.payments)


def test_get_payment_success():
    """Verify retrieving payment details by transaction ID."""
    actor = MOCK_ACTORS["analyst"]
    payment = mock_payment_service.get_payment(actor, "tx-seed-001")
    assert payment.transaction_id == "tx-seed-001"
    assert payment.amount == 450.00
    assert payment.status == PaymentStatus.COMPLETED


def test_get_payment_not_found():
    """Verify querying non-existent transaction ID raises NotFoundError."""
    actor = MOCK_ACTORS["employee"]
    with pytest.raises(NotFoundError):
        mock_payment_service.get_payment(actor, "tx-non-existent-999")


def test_create_payment_request_success():
    """Verify initiating a simulated payment request in PENDING state."""
    actor = MOCK_ACTORS["employee"]
    payload = CreatePaymentPayload(
        amount=1200.50,
        currency="USD",
        recipient="vendor-hardware-support",
        description="Replacement SSD drives for SOC workstation",
    )
    res = mock_payment_service.create_payment_request(actor, payload)
    assert res.amount == 1200.50
    assert res.status == PaymentStatus.PENDING
    assert res.created_by_actor == actor.actor_id
    assert res.is_simulation is True


@pytest.mark.parametrize(
    "invalid_amount",
    [-50.0, 0.0, -0.01, 1_500_000.0],
)
def test_create_payment_invalid_amount(invalid_amount: float):
    """Verify rejection of non-positive or excessive payment amounts."""
    with pytest.raises(ValueError):
        CreatePaymentPayload(
            amount=invalid_amount,
            currency="USD",
            recipient="vendor-test",
            description="Testing invalid amounts",
        )


def test_create_payment_invalid_currency():
    """Verify rejection of unsupported or malformed currency codes."""
    with pytest.raises(ValueError):
        CreatePaymentPayload(
            amount=100.0,
            currency="XYZ",
            recipient="vendor-test",
            description="Testing invalid currency",
        )


def test_authorize_payment_unauthorized_actor():
    """Verify that an actor lacking payments:authorize permission cannot approve payments."""
    employee = MOCK_ACTORS["employee"]
    payload = AuthorizePaymentPayload(auth_code=VALID_PAYMENT_AUTH_CODE)
    with pytest.raises(SecurityError) as exc_info:
        mock_payment_service.authorize_payment(employee, "tx-seed-002", payload)
    assert "payments:authorize" in str(exc_info.value)


def test_authorize_payment_invalid_auth_code():
    """Verify that an invalid authorization code is rejected even for admin."""
    admin = MOCK_ACTORS["admin"]
    payload = AuthorizePaymentPayload(auth_code="INVALID-CODE-1234")
    with pytest.raises(SecurityError) as exc_info:
        mock_payment_service.authorize_payment(admin, "tx-seed-002", payload)
    assert "Invalid payment authorization code" in str(exc_info.value)


def test_authorize_payment_success():
    """Verify successful dual authorization with admin role and valid authorization key."""
    admin = MOCK_ACTORS["admin"]
    payload = AuthorizePaymentPayload(
        auth_code=VALID_PAYMENT_AUTH_CODE,
        note="Approved by SOC Administrator after verification",
    )
    res = mock_payment_service.authorize_payment(admin, "tx-seed-002", payload)
    assert res.status == PaymentStatus.COMPLETED
    assert res.authorized_by_actor == admin.actor_id
    assert res.authorized_at is not None
    assert "Approved by SOC Administrator" in (res.audit_note or "")


def test_authorize_already_completed_payment_rejected():
    """Verify that an already completed or rejected transaction cannot be re-authorized."""
    admin = MOCK_ACTORS["admin"]
    payload = AuthorizePaymentPayload(auth_code=VALID_PAYMENT_AUTH_CODE)
    with pytest.raises(ValidationError) as exc_info:
        mock_payment_service.authorize_payment(admin, "tx-seed-001", payload)
    assert "COMPLETED" in str(exc_info.value)

