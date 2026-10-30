"""Pytest test configuration, fixtures, and mock actors."""

import os
from typing import Dict
import pytest
from fastapi.testclient import TestClient

# Ensure test environment settings are active
os.environ["APP_ENV"] = "test"
os.environ["DEBUG"] = "false"

from backend.app.main import app
from backend.app.agents.target.state import task_state_store
from backend.app.agents.redteam.state import campaign_state_store
from backend.app.agents.guardian.state import guardian_decision_store
from backend.app.agents.guardian.approvals import approval_store
from backend.app.security.actors import MOCK_ACTORS
from backend.app.services.ml_client import set_ml_client
from backend.app.tools import reset_all_mock_tools


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Fixture providing a FastAPI TestClient."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def reset_mock_state():
    """Reset all mock tool services and state stores to initial seed state before every test."""
    reset_all_mock_tools()
    task_state_store.reset()
    campaign_state_store.reset()
    guardian_decision_store.reset()
    approval_store.reset()
    set_ml_client(None)
    yield
    reset_all_mock_tools()
    task_state_store.reset()
    campaign_state_store.reset()
    guardian_decision_store.reset()
    approval_store.reset()
    set_ml_client(None)


@pytest.fixture
def admin_headers() -> Dict[str, str]:
    return {"X-API-Key": MOCK_ACTORS["admin"].api_key}


@pytest.fixture
def analyst_headers() -> Dict[str, str]:
    return {"X-API-Key": MOCK_ACTORS["analyst"].api_key}


@pytest.fixture
def employee_headers() -> Dict[str, str]:
    return {"X-API-Key": MOCK_ACTORS["employee"].api_key}


@pytest.fixture
def guest_headers() -> Dict[str, str]:
    return {"X-API-Key": MOCK_ACTORS["guest"].api_key}


@pytest.fixture
def untrusted_headers() -> Dict[str, str]:
    return {"X-API-Key": MOCK_ACTORS["untrusted_agent"].api_key}
