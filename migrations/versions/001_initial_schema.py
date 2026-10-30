"""Initial normalized schema for AgentShield AI.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-30 20:15:00.000000

Creates the 7 approved normalized tables:
- tasks
- task_steps
- campaigns
- campaign_attack_results
- guardian_decisions
- guardian_approvals
- audit_logs
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Tasks Table ────────────────────────────────────────────────────────
    op.create_table(
        "tasks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("context", sa.JSON(), nullable=True),
    )
    op.create_index("ix_tasks_actor_id", "tasks", ["actor_id"])
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_created_at", "tasks", ["created_at"])

    # ── 2. Task Steps Table ───────────────────────────────────────────────────
    op.create_table(
        "task_steps",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("task_id", sa.String(length=36), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_number", sa.Integer(), nullable=False),
        sa.Column("tool", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("parameters", sa.JSON(), nullable=False),
        sa.Column("policy_allowed", sa.Boolean(), nullable=False),
        sa.Column("policy_reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("output", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("task_id", "step_number", name="uq_task_step_number"),
    )
    op.create_index("ix_task_steps_task_id", "task_steps", ["task_id"])
    op.create_index("ix_task_steps_tool", "task_steps", ["tool"])
    op.create_index("ix_task_steps_status", "task_steps", ["status"])

    # ── 3. Campaigns Table ────────────────────────────────────────────────────
    op.create_table(
        "campaigns",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("launched_by", sa.String(length=64), nullable=False),
        sa.Column("target_actor_key_hint", sa.String(length=32), nullable=False),
        sa.Column("categories", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_attacks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("defences_held", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_to_trigger", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("attacks_landed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("errors", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
    )
    op.create_index("ix_campaigns_status", "campaigns", ["status"])
    op.create_index("ix_campaigns_launched_by", "campaigns", ["launched_by"])
    op.create_index("ix_campaigns_started_at", "campaigns", ["started_at"])

    # ── 4. Campaign Attack Results Table ──────────────────────────────────────
    op.create_table(
        "campaign_attack_results",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("campaign_id", sa.String(length=36), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attack_id", sa.String(length=64), nullable=False),
        sa.Column("attack_name", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("target_task_id", sa.String(length=36), nullable=False),
        sa.Column("target_task_status", sa.String(length=32), nullable=False),
        sa.Column("steps_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("steps_blocked", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("guardian_blocks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("steps_succeeded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("steps_errored", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("evaluation_notes", sa.Text(), nullable=False),
        sa.Column("raw_step_data", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_campaign_attack_results_campaign_id", "campaign_attack_results", ["campaign_id"])
    op.create_index("ix_campaign_attack_results_attack_id", "campaign_attack_results", ["attack_id"])
    op.create_index("ix_campaign_attack_results_category", "campaign_attack_results", ["category"])
    op.create_index("ix_campaign_attack_results_target_task_id", "campaign_attack_results", ["target_task_id"])
    op.create_index("ix_campaign_attack_results_outcome", "campaign_attack_results", ["outcome"])

    # ── 5. Guardian Decisions Table ───────────────────────────────────────────
    op.create_table(
        "guardian_decisions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("task_id", sa.String(length=36), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("step_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("tool", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("verdict", sa.String(length=32), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("intent_alignment", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("signals_triggered", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("ml_advisory", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_guardian_decisions_task_id", "guardian_decisions", ["task_id"])
    op.create_index("ix_guardian_decisions_actor_id", "guardian_decisions", ["actor_id"])
    op.create_index("ix_guardian_decisions_tool", "guardian_decisions", ["tool"])
    op.create_index("ix_guardian_decisions_verdict", "guardian_decisions", ["verdict"])
    op.create_index("ix_guardian_decisions_timestamp", "guardian_decisions", ["timestamp"])

    # ── 6. Guardian Approvals Table ───────────────────────────────────────────
    op.create_table(
        "guardian_approvals",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("task_id", sa.String(length=36), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("step_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("tool", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("parameters", sa.JSON(), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("decided_by", sa.String(length=64), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
    )
    op.create_index("ix_guardian_approvals_task_id", "guardian_approvals", ["task_id"])
    op.create_index("ix_guardian_approvals_status", "guardian_approvals", ["status"])

    # ── 7. Audit Logs Table ───────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("tool", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("resource", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_tool", "audit_logs", ["tool"])
    op.create_index("ix_audit_logs_resource", "audit_logs", ["resource"])
    op.create_index("ix_audit_logs_status", "audit_logs", ["status"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("guardian_approvals")
    op.drop_table("guardian_decisions")
    op.drop_table("campaign_attack_results")
    op.drop_table("campaigns")
    op.drop_table("task_steps")
    op.drop_table("tasks")

