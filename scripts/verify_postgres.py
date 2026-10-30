"""Phase 7.1: Interactive PostgreSQL Connection, Alembic Migration, and CRUD Verification Script.

Executes:
1. Prompts securely for PostgreSQL password without echoing to terminal or chat.
2. Generates the git-ignored .env configuration with psycopg v3 driver URL.
3. Tests live connection to localhost:5432 / agentshield_db with SQLAlchemy 2.0.
4. Executes Alembic migrations against the real PostgreSQL database.
5. Verifies all 7 normalized tables exist in PostgreSQL.
6. Executes real CRUD transactions across all tables and cleans up test records.
"""

import getpass
import os
import sys
import urllib.parse
from datetime import datetime, timezone

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def main():
    print("=" * 70)
    print("AgentShield AI — Phase 7.1 Real PostgreSQL Verification")
    print("=" * 70)

    # 1. Obtain password securely
    password = os.environ.get("POSTGRES_PASSWORD")
    if not password:
        try:
            password = getpass.getpass("Enter password for PostgreSQL user 'postgres': ")
        except Exception:
            # Fallback if getpass is unsupported in certain environments
            print("Notice: Terminal echoing is standard. Please input password:")
            password = input().strip()

    if not password:
        print("ERROR: Password cannot be empty.")
        sys.exit(1)

    encoded_pw = urllib.parse.quote_plus(password)
    user = os.environ.get("POSTGRES_USER", "postgres")
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = int(os.environ.get("POSTGRES_PORT", 5432))
    db_name = os.environ.get("POSTGRES_DB", "agentshield_db")

    db_url = f"postgresql+psycopg://{user}:{encoded_pw}@{host}:{port}/{db_name}"

    # 2. Write or update .env file
    env_path = os.path.join(PROJECT_ROOT, ".env")
    env_content = f"""# AgentShield AI Local Environment Configuration
APP_NAME=AgentShield-AI
APP_ENV=development
DEBUG=false
API_V1_PREFIX=/api/v1
HOST=127.0.0.1
PORT=8000

# PostgreSQL Database Configuration
POSTGRES_USER={user}
POSTGRES_PASSWORD={password}
POSTGRES_HOST={host}
POSTGRES_PORT={port}
POSTGRES_DB={db_name}
DATABASE_URL={db_url}

# Connection Pooling
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_ECHO=false

# Machine Learning
MODEL_PATH=ml-model/artifacts/prompt_injection_model.joblib
ML_SERVICE_ENABLED=true
ML_SERVICE_URL=http://localhost:8001
ML_SERVICE_TIMEOUT_SECONDS=1.5
ML_PROBABILITY_THRESHOLD=0.65
ML_MARGIN_THRESHOLD=0.55

LOG_LEVEL=INFO
"""
    with open(env_path, "w", encoding="utf-8") as f:
        f.write(env_content)
    print(f"\n[+] Generated local git-ignored configuration: {env_path}")

    # Set in current process environment
    os.environ["DATABASE_URL"] = db_url
    os.environ["POSTGRES_PASSWORD"] = password

    # 3. Test Connection with SQLAlchemy 2.0
    print("\n[*] Step 1: Testing live PostgreSQL connection via SQLAlchemy 2.0 & psycopg v3...")
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.orm import Session, sessionmaker

    try:
        engine = create_engine(db_url, echo=False)
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT version(), current_database(), current_user, inet_server_addr(), inet_server_port();")
            ).fetchone()
            pg_version, curr_db, curr_user, srv_addr, srv_port = result
            print(f"    -> Connected successfully!")
            print(f"    -> PostgreSQL Version: {pg_version.split(',')[0]}")
            print(f"    -> Database: {curr_db} | User: {curr_user}")
            print(f"    -> Server Address: {srv_addr or 'localhost'}:{srv_port or 5432}")
    except Exception as exc:
        print(f"\n[!] Connection FAILED to {user}@{host}:{port}/{db_name}:")
        print(f"    Error: {exc}")
        print("\nPlease verify that:")
        print("1. PostgreSQL service is running on port 5432.")
        print(f"2. Database '{db_name}' exists (created via: CREATE DATABASE agentshield_db;).")
        print("3. Password provided is correct.")
        sys.exit(1)

    # 4. Run Alembic Migrations
    print("\n[*] Step 2: Executing Alembic migrations against real PostgreSQL...")
    from alembic.config import Config
    from alembic import command

    alembic_ini_path = os.path.join(PROJECT_ROOT, "alembic.ini")
    alembic_cfg = Config(alembic_ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    try:
        command.upgrade(alembic_cfg, "head")
        print("    -> Alembic migration '001_initial_schema' successfully applied to 'head'!")
    except Exception as exc:
        print(f"[!] Alembic migration failed: {exc}")
        sys.exit(1)

    # 5. Verify 7 Tables in PostgreSQL
    print("\n[*] Step 3: Verifying 7 expected tables exist in PostgreSQL...")
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    expected_tables = [
        "tasks",
        "task_steps",
        "campaigns",
        "campaign_attack_results",
        "guardian_decisions",
        "guardian_approvals",
        "audit_logs",
    ]

    missing = [t for t in expected_tables if t not in existing_tables]
    if missing:
        print(f"[!] Missing expected tables in PostgreSQL: {missing}")
        sys.exit(1)

    for t in expected_tables:
        col_count = len(inspector.get_columns(t))
        fk_count = len(inspector.get_foreign_keys(t))
        ix_count = len(inspector.get_indexes(t))
        print(f"    [OK] Table '{t:<24}': {col_count:2d} cols | {fk_count} FKs | {ix_count} indexes")

    # 6. Real CRUD Verification with Safe Test Records
    print("\n[*] Step 4: Executing real CRUD transactions against PostgreSQL...")
    from backend.app.agents.guardian.schemas import (
        ApprovalRequest,
        ApprovalStatus,
        GuardianDecision,
        GuardianDecisionRecord,
        MLInferenceMetadata,
    )
    from backend.app.agents.redteam.schemas import (
        AttackCategory,
        AttackOutcome,
        AttackResult,
        CampaignResponse,
        CampaignStatus,
    )
    from backend.app.agents.target.schemas import StepResult, TaskResponse, TaskStatus
    from backend.app.db.repositories import (
        AuditRepository,
        CampaignRepository,
        GuardianRepository,
        TaskRepository,
    )
    from backend.app.security.audit import AuditLogEntry

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = SessionLocal()

    task_repo = TaskRepository(session)
    camp_repo = CampaignRepository(session)
    guardian_repo = GuardianRepository(session)
    audit_repo = AuditRepository(session)

    test_task_id = "task-pg-verify-001"
    test_camp_id = "camp-pg-verify-001"
    test_gdec_id = "gdec-pg-verify-001"
    test_appr_id = "appr-pg-verify-001"
    test_audit_id = "audit-pg-verify-001"

    try:
        # A. Task CRUD
        task = TaskResponse(
            task_id=test_task_id,
            actor_id="postgres-test-actor",
            role="ANALYST",
            instruction="Verify PostgreSQL task execution lifecycle",
            status=TaskStatus.RUNNING,
            steps=[
                StepResult(
                    step_number=1,
                    tool="email",
                    action="list_emails",
                    parameters={"folder": "inbox"},
                    policy_allowed=True,
                    status="SUCCESS",
                ),
            ],
        )
        task_repo.save_task(task)
        session.commit()
        fetched_task = task_repo.get_task(test_task_id)
        assert fetched_task is not None, "Failed to retrieve task from PostgreSQL"
        assert len(fetched_task.steps) == 1, "Failed to retrieve task step from PostgreSQL"
        print("    -> Task & TaskStep CRUD verified.")

        # B. Campaign CRUD
        camp = CampaignResponse(
            campaign_id=test_camp_id,
            campaign_name="PostgreSQL Verification Campaign",
            status=CampaignStatus.COMPLETED,
            launched_by="postgres-test-actor",
            target_actor_key_hint="test-key-hint",
            categories=[AttackCategory.PROMPT_INJECTION_EMAIL],
            total_attacks=1,
            defences_held=1,
            attacks_landed=0,
            attack_results=[
                AttackResult(
                    attack_id="PI-PG-001",
                    attack_name="PostgreSQL Verification Attack",
                    category=AttackCategory.PROMPT_INJECTION_EMAIL,
                    payload="Inert verification payload",
                    target_task_id=test_task_id,
                    target_task_status="BLOCKED",
                    steps_total=1,
                    steps_blocked=1,
                    outcome=AttackOutcome.DEFENCE_HELD,
                    evaluation_notes="Verified containment in PostgreSQL",
                ),
            ],
        )
        camp_repo.save_campaign(camp)
        session.commit()
        fetched_camp = camp_repo.get_campaign(test_camp_id)
        assert fetched_camp is not None, "Failed to retrieve campaign from PostgreSQL"
        assert len(fetched_camp.attack_results) == 1, "Failed to retrieve attack result"
        print("    -> Campaign & CampaignAttackResult CRUD verified.")

        # C. Guardian Decision with ML Advisory Metadata CRUD
        ml_meta = MLInferenceMetadata(
            service_available=True,
            is_suspicious=True,
            probability=0.875,
            decision_margin=1.52,
            label="SUSPICIOUS",
            fallback_reason=None,
        )
        decision = GuardianDecisionRecord(
            record_id=test_gdec_id,
            task_id=test_task_id,
            step_number=1,
            actor_id="postgres-test-actor",
            tool="filesystem",
            action="read_file",
            verdict=GuardianDecision.BLOCK,
            risk_score=85.0,
            intent_alignment=0.2,
            signals_triggered=["INTENT_MISMATCH", "ML_PROMPT_INJECTION_ADVISORY"],
            explanation="Action blocked during PostgreSQL integration test",
            ml_advisory=ml_meta,
        )
        guardian_repo.save_decision(decision)
        session.commit()
        fetched_dec = guardian_repo.get_decision(test_gdec_id)
        assert fetched_dec is not None, "Failed to retrieve Guardian decision from PostgreSQL"
        assert fetched_dec.ml_advisory is not None, "Failed to retrieve ML advisory metadata"
        assert fetched_dec.ml_advisory.probability == 0.875, "ML probability mismatch"
        print("    -> GuardianDecision with ML Advisory JSON CRUD verified.")

        # D. Guardian Approval CRUD
        approval = ApprovalRequest(
            approval_id=test_appr_id,
            task_id=test_task_id,
            step_number=1,
            tool="payments",
            action="create_payment_request",
            parameters={"amount": 1000.0, "currency": "USD"},
            risk_score=65.0,
            explanation="Test approval request",
            status=ApprovalStatus.PENDING,
        )
        guardian_repo.save_approval(approval)
        session.commit()

        updated_appr = guardian_repo.update_approval(
            approval_id=test_appr_id,
            status=ApprovalStatus.APPROVED,
            decided_by="postgres-admin",
            note="Verified via PostgreSQL integration test",
        )
        session.commit()
        assert updated_appr is not None and updated_appr.status == ApprovalStatus.APPROVED
        print("    -> Guardian Approval lifecycle (PENDING -> APPROVED) verified.")

        # E. Audit Log CRUD
        audit_entry = AuditLogEntry(
            id=test_audit_id,
            actor_id="postgres-test-actor",
            role="ANALYST",
            tool="database_verifier",
            action="verify_crud",
            resource="postgresql/agentshield_db",
            status="ALLOWED",
            details={"verification": "Phase 7.1"},
        )
        audit_repo.save_audit_log(audit_entry)
        session.commit()
        logs = audit_repo.list_audit_logs(actor_id="postgres-test-actor")
        assert any(l.id == test_audit_id for l in logs), "Failed to retrieve audit log from PostgreSQL"
        print("    -> Security Audit Log CRUD verified.")

        # Cleanup test records
        print("\n[*] Step 5: Cleaning up verification test records from PostgreSQL...")
        task_repo.delete_task(test_task_id)
        camp_repo.delete_campaign(test_camp_id)

        # Remove decision, approval, audit log
        from backend.app.db.models.guardian import ApprovalRequestModel, GuardianDecisionModel
        from backend.app.db.models.audit import AuditLogModel

        dec_model = session.get(GuardianDecisionModel, test_gdec_id)
        if dec_model:
            session.delete(dec_model)
        appr_model = session.get(ApprovalRequestModel, test_appr_id)
        if appr_model:
            session.delete(appr_model)
        audit_model = session.get(AuditLogModel, test_audit_id)
        if audit_model:
            session.delete(audit_model)

        session.commit()
        print("    -> Cleaned up test records cleanly.")

    finally:
        session.close()
        engine.dispose()

    print("\n" + "=" * 70)
    print("SUCCESS: Phase 7.1 Real PostgreSQL verification completed 100% successfully!")
    print("All 7 tables migrated and verified in PostgreSQL database 'agentshield_db'.")
    print("=" * 70)


if __name__ == "__main__":
    main()

