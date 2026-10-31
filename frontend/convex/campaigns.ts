import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("campaigns")
      .order("desc")
      .take(limit);
  },
});

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("campaigns")
      .order("desc")
      .first();
  },
});

export const getById = query({
  args: { campaign_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_campaign_id", (q) => q.eq("campaign_id", args.campaign_id))
      .first();
  },
});

export const save = mutation({
  args: {
    campaign_id: v.string(),
    campaign_name: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("campaigns")
      .withIndex("by_campaign_id", (q) => q.eq("campaign_id", args.campaign_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("campaigns", args);
    }
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("campaigns").collect();
    for (const c of all) {
      await ctx.db.delete(c._id);
    }
    return { count: all.length };
  },
});

