"""Intent Verification Engine for Blue Team Guardian.

Determines whether a proposed tool action aligns with the user's natural language instruction.
Operates deterministically without external API calls or non-deterministic ML models.
"""

import re
from typing import Dict, List, Set
from backend.app.agents.target.schemas import ToolCallProposal


class IntentVerifier:
    """Verifies intent alignment between user instructions and proposed agent tool actions."""

    # Category-level semantic keyword associations
    TOOL_KEYWORD_MAP: Dict[str, Set[str]] = {
        "email": {
            "email", "emails", "mail", "inbox", "message", "messages",
            "outbox", "newsletter", "correspondence",
        },
        "filesystem": {
            "file", "files", "document", "documents", "handbook", "password",
            "passwords", "sandbox", "filesystem", "directory",
        },
        "browser": {
            "browser", "browse", "web", "website", "webpage", "url",
            "http", "https", "link", "forum", "wiki", "portal", "cve",
        },
        "payments": {
            "payment", "payments", "pay", "invoice", "invoices", "wire", "transfer",
            "transaction", "transactions", "usd", "dollar", "$", "vendor",
            "fee", "fees", "expense", "expenses", "procurement",
        },
    }

    # Action-specific keywords for finer alignment checks
    ACTION_KEYWORD_MAP: Dict[str, Set[str]] = {
        "send_email": {"send", "email", "mail", "compose", "dispatch", "forward"},
        "read_message": {"read", "check", "inspect", "open", "view", "message", "latest", "inbox"},
        "list_messages": {"list", "check", "inbox", "messages", "emails", "overview", "scan"},
        "read_file": {"read", "inspect", "check", "open", "view", "examine", "content", "handbook", "password"},
        "write_file": {"write", "save", "create", "store", "record", "append", "update", "notes", "summary"},
        "list_files": {"list", "show", "files", "directory", "folder", "inventory", "available"},
        "open_url": {"browse", "open", "visit", "url", "webpage", "site", "forum", "wiki", "http", "https"},
        "get_page": {"page", "view", "read", "article", "thread", "forum"},
        "list_pages": {"list", "pages", "sites", "directory", "catalog"},
        "create_payment_request": {"create", "payment", "request", "invoice", "wire", "transfer", "bill", "expense"},
        "authorize_payment": {"authorize", "approve", "execute", "confirm payment", "sign off"},
        "list_payments": {"list", "payments", "transactions", "invoices", "overview"},
        "get_payment": {"payment", "transaction", "invoice", "details", "status"},
    }

    @classmethod
    def score(cls, instruction: str, proposal: ToolCallProposal) -> float:
        """Compute an alignment score between 0.0 (no alignment) and 1.0 (full alignment).

        Score calculation:
          - Base category match: 0.6 if category keywords are present
          - Specific action match: up to +0.4 for action keywords
          - Specific parameter match (e.g. filename, url, email mention): bonus or penalty
        """
        text = instruction.lower()
        tool = proposal.tool.lower().strip()
        action = proposal.action.lower().strip()

        # Tokenize instruction words
        words = set(re.findall(r"\b[a-z0-9_.-]+\b", text))

        category_keywords = cls.TOOL_KEYWORD_MAP.get(tool, set())
        action_keywords = cls.ACTION_KEYWORD_MAP.get(action, set())

        # Check category match
        cat_matches = words.intersection(category_keywords)
        action_matches = words.intersection(action_keywords)

        # Check if URL, path or specific target from parameter is mentioned in instruction
        param_match_boost = 0.0
        params = proposal.parameters or {}
        for param_val in params.values():
            if isinstance(param_val, str) and param_val:
                val_clean = param_val.lower().strip()
                # Check for direct inclusion of file path or URL fragments
                if val_clean in text or any(part in text for part in re.split(r"[/@.]", val_clean) if len(part) > 3):
                    param_match_boost = 0.2
                    break

        if not cat_matches and not action_matches and param_match_boost == 0.0:
            return 0.0

        if not cat_matches and param_match_boost == 0.0:
            # When the tool category is not referenced and no parameter matches,
            # generic action verbs alone (e.g. "check", "view") provide minimal alignment.
            return min(0.15, len(action_matches) * 0.1)

        score = 0.0
        if cat_matches:
            # Having category keywords contributes up to 0.5
            score += min(0.5, len(cat_matches) * 0.25)

        if action_matches:
            # Having action-specific keywords contributes up to 0.35
            score += min(0.35, len(action_matches) * 0.2)

        score += param_match_boost

        return min(1.0, max(0.0, round(score, 2)))
