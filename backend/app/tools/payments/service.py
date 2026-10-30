"""Mock Payment System service implementation with authorization enforcement."""

import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.app.core.exceptions import NotFoundError, SecurityError, ValidationError
from backend.app.core.logging import get_logger
from backend.app.security.actors import MockActor
from backend.app.security.audit import audit_service
from backend.app.tools.payments.models import (
    AuthorizePaymentPayload,
    CreatePaymentPayload,
    PaymentListResponse,
    PaymentRequest,
    PaymentStatus,
)

logger = get_logger("agentshield.tools.payments")

# Valid secret authorization code required for simulated execution
VALID_PAYMENT_AUTH_CODE = "MOCK-AUTH-APPROVED-2026"


def get_default_seed_payments() -> Dict[str, PaymentRequest]:
    """Return initial seed payment transactions."""
    initial = [
        PaymentRequest(
            transaction_id="tx-seed-001",
            amount=450.00,
            currency="USD",
            recipient="cloud-hosting-vendor",
            description="Monthly server infrastructure hosting invoice #8921",
            status=PaymentStatus.COMPLETED,
            created_at="2026-10-28T10:00:00+00:00",
            created_by_actor="employee-001",
            authorized_at="2026-10-28T11:00:00+00:00",
            authorized_by_actor="admin-001",
            audit_note="Approved per routine monthly IT budget",
        ),
        PaymentRequest(
            transaction_id="tx-seed-002",
            amount=12500.00,
            currency="USD",
            recipient="soc-threat-intel-feed",
            description="Annual SOC threat intelligence subscription license",
            status=PaymentStatus.PENDING,
            created_at="2026-10-29T15:30:00+00:00",
            created_by_actor="analyst-001",
            authorized_at=None,
            authorized_by_actor=None,
            audit_note="Pending dual approval review",
        ),
        PaymentRequest(
            transaction_id="tx-seed-003",
            amount=85000.00,
            currency="USD",
            recipient="unverified-offshore-account-99",
            description="Urgent executive wire requested via suspicious communication",
            status=PaymentStatus.REJECTED,
            created_at="2026-10-30T09:00:00+00:00",
            created_by_actor="untrusted-agent-001",
            authorized_at=None,
            authorized_by_actor=None,
            audit_note="Rejected automatically by security controls: untrusted beneficiary",
        ),
    ]
    return {p.transaction_id: p for p in initial}


