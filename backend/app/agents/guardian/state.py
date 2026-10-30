"""Thread-safe store for Blue Team Guardian decision audit records."""

import threading
from typing import Dict, List, Optional

from backend.app.agents.guardian.schemas import (
    GuardianDecision,
    GuardianDecisionRecord,
    GuardianVerdict,
)
from backend.app.agents.target.schemas import ToolCallProposal


class GuardianDecisionStore:
    """In-memory historical registry of all security evaluations rendered by the Guardian."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._decisions: Dict[str, GuardianDecisionRecord] = {}

    def record_decision(
        self,
        task_id: str,
        step_number: int,
        actor_id: str,
        proposal: ToolCallProposal,
        verdict: GuardianVerdict,
    ) -> GuardianDecisionRecord:
        """Record an evaluation outcome for audit and observability."""
        record = GuardianDecisionRecord(
            task_id=task_id,
            step_number=step_number,
            actor_id=actor_id,
            tool=proposal.tool,
            action=proposal.action,
            verdict=verdict.verdict,
            risk_score=verdict.risk_score,
            signals_triggered=[s.signal_id for s in verdict.signals_triggered],
            explanation=verdict.explanation,
            intent_alignment=verdict.intent_alignment,
            ml_advisory=verdict.ml_advisory,
        )
        with self._lock:
            self._decisions[record.record_id] = record
        return record

    def get_decision(self, record_id: str) -> Optional[GuardianDecisionRecord]:
        with self._lock:
            return self._decisions.get(record_id)

    def list_decisions(
        self,
        verdict: Optional[GuardianDecision] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[GuardianDecisionRecord]:
        with self._lock:
            items = list(self._decisions.values())

        if verdict:
            items = [d for d in items if d.verdict == verdict]

        sorted_items = sorted(items, key=lambda d: d.timestamp, reverse=True)
        return sorted_items[offset : offset + limit]

    def count(self) -> int:
        with self._lock:
            return len(self._decisions)

    def reset(self) -> None:
        """Reset decision store (used for test teardown)."""
        with self._lock:
            self._decisions.clear()


guardian_decision_store = GuardianDecisionStore()

