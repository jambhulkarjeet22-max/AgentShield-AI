"""Unit tests for the health check endpoints."""

from fastapi.testclient import TestClient


def test_root_health_endpoint(client: TestClient):
    """Test that GET /health returns 200 OK and expected structure."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data
    assert response.headers.get("X-Process-Time-Ms") is not None


def test_v1_health_endpoint(client: TestClient):
    """Test that GET /api/v1/health returns 200 OK and matches root health."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "AgentShield-AI"
    assert data["version"] == "0.1.0"

