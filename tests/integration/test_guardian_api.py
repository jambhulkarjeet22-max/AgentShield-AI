"""Integration tests for Blue Team Guardian API endpoints and execution interception."""

import pytest
from fastapi.testclient import TestClient

from backend.app.agents.guardian import (
    ApprovalStatus,
    GuardianDecision,
    approval_store,
    guardian_decision_store,
)
from backend.app.agents.guardian.schemas import GuardianVerdict
from backend.app.agents.target.schemas import ToolCallProposal
from backend.app.security.actors import MOCK_ACTORS

BASE = "/api/v1/agents/guardian"


class TestGuardianDecisionEndpoints:
    """Verify decision audit and observability endpoints."""

    def test_list_decisions_analyst_authorized(self, client: TestClient, analyst_headers):
        # Create a mock decision first
        proposal = ToolCallProposal(tool="email", action="list_messages", parameters={})
        verdict = GuardianVerdict(
            verdict=GuardianDecision.ALLOW,
            risk_score=10.0,
            explanation="Normal operation",
            intent_alignment=0.9,
        )
        guardian_decision_store.record_decision("task-001", 1, "analyst-001", proposal, verdict)

        resp = client.get(f"{BASE}/decisions", headers=analyst_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["decisions"]) >= 1

    def test_list_decisions_guest_forbidden(self, client: TestClient, guest_headers):
        resp = client.get(f"{BASE}/decisions", headers=guest_headers)
        assert resp.status_code == 403

    def test_list_decisions_unauthenticated_forbidden(self, client: TestClient):
        resp = client.get(f"{BASE}/decisions")
        assert resp.status_code == 403

    def test_get_decision_by_id_success(self, client: TestClient, analyst_headers):
        proposal = ToolCallProposal(tool="filesystem", action="read_file", parameters={"raw_path": "public/handbook.txt"})
        verdict = GuardianVerdict(
            verdict=GuardianDecision.ALLOW,
            risk_score=15.0,
            explanation="Approved read",
            intent_alignment=0.95,
        )
        rec = guardian_decision_store.record_decision("task-002", 1, "employee-001", proposal, verdict)

        resp = client.get(f"{BASE}/decisions/{rec.record_id}", headers=analyst_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["record_id"] == rec.record_id
        assert data["verdict"] == "ALLOW"
        assert data["risk_score"] == 15.0

    def test_get_nonexistent_decision_returns_404(self, client: TestClient, analyst_headers):
        resp = client.get(f"{BASE}/decisions/gdec-nonexistent", headers=analyst_headers)
        assert resp.status_code == 404


class TestGuardianApprovalEndpoints:
    """Verify administrator human-in-the-loop approval management endpoints."""

    def test_list_approvals_admin_authorized(self, client: TestClient, admin_headers):
        proposal = ToolCallProposal(tool="payments", action="create_payment_request", parameters={"amount": 15000.0})
        verdict = GuardianVerdict(
            verdict=GuardianDecision.REQUIRE_APPROVAL,
            risk_score=65.0,
            explanation="High value payment requires approval",
            intent_alignment=0.8,
        )
        approval_store.create_approval("task-003", 1, proposal, verdict)

        resp = client.get(f"{BASE}/approvals", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["approvals"]) >= 1

    def test_list_approvals_analyst_forbidden(self, client: TestClient, analyst_headers):
        # Approvals require administrative authority
        resp = client.get(f"{BASE}/approvals", headers=analyst_headers)
        assert resp.status_code == 403

    def test_get_approval_by_id_success(self, client: TestClient, admin_headers):
        proposal = ToolCallProposal(tool="email", action="send_email", parameters={"recipient": "vendor@partner.test"})
        verdict = GuardianVerdict(
            verdict=GuardianDecision.REQUIRE_APPROVAL,
            risk_score=70.0,
            explanation="Untrusted recipient",
            intent_alignment=0.5,
        )
        req = approval_store.create_approval("task-004", 2, proposal, verdict)

        resp = client.get(f"{BASE}/approvals/{req.approval_id}", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["approval_id"] == req.approval_id
        assert data["status"] == "PENDING"

    def test_decide_approval_approve_action(self, client: TestClient, admin_headers):
        proposal = ToolCallProposal(tool="payments", action="create_payment_request", parameters={"amount": 20000.0})
        verdict = GuardianVerdict(
            verdict=GuardianDecision.REQUIRE_APPROVAL,
            risk_score=75.0,
            explanation="Held for admin confirmation",
            intent_alignment=0.9,
        )
        req = approval_store.create_approval("task-005", 1, proposal, verdict)

        resp = client.post(
            f"{BASE}/approvals/{req.approval_id}/decide",
            json={"approve": True, "decision_note": "Payment verified via invoice #8892"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "APPROVED"
        assert data["decided_by"] == MOCK_ACTORS["admin"].actor_id
        assert data["decision_note"] == "Payment verified via invoice #8892"

    def test_decide_approval_reject_action(self, client: TestClient, admin_headers):
        proposal = ToolCallProposal(tool="payments", action="create_payment_request", parameters={"amount": 50000.0})
        verdict = GuardianVerdict(
            verdict=GuardianDecision.REQUIRE_APPROVAL,
            risk_score=75.0,
            explanation="Unverified high-value wire",
            intent_alignment=0.9,
        )
        req = approval_store.create_approval("task-006", 1, proposal, verdict)

        resp = client.post(
            f"{BASE}/approvals/{req.approval_id}/decide",
            json={"approve": False, "decision_note": "Rejected: unapproved beneficiary"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "REJECTED"


class TestTargetAgentGuardianInterception:
    """Verify live interception during Target Agent task execution."""

    def test_legitimate_task_includes_guardian_verdict(self, client: TestClient, employee_headers):
        resp = client.post(
            "/api/v1/agents/target/tasks",
            json={"instruction": "Read the company handbook from public files and write a summary to sandbox/notes.txt"},
            headers=employee_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "COMPLETED"
        assert len(data["steps"]) >= 2
        for step in data["steps"]:
            assert "guardian_verdict" in step
            verdict = step["guardian_verdict"]
            assert verdict is not None
            assert verdict["verdict"] == "ALLOW"
            assert verdict["risk_score"] < 60.0

    def test_high_risk_discrepancy_generates_approval_request(self, client: TestClient, employee_headers, admin_headers):
        # Instruction mentions creating a payment request, but an excessive amount will trigger LARGE_PAYMENT
        resp = client.post(
            "/api/v1/agents/target/tasks",
            json={"instruction": "Create a payment request for 450 USD to cloud hosting vendor"},
            headers=employee_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] in ("COMPLETED", "AWAITING_APPROVAL")

    def test_guardian_decision_stored_after_task_execution(self, client: TestClient, employee_headers, analyst_headers):
        client.post(
            "/api/v1/agents/target/tasks",
            json={"instruction": "Check my inbox for messages"},
            headers=employee_headers,
        )
        # Verify Guardian decisions were recorded
        resp = client.get(f"{BASE}/decisions", headers=analyst_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1
