'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api as convexApi } from '@convex/_generated/api';
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { listCampaigns } from '@/services/test-run-service';
import { exportToCSV } from '@/services/report-service';
import { CampaignResponse } from '@/types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [restCampaigns, setRestCampaigns] = useState<CampaignResponse[]>([]);
  const [restLoading, setRestLoading] = useState(true);

  // Convex Real-Time Reactive Query
  const liveCampaigns = useQuery(convexApi.campaigns.list, { limit: 50 });
  const isConvexLive = liveCampaigns !== undefined;

  const campaigns: CampaignResponse[] =
    liveCampaigns && liveCampaigns.length > 0
      ? (liveCampaigns as unknown as CampaignResponse[])
      : restCampaigns;

  const loading = isConvexLive ? false : restLoading;

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        const res = await listCampaigns(50, 0);
        if (res.data) setRestCampaigns(res.data.campaigns || []);
      } catch (err) {
        console.error(err);
      } finally {
        setRestLoading(false);
      }
    }
    load();
  }, []);

  const totalAttacks = campaigns.reduce((acc, c) => acc + (c.total_attacks || 0), 0);
  const totalDefended = campaigns.reduce((acc, c) => acc + (c.defences_held || 0), 0);
  const totalBreached = campaigns.reduce((acc, c) => acc + (c.attacks_landed || 0), 0);

  const blockRate = totalAttacks > 0 ? ((totalDefended / totalAttacks) * 100).toFixed(1) : '100.0';
  const breachRate = (100 - Number(blockRate)).toFixed(1);

  // Trend data over campaigns
  const trendData = campaigns.slice(0, 10).reverse().map((c, i) => ({
    name: `Run #${i + 1}`,
    Defended: c.defences_held || 0,
    Breached: c.attacks_landed || 0,
  }));

  const handleExportCSV = () => {
    const flatRows: any[] = [];
    campaigns.forEach((c) => {
      if (c.results && c.results.length > 0) {
        c.results.forEach((r) => {
          flatRows.push({
            campaign_id: c.campaign_id,
            campaign_name: c.campaign_name,
            attack_id: r.attack_id,
            attack_name: r.name,
            category: r.category,
            defended: r.defended ? 'YES' : 'NO',
            outcome: r.outcome,
            mechanism: r.defence_mechanism,
            timestamp: r.timestamp,
          });
        });
      } else {
        flatRows.push({
          campaign_id: c.campaign_id,
          campaign_name: c.campaign_name,
          total_attacks: c.total_attacks,
          defences_held: c.defences_held,
          attacks_landed: c.attacks_landed,
          started_at: c.started_at,
        });
      }
    });
    exportToCSV('agentshield-security-report', flatRows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            REPORTS &amp; ANALYTICS
            <Badge variant="cyan" size="sm">
              Executive Evaluation
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Comprehensive audit reports, empirical threat trends, and exportable CSV evaluation datasets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV Dataset</span>
          </Button>
        </div>
      </div>

      {/* Top 2 Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/70 border-border/80 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Attack Success Rate (Breach Exposure)
            </span>
            <span className="text-rose-400 font-bold text-xs flex items-center gap-1">
              <TrendingDown className="w-4 h-4" /> Near Zero Risk
            </span>
          </div>
          <h3 className="text-4xl font-extrabold text-rose-400 mt-3 font-mono">
            {breachRate}%
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Total of {totalBreached} attacks slipped past autonomous defenses across {campaigns.length} campaigns.
          </p>
        </Card>

        <Card className="bg-card/70 border-border/80 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Defense Performance (Mitigation Reliability)
            </span>
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Policy Enforced
            </span>
          </div>
          <h3 className="text-4xl font-extrabold text-emerald-400 mt-3 font-mono">
            {blockRate}%
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Total of {totalDefended} adversarial attacks proactively halted before tool execution.
          </p>
        </Card>
      </div>

      {/* Security Trends Chart */}
      <Card className="bg-card/70 border-border/80">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-bold text-foreground">
            Security Defense Trends Across Campaigns
          </CardTitle>
          <CardDescription className="text-xs">
            Evaluations over time: Defended attacks vs breaches
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="w-full h-72">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="defendedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="breachedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d1527',
                      borderColor: '#1e293b',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="Defended"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#defendedGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Breached"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#breachedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

