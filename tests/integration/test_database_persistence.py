"""Integration tests for Database Repositories, CRUD, migrations, and failure handling."""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

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
from backend.app.db.base import Base
from backend.app.db.repositories import (
    AuditRepository,
    CampaignRepository,
    GuardianRepository,
    TaskRepository,
)
from backend.app.db.session import check_db_connection, set_engine_override
from backend.app.security.audit import AuditLogEntry


@pytest.fixture
def test_db_session():
    """Isolated database session using an in-memory SQLite database configured with full schema."""
    engine = create_engine("sqlite+pysqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    set_engine_override(engine)

    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()

    yield session

    session.close()
    Base.metadata.drop_all(engine)
    set_engine_override(None)


class TestTaskRepositoryPersistence:
    """Verify TaskRepository persistence, retrieval, and step syncing."""

    def test_save_and_retrieve_task(self, test_db_session: Session):
        repo = TaskRepository(test_db_session)

        task_data = TaskResponse(
            task_id="task-integ-001",
            actor_id="analyst-001",
            role="ANALYST",
            instruction="Audit mock payment ledger",
            status=TaskStatus.RUNNING,
            steps=[
                StepResult(
                    step_number=1,
                    tool="payments",
                    action="list_payments",
                    parameters={"limit": 10},
                    policy_allowed=True,
                    status="SUCCESS",
                ),
            ],
        )

        saved = repo.save_task(task_data)
        test_db_session.commit()

        assert saved.task_id == "task-integ-001"

        # Query back
        fetched = repo.get_task("task-integ-001")
        assert fetched is not None
        assert fetched.instruction == "Audit mock payment ledger"
        assert len(fetched.steps) == 1
        assert fetched.steps[0].action == "list_payments"

    def test_list_tasks_and_filter_by_actor(self, test_db_session: Session):
        repo = TaskRepository(test_db_session)

        t1 = TaskResponse(task_id="task-1", actor_id="user-a", role="EMPLOYEE", instruction="Task 1")
        t2 = TaskResponse(task_id="task-2", actor_id="user-b", role="ANALYST", instruction="Task 2")
        t3 = TaskResponse(task_id="task-3", actor_id="user-a", role="EMPLOYEE", instruction="Task 3")

        repo.save_task(t1)
        repo.save_task(t2)
        repo.save_task(t3)
        test_db_session.commit()

        user_a_tasks = repo.list_tasks(actor_id="user-a")
        assert len(user_a_tasks) == 2
        assert repo.count(actor_id="user-a") == 2
        assert repo.count() == 3


class TestCampaignRepositoryPersistence:
    """Verify CampaignRepository persistence with granular attack evaluations."""

    def test_save_and_retrieve_campaign(self, test_db_session: Session):
        repo = CampaignRepository(test_db_session)

        camp = CampaignResponse(
            campaign_id="camp-integ-001",
            campaign_name="Automated Red Team Defense Test",
            status=CampaignStatus.COMPLETED,
            launched_by="analyst-001",
            target_actor_key_hint="mock-key-abc",
            categories=[AttackCategory.PROMPT_INJECTION_EMAIL, AttackCategory.TOOL_ABUSE],
            total_attacks=1,
            defences_held=1,
            attacks_landed=0,
            attack_results=[
                AttackResult(
                    attack_id="PI-EMAIL-001",
                    attack_name="Prompt Injection via Email",
                    category=AttackCategory.PROMPT_INJECTION_EMAIL,
                    payload="Ignore rules",
                    target_task_id="task-target-99",
                    target_task_status="BLOCKED",
                    steps_total=1,
                    steps_blocked=1,
                    outcome=AttackOutcome.DEFENCE_HELD,
                    evaluation_notes="Contained by Blue Guardian",
                ),
            ],
        )

        repo.save_campaign(camp)
        test_db_session.commit()

        fetched = repo.get_campaign("camp-integ-001")
        assert fetched is not None
        assert fetched.defences_held == 1
        assert len(fetched.attack_results) == 1
        assert fetched.attack_results[0].attack_id == "PI-EMAIL-001"


class TestGuardianRepositoryPersistence:
    """Verify Guardian decision audit and approval queue persistence."""

    def test_save_decision_with_ml_advisory_roundtrip(self, test_db_session: Session):
        repo = GuardianRepository(test_db_session)

        ml_meta = MLInferenceMetadata(
            service_available=True,
            is_suspicious=True,
            probability=0.91,
            decision_margin=1.72,
            label="SUSPICIOUS",
            fallback_reason=None,
        )

        record = GuardianDecisionRecord(
            record_id="gdec-integ-001",
            task_id="task-integ-001",
            step_number=1,
            actor_id="analyst-001",
            tool="filesystem",
            action="read_file",
            verdict=GuardianDecision.BLOCK,
            risk_score=85.0,
            intent_alignment=0.15,
            signals_triggered=["INTENT_MISMATCH", "ML_PROMPT_INJECTION_ADVISORY"],
            explanation="Blocked due to adversarial prompt injection signal",
            ml_advisory=ml_meta,
        )

        repo.save_decision(record)
        test_db_session.commit()

        fetched = repo.get_decision("gdec-integ-001")
        assert fetched is not None
        assert fetched.verdict == GuardianDecision.BLOCK
        assert fetched.ml_advisory is not None
        assert fetched.ml_advisory.probability == 0.91
        assert fetched.ml_advisory.decision_margin == 1.72

    def test_approval_lifecycle(self, test_db_session: Session):
        repo = GuardianRepository(test_db_session)

        appr = ApprovalRequest(
            approval_id="appr-integ-001",
            task_id="task-test-hold",
            step_number=2,
            tool="payments",
            action="create_payment_request",
            parameters={"amount": 4500.0, "currency": "USD"},
            risk_score=65.0,
            explanation="Requires supervisor authorization",
            status=ApprovalStatus.PENDING,
        )

        repo.save_approval(appr)
        test_db_session.commit()

        # Update decision
        updated = repo.update_approval(
            approval_id="appr-integ-001",
            status=ApprovalStatus.APPROVED,
            decided_by="admin-001",
            note="Approved for procurement",
        )
        test_db_session.commit()

        assert updated is not None
        assert updated.status == ApprovalStatus.APPROVED
        assert updated.decided_by == "admin-001"
        assert updated.decision_note == "Approved for procurement"


class TestAuditRepositoryPersistence:
    """Verify AuditRepository logging and multi-field queries."""

    def test_save_and_filter_audit_logs(self, test_db_session: Session):
        repo = AuditRepository(test_db_session)

        e1 = AuditLogEntry(
            id="audit-1",
            actor_id="emp-1",
            role="EMPLOYEE",
            tool="email",
            action="read_email",
            resource="msg-001",
            status="ALLOWED",
        )
        e2 = AuditLogEntry(
            id="audit-2",
            actor_id="guest-1",
            role="GUEST",
            tool="filesystem",
            action="read_file",
            resource="confidential/keys.txt",
            status="DENIED",
        )

        repo.save_audit_log(e1)
        repo.save_audit_log(e2)
        test_db_session.commit()

        denied_logs = repo.list_audit_logs(status="DENIED")
        assert len(denied_logs) == 1
        assert denied_logs[0].actor_id == "guest-1"

        email_logs = repo.list_audit_logs(tool="email")
        assert len(email_logs) == 1
        assert email_logs[0].action == "read_email"


class TestDatabaseConnectionHealthProbe:
    """Verify health probe utility."""

    def test_check_db_connection_success(self, test_db_session: Session):
        success, msg = check_db_connection()
        assert success is True
        assert "operational" in msg.lower()


class TestAlembicMigrations:
    """Verify Alembic schema migration upgrade and downgrade scripts."""

    def test_alembic_upgrade_and_downgrade(self):
        import tempfile
        from alembic.config import Config
        from alembic import command
        from sqlalchemy import inspect

        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            db_url = f"sqlite:///{tmp_path.replace(os.sep, '/')}"
            alembic_cfg = Config("alembic.ini")
            alembic_cfg.set_main_option("sqlalchemy.url", db_url)

            # 1. Upgrade to head
            command.upgrade(alembic_cfg, "head")

            # Verify all 7 approved tables exist
            engine = create_engine(db_url)
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            assert "tasks" in tables
            assert "task_steps" in tables
            assert "campaigns" in tables
            assert "campaign_attack_results" in tables
            assert "guardian_decisions" in tables
            assert "guardian_approvals" in tables
            assert "audit_logs" in tables
            engine.dispose()

            # 2. Downgrade to base
            command.downgrade(alembic_cfg, "base")

            engine = create_engine(db_url)
            inspector = inspect(engine)
            tables_after = inspector.get_table_names()
            assert "tasks" not in tables_after
            assert "campaigns" not in tables_after
            engine.dispose()
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
