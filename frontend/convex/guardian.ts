import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listDecisions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("guardian_decisions")
      .order("desc")
      .take(limit);
  },
});

export const recordDecision = mutation({
  args: {
    decision_id: v.string(),
    task_id: v.string(),
    step_number: v.number(),
    verdict: v.string(),
    risk_score: v.number(),
    explanation: v.string(),
    signals: v.array(v.any()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("guardian_decisions", args);
  },
});

export const recordDecisionBatch = mutation({
  args: {
    decisions: v.array(
      v.object({
        decision_id: v.string(),
        task_id: v.string(),
        step_number: v.number(),
        verdict: v.string(),
        risk_score: v.number(),
        explanation: v.string(),
        signals: v.array(v.any()),
        timestamp: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const d of args.decisions) {
      const id = await ctx.db.insert("guardian_decisions", d);
      ids.push(id);
    }
    return { count: ids.length, ids };
  },
});

export const listApprovals = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("approvals")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("approvals").order("desc").collect();
  },
});

export const createApproval = mutation({
  args: {
    approval_id: v.string(),
    task_id: v.string(),
    step_number: v.number(),
    tool: v.string(),
    action: v.string(),
    status: v.string(),
    requested_at: v.string(),
    rationale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("approvals", args);
  },
});

export const decideApproval = mutation({
  args: {
    approval_id: v.string(),
    status: v.string(), // "APPROVED" | "REJECTED"
    decided_by: v.string(),
    decided_at: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("approvals")
      .withIndex("by_approval_id", (q) => q.eq("approval_id", args.approval_id))
      .first();

    if (!existing) {
      throw new Error(`Approval ${args.approval_id} not found.`);
    }

    await ctx.db.patch(existing._id, {
      status: args.status,
      decided_by: args.decided_by,
      decided_at: args.decided_at,
    });
    return existing._id;
  },
});

