'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api as convexApi } from '@convex/_generated/api';
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  Activity,
  Layers,
  Calendar,
  ArrowUpDown,
  Clock,
  Copy,
  Check,
  Info,
  ChevronRight,
  Eye,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { listCampaigns } from '@/services/test-run-service';
import { exportToCSV } from '@/services/report-service';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { CampaignResponse, AttackResult } from '@/types';
import { CampaignDetailModal } from '@/components/reports/CampaignDetailModal';
import { ExecutiveReportModal } from '@/components/reports/ExecutiveReportModal';
import { SecurityAnalysisCharts } from '@/components/reports/SecurityAnalysisCharts';
import { CategoryBreakdown } from '@/components/reports/CategoryBreakdown';

type DateRangeOption = 'ALL' | '24H' | '7D' | '30D';
type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'attacks_desc'
  | 'defense_desc'
  | 'landed_desc'
  | 'name_asc';

export default function ReportsPage() {
  const [restCampaigns, setRestCampaigns] = useState<CampaignResponse[]>([]);
  const [restLoading, setRestLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Modals State
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Real-time Convex Subscription
  const liveCampaigns = useQuery(convexApi.campaigns.list, { limit: 50 });
  const isConvexLive = liveCampaigns !== undefined;

  const rawCampaigns: CampaignResponse[] =
    liveCampaigns && liveCampaigns.length > 0
      ? (liveCampaigns as unknown as CampaignResponse[])
      : restCampaigns;

  const loadRestCampaigns = async () => {
    setRestLoading(true);
    setError(null);
    try {
      const res = await listCampaigns(50, 0);
      if (res.data && res.data.campaigns) {
        setRestCampaigns(res.data.campaigns);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch campaign records');
    } finally {
      setRestLoading(false);
    }
  };

  useEffect(() => {
    loadRestCampaigns();
  }, []);

  const isLoading = isConvexLive ? false : restLoading;

  // Handle Campaign ID Copy
  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Date Filtering Logic
  const filteredByDate = useMemo(() => {
    if (dateRange === 'ALL') return rawCampaigns;
    const now = Date.now();
    const rangeMs =
      dateRange === '24H'
        ? 24 * 60 * 60 * 1000
        : dateRange === '7D'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    return rawCampaigns.filter((c) => {
      if (!c.started_at) return true;
      const started = new Date(c.started_at).getTime();
      return now - started <= rangeMs;
    });
  }, [rawCampaigns, dateRange]);

  // Search, Status, and Category Filter Logic
  const filteredCampaigns = useMemo(() => {
    return filteredByDate.filter((c) => {
      // Search matches name, unique ID, description, or category
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.campaign_name.toLowerCase().includes(q) ||
        c.campaign_id.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.categories && c.categories.some((cat) => cat.toLowerCase().includes(q)));

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' || c.status === statusFilter;

      // Category filter
      const matchesCategory =
        categoryFilter === 'ALL' ||
        (c.categories && c.categories.includes(categoryFilter as any));

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [filteredByDate, searchTerm, statusFilter, categoryFilter]);

  // Sort Logic
  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.started_at || 0).getTime() - new Date(b.started_at || 0).getTime();
      }
      if (sortBy === 'attacks_desc') {
        return (b.total_attacks || 0) - (a.total_attacks || 0);
      }
      if (sortBy === 'defense_desc') {
        const rateA = a.total_attacks > 0 ? (a.defences_held || 0) / a.total_attacks : 0;
        const rateB = b.total_attacks > 0 ? (b.defences_held || 0) / b.total_attacks : 0;
        return rateB - rateA;
      }
      if (sortBy === 'landed_desc') {
        return (b.attacks_landed || 0) - (a.attacks_landed || 0);
      }
      if (sortBy === 'name_asc') {
        return a.campaign_name.localeCompare(b.campaign_name);
      }
      return 0;
    });
  }, [filteredCampaigns, sortBy]);

  // Aggregate Metrics (calculated strictly from filtered dataset)
  const campaignsCount = filteredCampaigns.length;
  const completedCount = filteredCampaigns.filter((c) => c.status === 'COMPLETED').length;
  const runningCount = filteredCampaigns.filter((c) => c.status === 'RUNNING').length;
  const failedCount = filteredCampaigns.filter((c) => c.status === 'FAILED').length;

  const totalAttacks = filteredCampaigns.reduce((acc, c) => acc + (c.total_attacks || 0), 0);
  const totalDefended = filteredCampaigns.reduce((acc, c) => acc + (c.defences_held || 0), 0);
  const totalLanded = filteredCampaigns.reduce((acc, c) => acc + (c.attacks_landed || 0), 0);
  const totalFailedToTrigger = filteredCampaigns.reduce(
    (acc, c) => acc + ((c as any).failed_to_trigger || 0),
    0
  );
  const totalErrors = filteredCampaigns.reduce(
    (acc, c) => acc + ((c as any).errors || 0),
    0
  );

  const defenseRate =
    totalAttacks > 0 ? ((totalDefended / totalAttacks) * 100).toFixed(1) : null;
  const breachRate =
    totalAttacks > 0 ? ((totalLanded / totalAttacks) * 100).toFixed(1) : null;

  // CSV Export for filtered dataset
  const handleExportCSV = () => {
    const flatRows: Record<string, any>[] = [];

    sortedCampaigns.forEach((c) => {
      const attackList: AttackResult[] = (c as any).attack_results || c.results || [];
      if (attackList.length > 0) {
        attackList.forEach((r) => {
          flatRows.push({
            campaign_id: c.campaign_id,
            campaign_name: c.campaign_name,
            campaign_status: c.status,
            campaign_started_at: c.started_at,
            campaign_completed_at: c.completed_at || '',
            attack_id: r.attack_id,
            attack_name: (r as any).attack_name || r.name,
            category: r.category,
            outcome: r.outcome,
            defended: r.defended ? 'YES' : 'NO',
            defence_mechanism: (r as any).defence_mechanism || '',
            target_task_id: (r as any).target_task_id || r.task_id || '',
            evaluation_notes: (r as any).evaluation_notes || '',
            timestamp: r.timestamp || '',
          });
        });
      } else {
        flatRows.push({
          campaign_id: c.campaign_id,
          campaign_name: c.campaign_name,
          campaign_status: c.status,
          campaign_started_at: c.started_at,
          campaign_completed_at: c.completed_at || '',
          total_attacks: c.total_attacks,
          defences_held: c.defences_held,
          attacks_landed: c.attacks_landed,
          failed_to_trigger: (c as any).failed_to_trigger || 0,
          errors: (c as any).errors || 0,
        });
      }
    });

    exportToCSV('agentra-security-assessment', flatRows);
  };

  const handleOpenDetail = (campaign: CampaignResponse) => {
    setSelectedCampaign(campaign);
    setIsDetailModalOpen(true);
  };

  const dateRangeLabel =
    dateRange === 'ALL'
      ? 'All Time'
      : dateRange === '24H'
      ? 'Past 24 Hours'
      : dateRange === '7D'
      ? 'Past 7 Days'
      : 'Past 30 Days';

  return (
    <div className="space-y-6 text-foreground font-sans">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Security Assessments
            </h1>
            <Badge variant="cyan" size="sm">
              Empirical SOC Verification
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Campaign results, defense effectiveness, and audit evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subtle Contextual Langfuse Link */}
          <a
            href="https://cloud.langfuse.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Langfuse Cloud LLM Tracing"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 border border-border/60 transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Langfuse Tracing</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadRestCampaigns}
            loading={isLoading}
            className="text-xs h-8"
            title="Reload assessment data"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>

          {/* Export CSV Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={sortedCampaigns.length === 0}
            className="text-xs h-8"
            title="Download CSV of evaluated campaigns and attacks"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          {/* Primary Action: Generate Executive Report */}
          <Button
            size="sm"
            onClick={() => setIsExecutiveModalOpen(true)}
            disabled={sortedCampaigns.length === 0}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 shadow-sm shadow-blue-600/30"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <span>Generate Executive Report</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Summary Metrics (Four Compact Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Campaigns Analyzed */}
        <Card className="bg-card/70 border-border/80 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase font-semibold">
            <span>Campaigns Analyzed</span>
            <Badge size="sm" variant="outline" className="text-[10px]">
              {dateRangeLabel}
            </Badge>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {isLoading ? (
                <span className="inline-block w-8 h-7 bg-muted/40 animate-pulse rounded" />
              ) : (
                campaignsCount
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {completedCount} completed • {runningCount} active • {failedCount} failed
            </p>
          </div>
        </Card>

        {/* Card 2: Total Attacks Tested */}
        <Card className="bg-card/70 border-border/80 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase font-semibold">
            <span>Total Attacks Tested</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {isLoading ? (
                <span className="inline-block w-12 h-7 bg-muted/40 animate-pulse rounded" />
              ) : (
                totalAttacks
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {campaignsCount > 0
                ? `Avg ${(totalAttacks / campaignsCount).toFixed(1)} attacks per campaign`
                : 'No campaigns recorded'}
            </p>
          </div>
        </Card>

        {/* Card 3: Defenses Held */}
        <Card className="bg-card/70 border-border/80 p-4 shadow-sm flex flex-col justify-between border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs font-mono uppercase font-semibold text-emerald-400">
            <span>Defenses Held</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
              {isLoading ? (
                <span className="inline-block w-16 h-7 bg-muted/40 animate-pulse rounded" />
              ) : (
                <>
                  {totalDefended}{' '}
                  {defenseRate !== null && (
                    <span className="text-sm font-sans font-medium text-emerald-400/80">
                      ({defenseRate}%)
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">
              {totalAttacks > 0
                ? `${totalDefended} of ${totalAttacks} threats contained`
                : 'Awaiting execution data'}
            </p>
          </div>
        </Card>

        {/* Card 4: Attacks Landed */}
        <Card
          className={`bg-card/70 border-border/80 p-4 shadow-sm flex flex-col justify-between border-l-2 ${
            totalLanded > 0 ? 'border-l-rose-500' : 'border-l-border/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase font-semibold text-muted-foreground">
            <span className={totalLanded > 0 ? 'text-rose-400 font-bold' : ''}>
              Attacks Landed
            </span>
            {totalLanded > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="mt-2.5">
            <div
              className={`text-2xl sm:text-3xl font-bold font-mono ${
                totalLanded > 0 ? 'text-rose-400' : 'text-foreground'
              }`}
            >
              {isLoading ? (
                <span className="inline-block w-10 h-7 bg-muted/40 animate-pulse rounded" />
              ) : (
                <>
                  {totalLanded}{' '}
                  {breachRate !== null && (
                    <span className="text-sm font-sans font-medium text-muted-foreground">
                      ({breachRate}%)
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>
                {totalLanded === 0
                  ? '0 breaches in evaluated vectors'
                  : 'Critical boundary violations'}
              </span>
              {(totalFailedToTrigger > 0 || totalErrors > 0) && (
                <span
                  title={`${totalFailedToTrigger} failed to trigger, ${totalErrors} execution errors`}
                  className="text-amber-400 font-mono text-[10px]"
                >
                  +{totalFailedToTrigger + totalErrors} inconclusive
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Campaign Results Table (The Primary Focus of the Page) */}
      <Card className="bg-card/70 border-border/80 shadow-md overflow-hidden flex flex-col">
        {/* Table Controls & Filter Bar */}
        <div className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground tracking-wide uppercase font-mono">
              Campaign Execution Register
            </h2>
            <Badge size="sm" variant="outline" className="font-mono text-[10px]">
              {sortedCampaigns.length} {sortedCampaigns.length === 1 ? 'Run' : 'Runs'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search campaign name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-44 sm:w-60 pl-8 pr-2 text-xs rounded-md bg-muted/40 border border-border/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              className="h-8 text-xs px-2.5 rounded-md bg-muted/40 border border-border/70 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by date range"
            >
              <option value="ALL">All Time</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 text-xs px-2.5 rounded-md bg-muted/40 border border-border/70 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="RUNNING">Running</option>
              <option value="FAILED">Failed</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 text-xs px-2.5 rounded-md bg-muted/40 border border-border/70 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by attack category"
            >
              <option value="ALL">All Categories</option>
              <option value="prompt_injection_email">Prompt Injection (Email)</option>
              <option value="prompt_injection_web">Prompt Injection (Web)</option>
              <option value="privilege_escalation">Privilege Escalation</option>
              <option value="payment_fraud">Payment Fraud</option>
              <option value="tool_abuse">Tool Abuse</option>
              <option value="loop_exhaustion">Loop Exhaustion</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 text-xs px-2.5 rounded-md bg-muted/40 border border-border/70 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Sort campaigns by"
            >
              <option value="date_desc">Date (Newest)</option>
              <option value="date_asc">Date (Oldest)</option>
              <option value="attacks_desc">Attacks (High-Low)</option>
              <option value="defense_desc">Defense % (High-Low)</option>
              <option value="landed_desc">Landed (High-Low)</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Primary Campaign Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/40 border-b border-border/80 text-[10px] font-semibold text-muted-foreground uppercase font-mono">
              <tr>
                <th className="px-4 py-3">Campaign &amp; Unique ID</th>
                <th className="px-4 py-3">Start Time (UTC)</th>
                <th className="px-4 py-3 text-center">Attacks Tested</th>
                <th className="px-4 py-3 text-center">Defenses Held</th>
                <th className="px-4 py-3 text-center">Attacks Landed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-sans">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5 space-y-1">
                      <div className="h-4 w-44 bg-muted/60 rounded" />
                      <div className="h-3 w-28 bg-muted/40 rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-28 bg-muted/40 rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-12 bg-muted/40 rounded mx-auto" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-16 bg-muted/40 rounded mx-auto" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-12 bg-muted/40 rounded mx-auto" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-5 w-20 bg-muted/40 rounded-full" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-7 w-20 bg-muted/40 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : sortedCampaigns.length > 0 ? (
                sortedCampaigns.map((c) => {
                  const rate =
                    c.total_attacks > 0
                      ? ((c.defences_held / c.total_attacks) * 100).toFixed(0)
                      : '0';

                  return (
                    <tr
                      key={c.campaign_id}
                      onClick={() => handleOpenDetail(c)}
                      className="cursor-pointer hover:bg-muted/20 transition-colors group"
                    >
                      {/* Name & Unique ID */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-xs group-hover:text-blue-400 transition-colors">
                            {c.campaign_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-muted-foreground">
                          <span className="bg-muted/50 px-1 py-0.2 rounded border border-border/50 text-[10px]">
                            {c.campaign_id}
                          </span>
                          <button
                            onClick={(e) => handleCopyId(e, c.campaign_id)}
                            title="Copy Campaign ID"
                            className="p-0.5 hover:text-foreground text-muted-foreground transition-colors"
                          >
                            {copiedId === c.campaign_id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Start Time */}
                      <td className="px-4 py-3.5 text-muted-foreground text-[11px]" suppressHydrationWarning>
                        <div>{formatDate(c.started_at)}</div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {formatTimeAgo(c.started_at)}
                        </div>
                      </td>

                      {/* Total Attacks */}
                      <td className="px-4 py-3.5 text-center font-mono text-foreground font-semibold">
                        {c.total_attacks}
                      </td>

                      {/* Defenses Held */}
                      <td className="px-4 py-3.5 text-center font-mono">
                        <span className="text-emerald-400 font-bold">
                          {c.defences_held}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-1">
                          ({rate}%)
                        </span>
                      </td>

                      {/* Attacks Landed */}
                      <td className="px-4 py-3.5 text-center font-mono">
                        {c.attacks_landed > 0 ? (
                          <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                            {c.attacks_landed}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge
                          size="sm"
                          variant={
                            c.status === 'COMPLETED'
                              ? 'success'
                              : c.status === 'RUNNING'
                              ? 'cyan'
                              : 'destructive'
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(c);
                          }}
                          className="h-7 text-xs px-2.5 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 border-blue-500/30"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>Inspect Report</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground space-y-2">
                    <Info className="w-6 h-6 mx-auto text-muted-foreground/60" />
                    <p className="text-xs font-semibold text-foreground">
                      No campaigns found matching current filters.
                    </p>
                    <p className="text-[11px]">
                      Try clearing search parameters or adjusting the date range selector.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('ALL');
                        setCategoryFilter('ALL');
                        setDateRange('ALL');
                      }}
                      className="text-xs h-7 mt-1"
                    >
                      Reset Filters
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-2.5 bg-muted/20 border-t border-border/80 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2 font-mono">
          <span>
            Showing {sortedCampaigns.length} of {rawCampaigns.length} recorded campaigns
          </span>
          <span className="text-[10px] text-muted-foreground font-sans">
            Click any row or &quot;Inspect Report&quot; to review evidence trails &amp; attack payload steps.
          </span>
        </div>
      </Card>

      {/* 4. Security Analysis (Maximum 2 Charts) */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground tracking-wide uppercase font-mono">
          Threat Analytics &amp; Temporal Trends
        </h2>
        <SecurityAnalysisCharts campaigns={filteredCampaigns} />
      </div>

      {/* 5. Attack and Defense Breakdown */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground tracking-wide uppercase font-mono">
          Taxonomy &amp; Boundary Enforcement Details
        </h2>
        <CategoryBreakdown campaigns={filteredCampaigns} />
      </div>

      {/* Modals */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCampaign(null);
        }}
      />

      <ExecutiveReportModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        campaigns={sortedCampaigns}
        dateRangeLabel={dateRangeLabel}
        onExportCSV={handleExportCSV}
      />
    </div>
  );
}
