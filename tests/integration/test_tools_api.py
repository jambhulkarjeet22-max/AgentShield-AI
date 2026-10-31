"""Integration tests for the complete mock tools REST API suite."""

from fastapi.testclient import TestClient
from backend.app.tools.payments.service import VALID_PAYMENT_AUTH_CODE


def test_email_api_flow(client: TestClient, employee_headers: dict, guest_headers: dict):
    """Test full email API lifecycle through HTTP."""
    # 1. List inbox messages
    res = client.get("/api/v1/tools/email/messages", headers=employee_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 3
    assert any(m["id"] == "msg-safe-001" for m in data["messages"])

    # 2. Read specific email
    res_msg = client.get("/api/v1/tools/email/messages/msg-safe-001", headers=employee_headers)
    assert res_msg.status_code == 200
    assert res_msg.json()["subject"] == "Welcome to Agentra Corp Security Network"

    # 3. Read non-existent email -> 404
    res_404 = client.get("/api/v1/tools/email/messages/invalid-id-000", headers=employee_headers)
    assert res_404.status_code == 404
    assert res_404.json()["success"] is False

    # 4. Unauthorized actor attempting to list -> 403
    res_denied = client.get("/api/v1/tools/email/messages", headers=guest_headers)
    assert res_denied.status_code == 403

    # 5. Send simulated email
    send_payload = {
        "recipient": "lead-analyst@agentra.test",
        "subject": "Suspicious Activity Report",
        "body": "Spotted anomalous payment requests in the queue.",
    }
    res_send = client.post("/api/v1/tools/email/send", json=send_payload, headers=employee_headers)
    assert res_send.status_code == 201
    assert res_send.json()["subject"] == "Suspicious Activity Report"


def test_filesystem_api_flow(client: TestClient, employee_headers: dict, analyst_headers: dict):
    """Test full filesystem API lifecycle and security controls."""
    # 1. List files (employee sees public and internal)
    res = client.get("/api/v1/tools/files", headers=employee_headers)
    assert res.status_code == 200
    paths = {f["path"] for f in res.json()["files"]}
    assert "public/company_handbook.txt" in paths
    assert "confidential/passwords.txt" not in paths

    # 2. Read public file
    res_pub = client.get(
        "/api/v1/tools/files/content",
        params={"path": "public/company_handbook.txt"},
        headers=employee_headers,
    )
    assert res_pub.status_code == 200
    assert "AGENTRA CORP EMPLOYEE HANDBOOK" in res_pub.json()["content"]

    # 3. Read confidential file with employee -> 403 Forbidden
    res_conf_denied = client.get(
        "/api/v1/tools/files/content",
        params={"path": "confidential/passwords.txt"},
        headers=employee_headers,
    )
    assert res_conf_denied.status_code == 403

    # 4. Read confidential file with analyst -> 200 OK
    res_conf_ok = client.get(
        "/api/v1/tools/files/content",
        params={"path": "confidential/passwords.txt"},
        headers=analyst_headers,
    )
    assert res_conf_ok.status_code == 200
    assert "passwords.txt" in res_conf_ok.json()["path"]

    # 5. Path traversal attempt via API -> 403
    res_traversal = client.get(
        "/api/v1/tools/files/content",
        params={"path": "../../etc/passwd"},
        headers=analyst_headers,
    )
    assert res_traversal.status_code == 403

    # 6. Write file inside sandbox -> 201 Created
    write_payload = {
        "path": "sandbox/report_oct30.txt",
        "content": "SOC analyst verification completed.",
    }
    res_write = client.post("/api/v1/tools/files", json=write_payload, headers=employee_headers)
    assert res_write.status_code == 201
    assert res_write.json()["path"] == "sandbox/report_oct30.txt"

    # 7. Write file outside sandbox -> 403 Forbidden
    write_illegal = {
        "path": "public/overwrite_faq.txt",
        "content": "Defacement attempt",
    }
    res_illegal = client.post("/api/v1/tools/files", json=write_illegal, headers=employee_headers)
    assert res_illegal.status_code == 403


def test_browser_api_flow(client: TestClient, employee_headers: dict):
    """Test full browser API lifecycle."""
    # 1. List available simulated pages
    res = client.get("/api/v1/tools/browser/pages", headers=employee_headers)
    assert res.status_code == 200
    assert res.json()["total"] >= 4

    # 2. Get trusted page by ID
    res_page = client.get("/api/v1/tools/browser/pages/page-trusted-001", headers=employee_headers)
    assert res_page.status_code == 200
    assert res_page.json()["domain"] == "internal.company.local"

    # 3. Open page by simulated URL
    open_payload = {"url": "http://internal.company.local/wiki"}
    res_open = client.post("/api/v1/tools/browser/open", json=open_payload, headers=employee_headers)
    assert res_open.status_code == 200
    assert res_open.json()["page_id"] == "page-trusted-001"

    # 4. Open unmapped internet URL -> 404 (network air-gap enforced)
    unmapped_payload = {"url": "https://unknown-external-target.com"}
    res_unmapped = client.post("/api/v1/tools/browser/open", json=unmapped_payload, headers=employee_headers)
    assert res_unmapped.status_code == 404


def test_payment_api_flow(client: TestClient, employee_headers: dict, admin_headers: dict):
    """Test full payments API lifecycle with validation and authorization."""
    # 1. List payments
    res = client.get("/api/v1/tools/payments", headers=employee_headers)
    assert res.status_code == 200
    assert res.json()["total"] >= 3

    # 2. Create simulated payment request
    req_payload = {
        "amount": 2500.00,
        "currency": "USD",
        "recipient": "security-training-vendor",
        "description": "Annual training workshop seat registration",
    }
    res_create = client.post("/api/v1/tools/payments/request", json=req_payload, headers=employee_headers)
    assert res_create.status_code == 201
    created_tx = res_create.json()
    tx_id = created_tx["transaction_id"]
    assert created_tx["status"] == "PENDING"

    # 3. Validate negative amount rejection -> 422
    bad_amount = {
        "amount": -500.0,
        "currency": "USD",
        "recipient": "vendor",
        "description": "Negative amount test",
    }
    res_bad = client.post("/api/v1/tools/payments/request", json=bad_amount, headers=employee_headers)
    assert res_bad.status_code == 422

    # 4. Employee attempting to authorize -> 403 Forbidden
    auth_payload = {"auth_code": VALID_PAYMENT_AUTH_CODE}
    res_emp_auth = client.post(
        f"/api/v1/tools/payments/{tx_id}/authorize",
        json=auth_payload,
        headers=employee_headers,
    )
    assert res_emp_auth.status_code == 403

    # 5. Admin authorizing with invalid code -> 403 Forbidden
    res_bad_code = client.post(
        f"/api/v1/tools/payments/{tx_id}/authorize",
        json={"auth_code": "WRONG-CODE-9999"},
        headers=admin_headers,
    )
    assert res_bad_code.status_code == 403

    # 6. Admin authorizing with valid code -> 200 OK (status: COMPLETED)
    res_approved = client.post(
        f"/api/v1/tools/payments/{tx_id}/authorize",
        json=auth_payload,
        headers=admin_headers,
    )
    assert res_approved.status_code == 200
    assert res_approved.json()["status"] == "COMPLETED"


def test_audit_logs_and_reset_api(client: TestClient, admin_headers: dict, guest_headers: dict):
    """Test audit log inspection and reset endpoint."""
    # 1. Guest attempting to view audit logs -> 403 Forbidden
    res_guest = client.get("/api/v1/tools/audit-logs", headers=guest_headers)
    assert res_guest.status_code == 403

    # 2. Admin viewing audit logs -> 200 OK
    res_admin = client.get("/api/v1/tools/audit-logs", headers=admin_headers)
    assert res_admin.status_code == 200
    assert "logs" in res_admin.json()

    # 3. Admin triggering environment reset -> 200 OK
    res_reset = client.post("/api/v1/tools/reset", headers=admin_headers)
    assert res_reset.status_code == 200
    assert res_reset.json()["success"] is True


def test_phase1_health_endpoints_remain_functional(client: TestClient):
    """Ensure Phase 1 health endpoints and root metadata remain untouched and working."""
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    res_v1_health = client.get("/api/v1/health")
    assert res_v1_health.status_code == 200
    assert res_v1_health.json()["status"] == "healthy"

    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "operational"

