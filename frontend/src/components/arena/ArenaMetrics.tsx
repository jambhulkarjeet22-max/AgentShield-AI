'use client';

import React from 'react';
import { Swords, ShieldCheck, ShieldAlert, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { CampaignResponse } from '@/types';

interface ArenaMetricsProps {
  campaign: CampaignResponse | null;
  totalCampaigns?: number;
}

export function ArenaMetrics({ campaign, totalCampaigns = 0 }: ArenaMetricsProps) {
  const attacksTested = campaign?.total_attacks ?? 0;
  const attacksDefended = campaign?.defences_held ?? 0;
  const breaches = campaign?.attacks_landed ?? 0;

  const blockRate = attacksTested > 0
    ? ((attacksDefended / attacksTested) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {/* 1. Attacks Tested */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-violet-500/30 bg-violet-950/20 backdrop-blur-md transition-all duration-200 hover:border-violet-500/50">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.25)]">
            <Swords className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Attacks Tested</div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">{attacksTested}</div>
            <div className="text-[11px] text-slate-400">
              Across {totalCampaigns > 0 ? totalCampaigns : (attacksTested > 0 ? 1 : 0)} campaign runs
            </div>
          </div>
        </div>
        <div className="text-violet-500/35 pr-1">
          <BarChart3 className="w-6 h-6" />
        </div>
      </div>

      {/* 2. Defended */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/25 bg-emerald-950/15 backdrop-blur-md transition-all duration-200 hover:border-emerald-500/40">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Defended</div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">{attacksDefended}</div>
            <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
              <span>{blockRate}% Block Rate</span>
            </div>
          </div>
        </div>
        <div className="text-emerald-500/30 pr-1">
          <TrendingUp className="w-6 h-6 text-emerald-400/50" />
        </div>
      </div>

      {/* 3. Breaches */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-rose-500/25 bg-rose-950/15 backdrop-blur-md transition-all duration-200 hover:border-rose-500/40">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.2)]">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Breaches</div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">{breaches}</div>
            <div className="text-[11px] text-slate-400">
              {breaches === 0 ? 'Zero breaches detected' : `${breaches} confirmed breaches`}
            </div>
          </div>
        </div>
        <div className="text-rose-500/30 pr-1">
          <AlertTriangle className="w-6 h-6 text-rose-400/40" />
        </div>
      </div>
    </div>
  );
}

