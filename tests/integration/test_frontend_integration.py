"""Integration tests verifying Frontend build artifacts and API client endpoint compatibility.

Ensures:
1. Production bundle assets exist, compile cleanly, and contain essential entry points.
2. Every FastAPI endpoint consumed by the 8 dashboard pages is operational and adheres to the expected schemas.
3. Role-Based Access Control (RBAC) is enforced across frontend-consumed endpoints.
"""

import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.security.actors import MOCK_ACTORS

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"


class TestFrontendBuildArtifacts:
    """Validate that the React 18 / Vite production build succeeds and generates valid assets."""

    def test_production_bundle_exists(self):
        """Ensure frontend/dist/index.html and compiled assets are generated."""
        index_html = DIST_DIR / "index.html"
        assert index_html.exists(), "frontend/dist/index.html does not exist. Run 'npm run build'."

        content = index_html.read_text(encoding="utf-8")
        assert '<div id="root"></div>' in content
        assert "Agentra AI" in content

        assets_dir = DIST_DIR / "assets"
        assert assets_dir.exists() and any(assets_dir.glob("*.js")), "Missing compiled JavaScript in frontend/dist/assets"
        assert any(assets_dir.glob("*.css")), "Missing compiled CSS in frontend/dist/assets"


class TestFrontendAPIConnectivity:
    """Verify all FastAPI routes mapped to the 8 dashboard pages respond correctly."""

    @pytest.fixture
    def admin_headers(self):
        return {"X-API-Key": MOCK_ACTORS["admin"].api_key}

    @pytest.fixture
    def analyst_headers(self):
        return {"X-API-Key": MOCK_ACTORS["analyst"].api_key}

    def test_page1_dashboard_kpis_endpoint(self, client: TestClient, admin_headers):
        """Page 1: System health probe and dashboard aggregation."""
        # Root health check
        health_resp = client.get("/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "healthy"

        # Decisions query
        dec_resp = client.get("/api/v1/agents/guardian/decisions?limit=5", headers=admin_headers)
        assert dec_resp.status_code == 200
        assert "decisions" in dec_resp.json()

    def test_page2_campaigns_endpoint(self, client: TestClient, analyst_headers):
        """Page 2: Red Team campaigns list and launch."""
        list_resp = client.get("/api/v1/agents/redteam/campaigns?limit=5", headers=analyst_headers)
        assert list_resp.status_code == 200
        assert "campaigns" in list_resp.json()

    def test_page2_campaign_launch_with_frontend_payload_success(self, client: TestClient, analyst_headers):
        """Page 2 Regression: Launching campaign with corrected frontend payload succeeds."""
        payload = {
            "campaign_name": "Frontend Launch Regression Test",
            "categories": ["prompt_injection_email", "loop_exhaustion"],
            "target_actor_key": MOCK_ACTORS["employee"].api_key,
            "description": "Adversarial validation of agent security guardrails",
        }
        resp = client.post(
            "/api/v1/agents/redteam/campaigns",
            json=payload,
            headers=analyst_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "campaign_id" in data
        assert data["campaign_name"] == "Frontend Launch Regression Test"
        assert data["status"] == "COMPLETED"
        assert data["total_attacks"] >= 2
        assert data["defences_held"] >= 2
        assert data["attacks_landed"] == 0

        # Verify the created campaign appears in the campaign ledger
        ledger_resp = client.get("/api/v1/agents/redteam/campaigns", headers=analyst_headers)
        assert ledger_resp.status_code == 200
        campaign_ids = [c["campaign_id"] for c in ledger_resp.json()["campaigns"]]
        assert data["campaign_id"] in campaign_ids

    def test_page2_campaign_missing_target_actor_key_fails_with_422(self, client: TestClient, analyst_headers):
        """Page 2 Regression: Confirms that omitting target_actor_key fails with 422 Unprocessable Entity."""
        buggy_payload = {
            "campaign_name": "Buggy Launch Attempt",
            "categories": ["prompt_injection_email"],
            # "target_actor_key" omitted
        }
        resp = client.post(
            "/api/v1/agents/redteam/campaigns",
            json=buggy_payload,
            headers=analyst_headers,
        )
        assert resp.status_code == 422
        error_data = resp.json()
        assert error_data["success"] is False
        details = error_data["error"]["details"]
        assert any(e["loc"] == ["body", "target_actor_key"] for e in details)

    def test_page3_catalog_endpoint(self, client: TestClient, analyst_headers):
        """Page 3: Attack catalog directory (15 registered attacks)."""
        cat_resp = client.get("/api/v1/agents/redteam/attacks/catalog", headers=analyst_headers)
        assert cat_resp.status_code == 200
        data = cat_resp.json()
        assert len(data) == 15
        assert any(a["attack_id"] == "PI-EMAIL-001" for a in data)

    def test_page4_guardian_decisions_endpoint(self, client: TestClient, admin_headers):
        """Page 4: Blue Team Guardian decisions list."""
        dec_resp = client.get("/api/v1/agents/guardian/decisions", headers=admin_headers)
        assert dec_resp.status_code == 200
        assert isinstance(dec_resp.json()["decisions"], list)

    def test_page5_approvals_endpoint_rbac(self, client: TestClient, admin_headers, analyst_headers):
        """Page 5: Approvals queue requires ADMIN role."""
        # Admin can view
        appr_resp = client.get("/api/v1/agents/guardian/approvals", headers=admin_headers)
        assert appr_resp.status_code == 200

        # Analyst is forbidden (RBAC enforced)
        forbidden_resp = client.get("/api/v1/agents/guardian/approvals", headers=analyst_headers)
        assert forbidden_resp.status_code == 403

    def test_page6_task_studio_endpoint(self, client: TestClient, analyst_headers):
        """Page 6: Target Agent task submission and inspection."""
        submit_resp = client.post(
            "/api/v1/agents/target/tasks",
            json={"instruction": "List files in the public directory", "max_steps": 3},
            headers=analyst_headers,
        )
        assert submit_resp.status_code == 201
        task_data = submit_resp.json()
        assert "task_id" in task_data
        assert "status" in task_data

    def test_page7_mock_tools_endpoints(self, client: TestClient, admin_headers):
        """Page 7: Mock infrastructure tools (email, files, browser, payments)."""
        # Email
        email_resp = client.get("/api/v1/tools/email/messages", headers=admin_headers)
        assert email_resp.status_code == 200

        # Files
        files_resp = client.get("/api/v1/tools/files", headers=admin_headers)
        assert files_resp.status_code == 200

        # Browser
        browser_resp = client.get("/api/v1/tools/browser/pages", headers=admin_headers)
        assert browser_resp.status_code == 200

        # Payments
        pay_resp = client.get("/api/v1/tools/payments", headers=admin_headers)
        assert pay_resp.status_code == 200

    def test_page7_mock_email_send_success(self, client: TestClient, admin_headers):
        """Page 7 Regression: Successful mock email transmission using expected recipient field."""
        send_payload = {
            "recipient": "analyst@internal.corp",
            "subject": "Weekly Status Update",
            "body": "Routine status update message for review.",
        }
        resp = client.post("/api/v1/tools/email/send", json=send_payload, headers=admin_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["recipient"] == "analyst@internal.corp"
        assert data["subject"] == "Weekly Status Update"
        assert data["body"] == "Routine status update message for review."
        assert "id" in data
        assert "timestamp" in data

    def test_page7_mock_email_missing_recipient_validation(self, client: TestClient, admin_headers):
        """Page 7 Regression: Missing recipient (e.g. passing 'to' instead of 'recipient') fails with 422."""
        # 1. Payload with 'to' instead of 'recipient'
        mismatched_payload = {
            "to": "analyst@internal.corp",
            "subject": "Weekly Status Update",
            "body": "Routine status update message for review.",
        }
        resp = client.post("/api/v1/tools/email/send", json=mismatched_payload, headers=admin_headers)
        assert resp.status_code == 422
        error_data = resp.json()
        assert error_data["success"] is False
        details = error_data["error"]["details"]
        assert any(e["loc"] == ["body", "recipient"] for e in details)

        # 2. Payload with omitted recipient altogether
        empty_recipient_payload = {
            "subject": "Weekly Status Update",
            "body": "Routine status update message for review.",
        }
        resp_empty = client.post("/api/v1/tools/email/send", json=empty_recipient_payload, headers=admin_headers)
        assert resp_empty.status_code == 422
        error_empty = resp_empty.json()
        assert error_empty["success"] is False
        details_empty = error_empty["error"]["details"]
        assert any(e["loc"] == ["body", "recipient"] for e in details_empty)

    def test_page8_audit_logs_endpoint(self, client: TestClient, admin_headers):
        """Page 8: Security audit log ledger."""
        audit_resp = client.get("/api/v1/tools/audit-logs?limit=10", headers=admin_headers)
        assert audit_resp.status_code == 200
        assert "logs" in audit_resp.json()

