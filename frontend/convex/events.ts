import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("audit_logs")
      .order("desc")
      .take(limit);
  },
});

export const record = mutation({
  args: {
    event_id: v.string(),
    timestamp: v.string(),
    actor_id: v.string(),
    role: v.string(),
    tool: v.string(),
    action: v.string(),
    status: v.string(),
    resource: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("audit_logs", args);
  },
});

export const recordBatch = mutation({
  args: {
    events: v.array(
      v.object({
        event_id: v.string(),
        timestamp: v.string(),
        actor_id: v.string(),
        role: v.string(),
        tool: v.string(),
        action: v.string(),
        status: v.string(),
        resource: v.optional(v.string()),
        details: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const evt of args.events) {
      const id = await ctx.db.insert("audit_logs", evt);
      ids.push(id);
    }
    return { count: ids.length, ids };
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("audit_logs").collect();
    for (const log of all) {
      await ctx.db.delete(log._id);
    }
    return { count: all.length };
  },
});

