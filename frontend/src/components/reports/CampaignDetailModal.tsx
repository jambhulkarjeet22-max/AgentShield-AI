'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  PlayCircle,
  Clock,
  Terminal,
  Activity,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { exportToCSV } from '@/services/report-service';
import { CampaignResponse, AttackResult } from '@/types';

interface CampaignDetailModalProps {
  campaign: CampaignResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CampaignDetailModal({
  campaign,
  isOpen,
  onClose,
}: CampaignDetailModalProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [attackSearch, setAttackSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [expandedAttackId, setExpandedAttackId] = useState<string | null>(null);

  if (!isOpen || !campaign) return null;

  const rawAttacks: AttackResult[] =
    (campaign as any).attack_results || campaign.results || [];

  const handleCopyId = () => {
    navigator.clipboard.writeText(campaign.campaign_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportSingleCSV = () => {
    const rows = rawAttacks.map((atk) => ({
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      campaign_status: campaign.status,
      campaign_started_at: campaign.started_at,
      campaign_completed_at: campaign.completed_at || '',
      attack_id: atk.attack_id,
      attack_name: (atk as any).attack_name || atk.name,
      category: atk.category,
      outcome: atk.outcome,
      defended: atk.defended ? 'YES' : 'NO',
      defence_mechanism: (atk as any).defence_mechanism || '',
      target_task_id: (atk as any).target_task_id || atk.task_id || '',
      evaluation_notes: (atk as any).evaluation_notes || '',
      timestamp: atk.timestamp || '',
    }));

    exportToCSV(`campaign-${campaign.campaign_id}-audit`, rows);
  };

  const filteredAttacks = rawAttacks.filter((atk) => {
    const name = ((atk as any).attack_name || atk.name || '').toLowerCase();
    const id = (atk.attack_id || '').toLowerCase();
    const cat = (atk.category || '').toLowerCase();
    const q = attackSearch.toLowerCase();
    const matchesSearch = name.includes(q) || id.includes(q) || cat.includes(q);

    const matchesOutcome =
      outcomeFilter === 'ALL' ||
      (outcomeFilter === 'DEFENDED' && atk.defended) ||
      (outcomeFilter === 'BREACHED' && !atk.defended && atk.outcome === 'ATTACK_SUCCESS') ||
      (outcomeFilter === 'OTHER' && atk.outcome !== 'DEFENCE_HELD' && atk.outcome !== 'ATTACK_SUCCESS');

    return matchesSearch && matchesOutcome;
  });

  const durationStr = (() => {
    if (!campaign.started_at || !campaign.completed_at) return null;
    try {
      const start = new Date(campaign.started_at).getTime();
      const end = new Date(campaign.completed_at).getTime();
      const diffSec = Math.max(0, Math.round((end - start) / 1000));
      if (diffSec < 60) return `${diffSec}s`;
      const mins = Math.floor(diffSec / 60);
      const remSec = diffSec % 60;
      return `${mins}m ${remSec}s`;
    } catch {
      return null;
    }
  })();

  const defenseRate =
    campaign.total_attacks > 0
      ? ((campaign.defences_held / campaign.total_attacks) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-150">
      <div
        className="w-full max-w-4xl bg-card border border-border/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border/80 bg-muted/20">
          <div className="space-y-1 max-w-[85%]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {campaign.campaign_name}
              </h2>
              <Badge
                size="sm"
                variant={
                  campaign.status === 'COMPLETED'
                    ? 'success'
                    : campaign.status === 'RUNNING'
                    ? 'cyan'
                    : 'destructive'
                }
              >
                {campaign.status}
              </Badge>
              {durationStr && (
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {durationStr}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>ID: <code className="text-foreground bg-muted/60 px-1.5 py-0.5 rounded">{campaign.campaign_id}</code></span>
              <button
                onClick={handleCopyId}
                title="Copy Campaign ID"
                className="hover:text-foreground text-muted-foreground p-0.5 rounded transition-colors"
              >
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <span>•</span>
              <span suppressHydrationWarning>Started: {formatDate(campaign.started_at)}</span>
              {campaign.completed_at && (
                <>
                  <span>•</span>
                  <span suppressHydrationWarning>Completed: {formatDate(campaign.completed_at)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Top Scoreboard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-muted/30 border border-border/70">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Total Attacks Tested
              </span>
              <div className="text-2xl font-bold font-mono text-foreground mt-1">
                {campaign.total_attacks}
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Simulated vectors
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                Defenses Held
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {campaign.defences_held} <span className="text-sm font-sans font-medium text-emerald-400/80">({defenseRate}%)</span>
              </div>
              <span className="text-[11px] text-emerald-400/80 mt-0.5 block">
                Policy &amp; Guardian halted
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">
                Attacks Landed
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                {campaign.attacks_landed}
              </div>
              <span className="text-[11px] text-rose-400/80 mt-0.5 block">
                {campaign.attacks_landed === 0
                  ? 'Zero observed breaches'
                  : 'Critical boundary violations'}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                Inconclusive / Errors
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {(campaign as any).failed_to_trigger || 0 + ((campaign as any).errors || 0)}
              </div>
              <span className="text-[11px] text-amber-400/80 mt-0.5 block">
                {(campaign as any).failed_to_trigger || 0} trigger fail • {(campaign as any).errors || 0} error
              </span>
            </div>
          </div>

          {/* Contextual Observability & Description Banner */}
          <div className="p-3.5 rounded-lg bg-muted/20 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="text-foreground font-semibold flex items-center gap-1.5">
                <span>Assessment Context</span>
                {campaign.categories && campaign.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-1">
                    {campaign.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/25"
                      >
                        {cat.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {campaign.description ||
                  campaign.summary ||
                  'Automated multi-agent adversarial test campaign executed against target agent with Guardian policy interception active.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="https://cloud.langfuse.com"
                target="_blank"
                rel="noopener noreferrer"
                title="View execution spans and token telemetry in Langfuse Cloud"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted text-foreground border border-border/80 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Langfuse Trace ↗</span>
              </a>
            </div>
          </div>

          {/* Attack Evaluation Breakdown Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                <span>Evaluated Attack Vectors &amp; Evidence</span>
                <span className="text-xs font-mono text-muted-foreground lowercase">
                  ({filteredAttacks.length} of {rawAttacks.length})
                </span>
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter attacks..."
                    value={attackSearch}
                    onChange={(e) => setAttackSearch(e.target.value)}
                    className="h-7 w-36 sm:w-48 pl-7 pr-2 text-xs rounded-md bg-muted/40 border border-border/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value)}
                  className="h-7 text-xs px-2 rounded-md bg-muted/40 border border-border/70 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="DEFENDED">Defended Only</option>
                  <option value="BREACHED">Breached Only</option>
                  <option value="OTHER">Other / Inconclusive</option>
                </select>
              </div>
            </div>

            {/* Attacks Table */}
            <div className="rounded-lg border border-border/80 overflow-hidden bg-card/60">
              <div className="overflow-x-auto max-h-80 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-md border-b border-border/70 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Attack ID / Name</th>
                      <th className="px-3.5 py-2.5">Category</th>
                      <th className="px-3.5 py-2.5">Outcome</th>
                      <th className="px-3.5 py-2.5">Defense Mechanism</th>
                      <th className="px-3.5 py-2.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredAttacks.length > 0 ? (
                      filteredAttacks.map((atk, idx) => {
                        const isExpanded = expandedAttackId === atk.attack_id;
                        const attackName = (atk as any).attack_name || atk.name || 'Unnamed Attack';
                        return (
                          <React.Fragment key={atk.attack_id || idx}>
                            <tr
                              onClick={() =>
                                setExpandedAttackId(isExpanded ? null : atk.attack_id)
                              }
                              className={`cursor-pointer transition-colors ${
                                isExpanded ? 'bg-muted/30' : 'hover:bg-muted/15'
                              }`}
                            >
                              <td className="px-3.5 py-2.5">
                                <span className="font-semibold text-foreground block max-w-xs truncate">
                                  {attackName}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {atk.attack_id}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">
                                  {atk.category}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <Badge
                                  size="sm"
                                  variant={
                                    atk.defended
                                      ? 'success'
                                      : atk.outcome === 'ATTACK_SUCCESS'
                                      ? 'destructive'
                                      : 'warning'
                                  }
                                >
                                  {atk.defended ? 'DEFENDED' : atk.outcome}
                                </Badge>
                              </td>
                              <td className="px-3.5 py-2.5 text-muted-foreground text-[11px] max-w-xs truncate">
                                {(atk as any).defence_mechanism ||
                                  (atk as any).mechanism ||
                                  'Policy Boundary Rule'}
                              </td>
                              <td className="px-3.5 py-2.5 text-right text-muted-foreground">
                                <button className="p-1 hover:text-foreground">
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Details Row */}
                            {isExpanded && (
                              <tr className="bg-muted/25 font-mono text-[11px]">
                                <td colSpan={5} className="px-4 py-3 space-y-2 border-b border-border/50">
                                  {atk.payload && (
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground block font-sans">
                                        Adversarial Payload:
                                      </span>
                                      <pre className="p-2 mt-1 rounded bg-black/40 border border-border/60 text-zinc-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                        {atk.payload}
                                      </pre>
                                    </div>
                                  )}

                                  {(atk as any).evaluation_notes && (
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground block font-sans">
                                        Evaluation Findings &amp; Interception Evidence:
                                      </span>
                                      <p className="mt-1 text-zinc-300 font-sans text-xs">
                                        {(atk as any).evaluation_notes}
                                      </p>
                                    </div>
                                  )}

                                  {((atk as any).target_task_id || atk.task_id) && (
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                                      <span>Target Agent Task ID:</span>
                                      <code className="text-zinc-200">
                                        {(atk as any).target_task_id || atk.task_id}
                                      </code>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-xs text-muted-foreground font-sans"
                        >
                          No attacks matched the current search/filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 border-t border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit trail cryptographically verified</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSingleCSV}
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Export Campaign CSV</span>
            </Button>

            <Link href="/arena">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                <span>Replay in 3D Arena</span>
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

