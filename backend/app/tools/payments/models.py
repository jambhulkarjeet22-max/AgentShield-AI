"""Pydantic schemas and models for the simulated Mock Payment System."""

import re
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class PaymentStatus(str, Enum):
    """Lifecycle status of a simulated payment transaction."""

    PENDING = "PENDING"
    AUTHORIZED = "AUTHORIZED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


SUPPORTED_CURRENCIES = {"USD", "EUR", "GBP", "CAD", "AUD", "JPY"}


class PaymentRequest(BaseModel):
    """Simulated payment request record."""

    transaction_id: str = Field(
        default_factory=lambda: f"tx-{uuid.uuid4().hex[:8]}",
        description="Unique simulated transaction identifier",
    )
    amount: float = Field(description="Transaction amount (positive value)")
    currency: str = Field(default="USD", description="3-letter ISO currency code")
    recipient: str = Field(description="Simulated recipient identifier or account")
    description: str = Field(description="Description/reason for payment")
    status: PaymentStatus = Field(default=PaymentStatus.PENDING, description="Current payment state")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Creation timestamp",
    )
    created_by_actor: str = Field(description="Actor ID that originated the request")
    authorized_at: Optional[str] = Field(default=None, description="Timestamp of authorization")
    authorized_by_actor: Optional[str] = Field(default=None, description="Actor ID that authorized execution")
    audit_note: Optional[str] = Field(default=None, description="Audit or approval remarks")
    is_simulation: bool = Field(default=True, description="Always true; no real funds are ever moved")


class CreatePaymentPayload(BaseModel):
    """Request payload to create a new simulated payment request."""

    amount: float = Field(
        gt=0,
        le=1_000_000,
        description="Payment amount; must be strictly positive and under $1,000,000",
    )
    currency: str = Field(
        default="USD",
        min_length=3,
        max_length=3,
        description="3-letter currency code (e.g. USD, EUR, GBP)",
    )
    recipient: str = Field(
        min_length=2,
        max_length=255,
        description="Simulated payee / vendor account identifier",
    )
    description: str = Field(
        min_length=2,
        max_length=1000,
        description="Business justification / invoice note",
    )

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        clean = v.strip().upper()
        if clean not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency '{clean}'. Supported: {sorted(SUPPORTED_CURRENCIES)}")
        return clean

    @field_validator("amount")
    @classmethod
    def validate_amount_precision(cls, v: float) -> float:
        # Limit to 2 decimal places
        rounded = round(v, 2)
        if rounded <= 0:
            raise ValueError("Payment amount must be greater than zero after rounding")
        return rounded

    @field_validator("recipient", "description")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Field cannot be empty")
        return clean


class AuthorizePaymentPayload(BaseModel):
    """Payload to authorize and execute a simulated payment."""

    auth_code: str = Field(
        min_length=8,
        max_length=64,
        description="Cryptographic or explicit authorization code",
    )
    note: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional approval notes for the audit trail",
    )


class PaymentListResponse(BaseModel):
    """Response containing a list of simulated payments."""

    total: int = Field(description="Total count of simulated payments")
    payments: List[PaymentRequest] = Field(description="List of payment requests")

