"""Deterministic mock LLM planner for offline testing and local development."""

import re
from typing import Any, Dict, List, Optional
from backend.app.agents.target.llm.base import BaseLLMProvider
from backend.app.agents.target.schemas import StepResult, ToolCallProposal
from backend.app.core.logging import get_logger

logger = get_logger("agentshield.agents.target.mock_planner")


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
        if "runaway loop" in text or "infinite loop" in text:
            for i in range(15):
                proposals.append(
                    ToolCallProposal(
                        tool="email",
                        action="list_messages",
                        parameters={"folder": "inbox"},
                    )
                )
            return proposals

        # 1. Email actions
        if "email" in text or "inbox" in text or "mail" in text or "message" in text:
            if "send" in text:
                recipient = "compliance@agentshield.test"
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
                if "read" in text or "check" in text:
                    # Check if a specific ID was mentioned
                    id_match = re.search(r"(msg-[a-z0-9-]+)", text)
                    msg_id = id_match.group(1) if id_match else "msg-safe-001"
                    proposals.append(
                        ToolCallProposal(
                            tool="email",
                            action="read_message",
                            parameters={"message_id": msg_id},
                        )
                    )

        # 2. Filesystem actions
        # Read and write checks are independent so an instruction like
        # "read handbook and write a summary to sandbox/..." generates BOTH steps.
        if "file" in text or "handbook" in text or "passwords" in text or "sandbox" in text:
            # --- Read step (evaluated independently of write) ---
            if "read" in text or "inspect" in text or "check" in text or ("list" in text and "file" in text):
                if "confidential" in text or "password" in text:
                    proposals.append(
                        ToolCallProposal(
                            tool="filesystem",
                            action="read_file",
                            parameters={"raw_path": "confidential/passwords.txt"},
                        )
                    )
                elif "handbook" in text:
                    proposals.append(
                        ToolCallProposal(
                            tool="filesystem",
                            action="read_file",
                            parameters={"raw_path": "public/company_handbook.txt"},
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
            if "write" in text or "save" in text or "create file" in text:
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
            proposals.append(
                ToolCallProposal(
                    tool="browser",
                    action="open_url",
                    parameters={"url": url},
                )
            )

        # 4. Payment actions
        if "payment" in text or "invoice" in text or "wire" in text or "usd" in text:
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
                proposals.append(
                    ToolCallProposal(
                        tool="payments",
                        action="create_payment_request",
                        parameters={
                            "amount": amount,
                            "currency": "USD",
                            "recipient": "cloud-hosting-vendor",
                            "description": "Simulated operational expense request",
                        },
                    )
                )
            else:
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

        return proposals

    async def summarize_results(
        self,
        instruction: str,
        steps: List[StepResult],
    ) -> str:
        """Synthesize step results into an objective task summary."""
        total = len(steps)
        successful = sum(1 for s in steps if s.status == "SUCCESS")
        blocked = sum(1 for s in steps if s.status == "BLOCKED")
        errors = sum(1 for s in steps if s.status == "ERROR")

        lines = [
            f"### Task Summary: '{instruction}'",
            f"- **Steps executed**: {total} (Success: {successful}, Blocked: {blocked}, Errors: {errors})",
            "",
            "**Action Breakdown:**",
        ]

        for s in steps:
            status_badge = f"[{s.status}]"
            if s.status == "SUCCESS":
                lines.append(f"- {status_badge} `{s.tool}:{s.action}` -> Executed successfully.")
            elif s.status == "BLOCKED":
                lines.append(f"- {status_badge} `{s.tool}:{s.action}` -> Blocked by security policy: {s.policy_reason}")
            else:
                lines.append(f"- {status_badge} `{s.tool}:{s.action}` -> Failed with error: {s.error}")

        if blocked > 0:
            lines.append("\n> [!NOTE]\n> One or more actions were blocked in adherence to security boundaries.")

        return "\n".join(lines)

