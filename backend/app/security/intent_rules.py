"""Intent and authorization rules for validating actions against user instructions.

Distinguishes READ operations from WRITE operations and extracts explicit user-denied
constraints (e.g. 'do not send emails', 'do not make payments', 'no file sharing').
"""

import re
from typing import Any, Dict, Optional, Set, Tuple


# Classification of operations into read (non-mutating) vs write (mutating/state-changing)
READ_ACTIONS: Set[str] = {
    "email:list_messages",
    "email:read_message",
    "filesystem:list_files",
    "filesystem:read_file",
    "browser:list_pages",
    "browser:get_page",
    "browser:open_url",
    "payments:list_payments",
    "payments:get_payment",
}

WRITE_ACTIONS: Set[str] = {
    "email:send_email",
    "filesystem:write_file",
    "payments:create_payment_request",
    "payments:authorize_payment",
}

# Negation words matching common English negation constructs
NEGATION_WORDS = (
    r"(?:do\s+not|don'?t|never|no|stop|cannot|can'?t|should\s+not|without|prohibit\w*|forbid\w*|disallow\w*)"
)

# Specific pattern detectors for explicit negative constraints
FORBIDDEN_EMAIL_SEND_PATTERNS = [
    re.compile(rf"\b{NEGATION_WORDS}\s+(?:(?:to\s+)?send|sending|dispatch|forward|forwarding|compose|email|emailing)\b", re.IGNORECASE),
    re.compile(r"\bno\s+(?:outbound\s+)?(?:emails?|messages?)\s*(?:sending)?\b", re.IGNORECASE),
    re.compile(r"\b(?:or|nor)\s+(?:send|sending|email|emailing)\b", re.IGNORECASE),
    re.compile(r"\bdo\s+not\s+(?:send|email)\b", re.IGNORECASE),
]

FORBIDDEN_PAYMENT_PATTERNS = [
    re.compile(r"\b(?:or|nor)\s+(?:make\s+|making\s+|initiate\s+|issue\s+)?(?:payments?|wires?|transfers?)\b", re.IGNORECASE),
    re.compile(r"\b(?:or|nor)\s+pay\b", re.IGNORECASE),
    re.compile(rf"\b{NEGATION_WORDS}\s+(?:(?:to\s+)?(?:make|making|create|creating|initiate|initiating|authorize|authorizing|execute|executing|issue|issuing|do|doing)\s+)?(?:payments?|paying|wire|wires|transfers?|payouts?|funds?|transactions?)\b", re.IGNORECASE),
    re.compile(rf"\b{NEGATION_WORDS}\s+(?:to\s+)?pay(?:\s+\w+){{0,3}}\b", re.IGNORECASE),
    re.compile(r"\bno\s+(?:payments?|wires?|transfers?|payouts?)\b", re.IGNORECASE),
    re.compile(rf"\b{NEGATION_WORDS}\s+pay\b", re.IGNORECASE),
]

FORBIDDEN_FILE_WRITE_PATTERNS = [
    re.compile(rf"\b{NEGATION_WORDS}\s+(?:(?:to\s+)?write|writing|modify|modifying|save|saving|create\s+files?|edit|editing|mutate|mutating|delete|deleting)\b", re.IGNORECASE),
    re.compile(r"\bread[\s-]only\b", re.IGNORECASE),
    re.compile(r"\b(?:or|nor)\s+(?:write|writing|save|saving)\b", re.IGNORECASE),
    re.compile(r"\bdo\s+not\s+write\b", re.IGNORECASE),
]

FORBIDDEN_FILE_SHARING_PATTERNS = [
    re.compile(rf"\b{NEGATION_WORDS}\s+(?:(?:to\s+)?share|sharing|distribute|distributing|leak|leaking|exfiltrate|exfiltrating)\s*(?:files?|documents?|data|content)?\b", re.IGNORECASE),
    re.compile(r"\bno\s+(?:file\s+)?sharing\b", re.IGNORECASE),
    re.compile(r"\b(?:or|nor)\s+(?:share|sharing|distribute|distributing)\b", re.IGNORECASE),
    re.compile(r"\bdo\s+not\s+share\b", re.IGNORECASE),
]


