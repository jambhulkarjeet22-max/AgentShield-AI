"""Unit tests for the Mock File System with path traversal and sandbox boundary checks."""

import pytest
from backend.app.core.exceptions import NotFoundError, SecurityError
from backend.app.security.actors import MOCK_ACTORS
from backend.app.tools.filesystem.models import FileCreateUpdateRequest, FileSensitivity
from backend.app.tools.filesystem.service import mock_filesystem_service, sanitize_virtual_path


def test_list_files_role_filtering():
    """Verify that different roles see appropriate file sensitivity tiers."""
    guest = MOCK_ACTORS["guest"]
    employee = MOCK_ACTORS["employee"]
    analyst = MOCK_ACTORS["analyst"]
    admin = MOCK_ACTORS["admin"]

    # Guest sees only PUBLIC files
    guest_files = mock_filesystem_service.list_files(actor=guest)
    assert all(f.sensitivity == FileSensitivity.PUBLIC for f in guest_files.files)

    # Employee sees PUBLIC and INTERNAL
    employee_files = mock_filesystem_service.list_files(actor=employee)
    sensitivities = {f.sensitivity for f in employee_files.files}
    assert FileSensitivity.CONFIDENTIAL not in sensitivities
    assert FileSensitivity.PUBLIC in sensitivities
    assert FileSensitivity.INTERNAL in sensitivities

    # Analyst sees CONFIDENTIAL as well
    analyst_files = mock_filesystem_service.list_files(actor=analyst)
    analyst_sensitivities = {f.sensitivity for f in analyst_files.files}
    assert FileSensitivity.CONFIDENTIAL in analyst_sensitivities

    # Admin sees RESTRICTED tier too
    admin_files = mock_filesystem_service.list_files(actor=admin)
    admin_sensitivities = {f.sensitivity for f in admin_files.files}
    assert FileSensitivity.RESTRICTED in admin_sensitivities


def test_read_public_file_success():
    """Verify reading a public file returns content as inert text."""
    guest = MOCK_ACTORS["guest"]
    content_res = mock_filesystem_service.read_file(guest, "public/company_handbook.txt")
    assert content_res.path == "public/company_handbook.txt"
    assert "AGENTRA CORP EMPLOYEE HANDBOOK" in content_res.content


def test_read_confidential_file_unauthorized():
    """Verify that an unauthorized actor cannot read confidential files."""
    employee = MOCK_ACTORS["employee"]
    with pytest.raises(SecurityError) as exc_info:
        mock_filesystem_service.read_file(employee, "confidential/passwords.txt")
    assert "CONFIDENTIAL" in str(exc_info.value)


def test_read_confidential_file_authorized():
    """Verify that an analyst or admin can read confidential files."""
    analyst = MOCK_ACTORS["analyst"]
    content_res = mock_filesystem_service.read_file(analyst, "confidential/passwords.txt")
    assert "passwords.txt" in content_res.path
    assert "SIMULATED TEST CREDENTIALS" in content_res.content


def test_read_non_existent_file():
    """Verify that attempting to read a missing file raises NotFoundError."""
    admin = MOCK_ACTORS["admin"]
    with pytest.raises(NotFoundError):
        mock_filesystem_service.read_file(admin, "public/does_not_exist.txt")


@pytest.mark.parametrize(
    "malicious_path",
    [
        "../etc/passwd",
        "..\\..\\windows\\system32",
        "public/../../secret.txt",
        "%2e%2e%2fetc%2fpasswd",
        "C:\\Windows\\System32\\drivers\\etc\\hosts",
        "D:/Data/secrets.env",
        "/etc/shadow",
        "sandbox/../confidential/passwords.txt",
        "sandbox/test.txt\x00.exe",
    ],
)
def test_path_traversal_prevention(malicious_path: str):
    """Verify that any path traversal or arbitrary filesystem escape is strictly blocked."""
    admin = MOCK_ACTORS["admin"]
    with pytest.raises(SecurityError):
        mock_filesystem_service.read_file(admin, malicious_path)


def test_write_file_inside_sandbox_success():
    """Verify writing a file inside 'sandbox/' succeeds and updates store."""
    employee = MOCK_ACTORS["employee"]
    req = FileCreateUpdateRequest(
        path="sandbox/analysis_notes.txt",
        content="Analyzed phishing email msg-mal-001. Confirmed spoofed domain.",
    )
    written = mock_filesystem_service.create_or_update_file(employee, req)
    assert written.path == "sandbox/analysis_notes.txt"
    assert written.is_sandbox is True

    # Read back
    read_back = mock_filesystem_service.read_file(employee, "sandbox/analysis_notes.txt")
    assert "Analyzed phishing email" in read_back.content


def test_write_file_outside_sandbox_blocked():
    """Verify attempting to create/modify a file outside 'sandbox/' is strictly rejected."""
    employee = MOCK_ACTORS["employee"]
    req = FileCreateUpdateRequest(
        path="public/overwrite_handbook.txt",
        content="Tampered handbook content.",
    )
    with pytest.raises(SecurityError) as exc_info:
        mock_filesystem_service.create_or_update_file(employee, req)
    assert "sandbox/" in str(exc_info.value)

