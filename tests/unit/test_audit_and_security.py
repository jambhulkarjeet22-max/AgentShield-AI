"""Unit tests for the structured audit logger and security controls."""

from backend.app.security.actors import (
    DEFAULT_ANONYMOUS_ACTOR,
    MOCK_ACTORS,
    Role,
    get_mock_actor,
)
from backend.app.security.audit import audit_service
from backend.app.tools import reset_all_mock_tools
from backend.app.tools.email.models import SendEmailRequest
from backend.app.tools.email.service import mock_email_service
from backend.app.tools.filesystem.service import mock_filesystem_service


def test_actor_resolution_security():
    """Verify actor resolution logic prevents self-reported spoofing."""
    # Empty or None header -> default anonymous least privilege actor
    anon = get_mock_actor(None)
    assert anon.role == Role.ANONYMOUS
    assert anon.actor_id == "anonymous-user"

    # Forged random key -> default anonymous least privilege actor
    fake = get_mock_actor("forged-super-admin-key")
    assert fake.role == Role.ANONYMOUS

    # Legitimate configured admin key -> admin actor
    admin = get_mock_actor(MOCK_ACTORS["admin"].api_key)
    assert admin.role == Role.ADMIN
    assert admin.actor_id == "admin-001"


def test_audit_log_recording_and_filtering():
    """Verify that tool operations generate structured audit log entries."""
    audit_service.reset()
    actor = MOCK_ACTORS["employee"]

    # 1. Email operation
    mock_email_service.send_message(
        actor=actor,
        request=SendEmailRequest(recipient="lead@agentra.test", subject="Test", body="Body"),
    )

    # 2. Filesystem read operation
    mock_filesystem_service.read_file(actor, "public/faq.txt")

    # Verify audit logs
    logs = audit_service.list_logs()
    assert len(logs) >= 2

    # Filter by tool
    email_logs = audit_service.list_logs(tool="email")
    assert any(log.action == "send_email" for log in email_logs)

    files_logs = audit_service.list_logs(tool="filesystem")
    assert any(log.action == "read_file" and log.resource == "public/faq.txt" for log in files_logs)

    # Check audit record structure
    first = logs[0]
    assert first.id.startswith("audit-")
    assert first.timestamp is not None
    assert first.actor_id == actor.actor_id
    assert first.status == "ALLOWED"


def test_global_reset_all_mock_tools():
    """Verify that reset_all_mock_tools() restores all data to deterministic seed state."""
    actor = MOCK_ACTORS["employee"]
    admin = MOCK_ACTORS["admin"]

    # Perform a mutation: add an email
    mock_email_service.send_message(
        actor=actor,
        request=SendEmailRequest(recipient="reset-test@agentra.test", subject="Pre-Reset", body="Data"),
    )
    assert mock_email_service.list_messages(actor, folder="sent").total >= 1

    # Call reset
    reset_all_mock_tools()

    # Verify sent folder is back to empty
    assert mock_email_service.list_messages(actor, folder="sent").total == 0

    # Verify seed inbox message still exists
    assert mock_email_service.get_message(actor, "msg-safe-001").id == "msg-safe-001"

