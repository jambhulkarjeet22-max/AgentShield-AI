"""Unit tests for Convex DB synchronization client."""

import pytest
from backend.app.db.convex_client import ConvexSyncClient


def test_convex_client_unconfigured_safe_fallback():
    """Verify that when no Convex URL is configured, client safely no-ops without exceptions."""
    client = ConvexSyncClient(convex_url="")
    assert not client.is_configured

    # Mutations and queries return None without throwing errors
    assert client.mutation("campaigns:save", {"campaign_id": "test-1"}) is None
    assert client.query("campaigns:getLatest", {}) is None

    # Convenience sync methods should not raise
    client.sync_campaign({"campaign_id": "test-1", "total_attacks": 0})
    client.sync_audit_log({"event_id": "evt-1", "tool": "test"})
    client.sync_decision({"decision_id": "dec-1", "risk_score": 10.0})


def test_convex_client_configured_state():
    """Verify URL trimming and configured state."""
    client = ConvexSyncClient(convex_url="https://test-deployment.convex.cloud/")
    assert client.is_configured
    assert client.convex_url == "https://test-deployment.convex.cloud"

