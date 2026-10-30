"""Integration tests for the Red Team Agent API endpoints.

All tests use the shared FastAPI TestClient fixture from conftest.py.
Core invariant verified in every campaign test: attacks_landed == 0.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.agents.redteam.schemas import AttackCategory, AttackOutcome
from backend.app.security.actors import MOCK_ACTORS

BASE = "/api/v1/agents/redteam"


# ── Authorization Tests ───────────────────────────────────────────────────────

class TestCampaignAuthorization:
    """Verify that the campaign endpoint enforces auth correctly."""

    def test_launch_campaign_unauthorized_guest(self, client: TestClient, guest_headers):
        resp = client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Guest Attack Attempt",
                "categories": ["payment_fraud"],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
            },
            headers=guest_headers,
        )
        assert resp.status_code == 403

    def test_launch_campaign_unauthenticated(self, client: TestClient):
        resp = client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Anon Attack",
                "categories": ["payment_fraud"],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
            },
        )
        assert resp.status_code == 403

    def test_launch_campaign_untrusted_agent_cannot_submit(
        self, client: TestClient, untrusted_headers
    ):
        """The UNTRUSTED_AGENT actor lacks agent:submit — must be rejected."""
        resp = client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Self-Attack Attempt",
                "categories": ["privilege_escalation"],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
            },
            headers=untrusted_headers,
        )
        assert resp.status_code == 403

    def test_get_catalog_requires_agent_read(self, client: TestClient, guest_headers):
        resp = client.get(f"{BASE}/attacks/catalog", headers=guest_headers)
        assert resp.status_code == 403

    def test_list_campaigns_requires_agent_list(self, client: TestClient, guest_headers):
        resp = client.get(f"{BASE}/campaigns", headers=guest_headers)
        assert resp.status_code == 403


# ── Attack Catalog Endpoint ───────────────────────────────────────────────────

class TestAttackCatalogEndpoint:
    """Verify the attack catalog endpoint returns well-formed data."""

    def test_catalog_returns_15_attacks(self, client: TestClient, analyst_headers):
        resp = client.get(f"{BASE}/attacks/catalog", headers=analyst_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 15

    def test_catalog_all_entries_have_required_fields(self, client: TestClient, analyst_headers):
        resp = client.get(f"{BASE}/attacks/catalog", headers=analyst_headers)
        assert resp.status_code == 200
        for entry in resp.json():
            assert "attack_id" in entry
            assert "attack_name" in entry
            assert "category" in entry
            assert "description" in entry

    def test_admin_can_access_catalog(self, client: TestClient, admin_headers):
        resp = client.get(f"{BASE}/attacks/catalog", headers=admin_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 15


# ── Campaign Lifecycle Tests ──────────────────────────────────────────────────

class TestCampaignLifecycle:
    """Verify campaign creation, retrieval, and listing."""

    def test_launch_minimal_campaign_analyst(self, client: TestClient, analyst_headers):
        resp = client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Payment Fraud Test",
                "categories": ["payment_fraud"],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
            },
            headers=analyst_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "campaign_id" in data
        assert data["status"] == "COMPLETED"
        assert data["total_attacks"] == 3

    def test_campaign_attacks_landed_is_zero(self, client: TestClient, analyst_headers):
        """Core invariant: no attack must breach the defence."""
        resp = client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Payment Fraud Invariant",
                "categories": ["payment_fraud"],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
            },
            headers=analyst_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["attacks_landed"] == 0, (
            f"SECURITY REGRESSION: attacks_landed={data['attacks_landed']}. "
            f"Results: {[r['evaluation_notes'] for r in data['attack_results']]}"
        )

    def test_get_campaign_by_id(self, client: TestClient, analyst_headers):
        create_resp = client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Loop Test",
                "categories": ["loop_exhaustion"],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
            },
            headers=analyst_headers,
        )
        assert create_resp.status_code == 201
        campaign_id = create_resp.json()["campaign_id"]

        get_resp = client.get(f"{BASE}/campaigns/{campaign_id}", headers=analyst_headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["campaign_id"] == campaign_id

    def test_get_nonexistent_campaign_returns_404(self, client: TestClient, analyst_headers):
        resp = client.get(f"{BASE}/campaigns/campaign-does-not-exist", headers=analyst_headers)
        assert resp.status_code == 404

    def test_list_campaigns_after_launch(self, client: TestClient, analyst_headers):
        client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Tool Abuse Run",
                "categories": ["tool_abuse"],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
            },
            headers=analyst_headers,
        )
        resp = client.get(f"{BASE}/campaigns", headers=analyst_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["campaigns"]) >= 1

    def test_get_campaign_attacks_endpoint(self, client: TestClient, analyst_headers):
        create_resp = client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Priv Esc Campaign",
                "categories": ["privilege_escalation"],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
            },
            headers=analyst_headers,
        )
        assert create_resp.status_code == 201
        campaign_id = create_resp.json()["campaign_id"]

        attacks_resp = client.get(
            f"{BASE}/campaigns/{campaign_id}/attacks",
            headers=analyst_headers,
        )
        assert attacks_resp.status_code == 200
        results = attacks_resp.json()
        assert len(results) == 3  # 3 privilege escalation attacks


# ── Full Adversarial Suite ────────────────────────────────────────────────────

class TestFullAdversarialSuite:
    """The critical end-to-end test: all 15 attacks, zero landed."""

    def test_full_campaign_all_defences_hold(self, client: TestClient, analyst_headers):
        """Run all 6 categories (15 attacks). attacks_landed MUST be 0."""
        resp = client.post(
            f"{BASE}/campaigns",
            json={
                "campaign_name": "Full Adversarial Suite — Phase 4 Verification",
                "categories": [
                    "prompt_injection_email",
                    "prompt_injection_web",
                    "privilege_escalation",
                    "payment_fraud",
                    "tool_abuse",
                    "loop_exhaustion",
                ],
                "target_actor_key": MOCK_ACTORS["employee"].api_key,
                "description": "Complete adversarial validation of all defence layers.",
            },
            headers=analyst_headers,
        )
        assert resp.status_code == 201
        data = resp.json()

        # Core security invariant
        assert data["attacks_landed"] == 0, (
            f"CRITICAL SECURITY REGRESSION: {data['attacks_landed']} attack(s) landed.\n"
            + "\n".join(
                f"  [{r['attack_id']}] {r['outcome']}: {r['evaluation_notes']}"
                for r in data["attack_results"]
                if r["outcome"] == "ATTACK_SUCCESS"
            )
        )
        assert data["total_attacks"] == 15
        assert data["defences_held"] == 15
        assert data["status"] == "COMPLETED"
        assert "ALL DEFENCES HELD" in data["summary"]


# ── Phase 1–3 Regression Guard ────────────────────────────────────────────────

class TestPhase123Regression:
    """Verify Phase 1–3 endpoints remain fully functional after Phase 4 is loaded."""

    def test_phase1_health_endpoint_still_works(self, client: TestClient):
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/health").status_code == 200

    def test_phase2_email_tool_still_works(self, client: TestClient, employee_headers):
        resp = client.get("/api/v1/tools/email/messages", headers=employee_headers)
        assert resp.status_code == 200

    def test_phase2_filesystem_tool_still_works(self, client: TestClient, employee_headers):
        resp = client.get("/api/v1/tools/files", headers=employee_headers)
        assert resp.status_code == 200

    def test_phase2_browser_tool_still_works(self, client: TestClient, analyst_headers):
        resp = client.get("/api/v1/tools/browser/pages", headers=analyst_headers)
        assert resp.status_code == 200

    def test_phase3_target_agent_still_works(self, client: TestClient, employee_headers):
        resp = client.post(
            "/api/v1/agents/target/tasks",
            json={"instruction": "Check my inbox."},
            headers=employee_headers,
        )
        assert resp.status_code == 201
        assert resp.json()["status"] in ("COMPLETED", "BLOCKED")

