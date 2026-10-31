"""Integration tests for API v1 base routes."""

from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test the service root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Agentra-AI"
    assert data["status"] == "operational"
    assert data["api_v1"] == "/api/v1"


def test_health_check_via_v1(client: TestClient):
    """Test the health check mounted under /api/v1/health."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