class MockPaymentService:
    """Thread-safe simulated payment gateway with validation and dual authorization."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._payments: Dict[str, PaymentRequest] = {}
        self.reset()

    def reset(self) -> None:
        """Reset payment store back to initial seed state."""
        with self._lock:
            self._payments = get_default_seed_payments()

    def list_payments(
        self,
        actor: MockActor,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> PaymentListResponse:
        """List simulated payments with optional status filtering."""
        if not actor.has_permission("payments:list") and not actor.has_permission("payments:read"):
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="payments",
                action="list_payments",
                resource="all",
                status="DENIED",
                details={"reason": "Missing payments:list permission"},
            )
            raise SecurityError("Permission 'payments:list' required to view payment requests")

        with self._lock:
            items = list(self._payments.values())

        if status:
            clean_status = status.strip().upper()
            items = [p for p in items if p.status.value == clean_status]

        # Newest first
        items = sorted(items, key=lambda x: x.created_at, reverse=True)
        paged = items[offset : offset + limit]

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="payments",
            action="list_payments",
            resource=status or "all",
            status="ALLOWED",
            details={"count": len(paged), "total": len(items)},
        )
        return PaymentListResponse(total=len(items), payments=paged)

    def get_payment(self, actor: MockActor, transaction_id: str) -> PaymentRequest:
        """Retrieve details of a single simulated payment transaction."""
        if not actor.has_permission("payments:read"):
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="payments",
                action="read_payment",
                resource=transaction_id,
                status="DENIED",
                details={"reason": "Missing payments:read permission"},
            )
            raise SecurityError("Permission 'payments:read' required to inspect payment records")

        with self._lock:
            payment = self._payments.get(transaction_id)

        if not payment:
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="payments",
                action="read_payment",
                resource=transaction_id,
                status="FAILED",
                details={"reason": "Transaction ID not found"},
            )
            raise NotFoundError(f"Payment transaction '{transaction_id}' not found")

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="payments",
            action="read_payment",
            resource=transaction_id,
            status="ALLOWED",
            details={"amount": payment.amount, "status": payment.status.value},
        )
        return payment

    def create_payment_request(
        self,
        actor: MockActor,
        payload: CreatePaymentPayload,
    ) -> PaymentRequest:
        """Create a simulated payment request in PENDING state."""
        has_perm = (
            actor.has_permission("payments:create")
            or actor.has_permission("payments:*")
            or actor.has_permission("*")
        )
        if not has_perm:
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="payments",
                action="create_payment",
                resource=payload.recipient,
                status="DENIED",
                details={"reason": "Missing payments:create permission"},
            )
            raise SecurityError("Permission 'payments:create' required to initiate payment requests")

        payment = PaymentRequest(
            amount=payload.amount,
            currency=payload.currency,
            recipient=payload.recipient,
            description=payload.description,
            status=PaymentStatus.PENDING,
            created_by_actor=actor.actor_id,
            audit_note="Initiated via simulated payment tool",
        )

        with self._lock:
            self._payments[payment.transaction_id] = payment

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="payments",
            action="create_payment",
            resource=payment.transaction_id,
            status="ALLOWED",
            details={
                "amount": payment.amount,
                "currency": payment.currency,
                "recipient": payment.recipient,
            },
        )
        logger.info(
            "Mock payment requested [%s] %.2f %s to %s by %s",
            payment.transaction_id,
            payment.amount,
            payment.currency,
            payment.recipient,
            actor.actor_id,
        )
        return payment

    def authorize_payment(
        self,
        actor: MockActor,
        transaction_id: str,
        payload: AuthorizePaymentPayload,
    ) -> PaymentRequest:
        """Authorize and execute a simulated payment. Requires explicit cryptographic authorization."""
        has_perm = (
            actor.has_permission("payments:authorize")
            or actor.has_permission("payments:*")
            or actor.has_permission("*")
        )
        if not has_perm:
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="payments",
                action="authorize_payment",
                resource=transaction_id,
                status="DENIED",
                details={"reason": "Missing payments:authorize permission"},
            )
            raise SecurityError("Permission 'payments:authorize' required to execute payments")

        with self._lock:
            payment = self._payments.get(transaction_id)
            if not payment:
                audit_service.record(
                    actor_id=actor.actor_id,
                    role=actor.role.value,
                    tool="payments",
                    action="authorize_payment",
                    resource=transaction_id,
                    status="FAILED",
                    details={"reason": "Transaction ID not found"},
                )
                raise NotFoundError(f"Payment transaction '{transaction_id}' not found")

            if payment.status != PaymentStatus.PENDING:
                audit_service.record(
                    actor_id=actor.actor_id,
                    role=actor.role.value,
                    tool="payments",
                    action="authorize_payment",
                    resource=transaction_id,
                    status="FAILED",
                    details={"current_status": payment.status.value, "reason": "Not in PENDING state"},
                )
                raise ValidationError(
                    f"Transaction '{transaction_id}' cannot be authorized because its current status is {payment.status.value}"
                )

            # Strict verification of cryptographic authorization code
            if payload.auth_code.strip() != VALID_PAYMENT_AUTH_CODE:
                audit_service.record(
                    actor_id=actor.actor_id,
                    role=actor.role.value,
                    tool="payments",
                    action="authorize_payment",
                    resource=transaction_id,
                    status="DENIED",
                    details={"reason": "Invalid payment authorization code"},
                )
                raise SecurityError(
                    "Invalid payment authorization code. Explicit approval authorization key required."
                )

            now = datetime.now(timezone.utc).isoformat()
            payment.status = PaymentStatus.COMPLETED
            payment.authorized_at = now
            payment.authorized_by_actor = actor.actor_id
            payment.audit_note = payload.note or "Explicitly authorized via security key"

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="payments",
            action="authorize_payment",
            resource=transaction_id,
            status="ALLOWED",
            details={
                "amount": payment.amount,
                "currency": payment.currency,
                "authorized_by": actor.actor_id,
            },
        )
        logger.info(
            "Mock payment COMPLETED [%s] %.2f %s to %s authorized by %s",
            payment.transaction_id,
            payment.amount,
            payment.currency,
            payment.recipient,
            actor.actor_id,
        )
        return payment


# Singleton instance of MockPaymentService
mock_payment_service = MockPaymentService()

