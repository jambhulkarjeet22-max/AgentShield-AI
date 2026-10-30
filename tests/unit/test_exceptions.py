"""Unit tests for centralized exception handling."""

from fastapi.testclient import TestClient
from backend.app.core.exceptions import (
    AppException,
    NotFoundError,
    SecurityError,
    format_error_response,
)


def test_format_error_response():
    """Verify standardized error response payload format."""
    payload = format_error_response(404, "Not found", details={"resource": "Agent"})
    assert payload["success"] is False
    assert payload["error"]["code"] == 404
    assert payload["error"]["message"] == "Not found"
    assert payload["error"]["details"]["resource"] == "Agent"


def test_not_found_exception(client: TestClient):
    """Verify non-existent route returns formatted 404 JSON."""
    response = client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == 404

