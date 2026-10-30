"""Pytest test configuration and fixtures."""

import os
import pytest
from fastapi.testclient import TestClient

# Ensure test environment settings are active
os.environ["APP_ENV"] = "test"
os.environ["DEBUG"] = "false"

from backend.app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Fixture providing a FastAPI TestClient."""
    with TestClient(app) as test_client:
        yield test_client

