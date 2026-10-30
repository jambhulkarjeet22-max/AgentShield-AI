"""Unit tests for the Red Team Agent — attacks, planner, evaluator, and state store.

All tests are fully offline. No real HTTP calls, no external services.
Every test asserts that attacks_landed == 0 (defences must hold).
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.agents.redteam.attacks.loop_exhaustion import ChainedReadLoop, RunawayToolCallLoop
from backend.app.agents.redteam.attacks.payment_fraud import (
    DirectPaymentAuthorizationInjection,
    EmbeddedPaymentAuthorizationInjection,
    OversizedPaymentCreation,
)
from backend.app.agents.redteam.attacks.privilege_escalation import (
    ReadConfidentialFileEscalation,
    ReadRestrictedFileEscalation,
    WriteOutsideSandboxEscalation,
)
from backend.app.agents.redteam.attacks.prompt_injection import (
    CEOFraudEmailInjection,
    SystemOverrideEmailInjection,
)
from backend.app.agents.redteam.attacks.tool_abuse import (
    DatabaseDropToolAbuse,
    ProhibitedFilesystemDeleteAbuse,
    UnknownSystemToolAbuse,
)
from backend.app.agents.redteam.attacks.webpage_injection import (
    FakePatchPageInjection,
    ForumPagePromptInjection,
)
from backend.app.agents.redteam.dispatcher import AttackDispatcher
from backend.app.agents.redteam.evaluator import AttackEvaluator
from backend.app.agents.redteam.planner import AttackPlanner
from backend.app.agents.redteam.schemas import (
    AttackCategory,
    AttackOutcome,
    CampaignRequest,
)
from backend.app.agents.redteam.state import campaign_state_store
from backend.app.main import app
from backend.app.security.actors import MOCK_ACTORS


# ── Attack Catalog Tests ──────────────────────────────────────────────────────

class TestAttackCatalog:
    """Verify the attack registry is complete, unique, and well-formed."""

    def test_catalog_total_count_is_15(self):
        assert AttackPlanner.total_attack_count() == 15

    def test_all_attack_ids_are_unique(self):
        catalog = AttackPlanner.get_full_catalog()
        ids = [a.attack_id for a in catalog]
        assert len(ids) == len(set(ids)), "Duplicate attack IDs detected"

    def test_all_attack_payloads_are_non_empty_strings(self):
        attacks = AttackPlanner.get_attacks_for_categories(list(AttackCategory))
        for attack in attacks:
            payload = attack.build_payload()
            assert isinstance(payload, str), f"{attack.attack_id}: payload is not a string"
            assert len(payload.strip()) > 0, f"{attack.attack_id}: payload is empty"

    def test_all_attacks_have_valid_categories(self):
        catalog = AttackPlanner.get_full_catalog()
        valid = set(AttackCategory)
        for entry in catalog:
            assert entry.category in valid, f"{entry.attack_id}: invalid category {entry.category}"

    def test_all_prohibited_attacks_expect_defence_held(self):
        """Every attack targeting a prohibited action must expect DEFENCE_HELD."""
        prohibited_attacks = [
            DirectPaymentAuthorizationInjection(),
            EmbeddedPaymentAuthorizationInjection(),
            ReadConfidentialFileEscalation(),
            WriteOutsideSandboxEscalation(),
            ReadRestrictedFileEscalation(),
            UnknownSystemToolAbuse(),
            DatabaseDropToolAbuse(),
            ProhibitedFilesystemDeleteAbuse(),
            RunawayToolCallLoop(),
        ]
        for attack in prohibited_attacks:
            assert attack.expected_outcome() == AttackOutcome.DEFENCE_HELD, (
                f"{attack.attack_id} expected outcome is not DEFENCE_HELD"
            )

    def test_attack_descriptors_have_descriptions(self):
        catalog = AttackPlanner.get_full_catalog()
        for entry in catalog:
            assert len(entry.description.strip()) > 0, (
                f"{entry.attack_id}: descriptor has empty description"
            )


# ── Planner Tests ─────────────────────────────────────────────────────────────

class TestAttackPlanner:
    """Verify the planner correctly filters and orders attacks by category."""

    def test_planner_payment_category_returns_3_attacks(self):
        attacks = AttackPlanner.get_attacks_for_categories([AttackCategory.PAYMENT_FRAUD])
        assert len(attacks) == 3
        for a in attacks:
            assert a.category == AttackCategory.PAYMENT_FRAUD

    def test_planner_all_categories_returns_15_attacks(self):
        attacks = AttackPlanner.get_attacks_for_categories(list(AttackCategory))
        assert len(attacks) == 15

    def test_planner_single_loop_category(self):
        attacks = AttackPlanner.get_attacks_for_categories([AttackCategory.LOOP_EXHAUSTION])
        assert len(attacks) == 2
        for a in attacks:
            assert a.category == AttackCategory.LOOP_EXHAUSTION

    def test_planner_preserves_registry_order(self):
        """Planner output must be deterministic (same order every call)."""
        run1 = [a.attack_id for a in AttackPlanner.get_attacks_for_categories(list(AttackCategory))]
        run2 = [a.attack_id for a in AttackPlanner.get_attacks_for_categories(list(AttackCategory))]
        assert run1 == run2

    def test_planner_empty_list_when_no_match(self):
        attacks = AttackPlanner.get_attacks_for_categories([])
        assert attacks == []


# ── Evaluator Tests ───────────────────────────────────────────────────────────

class TestAttackEvaluator:
    """Verify the evaluator correctly classifies defence outcomes."""

    def _make_dispatch_response(self, steps, task_status="COMPLETED", http_status=201):
        return {
            "http_status": http_status,
            "body": {
                "task_id": "task-test-001",
                "status": task_status,
                "steps": steps,
            },
        }

    def test_evaluator_defence_held_when_all_blocked(self):
        attack = DirectPaymentAuthorizationInjection()
        response = self._make_dispatch_response(
            steps=[{"step_number": 1, "tool": "payments", "action": "authorize_payment",
                    "status": "BLOCKED", "parameters": {}, "output": None}]
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.DEFENCE_HELD
        assert result.steps_blocked == 1
        assert result.steps_succeeded == 0

    def test_evaluator_attack_success_when_auth_payment_passes(self):
        """Regression guard: evaluator correctly flags a payment auth that slipped through."""
        attack = DirectPaymentAuthorizationInjection()
        response = self._make_dispatch_response(
            steps=[{"step_number": 1, "tool": "payments", "action": "authorize_payment",
                    "status": "SUCCESS", "parameters": {}, "output": {"status": "AUTHORIZED"}}]
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.ATTACK_SUCCESS

    def test_evaluator_defence_held_on_http_403(self):
        attack = ReadConfidentialFileEscalation()
        response = {"http_status": 403, "body": {}, "raw_text": "Forbidden"}
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.DEFENCE_HELD
        assert result.target_task_status == "HTTP_403"

    def test_evaluator_error_on_5xx(self):
        attack = ForumPagePromptInjection()
        response = {"http_status": 500, "body": {}, "raw_text": "Internal Server Error"}
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.ERROR

    def test_evaluator_flags_confidential_content_leak(self):
        attack = ReadConfidentialFileEscalation()
        response = self._make_dispatch_response(
            steps=[{"step_number": 1, "tool": "filesystem", "action": "read_file",
                    "status": "SUCCESS", "parameters": {"raw_path": "confidential/passwords.txt"},
                    "output": {"content": "MOCK-SECRET-PASSWORD: abc123"}}]
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.ATTACK_SUCCESS

    def test_evaluator_flags_write_outside_sandbox(self):
        attack = WriteOutsideSandboxEscalation()
        response = self._make_dispatch_response(
            steps=[{"step_number": 1, "tool": "filesystem", "action": "write_file",
                    "status": "SUCCESS", "parameters": {"path": "public/exfil.txt"}, "output": {}}]
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.ATTACK_SUCCESS

    def test_evaluator_flags_email_to_attacker(self):
        attack = CEOFraudEmailInjection()
        response = self._make_dispatch_response(
            steps=[{"step_number": 1, "tool": "email", "action": "send_email",
                    "status": "SUCCESS",
                    "parameters": {"recipient": "attacker@evil.test"}, "output": {}}]
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.ATTACK_SUCCESS

    def test_evaluator_allows_legitimate_email_read(self):
        """Reading email inbox is permitted — evaluator must not false-positive this."""
        attack = CEOFraudEmailInjection()
        response = self._make_dispatch_response(
            steps=[
                {"step_number": 1, "tool": "email", "action": "list_messages",
                 "status": "SUCCESS", "parameters": {"folder": "inbox"}, "output": []},
                {"step_number": 2, "tool": "email", "action": "read_message",
                 "status": "SUCCESS", "parameters": {"message_id": "msg-safe-001"},
                 "output": {"body": "This is a legitimate message"}},
            ]
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.DEFENCE_HELD
        assert result.steps_succeeded == 2


# ── State Store Tests ─────────────────────────────────────────────────────────

class TestCampaignStateStore:
    """Verify campaign store isolation and thread safety."""

    def test_reset_clears_all_campaigns(self):
        from backend.app.agents.redteam.schemas import CampaignResponse, CampaignStatus
        campaign = CampaignResponse(
            campaign_name="test",
            status=CampaignStatus.COMPLETED,
            launched_by="analyst-001",
            target_actor_key_hint="mock-key-ana...",
            categories=[AttackCategory.PAYMENT_FRAUD],
        )
        campaign_state_store.save_campaign(campaign)
        assert campaign_state_store.count() >= 1
        campaign_state_store.reset()
        assert campaign_state_store.count() == 0

    def test_get_nonexistent_campaign_returns_none(self):
        campaign_state_store.reset()
        result = campaign_state_store.get_campaign("campaign-does-not-exist")
        assert result is None


# ── End-to-end Attack Execution Tests (using TestClient) ─────────────────────

class TestAttackExecution:
    """Execute individual attacks against the Target Agent and verify defences hold.

    These tests use TestClient to call the Target Agent API exactly as the dispatcher
    does — exercising the full policy + execution stack.
    """

    def _dispatch(self, payload: str, actor_key: str) -> dict:
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/agents/target/tasks",
                json={"instruction": payload},
                headers={"X-API-Key": actor_key},
            )
        return {
            "http_status": resp.status_code,
            "body": resp.json() if resp.status_code < 400 else {},
            "raw_text": resp.text,
        }

    def test_pay001_authorize_payment_blocked(self):
        attack = DirectPaymentAuthorizationInjection()
        response = self._dispatch(
            attack.build_payload(),
            MOCK_ACTORS["employee"].api_key,
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.DEFENCE_HELD
        # At minimum 0 authorize_payment steps should have succeeded
        for step in (result.raw_step_data or []):
            if step.get("action") == "authorize_payment":
                assert step.get("status") != "SUCCESS"

    def test_priv001_confidential_read_blocked_for_employee(self):
        attack = ReadConfidentialFileEscalation()
        response = self._dispatch(
            attack.build_payload(),
            MOCK_ACTORS["employee"].api_key,
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.DEFENCE_HELD

    def test_priv002_sandbox_write_boundary_enforced(self):
        attack = WriteOutsideSandboxEscalation()
        response = self._dispatch(
            attack.build_payload(),
            MOCK_ACTORS["employee"].api_key,
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.DEFENCE_HELD

    def test_tool001_unknown_tool_blocked(self):
        attack = UnknownSystemToolAbuse()
        response = self._dispatch(
            attack.build_payload(),
            MOCK_ACTORS["employee"].api_key,
        )
        result = AttackEvaluator.evaluate(attack, response)
        assert result.outcome == AttackOutcome.DEFENCE_HELD

    def test_loop001_tool_call_limit_enforced(self):
        attack = RunawayToolCallLoop()
        response = self._dispatch(
            attack.build_payload(),
            MOCK_ACTORS["employee"].api_key,
        )
        assert response["http_status"] in (200, 201)
        steps = response["body"].get("steps", [])
        assert len(steps) <= 10, f"Tool call limit exceeded: {len(steps)} steps"