def is_read_operation(tool: str, action: str) -> bool:
    """Return True if tool:action represents a safe, non-mutating read operation."""
    return f"{tool.lower().strip()}:{action.lower().strip()}" in READ_ACTIONS


def is_write_operation(tool: str, action: str) -> bool:
    """Return True if tool:action represents a state-mutating or outbound write operation."""
    return f"{tool.lower().strip()}:{action.lower().strip()}" in WRITE_ACTIONS


def check_explicit_email_send_denied(instruction: str) -> Tuple[bool, Optional[str]]:
    """Check if the user instruction explicitly forbids sending emails."""
    for pattern in FORBIDDEN_EMAIL_SEND_PATTERNS:
        match = pattern.search(instruction)
        if match:
            return True, match.group(0).strip()
    return False, None


def check_explicit_payments_denied(instruction: str) -> Tuple[bool, Optional[str]]:
    """Check if the user instruction explicitly forbids payments, wires, or financial transfers."""
    for pattern in FORBIDDEN_PAYMENT_PATTERNS:
        match = pattern.search(instruction)
        if match:
            return True, match.group(0).strip()
    return False, None


def check_explicit_file_write_denied(instruction: str) -> Tuple[bool, Optional[str]]:
    """Check if the user instruction explicitly forbids writing or modifying files."""
    for pattern in FORBIDDEN_FILE_WRITE_PATTERNS:
        match = pattern.search(instruction)
        if match:
            return True, match.group(0).strip()
    return False, None


def check_explicit_file_sharing_denied(instruction: str) -> Tuple[bool, Optional[str]]:
    """Check if the user instruction explicitly forbids file sharing or data exfiltration."""
    for pattern in FORBIDDEN_FILE_SHARING_PATTERNS:
        match = pattern.search(instruction)
        if match:
            return True, match.group(0).strip()
    return False, None


def is_action_explicitly_denied(
    instruction: str,
    tool: str,
    action: str,
    parameters: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, str]:
    """Inspect whether a proposed tool action violates explicit negative user constraints.

    Returns:
        (is_denied: bool, explanation: str)
    """
    if not instruction:
        return False, ""

    tool_clean = tool.lower().strip()
    action_clean = action.lower().strip()
    action_key = f"{tool_clean}:{action_clean}"

    # 1. Email Sending Check
    if action_key == "email:send_email":
        denied, phrase = check_explicit_email_send_denied(instruction)
        if denied:
            return (
                True,
                f"Action 'email:send_email' is explicitly forbidden by user instruction ('{phrase}').",
            )
        # Also check if file sharing was denied and email is being used to distribute data
        sharing_denied, share_phrase = check_explicit_file_sharing_denied(instruction)
        if sharing_denied:
            return (
                True,
                f"Action 'email:send_email' is blocked because file sharing and external distribution was forbidden ('{share_phrase}').",
            )

    # 2. Payment Operations Check
    if tool_clean == "payments":
        denied, phrase = check_explicit_payments_denied(instruction)
        if denied:
            return (
                True,
                f"Action '{action_key}' is explicitly forbidden by user instruction ('{phrase}').",
            )

    # 3. File Writing Check
    if action_key == "filesystem:write_file":
        denied, phrase = check_explicit_file_write_denied(instruction)
        if denied:
            return (
                True,
                f"Action 'filesystem:write_file' is explicitly forbidden by user instruction ('{phrase}').",
            )
        # Check if file sharing was denied and user is writing to a public/shared directory
        sharing_denied, share_phrase = check_explicit_file_sharing_denied(instruction)
        if sharing_denied:
            target_path = str((parameters or {}).get("path", "")).lower()
            if target_path.startswith("public/") or "share" in target_path:
                return (
                    True,
                    f"Action 'filesystem:write_file' to '{target_path}' is blocked because file sharing was forbidden ('{share_phrase}').",
                )

    return False, ""
