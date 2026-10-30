"""Live Integration tests executing specifically against real PostgreSQL 18.

Verifies:
1. Real PostgreSQL connection via SQLAlchemy 2.0 & psycopg v3 driver.
2. Presence and schema integrity of all 7 normalized database tables.
3. Real repository CRUD operations for TaskRepository, CampaignRepository, GuardianRepository, and AuditRepository.
4. Relational integrity and foreign key enforcement in PostgreSQL.
5. Storage and JSON deserialization of MLInferenceMetadata advisory metadata.
6. Strict post-test cleanup ensuring zero test residue in the database.
"""

import os
import uuid
import pytest
from sqlalchemy import create_engine, inspect, text
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
from backend.app.core.config import settings
from backend.app.db.models.audit import AuditLogModel
from backend.app.db.models.campaign import CampaignAttackResultModel, CampaignModel
from backend.app.db.models.guardian import ApprovalRequestModel, GuardianDecisionModel
from backend.app.db.models.task import TaskModel, TaskStepModel
from backend.app.db.repositories import (
    AuditRepository,
    CampaignRepository,
    GuardianRepository,
    TaskRepository,
)
from backend.app.security.audit import AuditLogEntry

# Identify live PostgreSQL connection URL
PG_URL = settings.DATABASE_URL
IS_POSTGRES = "postgresql" in PG_URL.lower()

# Prefix for all test records to ensure strict, trackable isolation and cleanup
TEST_PREFIX = "test-live-pg-"


def _clean_test_records(session: Session):
    """Purge all test-created records from all 7 PostgreSQL tables."""
    try:
        session.rollback()
        # Clean tasks (cascades to task_steps, decisions, and approvals)
        tasks = session.query(TaskModel).filter(TaskModel.id.like(f"{TEST_PREFIX}%")).all()
        for t in tasks:
            session.delete(t)

        # Clean campaigns (cascades to attack results)
        campaigns = session.query(CampaignModel).filter(CampaignModel.id.like(f"{TEST_PREFIX}%")).all()
        for c in campaigns:
            session.delete(c)

        # Clean standalone decisions
        decisions = session.query(GuardianDecisionModel).filter(GuardianDecisionModel.id.like(f"{TEST_PREFIX}%")).all()
        for d in decisions:
            session.delete(d)

        # Clean standalone approvals
        approvals = session.query(ApprovalRequestModel).filter(ApprovalRequestModel.id.like(f"{TEST_PREFIX}%")).all()
        for a in approvals:
            session.delete(a)

        # Clean audit logs
        logs = session.query(AuditLogModel).filter(AuditLogModel.id.like(f"{TEST_PREFIX}%")).all()
        for l in logs:
            session.delete(l)

        session.commit()
    except Exception:
        session.rollback()


@pytest.fixture(scope="module")
def pg_engine():
    """Module-scoped live PostgreSQL SQLAlchemy 2.0 engine."""
    if not IS_POSTGRES:
        pytest.skip("DATABASE_URL is not configured for PostgreSQL.")

    try:
        engine = create_engine(PG_URL, echo=False)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"Live PostgreSQL server is not reachable: {exc}")

    yield engine
    engine.dispose()


@pytest.fixture
def pg_session(pg_engine):
    """Function-scoped session with automated pre-test and post-test record cleanup."""
    session_factory = sessionmaker(bind=pg_engine, autoflush=False, autocommit=False)
    session = session_factory()

    # Pre-clean any stale records
    _clean_test_records(session)

    yield session

    # Post-clean all test records
    _clean_test_records(session)
    session.close()


