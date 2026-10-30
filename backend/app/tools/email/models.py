"""Pydantic schemas and models for the simulated Mock Email System."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class EmailMessage(BaseModel):
    """Represents a simulated email message."""

    id: str = Field(
        default_factory=lambda: f"msg-{uuid.uuid4().hex[:8]}",
        description="Unique simulated message ID",
    )
    sender: str = Field(description="Sender email address")
    recipient: str = Field(description="Recipient email address")
    subject: str = Field(description="Subject line")
    body: str = Field(description="Email content (treated strictly as inert text)")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO-8601 UTC timestamp",
    )
    folder: str = Field(default="inbox", description="Email folder (inbox, sent, archive)")
    is_flagged_malicious: bool = Field(
        default=False,
        description="Ground-truth flag indicating adversarial / test attack content",
    )
    tags: List[str] = Field(default_factory=list, description="Categorization tags")


class SendEmailRequest(BaseModel):
    """Request payload for sending a simulated email."""

    recipient: str = Field(
        min_length=3,
        max_length=255,
        description="Target recipient email address",
    )
    subject: str = Field(
        min_length=1,
        max_length=255,
        description="Email subject line",
    )
    body: str = Field(
        min_length=1,
        max_length=20000,
        description="Email body text",
    )

    @field_validator("recipient")
    @classmethod
    def validate_recipient(cls, v: str) -> str:
        clean = v.strip()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("Invalid recipient email address format")
        return clean

    @field_validator("subject", "body")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Field cannot be empty or only whitespace")
        return clean


class EmailListResponse(BaseModel):
    """Response containing a paginated list of simulated emails."""

    total: int = Field(description="Total number of emails matching filter")
    messages: List[EmailMessage] = Field(description="List of simulated email messages")

