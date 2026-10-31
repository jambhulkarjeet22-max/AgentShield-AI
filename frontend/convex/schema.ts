import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  campaigns: defineTable({
    campaign_id: v.string(),
    campaign_name: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
    total_attacks: v.number(),
    defences_held: v.number(),
    attacks_landed: v.number(),
    failed_to_trigger: v.number(),
    errors: v.number(),
    categories: v.array(v.string()),
    started_at: v.string(),
    completed_at: v.optional(v.string()),
    summary: v.optional(v.string()),
    attack_results: v.array(v.any()),
  })
    .index("by_campaign_id", ["campaign_id"])
    .index("by_status", ["status"]),

  audit_logs: defineTable({
    event_id: v.string(),
    timestamp: v.string(),
    actor_id: v.string(),
    role: v.string(),
    tool: v.string(),
    action: v.string(),
    status: v.string(), // "ALLOWED" | "DENIED" | "WARNING"
    resource: v.optional(v.string()),
    details: v.optional(v.any()),
  })
    .index("by_event_id", ["event_id"])
    .index("by_actor", ["actor_id"])
    .index("by_status", ["status"]),

  guardian_decisions: defineTable({
    decision_id: v.string(),
    task_id: v.string(),
    step_number: v.number(),
    verdict: v.string(), // "ALLOW" | "REQUIRE_APPROVAL" | "BLOCK"
    risk_score: v.number(),
    explanation: v.string(),
    signals: v.array(v.any()),
    timestamp: v.string(),
  })
    .index("by_decision_id", ["decision_id"])
    .index("by_task_id", ["task_id"])
    .index("by_verdict", ["verdict"]),

  approvals: defineTable({
    approval_id: v.string(),
    task_id: v.string(),
    step_number: v.number(),
    tool: v.string(),
    action: v.string(),
    status: v.string(), // "PENDING" | "APPROVED" | "REJECTED"
    requested_at: v.string(),
    decided_at: v.optional(v.string()),
    decided_by: v.optional(v.string()),
    rationale: v.optional(v.string()),
  })
    .index("by_approval_id", ["approval_id"])
    .index("by_status", ["status"]),

  attack_catalog: defineTable({
    attack_id: v.string(),
    name: v.string(),
    category: v.string(),
    description: v.string(),
    target_tool: v.string(),
    severity: v.string(),
    expected_outcome: v.string(),
  }).index("by_attack_id", ["attack_id"]),

  messages: defineTable({
    body: v.string(),
    author: v.string(),
  }).index("by_author", ["author"]),
});

