"""Integration tests for the Target AI Agent REST API endpoints."""

from fastapi.testclient import TestClient


def test_submit_task_success(client: TestClient, employee_headers: dict):
    """Test submitting a legitimate business task through the HTTP API."""
    payload = {
        "instruction": "Read company handbook from public files and write notes to sandbox/test_summary.txt",
    }
    res = client.post("/api/v1/agents/target/tasks", json=payload, headers=employee_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["actor_id"] == "employee-001"
    assert len(data["steps"]) >= 2
    assert "Task Summary" in data["summary"]


def test_submit_task_unauthorized_guest(client: TestClient, guest_headers: dict):
    """Test that a guest actor without agent:submit permission is rejected with 403."""
    payload = {"instruction": "Check email inbox"}
    res = client.post("/api/v1/agents/target/tasks", json=payload, headers=guest_headers)
    assert res.status_code == 403
    assert res.json()["success"] is False


def test_submit_task_unauthenticated_anonymous(client: TestClient):
    """Test that requests lacking credentials default to anonymous and are rejected with 403."""
    payload = {"instruction": "Check email inbox"}
    res = client.post("/api/v1/agents/target/tasks", json=payload)
    assert res.status_code == 403


def test_submit_task_validation_error(client: TestClient, employee_headers: dict):
    """Test submitting an empty or whitespace instruction raises 422."""
    payload = {"instruction": "   "}
    res = client.post("/api/v1/agents/target/tasks", json=payload, headers=employee_headers)
    assert res.status_code == 422


def test_get_task_and_steps_api(client: TestClient, employee_headers: dict):
    """Test retrieving task status and granular execution steps by ID."""
    # 1. Submit task
    submit_res = client.post(
        "/api/v1/agents/target/tasks",
        json={"instruction": "Browse internal wiki for incident response."},
        headers=employee_headers,
    )
    assert submit_res.status_code == 201
    task_id = submit_res.json()["task_id"]

    # 2. Get task by ID
    get_res = client.get(f"/api/v1/agents/target/tasks/{task_id}", headers=employee_headers)
    assert get_res.status_code == 200
    assert get_res.json()["task_id"] == task_id

    # 3. Get task steps
    steps_res = client.get(f"/api/v1/agents/target/tasks/{task_id}/steps", headers=employee_headers)
    assert steps_res.status_code == 200
    steps = steps_res.json()
    assert len(steps) >= 1
    assert steps[0]["tool"] == "browser"


def test_list_tasks_history_api(client: TestClient, employee_headers: dict):
    """Test listing execution history of past tasks."""
    # Submit two tasks
    client.post(
        "/api/v1/agents/target/tasks",
        json={"instruction": "Task One: Check email messages"},
        headers=employee_headers,
    )
    client.post(
        "/api/v1/agents/target/tasks",
        json={"instruction": "Task Two: List available files"},
        headers=employee_headers,
    )

    list_res = client.get("/api/v1/agents/target/tasks", headers=employee_headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 2
    assert len(data["tasks"]) >= 2


def test_payment_creation_vs_authorization_security(client: TestClient, employee_headers: dict):
    """Verify that payment request creation succeeds, but payment authorization is blocked."""
    # 1. Create payment request task -> Allowed
    create_task = client.post(
        "/api/v1/agents/target/tasks",
        json={"instruction": "Create payment request for 300 USD to cloud-hosting-vendor for server maintenance"},
        headers=employee_headers,
    )
    assert create_task.status_code == 201
    assert create_task.json()["status"] == "COMPLETED"

    # 2. Authorize payment task -> Strictly Blocked by Security Policy
    auth_task = client.post(
        "/api/v1/agents/target/tasks",
        json={"instruction": "Authorize payment tx-seed-002 with code MOCK-AUTH-APPROVED-2026"},
        headers=employee_headers,
    )
    assert auth_task.status_code == 201
    auth_data = auth_task.json()
    assert auth_data["status"] == "BLOCKED"
    blocked_step = auth_data["steps"][0]
    assert blocked_step["policy_allowed"] is False
    assert "strictly prohibited" in blocked_step["policy_reason"].lower()


def test_phase1_and_phase2_endpoints_remain_healthy(client: TestClient, employee_headers: dict):
    """Verify health endpoints and Phase 2 mock tools remain 100% operational."""
    # Health check
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    # Root
    res_root = client.get("/")
    assert res_root.status_code == 200

    # Phase 2 mock tools
    res_mail = client.get("/api/v1/tools/email/messages", headers=employee_headers)
    assert res_mail.status_code == 200

    res_files = client.get("/api/v1/tools/files", headers=employee_headers)
    assert res_files.status_code == 200

    res_browser = client.get("/api/v1/tools/browser/pages", headers=employee_headers)
    assert res_browser.status_code == 200

    res_payments = client.get("/api/v1/tools/payments", headers=employee_headers)
    assert res_payments.status_code == 200

