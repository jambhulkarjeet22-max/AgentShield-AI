"""Unit tests for SQLAlchemy 2.0 ORM models, relationships, and constraints in AgentShield AI."""

import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from backend.app.db.base import Base
from backend.app.db.models import (
    ApprovalRequestModel,
    AuditLogModel,
    CampaignAttackResultModel,
    CampaignModel,
    GuardianDecisionModel,
    TaskModel,
    TaskStepModel,
)


@pytest.fixture
def db_session():
    """Create an isolated in-memory SQLite database and session for unit testing models."""
    engine = create_engine("sqlite+pysqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


class TestTaskModels:
    """Verify TaskModel and TaskStepModel schema, cascading, and constraints."""

    def test_create_task_with_steps(self, db_session: Session):
        task = TaskModel(
            id="task-unit-001",
            actor_id="employee-001",
            role="EMPLOYEE",
            instruction="Review policy documents",
            status="RUNNING",
        )
        step1 = TaskStepModel(
            id="step-001-1",
            task_id="task-unit-001",
            step_number=1,
            tool="filesystem",
            action="read_file",
            parameters={"path": "public/handbook.txt"},
            policy_allowed=True,
            status="SUCCESS",
        )
        task.steps.append(step1)
        db_session.add(task)
        db_session.commit()

        # Query back
        fetched = db_session.get(TaskModel, "task-unit-001")
        assert fetched is not None
        assert fetched.actor_id == "employee-001"
        assert len(fetched.steps) == 1
        assert fetched.steps[0].action == "read_file"

    def test_cascading_delete_task_removes_steps(self, db_session: Session):
        task = TaskModel(
            id="task-unit-cascade",
            actor_id="analyst-001",
            role="ANALYST",
            instruction="Audit system",
            status="COMPLETED",
        )
        step = TaskStepModel(
            id="step-casc-1",
            task_id="task-unit-cascade",
            step_number=1,
            tool="email",
            action="list_emails",
            parameters={},
            policy_allowed=True,
            status="SUCCESS",
        )
        task.steps.append(step)
        db_session.add(task)
        db_session.commit()

        # Delete parent task
        db_session.delete(task)
        db_session.commit()

        assert db_session.get(TaskModel, "task-unit-cascade") is None
        assert db_session.get(TaskStepModel, "step-casc-1") is None


class TestCampaignModels:
    """Verify CampaignModel and CampaignAttackResultModel."""

    def test_create_campaign_and_attack_results(self, db_session: Session):
        campaign = CampaignModel(
            id="camp-unit-001",
            name="Quarterly Red Team Audit",
            status="COMPLETED",
            launched_by="analyst-001",
            target_actor_key_hint="mock-key-emp",
            categories=["prompt_injection_email", "privilege_escalation"],
            total_attacks=2,
            defences_held=2,
        )
        res1 = CampaignAttackResultModel(
            id="att-res-001",
            campaign_id="camp-unit-001",
            attack_id="PI-EMAIL-001",
            attack_name="Phishing Injection",
            category="prompt_injection_email",
            payload="Malicious prompt payload",
            target_task_id="task-target-001",
            target_task_status="BLOCKED",
            steps_total=1,
            steps_blocked=1,
            outcome="DEFENCE_HELD",
            evaluation_notes="Action intercepted by Blue Guardian",
        )
        campaign.attack_results.append(res1)
        db_session.add(campaign)
        db_session.commit()

        fetched = db_session.get(CampaignModel, "camp-unit-001")
        assert fetched is not None
        assert len(fetched.attack_results) == 1
        assert fetched.attack_results[0].outcome == "DEFENCE_HELD"


class TestGuardianModels:
    """Verify GuardianDecisionModel and ApprovalRequestModel with ML advisory data."""

    def test_guardian_decision_stores_ml_advisory_json(self, db_session: Session):
        ml_data = {
            "service_available": True,
            "is_suspicious": True,
            "probability": 0.88,
            "decision_margin": 1.45,
            "label": "SUSPICIOUS",
            "fallback_reason": None,
        }
        decision = GuardianDecisionModel(
            id="gdec-unit-001",
            task_id=None,
            step_number=1,
            actor_id="analyst-001",
            tool="filesystem",
            action="read_file",
            verdict="BLOCK",
            risk_score=85.0,
            intent_alignment=0.1,
            signals_triggered=["INTENT_MISMATCH", "ML_PROMPT_INJECTION_ADVISORY"],
            explanation="Blocked due to high risk prompt injection",
            ml_advisory=ml_data,
        )
        db_session.add(decision)
        db_session.commit()

        fetched = db_session.get(GuardianDecisionModel, "gdec-unit-001")
        assert fetched is not None
        assert fetched.verdict == "BLOCK"
        assert fetched.ml_advisory is not None
        assert fetched.ml_advisory["probability"] == 0.88
        assert fetched.ml_advisory["is_suspicious"] is True

    def test_approval_request_lifecycle(self, db_session: Session):
        approval = ApprovalRequestModel(
            id="appr-unit-001",
            task_id=None,
            step_number=1,
            tool="payments",
            action="create_payment_request",
            parameters={"amount": 5000.0, "currency": "USD"},
            risk_score=70.0,
            explanation="Requires admin review",
            status="PENDING",
        )
        db_session.add(approval)
        db_session.commit()

        fetched = db_session.get(ApprovalRequestModel, "appr-unit-001")
        assert fetched.status == "PENDING"

        # Update decision
        fetched.status = "APPROVED"
        fetched.decided_by = "admin-001"
        fetched.decided_at = datetime.now(timezone.utc)
        fetched.decision_note = "Authorized vendor payment"
        db_session.commit()

        updated = db_session.get(ApprovalRequestModel, "appr-unit-001")
        assert updated.status == "APPROVED"
        assert updated.decided_by == "admin-001"


class TestAuditLogModel:
    """Verify AuditLogModel creation and indexing."""

    def test_create_audit_log(self, db_session: Session):
        log = AuditLogModel(
            id="audit-unit-001",
            actor_id="admin-001",
            role="ADMIN",
            tool="payments",
            action="authorize_payment",
            resource="pay-12345",
            status="ALLOWED",
            details={"note": "Manual executive clearance"},
        )
        db_session.add(log)
        db_session.commit()

        fetched = db_session.get(AuditLogModel, "audit-unit-001")
        assert fetched is not None
        assert fetched.tool == "payments"
        assert fetched.details["note"] == "Manual executive clearance"

