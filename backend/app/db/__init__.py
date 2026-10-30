"""Database module initialization for AgentShield AI."""

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
from backend.app.db.session import (
    check_db_connection,
    create_db_engine,
    get_db,
    get_engine,
    get_session_factory,
    reset_db_engine,
    set_engine_override,
)

__all__ = [
    "Base",
    "get_engine",
    "get_session_factory",
    "create_db_engine",
    "set_engine_override",
    "reset_db_engine",
    "get_db",
    "check_db_connection",
    "TaskModel",
    "TaskStepModel",
    "CampaignModel",
    "CampaignAttackResultModel",
    "GuardianDecisionModel",
    "ApprovalRequestModel",
    "AuditLogModel",
]

