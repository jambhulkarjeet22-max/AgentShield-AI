"""Autonomous agents package for Agentra AI."""

from backend.app.agents.target import (
    StepResult,
    TargetAgentOrchestrator,
    TaskListResponse,
    TaskResponse,
    TaskStatus,
    TaskSubmissionRequest,
    ToolCallProposal,
    task_state_store,
)
from backend.app.agents.redteam import (
    AttackCategory,
    AttackOutcome,
    AttackResult,
    CampaignListResponse,
    CampaignRequest,
    CampaignResponse,
    CampaignStatus,
    campaign_state_store,
)
from backend.app.agents.guardian import (
    ApprovalDecision,
    ApprovalListResponse,
    ApprovalRequest,
    ApprovalStatus,
    BlueTeamGuardian,
    GuardianDecision,
    GuardianDecisionListResponse,
    GuardianDecisionRecord,
    GuardianVerdict,
    RiskScorer,
    RiskSignal,
    approval_store,
    guardian_decision_store,
)

__all__ = [
    # Target Agent (Phase 3)
    "TargetAgentOrchestrator",
    "task_state_store",
    "TaskStatus",
    "ToolCallProposal",
    "StepResult",
    "TaskSubmissionRequest",
    "TaskResponse",
    "TaskListResponse",
    # Red Team Agent (Phase 4)
    "AttackCategory",
    "AttackOutcome",
    "AttackResult",
    "CampaignRequest",
    "CampaignResponse",
    "CampaignStatus",
    "CampaignListResponse",
    "campaign_state_store",
    # Blue Team Guardian (Phase 5)
    "BlueTeamGuardian",
    "GuardianDecision",
    "GuardianVerdict",
    "RiskSignal",
    "RiskScorer",
    "ApprovalRequest",
    "ApprovalStatus",
    "ApprovalDecision",
    "ApprovalListResponse",
    "GuardianDecisionRecord",
    "GuardianDecisionListResponse",
    "approval_store",
    "guardian_decision_store",
]
