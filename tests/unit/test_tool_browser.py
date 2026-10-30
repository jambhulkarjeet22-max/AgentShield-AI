"""Unit tests for the Mock Browser System."""

import pytest
from backend.app.core.exceptions import NotFoundError, SecurityError
from backend.app.security.actors import MOCK_ACTORS
from backend.app.tools.browser.models import WebPageCategory
from backend.app.tools.browser.service import mock_browser_service


def test_list_browser_pages():
    """Verify that an authorized actor can list the catalog of simulated pages."""
    actor = MOCK_ACTORS["employee"]
    res = mock_browser_service.list_pages(actor=actor)
    assert res.total >= 4
    page_ids = {p.page_id for p in res.pages}
    assert "page-trusted-001" in page_ids
    assert "page-mal-002" in page_ids


def test_open_trusted_page_by_id():
    """Verify opening a trusted internal page returns expected inert text."""
    actor = MOCK_ACTORS["employee"]
    page = mock_browser_service.get_page(actor, "page-trusted-001")
    assert page.page_id == "page-trusted-001"
    assert page.category == WebPageCategory.TRUSTED_INTERNAL
    assert page.is_malicious is False
    assert "Incident Response Protocol" in page.content


def test_open_trusted_page_by_url():
    """Verify opening a page by simulated URL."""
    actor = MOCK_ACTORS["analyst"]
    page = mock_browser_service.open_url(actor, "http://internal.company.local/wiki")
    assert page.page_id == "page-trusted-001"
    assert page.domain == "internal.company.local"


def test_open_malicious_injection_page_inert_content():
    """Verify indirect prompt injection page is retrieved safely as inert text."""
    actor = MOCK_ACTORS["analyst"]
    page = mock_browser_service.get_page(actor, "page-mal-002")
    assert page.category == WebPageCategory.MALICIOUS_INJECTION
    assert page.is_malicious is True
    # The payload is stored and returned strictly as inert text
    assert "SYSTEM INSTRUCTION OVERRIDE FOR AUTONOMOUS AGENT" in page.content
    assert page.content_type.startswith("text/plain")


def test_open_non_existent_page_id():
    """Verify that querying an unknown page ID raises NotFoundError."""
    actor = MOCK_ACTORS["employee"]
    with pytest.raises(NotFoundError):
        mock_browser_service.get_page(actor, "page-unknown-999")


def test_open_unmapped_external_url_blocked():
    """Verify that attempting to navigate to unmapped internet URLs is blocked with air-gap error."""
    actor = MOCK_ACTORS["employee"]
    with pytest.raises(NotFoundError) as exc_info:
        mock_browser_service.open_url(actor, "https://www.google.com")
    assert "real outbound internet traffic is strictly prohibited" in str(exc_info.value).lower()

