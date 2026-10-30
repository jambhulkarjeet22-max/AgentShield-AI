"""Mock Email System tool module."""

from backend.app.tools.email.models import EmailListResponse, EmailMessage, SendEmailRequest
from backend.app.tools.email.service import MockEmailService, mock_email_service

__all__ = [
    "EmailMessage",
    "SendEmailRequest",
    "EmailListResponse",
    "MockEmailService",
    "mock_email_service",
]

