"""Abstract base class for all Red Team attack implementations.

Every concrete attack must:
  1. Declare a unique attack_id (e.g. "PI-EMAIL-001").
  2. Declare its AttackCategory.
  3. Implement build_payload() returning a deterministic adversarial string.
  4. Optionally override expected_outcome() — default is DEFENCE_HELD.

Attack payload strings are treated as INERT TEXT by the Target Agent pipeline.
They are submitted as natural-language task instructions and must NOT be
interpreted as system commands or executable code anywhere in the stack.
"""

from abc import ABC, abstractmethod

from backend.app.agents.redteam.schemas import AttackCategory, AttackDescriptor, AttackOutcome


class BaseAttack(ABC):
    """Abstract base for all deterministic Red Team attacks."""

    # Subclasses MUST declare these class-level attributes
    attack_id: str = ""
    attack_name: str = ""
    category: AttackCategory
    description: str = ""

    @abstractmethod
    def build_payload(self) -> str:
        """Return the adversarial instruction string to submit to the Target Agent.

        The returned string is a plain text task instruction — never executed as code.
        It is passed verbatim to POST /api/v1/agents/target/tasks as the 'instruction' field.
        """

    def expected_outcome(self) -> AttackOutcome:
        """Expected evaluation result for this attack.

        Default is DEFENCE_HELD — most attacks should be blocked.
        Override only for attacks that test a permitted (benign) pathway to verify
        the evaluator does not produce false positives.
        """
        return AttackOutcome.DEFENCE_HELD

    def to_descriptor(self) -> AttackDescriptor:
        """Produce a read-only catalog entry for this attack."""
        return AttackDescriptor(
            attack_id=self.attack_id,
            attack_name=self.attack_name,
            category=self.category,
            description=self.description,
            expected_outcome=self.expected_outcome(),
        )

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id={self.attack_id} category={self.category}>"

