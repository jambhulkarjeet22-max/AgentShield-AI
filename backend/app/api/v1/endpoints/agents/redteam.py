"""API endpoints for the Red Team Agent — adversarial campaign management."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.testclient import TestClient

from backend.app.agents.redteam.orchestrator import RedTeamOrchestrator
from backend.app.agents.redteam.planner import AttackPlanner
from backend.app.agents.redteam.schemas import (
    AttackDescriptor,
    CampaignListResponse,
    CampaignRequest,
    CampaignResponse,
)
from backend.app.agents.redteam.state import campaign_state_store
from backend.app.core.exceptions import NotFoundError, SecurityError
from backend.app.security.actors import MockActor, get_current_actor, require_permission

router = APIRouter(prefix="/redteam", tags=["AI Agent: Red Team Agent"])


def _get_test_client() -> TestClient:
    """Create a TestClient bound to the running FastAPI application.

    The Red Team uses this to submit adversarial tasks to the Target Agent's HTTP
    API. Using TestClient keeps the call in-process (no real network socket) while
    exercising the full middleware and routing stack — the same as integration tests.
    """
    from backend.app.main import app as fastapi_app
    return TestClient(fastapi_app, raise_server_exceptions=False)


@router.post(
    "/campaigns",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Launch Red Team Attack Campaign",
    description=(
        "Launch a new adversarial campaign against the Target Agent. "
        "Selects attack instances for the requested categories and executes them "
        "sequentially, evaluating each defence outcome. "
        "Requires 'agent:submit' permission (Analyst or Admin only). "
        "The UNTRUSTED_AGENT actor cannot launch campaigns."
    ),
)
def launch_campaign(
    payload: CampaignRequest,
    actor: MockActor = Depends(require_permission("agent:submit")),
) -> CampaignResponse:
    """Launch an adversarial campaign and return the full result synchronously."""
    with _get_test_client() as client:
        return RedTeamOrchestrator.run_campaign(
            actor=actor,
            request=payload,
            client=client,
        )


@router.get(
    "/campaigns",
    response_model=CampaignListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Red Team Campaign History",
    description="Retrieve the history of all Red Team campaigns launched in this session.",
)
def list_campaigns(
    limit: int = Query(default=50, ge=1, le=100, description="Max campaigns to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    actor: MockActor = Depends(get_current_actor),
) -> CampaignListResponse:
    if not (actor.has_permission("agent:list") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:list' required to view campaign history")
    campaigns = campaign_state_store.list_campaigns(limit=limit, offset=offset)
    return CampaignListResponse(
        total=campaign_state_store.count(),
        campaigns=campaigns,
    )


@router.get(
    "/campaigns/{campaign_id}",
    response_model=CampaignResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Red Team Campaign Detail",
    description="Retrieve full detail and all attack results for a specific campaign.",
)
def get_campaign(
    campaign_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> CampaignResponse:
    if not (actor.has_permission("agent:read") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:read' required to inspect campaign detail")
    campaign = campaign_state_store.get_campaign(campaign_id)
    if not campaign:
        raise NotFoundError(f"Campaign '{campaign_id}' not found in campaign registry")
    return campaign


@router.get(
    "/campaigns/{campaign_id}/attacks",
    response_model=List[AttackDescriptor],
    status_code=status.HTTP_200_OK,
    summary="Get Per-Attack Results for a Campaign",
    description="Retrieve the attack descriptor summary for every attack in a campaign.",
)
def get_campaign_attacks(
    campaign_id: str,
    actor: MockActor = Depends(get_current_actor),
) -> List[AttackDescriptor]:
    if not (actor.has_permission("agent:read") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:read' required to inspect attack results")
    campaign = campaign_state_store.get_campaign(campaign_id)
    if not campaign:
        raise NotFoundError(f"Campaign '{campaign_id}' not found in campaign registry")
    return [
        AttackDescriptor(
            attack_id=r.attack_id,
            attack_name=r.attack_name,
            category=r.category,
            description=r.evaluation_notes,
            expected_outcome=r.outcome,
        )
        for r in campaign.attack_results
    ]


@router.get(
    "/attacks/catalog",
    response_model=List[AttackDescriptor],
    status_code=status.HTTP_200_OK,
    summary="List All Available Red Team Attacks",
    description=(
        "Returns the complete catalog of all 15 registered named attacks, "
        "their categories, descriptions, and expected outcomes."
    ),
)
def get_attack_catalog(
    actor: MockActor = Depends(get_current_actor),
) -> List[AttackDescriptor]:
    if not (actor.has_permission("agent:read") or actor.has_permission("*")):
        raise SecurityError("Permission 'agent:read' required to view attack catalog")
    return AttackPlanner.get_full_catalog()
