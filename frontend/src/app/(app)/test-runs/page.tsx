'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlayCircle,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Swords,
  Bot,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { listCampaigns, getCampaign } from '@/services/test-run-service';
import { CampaignResponse, AttackResult } from '@/types';
import { formatDate } from '@/lib/utils';
import { JSONViewer } from '@/components/ui/JSONViewer';

export default function TestRunsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignResponse[]>([]);
  const [selectedRun, setSelectedRun] = useState<CampaignResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCampaigns(50, 0);
      if (res.data && res.data.campaigns) {
        setCampaigns(res.data.campaigns);
        if (res.data.campaigns.length > 0 && !selectedRun) {
          setSelectedRun(res.data.campaigns[0]);
        }
      } else {
        setError(res.error || 'Failed to load test runs');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching campaign history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const filteredRuns = campaigns.filter((c) => {
    const matchesSearch =
      c.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.campaign_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            TEST RUNS
            <Badge variant="outline" size="sm">
              {campaigns.length} Executed Runs
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Historical adversarial test campaigns and verification records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRuns}
            loading={loading}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>
          <Link
            href="/arena"
            className="inline-flex items-center justify-center font-medium transition-all h-8 px-3 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 active:scale-[0.98]"
          >
            <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
            <span>New Test Run</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/80 bg-card/60">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search run ID or campaign name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/40 border border-border/70 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 bg-muted/40 border border-border/70 rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="RUNNING">Running</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Main Grid: Runs Table + Selected Run Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table (6 cols) */}
        <div className="lg:col-span-6">
          <Card className="bg-card/70 border-border/80 overflow-hidden flex flex-col shadow-lg">
            <div className="overflow-x-auto overflow-y-auto max-h-[620px] custom-scrollbar border-b border-border/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/80 text-muted-foreground uppercase text-[10px] font-semibold shadow-sm">
                  <tr>
                    <th className="px-4 py-3 bg-card/95">Run ID / Name</th>
                    <th className="px-4 py-3 bg-card/95">Status</th>
                    <th className="px-4 py-3 bg-card/95">Results</th>
                    <th className="px-4 py-3 bg-card/95">Started At</th>
                    <th className="px-4 py-3 text-right bg-card/95">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {filteredRuns.length > 0 ? (
                    filteredRuns.map((r) => {
                      const isSelected = selectedRun?.campaign_id === r.campaign_id;
                      return (
                        <tr
                          key={r.campaign_id}
                          onClick={() => setSelectedRun(r)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-600/15' : 'hover:bg-muted/20'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-bold text-foreground font-sans block truncate max-w-[180px]">
                              {r.campaign_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {r.campaign_id.slice(0, 12)}...
                            </span>
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <Badge
                              size="sm"
                              variant={r.status === 'COMPLETED' ? 'success' : 'warning'}
                            >
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-emerald-400 font-bold mr-1.5">
                              {r.defences_held} Defended
                            </span>
                            <span className="text-rose-400 font-bold">
                              {r.attacks_landed} Breached
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-[11px]" suppressHydrationWarning>
                            {formatDate(r.started_at)}
                          </td>
                          <td className="px-4 py-3 text-right font-sans">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRun(r);
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-sans text-xs">
                        No test runs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary Stats */}
            <div className="px-4 py-2.5 bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between font-mono">
              <span>Showing {filteredRuns.length} of {campaigns.length} test runs</span>
              <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Scrollable Runs Active
              </span>
            </div>
          </Card>
        </div>

        {/* Selected Run Details (6 cols) */}
        <div className="lg:col-span-6">
          {selectedRun ? (
            <Card className="bg-card/70 border-border/80 sticky top-20">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                    Campaign ID: {selectedRun.campaign_id}
                  </span>
                  <Badge variant={selectedRun.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
                    {selectedRun.status}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {selectedRun.campaign_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Summary Scoreboard */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/70">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Total Attacks
                    </span>
                    <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                      {selectedRun.total_attacks}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                      Defended
                    </span>
                    <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                      {selectedRun.defences_held}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[10px] text-rose-400 uppercase font-bold block">
                      Breached
                    </span>
                    <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                      {selectedRun.attacks_landed}
                    </span>
                  </div>
                </div>

                {/* Execution Timeline Breakdown */}
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Attacks Evaluated in this Run:
                  </span>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {selectedRun.results && selectedRun.results.length > 0 ? (
                      selectedRun.results.map((atk, idx) => (
                        <div
                          key={atk.attack_id || idx}
                          className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-foreground block">
                              {atk.name}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {atk.attack_id} • {atk.defence_mechanism || 'Policy Guard'}
                            </span>
                          </div>
                          <Badge
                            size="sm"
                            variant={atk.defended ? 'success' : 'destructive'}
                          >
                            {atk.defended ? 'DEFENDED' : 'BREACHED'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No granular attack records available.</p>
                    )}
                  </div>
                </div>

                {/* Replay Action */}
                <div className="pt-2">
                  <Link href="/arena">
                    <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold">
                      <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                      <span>Replay Simulation in 3D Arena</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/70 border-border/80 p-8 text-center text-xs text-muted-foreground">
              Select a test run to inspect execution breakdown.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

