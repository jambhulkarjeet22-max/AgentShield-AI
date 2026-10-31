import { mutation } from "./_generated/server";
import { SEEDED_ATTACKS } from "./catalog";

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Seed Attack Catalog (15 Attacks)
    let catalogCount = 0;
    for (const attack of SEEDED_ATTACKS) {
      const existing = await ctx.db
        .query("attack_catalog")
        .withIndex("by_attack_id", (q) => q.eq("attack_id", attack.attack_id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, attack);
      } else {
        await ctx.db.insert("attack_catalog", attack);
      }
      catalogCount++;
    }

    // 2. Seed Baseline Reference Campaign
    const campaignId = "camp-init-triad-001";
    const now = new Date().toISOString();

    const attackResults = SEEDED_ATTACKS.map((att, i) => ({
      attack_id: att.attack_id,
      name: att.name,
      category: att.category,
      payload: `SIMULATED_PAYLOAD::${att.attack_id}`,
      outcome: "DEFENCE_HELD",
      defended: true,
      defence_mechanism: "PolicyValidator & Guardian Interception Boundary",
      task_id: `task-seed-${i + 1}`,
      timestamp: now,
    }));

    const existingCamp = await ctx.db
      .query("campaigns")
      .withIndex("by_campaign_id", (q) => q.eq("campaign_id", campaignId))
      .first();

    const campaignData = {
      campaign_id: campaignId,
      campaign_name: "Full 15-Attack Triad Suite",
      description: "Automated baseline verification of all 15 preconfigured multi-agent cyber attacks.",
      status: "COMPLETED",
      total_attacks: 15,
      defences_held: 15,
      attacks_landed: 0,
      failed_to_trigger: 0,
      errors: 0,
      categories: [
        "prompt_injection_email",
        "prompt_injection_web",
        "privilege_escalation",
        "payment_fraud",
        "tool_abuse",
        "loop_exhaustion",
      ],
      started_at: now,
      completed_at: now,
      summary: "All 15 attacks successfully intercepted by Blue Guardian & Policy Boundary with zero breaches.",
      attack_results: attackResults,
    };

    if (existingCamp) {
      await ctx.db.patch(existingCamp._id, campaignData);
    } else {
      await ctx.db.insert("campaigns", campaignData);
    }

    // 3. Seed Audit Logs
    const existingLogs = await ctx.db.query("audit_logs").take(5);
    if (existingLogs.length === 0) {
      for (let i = 0; i < SEEDED_ATTACKS.length; i++) {
        const att = SEEDED_ATTACKS[i];
        await ctx.db.insert("audit_logs", {
          event_id: `evt-seed-${i + 1}`,
          timestamp: now,
          actor_id: "blue_guardian",
          role: "DEFENDER",
          tool: att.target_tool,
          action: att.name,
          status: "ALLOWED",
          resource: att.attack_id,
          details: {
            category: att.category,
            severity: att.severity,
            verdict: "INTERCEPTED",
          },
        });
      }
    }

    // 4. Seed Guardian Decisions
    const existingDecisions = await ctx.db.query("guardian_decisions").take(5);
    if (existingDecisions.length === 0) {
      for (let i = 0; i < SEEDED_ATTACKS.length; i++) {
        const att = SEEDED_ATTACKS[i];
        await ctx.db.insert("guardian_decisions", {
          decision_id: `dec-seed-${i + 1}`,
          task_id: `task-seed-${i + 1}`,
          step_number: i + 1,
          verdict: "ALLOW",
          risk_score: 18,
          explanation: `Guardian verified policy alignment for ${att.name}`,
          signals: [
            { type: "POLICY_GATE", status: "PASSED", score: 0 },
            { type: "ML_ADVISORY", status: "BENIGN", score: 18 },
          ],
          timestamp: now,
        });
      }
    }

    // 5. Seed an Approval Workflow Request
    const existingApproval = await ctx.db
      .query("approvals")
      .withIndex("by_approval_id", (q) => q.eq("approval_id", "appr-wire-50k-001"))
      .first();

    if (!existingApproval) {
      await ctx.db.insert("approvals", {
        approval_id: "appr-wire-50k-001",
        task_id: "task-payment-009",
        step_number: 2,
        tool: "payments",
        action: "wire_transfer_50k",
        status: "PENDING",
        requested_at: now,
        rationale: "Dual-Auth required: Outbound wire transfer above $10,000 threshold requires SecOps signoff.",
      });
    }

    return {
      success: true,
      catalogCount,
      campaignId,
      auditLogsSeeded: true,
      guardianDecisionsSeeded: true,
      approvalsSeeded: true,
    };
  },
});

