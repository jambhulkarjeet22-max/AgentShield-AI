"""Mock actor registry, roles, and deterministic permission management."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Dict, List, Optional, Set
from fastapi import Header, Request

from backend.app.core.exceptions import AuthenticationError, SecurityError
from backend.app.core.logging import get_logger

logger = get_logger("agentshield.security.actors")


class Role(str, Enum):
    """Predefined system roles with distinct privilege boundaries."""

    ADMIN = "ADMIN"
    SECURITY_ANALYST = "SECURITY_ANALYST"
    EMPLOYEE = "EMPLOYEE"
    GUEST = "GUEST"
    UNTRUSTED_AGENT = "UNTRUSTED_AGENT"
    ANONYMOUS = "ANONYMOUS"


@dataclass(frozen=True)
class MockActor:
    """Represents an authenticated mock actor within the simulation."""

    actor_id: str
    role: Role
    description: str
    api_key: str
    permissions: Set[str] = field(default_factory=set)

    def has_permission(self, permission: str) -> bool:
        """Check if actor holds a specific permission or universal admin."""
        if "*" in self.permissions or f"{permission.split(':')[0]}:*" in self.permissions:
            return True
        return permission in self.permissions


# Deterministic Mock Actor Directory with fixed preconfigured credentials
MOCK_ACTORS: Dict[str, MockActor] = {
    "admin": MockActor(
        actor_id="admin-001",
        role=Role.ADMIN,
        description="System Administrator with full access to all mock tools",
        api_key="mock-key-admin-secret-7701",
        permissions={"*"},
    ),
    "analyst": MockActor(
        actor_id="analyst-001",
        role=Role.SECURITY_ANALYST,
        description="Blue Team / Security Analyst with investigation permissions",
        api_key="mock-key-analyst-secret-5502",
        permissions={
            "email:read",
            "email:list",
            "files:read_public",
            "files:read_internal",
            "files:read_confidential",
            "files:list",
            "browser:open",
            "browser:list",
            "payments:read",
            "payments:list",
            "audit:read",
            "agent:submit",
            "agent:read",
            "agent:list",
        },
    ),
    "employee": MockActor(
        actor_id="employee-001",
        role=Role.EMPLOYEE,
        description="Standard simulated enterprise employee",
        api_key="mock-key-employee-secret-3303",
        permissions={
            "email:read",
            "email:list",
            "email:send",
            "files:read_public",
            "files:read_internal",
            "files:write_sandbox",
            "files:list",
            "browser:open",
            "browser:list",
            "payments:create",
            "payments:read",
            "payments:list",
            "agent:submit",
            "agent:read",
            "agent:list",
        },
    ),
    "guest": MockActor(
        actor_id="guest-001",
        role=Role.GUEST,
        description="External guest with read-only access to public assets",
        api_key="mock-key-guest-secret-1104",
        permissions={
            "files:read_public",
            "files:list",
            "browser:open",
            "browser:list",
        },
    ),
    "untrusted_agent": MockActor(
        actor_id="untrusted-agent-001",
        role=Role.UNTRUSTED_AGENT,
        description="Red Team or untrusted AI agent under evaluation",
        api_key="mock-key-untrusted-agent-0000",
        permissions={
            "files:read_public",
            "browser:open",
            "browser:list",
            "payments:list",
        },
    ),
}

# Lookup map by API Key for deterministic verification
API_KEY_TO_ACTOR: Dict[str, MockActor] = {
    "mock-key-admin-secret-7701": MOCK_ACTORS["admin"],
    "mock-key-admin-secret-9901": MOCK_ACTORS["admin"],
    **{
        actor.api_key: actor for actor in MOCK_ACTORS.values()
    }

}

# Default unauthenticated actor with least privilege
DEFAULT_ANONYMOUS_ACTOR = MockActor(
    actor_id="anonymous-user",
    role=Role.ANONYMOUS,
    description="Unauthenticated visitor with minimal public access",
    api_key="",
    permissions={"files:read_public", "browser:open", "browser:list"},
)


def get_mock_actor(api_key: Optional[str]) -> MockActor:
    """Retrieve actor by API key or return safe anonymous actor.
    
    Self-reported actor names in headers are NEVER trusted on their own.
    Only valid registered mock API keys resolve to privileged actors.
    """
    if not api_key:
        return DEFAULT_ANONYMOUS_ACTOR

    actor = API_KEY_TO_ACTOR.get(api_key.strip())
    if not actor:
        logger.warning("Unrecognized mock API key provided: %s", api_key[:8] + "...")
        return DEFAULT_ANONYMOUS_ACTOR

    return actor


async def get_current_actor(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    x_mock_auth: Optional[str] = Header(None, alias="X-Mock-Auth"),
) -> MockActor:
    """FastAPI dependency to extract and authenticate the mock actor from request headers."""
    # Check X-API-Key or X-Mock-Auth
    key = x_api_key or x_mock_auth
    actor = get_mock_actor(key)
    # Attach actor to request state for audit middleware/handlers
    request.state.actor = actor
    return actor


def require_permission(required_permission: str) -> Callable:
    """Dependency factory enforcing strict permission checking on an endpoint."""

    async def permission_checker(
        request: Request,
        x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
        x_mock_auth: Optional[str] = Header(None, alias="X-Mock-Auth"),
    ) -> MockActor:
        key = x_api_key or x_mock_auth
        actor = get_mock_actor(key)
        request.state.actor = actor

        if not actor.has_permission(required_permission):
            logger.warning(
                "Access DENIED: actor '%s' (role: %s) lacks required permission '%s'",
                actor.actor_id,
                actor.role.value,
                required_permission,
            )
            raise SecurityError(
                message=f"Access denied: permission '{required_permission}' required",
                details={
                    "actor_id": actor.actor_id,
                    "role": actor.role.value,
                    "required_permission": required_permission,
                },
            )
        return actor

    return permission_checker

