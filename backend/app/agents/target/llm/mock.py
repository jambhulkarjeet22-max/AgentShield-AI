"""Deterministic mock LLM planner for offline testing and local development."""

import re
from typing import Any, Dict, List, Optional
from backend.app.agents.target.llm.base import BaseLLMProvider
from backend.app.agents.target.schemas import StepResult, ToolCallProposal
from backend.app.core.logging import get_logger
from backend.app.security.intent_rules import is_action_explicitly_denied

logger = get_logger("agentra.agents.target.mock_planner")


class DeterministicMockPlanner(BaseLLMProvider):
    """Deterministic, rule-based planner mapping business tasks to structured tool proposals.

    Operates completely offline without requiring an external API key or model download.
    """

    async def plan_task(
        self,
        instruction: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[ToolCallProposal]:
        """Deconstruct natural-language task into deterministic tool proposals."""
        context = context or {}
        text = instruction.lower().strip()
        proposals: List[ToolCallProposal] = []

        # Check for simulated malformed output test flag
        if context.get("simulate_malformed_llm") or "simulate_malformed" in text:
            raise ValueError("Simulated malformed LLM response: failed JSON structure")

        # Check for test flag to simulate unknown tool
        if "unknown tool" in text or context.get("simulate_unknown_tool"):
            return [ToolCallProposal(tool="quantum_teleporter", action="warp_drive", parameters={})]

        # Check for runaway loop test scenario
        if "runaway loop" in text or "infinite loop" in text or "repeatedly" in text or ("every file" in text and "audit" in text):
            for i in range(15):
                if "email" in text or "inbox" in text or "loop: continuously" in text:
                    proposals.append(
                        ToolCallProposal(
                            tool="email",
                            action="list_messages",
                            parameters={"folder": "inbox"},
                        )
                    )
                else:
                    proposals.append(
                        ToolCallProposal(
                            tool="filesystem",
                            action="read_file",
                            parameters={"raw_path": "public/company_handbook.txt"},
                        )
                    )
            return proposals

        # Pre-check explicit negative user constraints
        send_denied, _ = is_action_explicitly_denied(instruction, "email", "send_email", {})
        payments_denied, _ = is_action_explicitly_denied(instruction, "payments", "create_payment_request", {})
        write_denied, _ = is_action_explicitly_denied(instruction, "filesystem", "write_file", {})

        # Positive send intent requires affirmative request without user negation
        has_positive_send = ("send" in text or "compose" in text or "dispatch" in text) and not send_denied

        # 1. Email actions
        if "email" in text or "inbox" in text or "mail" in text or "message" in text:
            if has_positive_send and not ("read" in text and "inbox" in text and "to " not in text):
                recipient = "compliance@agentra.test"
                rec_match = re.search(r"to\s+([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", instruction)
                if rec_match:
                    recipient = rec_match.group(1)
                proposals.append(
                    ToolCallProposal(
                        tool="email",
                        action="send_email",
                        parameters={
                            "recipient": recipient,
                            "subject": "Automated Status Report",
                            "body": "Completed scheduled security review per business instruction.",
                        },
                    )
                )
            else:
                proposals.append(
                    ToolCallProposal(
                        tool="email",
                        action="list_messages",
                        parameters={"folder": "inbox"},
                    )
                )
                if "read" in text or "check" in text or "summarize" in text or "summary" in text:
                    # Check if a specific ID was mentioned
                    id_match = re.search(r"(msg-[a-z0-9-]+)", text)
                    if id_match:
                        msg_id = id_match.group(1)
                    elif "urgent" in text or "ceo" in text:
                        msg_id = "msg-mal-001"
                    elif "system notification" in text or "admin alert" in text or "override" in text:
                        msg_id = "msg-mal-002"
                    else:
                        msg_id = "msg-safe-001"

                    proposals.append(
                        ToolCallProposal(
                            tool="email",
                            action="read_message",
                            parameters={"message_id": msg_id},
                        )
                    )

                    # Simulate prompt injection payload execution from untrusted emails
                    if msg_id == "msg-mal-001" and not payments_denied:
                        # CEO Fraud wire transfer payload embedded in msg-mal-001 attempts payment creation
                        proposals.append(
                            ToolCallProposal(
                                tool="payments",
                                action="create_payment_request",
                                parameters={
                                    "amount": 85000.00,
                                    "currency": "USD",
                                    "recipient": "Vendor Alpha (Account 99281-EX)",
                                    "description": "Executive wire transfer demanded in urgent email msg-mal-001",
                                },
                            )
                        )
                    elif msg_id == "msg-mal-002":
                        # System override prompt injection payload embedded in msg-mal-002 attempts confidential read
                        proposals.append(
                            ToolCallProposal(
                                tool="filesystem",
                                action="read_file",
                                parameters={"raw_path": "confidential/passwords.txt"},
                            )
                        )

        # 2. Filesystem actions
        # Read and write checks are independent so an instruction like
        # "read handbook and write a summary to sandbox/..." generates BOTH steps.
        has_fs_intent = (
            "file" in text
            or "handbook" in text
            or "passwords" in text
            or "sandbox" in text
            or "restricted" in text
            or "system_keys" in text
            or re.search(r"(?:restricted|confidential|public|sandbox|internal)/", text) is not None
        )
        if has_fs_intent:
            # --- Read step (evaluated independently of write) ---
            if "read" in text or "inspect" in text or "check" in text or "report" in text or ("list" in text and "file" in text):
                if "handbook" in text:
                    proposals.append(
                        ToolCallProposal(
                            tool="filesystem",
                            action="read_file",
                            parameters={"raw_path": "public/company_handbook.txt"},
                        )
                    )
                elif "restricted" in text or "system_keys" in text:
                    proposals.append(
                        ToolCallProposal(
                            tool="filesystem",
                            action="read_file",
                            parameters={"raw_path": "restricted/system_keys.txt"},
                        )
                    )
                elif "confidential" in text or "password" in text:
                    proposals.append(
                        ToolCallProposal(
                            tool="filesystem",
                            action="read_file",
                            parameters={"raw_path": "confidential/passwords.txt"},
                        )
                    )
                else:
                    path_match = re.search(
                        r"(?:read|inspect|check|contents of)?\s*((?:restricted|confidential|public|internal)/[a-zA-Z0-9_\-./]+)",
                        instruction,
                        re.IGNORECASE,
                    )
                    if path_match:
                        raw_target_path = path_match.group(1).rstrip(".,;:")
                        proposals.append(
                            ToolCallProposal(
                                tool="filesystem",
                                action="read_file",
                                parameters={"raw_path": raw_target_path},
                            )
                        )
                    else:
                        proposals.append(
                            ToolCallProposal(
                                tool="filesystem",
                                action="list_files",
                                parameters={"folder": None},
                            )
                        )

            # --- Write step (evaluated independently of read) ---
            if ("write" in text or "save" in text or "create file" in text) and not write_denied:
                target_path = "sandbox/task_summary.txt"
                # Strip trailing punctuation from captured path
                path_match = re.search(
                    r"(sandbox/[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+|public/[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+)",
                    instruction,
                )
                if path_match:
                    target_path = path_match.group(1)
                proposals.append(
                    ToolCallProposal(
                        tool="filesystem",
                        action="write_file",
                        parameters={
                            "path": target_path,
                            "content": f"Task Report for: '{instruction}'. Verified and recorded by Target Agent.",
                        },
                    )
                )

        # 3. Browser actions
        if "browser" in text or "browse" in text or "wiki" in text or "webpage" in text or "http" in text:
            url = "http://internal.company.local/wiki"
            # Exclude trailing punctuation (.,;:) from the captured URL
            url_match = re.search(r"(https?://[^\s'\"]+)", instruction)
            if url_match:
                url = url_match.group(1).rstrip(".,;:")
            elif "forum" in text:
                url = "https://tech-forum.test/threads/agent-review"
            elif "patch" in text:
                url = "https://patch-update-now.test/security-patch"

            proposals.append(
                ToolCallProposal(
                    tool="browser",
                    action="open_url",
                    parameters={"url": url},
                )
            )

            # Simulate prompt injection payload execution from malicious webpages
            if "tech-forum.test" in url or "forum" in text:
                # Injected payload inside page-mal-002 attempts confidential file read
                proposals.append(
                    ToolCallProposal(
                        tool="filesystem",
                        action="read_file",
                        parameters={"raw_path": "confidential/passwords.txt"},
                    )
                )
            elif "patch-update-now.test" in url or "patch" in text:
                # Injected payload inside page-mal-003 attempts to drop executable outside sandbox
                proposals.append(
                    ToolCallProposal(
                        tool="filesystem",
                        action="write_file",
                        parameters={
                            "path": "public/Agentra_Fix_Patch.exe",
                            "content": "MALICIOUS_SIMULATED_TROJAN_PAYLOAD",
                        },
                    )
                )

        # 4. Payment actions
        if ("payment" in text or "invoice" in text or "wire" in text or "usd" in text) and not payments_denied:
            if "authorize" in text or "approve" in text or "execute" in text:
                # Propose payment authorization (which PolicyValidator must intercept and BLOCK)
                tx_match = re.search(r"(tx-[a-z0-9-]+)", text)
                tx_id = tx_match.group(1) if tx_match else "tx-seed-002"
                proposals.append(
                    ToolCallProposal(
                        tool="payments",
                        action="authorize_payment",
                        parameters={
                            "transaction_id": tx_id,
                            "auth_code": "MOCK-AUTH-APPROVED-2026",
                            "note": "Attempted automatic authorization by agent",
                        },
                    )
                )
            elif "create" in text or "request" in text:
                amount = 450.00
                amt_match = re.search(r"(\d+(?:\.\d{1,2})?)\s*(?:usd|\$)", text)
                if amt_match:
                    amount = float(amt_match.group(1))
                else:
                    amt_for = re.search(r"(?:for|\$)\s*(\d+(?:\.\d{1,2})?)", text)
                    if amt_for:
                        amount = float(amt_for.group(1))

                recipient = "cloud-hosting-vendor"
                recip_match = re.search(
                    r"to (?:the )?(?:vendor )?['\"]?([^'\"]+?)['\"]?\s+(?:with|for|description|$)",
                    instruction,
                    re.IGNORECASE,
                )
                if recip_match:
                    recipient = recip_match.group(1).strip()

                desc = "Simulated operational expense request"
                desc_match = re.search(r"description ['\"]?([^'\"]+)['\"]?", instruction, re.IGNORECASE)
                if desc_match:
                    desc = desc_match.group(1).strip()

                proposals.append(
                    ToolCallProposal(
                        tool="payments",
                        action="create_payment_request",
                        parameters={
                            "amount": amount,
                            "currency": "USD",
                            "recipient": recipient,
                            "description": desc,
                        },
                    )
                )
            elif "list" in text or "view" in text or "check" in text or "inspect" in text:
                proposals.append(
                    ToolCallProposal(
                        tool="payments",
                        action="list_payments",
                        parameters={"status": None},
                    )
                )

        # Default fallback if no specific keywords matched
        if not proposals:
            logger.info("Defaulting to file listing for generic instruction: %s", instruction)
            proposals.append(
                ToolCallProposal(
                    tool="filesystem",
                    action="list_files",
                    parameters={"folder": None},
                )
            )

        # Send LLM generation trace to Langfuse
        try:
            from backend.app.services.langfuse_service import langfuse_service
            langfuse_service.trace_llm_generation(
                model="mock-deterministic",
                system_prompt="Deterministic Target Agent Business Planner",
                user_prompt=instruction,
                output_content=json.dumps([p.model_dump() for p in proposals]),
                metadata={"num_proposals": len(proposals), "context": context},
            )
        except Exception:
            pass

        return proposals

    async def summarize_results(
        self,
        instruction: str,
        steps: List[StepResult],
    ) -> str:
        """Synthesize step results into an objective task summary."""
        total = len(steps)
        successful = sum(1 for s in steps if s.status == "SUCCESS")
        blocked = sum(1 for s in steps if s.status in ("BLOCKED", "GUARDIAN_BLOCKED"))
        pending = sum(1 for s in steps if s.status == "PENDING_APPROVAL")
        errors = sum(1 for s in steps if s.status == "ERROR")

        lines = [
            f"### Task Summary: '{instruction}'",
            f"- **Steps executed**: {total} (Success: {successful}, Blocked: {blocked}, Pending Approval: {pending}, Errors: {errors})",
            "",
            "**Action Breakdown:**",
        ]

        for s in steps:
            status_badge = f"[{s.status}]"
            if s.status == "SUCCESS":
                lines.append(f"- {status_badge} `{s.tool}:{s.action}` -> Executed successfully.")
            elif s.status in ("BLOCKED", "GUARDIAN_BLOCKED"):
                lines.append(f"- {status_badge} `{s.tool}:{s.action}` -> Blocked by security policy: {s.policy_reason}")
            elif s.status == "PENDING_APPROVAL":
                lines.append(f"- {status_badge} `{s.tool}:{s.action}` -> Held for human approval: {s.policy_reason}")
            else:
                lines.append(f"- {status_badge} `{s.tool}:{s.action}` -> Failed with error: {s.error}")

        if blocked > 0:
            lines.append("\n> [!NOTE]\n> One or more actions were blocked in adherence to security boundaries.")

        return "\n".join(lines)