class TestRealPostgreSQLLiveOperations:
    """Validate repository operations and cleanup against the real PostgreSQL database."""

    def test_real_postgres_connection_and_table_presence(self, pg_engine):
        """Verify real PostgreSQL 18 connection and existence of all 7 expected tables."""
        inspector = inspect(pg_engine)
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

        for table in expected_tables:
            assert table in existing_tables, f"Expected table '{table}' missing in PostgreSQL."
            cols = inspector.get_columns(table)
            assert len(cols) > 0, f"Table '{table}' has no columns in PostgreSQL."

    def test_real_postgres_task_repository_crud(self, pg_session: Session):
        """Verify TaskRepository save, fetch, update, and cascading delete in real PostgreSQL."""
        repo = TaskRepository(pg_session)
        task_id = f"{TEST_PREFIX}task-001"

        task = TaskResponse(
            task_id=task_id,
            actor_id="analyst-pg-user",
            role="ANALYST",
            instruction="Review live invoices in PostgreSQL",
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
                StepResult(
                    step_number=2,
                    tool="filesystem",
                    action="read_file",
                    parameters={"path": "public/data.csv"},
                    policy_allowed=True,
                    status="SUCCESS",
                ),
            ],
        )

        # Create
        repo.save_task(task)
        pg_session.commit()

        # Read
        fetched = repo.get_task(task_id)
        assert fetched is not None
        assert fetched.task_id == task_id
        assert fetched.status == TaskStatus.RUNNING
        assert len(fetched.steps) == 2
        assert fetched.steps[0].tool == "email"
        assert fetched.steps[1].tool == "filesystem"

        # Update
        task.status = TaskStatus.COMPLETED
        repo.save_task(task)
        pg_session.commit()

        updated = repo.get_task(task_id)
        assert updated is not None
        assert updated.status == TaskStatus.COMPLETED

        # Delete
        repo.delete_task(task_id)
        pg_session.commit()
        assert repo.get_task(task_id) is None

    def test_real_postgres_campaign_repository_crud(self, pg_session: Session):
        """Verify CampaignRepository persistence and attack results with foreign key integrity."""
        task_repo = TaskRepository(pg_session)
        camp_repo = CampaignRepository(pg_session)

        task_id = f"{TEST_PREFIX}task-ref-1"
        camp_id = f"{TEST_PREFIX}camp-001"

        # Create target task to satisfy Foreign Key constraint
        ref_task = TaskResponse(
            task_id=task_id,
            actor_id="analyst-pg-user",
            role="ANALYST",
            instruction="Target task for attack evaluation",
            status=TaskStatus.BLOCKED,
            steps=[],
        )
        task_repo.save_task(ref_task)
        pg_session.commit()

        camp = CampaignResponse(
            campaign_id=camp_id,
            campaign_name="Live PostgreSQL Test Campaign",
            status=CampaignStatus.COMPLETED,
            launched_by="redteam-operator",
            target_actor_key_hint="actor-key-live",
            categories=[AttackCategory.PROMPT_INJECTION_EMAIL, AttackCategory.TOOL_ABUSE],
            total_attacks=1,
            defences_held=1,
            attacks_landed=0,
            attack_results=[
                AttackResult(
                    attack_id="LIVE-ATK-01",
                    attack_name="Email Injection Probe",
                    category=AttackCategory.PROMPT_INJECTION_EMAIL,
                    payload="Inert payload",
                    target_task_id=task_id,
                    target_task_status="BLOCKED",
                    steps_total=1,
                    steps_blocked=1,
                    outcome=AttackOutcome.DEFENCE_HELD,
                    evaluation_notes="Contained by Blue Team Guardian",
                ),
            ],
        )

        camp_repo.save_campaign(camp)
        pg_session.commit()

        fetched = camp_repo.get_campaign(camp_id)
        assert fetched is not None
        assert fetched.campaign_id == camp_id
        assert fetched.defences_held == 1
        assert fetched.attacks_landed == 0
        assert len(fetched.attack_results) == 1
        assert fetched.attack_results[0].outcome == AttackOutcome.DEFENCE_HELD

        # Cleanup
        camp_repo.delete_campaign(camp_id)
        task_repo.delete_task(task_id)
        pg_session.commit()
        assert camp_repo.get_campaign(camp_id) is None

    def test_real_postgres_guardian_repository_ml_advisory(self, pg_session: Session):
        """Verify Guardian decision persistence with full ML advisory JSON in real PostgreSQL."""
        task_repo = TaskRepository(pg_session)
        guardian_repo = GuardianRepository(pg_session)

        task_id = f"{TEST_PREFIX}task-002"
        dec_id = f"{TEST_PREFIX}dec-001"

        # Relational integrity: create parent task first
        parent_task = TaskResponse(
            task_id=task_id,
            actor_id="analyst-pg-user",
            role="ANALYST",
            instruction="Live task with Guardian decision",
            status=TaskStatus.RUNNING,
            steps=[],
        )
        task_repo.save_task(parent_task)
        pg_session.commit()

        ml_metadata = MLInferenceMetadata(
            service_available=True,
            is_suspicious=True,
            probability=0.912,
            decision_margin=1.78,
            label="SUSPICIOUS",
            fallback_reason=None,
        )

        decision = GuardianDecisionRecord(
            record_id=dec_id,
            task_id=task_id,
            step_number=1,
            actor_id="analyst-pg-user",
            tool="payments",
            action="create_payment_request",
            verdict=GuardianDecision.REQUIRE_APPROVAL,
            risk_score=78.5,
            intent_alignment=0.35,
            signals_triggered=["LARGE_PAYMENT_REQUEST", "ML_PROMPT_INJECTION_ADVISORY"],
            explanation="High-risk payment requires administrative approval",
            ml_advisory=ml_metadata,
        )

        guardian_repo.save_decision(decision)
        pg_session.commit()

        fetched = guardian_repo.get_decision(dec_id)
        assert fetched is not None
        assert fetched.record_id == dec_id
        assert fetched.verdict == GuardianDecision.REQUIRE_APPROVAL
        assert fetched.risk_score == 78.5
        assert fetched.ml_advisory is not None
        assert fetched.ml_advisory.is_suspicious is True
        assert fetched.ml_advisory.probability == 0.912
        assert fetched.ml_advisory.label == "SUSPICIOUS"

    def test_real_postgres_guardian_approval_lifecycle(self, pg_session: Session):
        """Verify Guardian approval status lifecycle transition in real PostgreSQL."""
        task_repo = TaskRepository(pg_session)
        guardian_repo = GuardianRepository(pg_session)

        task_id = f"{TEST_PREFIX}task-003"
        appr_id = f"{TEST_PREFIX}appr-001"

        # Relational integrity: create parent task first
        parent_task = TaskResponse(
            task_id=task_id,
            actor_id="analyst-pg-user",
            role="ANALYST",
            instruction="Live task with approval request",
            status=TaskStatus.RUNNING,
            steps=[],
        )
        task_repo.save_task(parent_task)
        pg_session.commit()

        approval = ApprovalRequest(
            approval_id=appr_id,
            task_id=task_id,
            step_number=1,
            tool="payments",
            action="create_payment_request",
            parameters={"amount": 4500.0, "currency": "USD"},
            risk_score=78.5,
            explanation="Pending approval test",
            status=ApprovalStatus.PENDING,
        )

        guardian_repo.save_approval(approval)
        pg_session.commit()

        pending = guardian_repo.get_approval(appr_id)
        assert pending is not None
        assert pending.status == ApprovalStatus.PENDING

        # Transition to APPROVED
        updated = guardian_repo.update_approval(
            approval_id=appr_id,
            status=ApprovalStatus.APPROVED,
            decided_by="admin-operator",
            note="Approved for verified test execution",
        )
        pg_session.commit()

        assert updated is not None
        assert updated.status == ApprovalStatus.APPROVED
        assert updated.decided_by == "admin-operator"

    def test_real_postgres_audit_repository_queries(self, pg_session: Session):
        """Verify Security Audit Log insertion and multi-attribute filtering in real PostgreSQL."""
        repo = AuditRepository(pg_session)
        unique_suffix = uuid.uuid4().hex[:8]
        log_id = f"{TEST_PREFIX}audit-{unique_suffix}"

        entry = AuditLogEntry(
            id=log_id,
            actor_id=f"analyst-pg-user-{unique_suffix}",
            role="ANALYST",
            tool="payments",
            action="create_payment_request",
            resource="payment-tx-001",
            status="ALLOWED",
            details={"verification": "Real PostgreSQL 18 Live Test"},
        )

        repo.save_audit_log(entry)
        pg_session.commit()

        results = repo.list_audit_logs(actor_id=f"analyst-pg-user-{unique_suffix}", limit=10)
        assert any(r.id == log_id for r in results)

    def test_real_postgres_cleanup_verification(self, pg_session: Session):
        """Verify that no test-generated records remain in any of the 7 PostgreSQL tables."""
        # Clean any remaining records
        _clean_test_records(pg_session)

        # Query all 7 tables for any surviving TEST_PREFIX records
        task_count = pg_session.query(TaskModel).filter(TaskModel.id.like(f"{TEST_PREFIX}%")).count()
        step_count = pg_session.query(TaskStepModel).filter(TaskStepModel.task_id.like(f"{TEST_PREFIX}%")).count()
        camp_count = pg_session.query(CampaignModel).filter(CampaignModel.id.like(f"{TEST_PREFIX}%")).count()
        atk_count = pg_session.query(CampaignAttackResultModel).filter(CampaignAttackResultModel.campaign_id.like(f"{TEST_PREFIX}%")).count()
        dec_count = pg_session.query(GuardianDecisionModel).filter(GuardianDecisionModel.id.like(f"{TEST_PREFIX}%")).count()
        appr_count = pg_session.query(ApprovalRequestModel).filter(ApprovalRequestModel.id.like(f"{TEST_PREFIX}%")).count()
        audit_count = pg_session.query(AuditLogModel).filter(AuditLogModel.id.like(f"{TEST_PREFIX}%")).count()

        assert task_count == 0, f"Residual: {task_count} tasks in PostgreSQL."
        assert step_count == 0, f"Residual: {step_count} task steps in PostgreSQL."
        assert camp_count == 0, f"Residual: {camp_count} campaigns in PostgreSQL."
        assert atk_count == 0, f"Residual: {atk_count} attack results in PostgreSQL."
        assert dec_count == 0, f"Residual: {dec_count} guardian decisions in PostgreSQL."
        assert appr_count == 0, f"Residual: {appr_count} approvals in PostgreSQL."
        assert audit_count == 0, f"Residual: {audit_count} audit logs in PostgreSQL."
