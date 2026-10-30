"""Mock cyber environment tools and sandbox utilities package."""

from backend.app.security.audit import audit_service
from backend.app.tools.browser.service import mock_browser_service
from backend.app.tools.email.service import mock_email_service
from backend.app.tools.filesystem.service import mock_filesystem_service
from backend.app.tools.payments.service import mock_payment_service


def reset_all_mock_tools() -> None:
    """Reset all simulated tools back to their initial default seed state."""
    mock_email_service.reset()
    mock_filesystem_service.reset()
    mock_browser_service.reset()
    mock_payment_service.reset()
    audit_service.reset()


__all__ = [
    "mock_email_service",
    "mock_filesystem_service",
    "mock_browser_service",
    "mock_payment_service",
    "reset_all_mock_tools",
]
