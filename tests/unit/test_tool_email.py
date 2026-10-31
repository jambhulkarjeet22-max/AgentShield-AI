"""Unit tests for the Mock Email System."""

import pytest
from fastapi.testclient import TestClient
from backend.app.core.exceptions import NotFoundError, SecurityError
from backend.app.security.actors import MOCK_ACTORS
from backend.app.tools.email.models import SendEmailRequest
from backend.app.tools.email.service import mock_email_service


def test_list_emails_success():
    """Verify that an authorized actor can list simulated inbox messages."""
    actor = MOCK_ACTORS["employee"]
    res = mock_email_service.list_messages(actor=actor, folder="inbox")
    assert res.total >= 3
    assert any(msg.id == "msg-safe-001" for msg in res.messages)
    assert any(msg.id == "msg-mal-001" for msg in res.messages)


def test_list_emails_unauthorized():
    """Verify that an actor lacking email:list permission is rejected."""
    actor = MOCK_ACTORS["guest"]
    with pytest.raises(SecurityError) as exc_info:
        mock_email_service.list_messages(actor=actor)
    assert "email:list" in str(exc_info.value)


def test_get_email_by_id_success():
    """Verify reading a safe email and an adversarial sample as inert text."""
    actor = MOCK_ACTORS["analyst"]
    # Safe message
    safe_msg = mock_email_service.get_message(actor=actor, message_id="msg-safe-001")
    assert safe_msg.id == "msg-safe-001"
    assert safe_msg.is_flagged_malicious is False
    assert "Agentra" in safe_msg.subject

    # Malicious injection sample
    mal_msg = mock_email_service.get_message(actor=actor, message_id="msg-mal-002")
    assert mal_msg.id == "msg-mal-002"
    assert mal_msg.is_flagged_malicious is True
    assert "SYSTEM INSTRUCTION OVERRIDE" in mal_msg.body


def test_get_email_invalid_id():
    """Verify that querying a non-existent email ID raises NotFoundError."""
    actor = MOCK_ACTORS["employee"]
    with pytest.raises(NotFoundError) as exc_info:
        mock_email_service.get_message(actor=actor, message_id="msg-non-existent-999")
    assert "not found" in str(exc_info.value).lower()


def test_send_email_success():
    """Verify sending a simulated email (stored in memory, not sent over network)."""
    actor = MOCK_ACTORS["employee"]
    req = SendEmailRequest(
        recipient="security-lead@agentra.test",
        subject="Phishing Report Detected",
        body="I received a suspicious wire transfer request.",
    )
    sent_msg = mock_email_service.send_message(actor=actor, request=req)
    assert sent_msg.recipient == "security-lead@agentra.test"
    assert sent_msg.subject == "Phishing Report Detected"
    assert sent_msg.folder == "sent"
    assert sent_msg.sender == f"{actor.actor_id}@agentra.test"


def test_send_email_unauthorized():
    """Verify that an actor without email:send permission cannot send emails."""
    actor = MOCK_ACTORS["guest"]
    req = SendEmailRequest(
        recipient="test@example.com",
        subject="Hello",
        body="World",
    )
    with pytest.raises(SecurityError):
        mock_email_service.send_message(actor=actor, request=req)


def test_send_email_validation():
    """Verify schema validation for invalid recipient format and empty strings."""
    with pytest.raises(ValueError):
        SendEmailRequest(recipient="invalid-email-no-domain", subject="Hi", body="Test")

    with pytest.raises(ValueError):
        SendEmailRequest(recipient="valid@domain.com", subject="   ", body="Test")
