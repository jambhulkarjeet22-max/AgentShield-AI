'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { BarChart3, TrendingUp, Info } from 'lucide-react';
import { CampaignResponse } from '@/types';
import { formatDate } from '@/lib/utils';

interface SecurityAnalysisChartsProps {
  campaigns: CampaignResponse[];
}

export function SecurityAnalysisCharts({ campaigns }: SecurityAnalysisChartsProps) {
  // Sort campaigns chronologically by started_at for analysis
  const sortedChronological = [...campaigns]
    .filter((c) => c.started_at)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  // Chart 1: Attack Outcomes by Campaign (up to 8 recent runs)
  const outcomeData = sortedChronological.slice(-8).map((c, idx) => {
    const total = c.total_attacks || 0;
    const defended = c.defences_held || 0;
    const landed = c.attacks_landed || 0;
    const other = Math.max(
      0,
      total - defended - landed + (((c as any).failed_to_trigger || 0) + ((c as any).errors || 0))
    );

    const displayName =
      c.campaign_name.length > 16
        ? `${c.campaign_name.slice(0, 14)}...`
        : c.campaign_name;

    return {
      name: displayName,
      fullName: c.campaign_name,
      campaignId: c.campaign_id,
      Defended: defended,
      Landed: landed,
      Inconclusive: other,
      total,
    };
  });

  const hasAnyInconclusive = outcomeData.some((d) => d.Inconclusive > 0);

  // Chart 2: Defense Effectiveness Trend Over Time (requires at least 2 timestamped data points)
  const hasSufficientTimeData = sortedChronological.length >= 2;

  const trendData = sortedChronological.map((c) => {
    const total = c.total_attacks || 0;
    const defended = c.defences_held || 0;
    const rate = total > 0 ? Number(((defended / total) * 100).toFixed(1)) : 0;

    let timeLabel = '';
    try {
      const d = new Date(c.started_at);
      timeLabel = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes()
      ).padStart(2, '0')}`;
    } catch {
      timeLabel = c.campaign_id.slice(0, 8);
    }

    return {
      timestamp: timeLabel,
      fullTime: formatDate(c.started_at),
      campaignName: c.campaign_name,
      defenseRate: rate,
      defended,
      total,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Attack Outcomes by Campaign */}
      <Card className="bg-card/70 border-border/80 shadow-sm flex flex-col">
        <CardHeader className="pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span>Attack Outcomes by Campaign</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Distribution of defended, landed, and inconclusive test cases per run
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex-1">
          {outcomeData.length > 0 ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={outcomeData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c0f1d',
                      borderColor: '#1e293b',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                      color: '#f8fafc',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    }}
                    formatter={(val: any, name: string) => [
                      `${val} attacks`,
                      name === 'Defended' ? 'Defenses Held' : name === 'Landed' ? 'Attacks Landed' : name,
                    ]}
                    labelFormatter={(_, items) => {
                      if (items && items[0]) {
                        return `${(items[0].payload as any).fullName} (${(items[0].payload as any).campaignId})`;
                      }
                      return '';
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="Defended"
                    stackId="outcomes"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Landed"
                    stackId="outcomes"
                    fill="#ef4444"
                    radius={[2, 2, 0, 0]}
                  />
                  {hasAnyInconclusive && (
                    <Bar
                      dataKey="Inconclusive"
                      stackId="outcomes"
                      fill="#f59e0b"
                      radius={[2, 2, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Info className="w-5 h-5 mb-1 text-muted-foreground/60" />
              <span>No campaign outcomes available to display.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Defense Effectiveness Over Time */}
      <Card className="bg-card/70 border-border/80 shadow-sm flex flex-col">
        <CardHeader className="pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Defense Effectiveness Trend</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Containment rate (%) evaluated over chronological campaign runs
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex-1">
          {hasSufficientTimeData ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    unit="%"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c0f1d',
                      borderColor: '#1e293b',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                      color: '#f8fafc',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    }}
                    formatter={(val: any) => [`${val}%`, 'Defense Rate']}
                    labelFormatter={(_, items) => {
                      if (items && items[0]) {
                        const payload = items[0].payload as any;
                        return `${payload.campaignName} • ${payload.fullTime}`;
                      }
                      return '';
                    }}
                  />
                  <ReferenceLine
                    y={100}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                    label={{
                      value: '100% Policy Target',
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="defenseRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#rateGradient)"
                    name="Containment Rate (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground p-6 text-center">
              <Info className="w-5 h-5 mb-2 text-muted-foreground/60" />
              <span className="font-semibold text-foreground">
                Insufficient Chronological Data
              </span>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                At least two timestamped campaign executions are required to render an empirical temporal trend.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

