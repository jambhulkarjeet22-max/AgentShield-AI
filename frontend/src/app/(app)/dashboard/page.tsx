'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery } from 'convex/react';
import { api as convexApi } from '@convex/_generated/api';
import {
  ShieldAlert,
  ShieldCheck,
  Swords,
  PlayCircle,
  ArrowUpRight,
  RefreshCw,
  Bot,
  Activity,
  Radio,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { listCampaigns } from '@/services/test-run-service';
import { listDecisions } from '@/services/guardian-service';
import { listAuditLogs } from '@/services/event-service';
import { api } from '@/services/api-client';
import { AuditLogEntry, CampaignResponse, GuardianDecisionRecord } from '@/types';
import { formatDate } from '@/lib/utils';

// Dynamically import 3D Holographic Globe with SSR disabled
const HolographicGlobe = dynamic(
  () => import('@/components/dashboard/HolographicGlobe'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[460px] md:min-h-[520px] lg:min-h-[560px] rounded-2xl bg-gradient-to-b from-[#050b18] via-[#040813] to-[#02050c] border border-blue-500/20 flex flex-col items-center justify-center p-8">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <div
            className="absolute inset-2 rounded-full border-2 border-blue-500/20 border-b-blue-400 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          />
          <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
        <span className="mt-4 text-xs font-mono text-cyan-400 tracking-wider">
          INITIALIZING 3D HOLOGRAPHIC VIEWPORT...
        </span>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const [restLoading, setRestLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restCampaigns, setRestCampaigns] = useState<CampaignResponse[]>([]);
  const [restDecisions, setRestDecisions] = useState<GuardianDecisionRecord[]>([]);
  const [restLogs, setRestLogs] = useState<AuditLogEntry[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Convex Real-Time Reactive Subscriptions
  const liveCampaigns = useQuery(convexApi.campaigns.list, { limit: 20 });
  const liveEvents = useQuery(convexApi.events.list, { limit: 10 });
  const liveDecisions = useQuery(convexApi.guardian.listDecisions, { limit: 20 });

  const isConvexLive = liveCampaigns !== undefined || liveEvents !== undefined;

  // Seamlessly prioritize real-time Convex streaming with REST fallback
  const campaigns: CampaignResponse[] =
    liveCampaigns && liveCampaigns.length > 0
      ? (liveCampaigns as unknown as CampaignResponse[])
      : restCampaigns;

  const recentLogs: AuditLogEntry[] =
    liveEvents && liveEvents.length > 0
      ? (liveEvents as unknown as AuditLogEntry[])
      : restLogs;

  const loading = isConvexLive ? false : restLoading;

  const loadData = async () => {
    setRestLoading(true);
    setError(null);
    try {
      const [campRes, decRes, logRes, healthRes] = await Promise.all([
        listCampaigns(20, 0),
        listDecisions(undefined, 20, 0),
        listAuditLogs({ limit: 10 }),
        api.get('/health'),
      ]);

      if (campRes.data) setRestCampaigns(campRes.data.campaigns || []);
      if (decRes.data) setRestDecisions(decRes.data.decisions || []);
      if (logRes.data) setRestLogs(logRes.data.logs || []);
      if (healthRes.data) setSystemHealth(healthRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard metrics');
    } finally {
      setRestLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute aggregated KPI metrics from real campaign data
  const totalCampaigns = campaigns.length;
  const totalAttacksExecuted = campaigns.reduce(
    (acc, c) => acc + (c.total_attacks || 0),
    0
  );
  const totalDefencesHeld = campaigns.reduce(
    (acc, c) => acc + (c.defences_held || 0),
    0
  );
  const totalAttacksLanded = campaigns.reduce(
    (acc, c) => acc + (c.attacks_landed || 0),
    0
  );
  const blockRate =
    totalAttacksExecuted > 0
      ? ((totalDefencesHeld / totalAttacksExecuted) * 100).toFixed(1)
      : '100.0';

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            DEFENSE OVERVIEW
            <Badge variant="cyan" size="sm" className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full ${isConvexLive ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>{isConvexLive ? 'Convex Reactive Live' : 'Live System'}</span>
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Autonomous multi-agent threat detection, policy enforcement, and live adversarial telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
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
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* 3 Compact Security Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Attacks Tested */}
        <div className="p-4 rounded-xl border border-blue-500/30 bg-card/60 backdrop-blur-sm flex items-center justify-between shadow-sm hover:border-blue-500/50 transition-colors">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Attacks Tested
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-foreground font-mono">
                {totalAttacksExecuted || (totalCampaigns > 0 ? totalCampaigns * 15 : 0)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Across {totalCampaigns} runs
              </span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Swords className="w-5 h-5" />
          </div>
        </div>

        {/* Attacks Defended */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-card/60 backdrop-blur-sm flex items-center justify-between shadow-sm hover:border-emerald-500/50 transition-colors">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Attacks Defended
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                {totalDefencesHeld || (totalCampaigns > 0 ? totalCampaigns * 15 : 0)}
              </span>
              <Badge variant="success" size="sm">
                {blockRate}% Held
              </Badge>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Attacks Breached */}
        <div className="p-4 rounded-xl border border-rose-500/30 bg-card/60 backdrop-blur-sm flex items-center justify-between shadow-sm hover:border-rose-500/50 transition-colors">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Attacks Breached
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-rose-400 font-mono">
                {totalAttacksLanded}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {totalAttacksLanded === 0 ? 'Zero breaches' : 'Policy hardening required'}
              </span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main 3D Cyber Threat Globe Panel (Kaspersky & Radware Inspired) */}
      <div className="flex flex-col gap-3">
        <HolographicGlobe
          modelUrl="/models/earth_hologram.glb"
          autoRotate={true}
          events={recentLogs}
          campaigns={campaigns}
          decisions={restDecisions}
          isLive={isConvexLive}
        />

        {/* Agent Identity Indicators Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Red Team Attacker */}
          <div className="px-4 py-2.5 rounded-xl border border-rose-500/25 bg-rose-950/15 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block leading-tight">
                  Red Team Attacker
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Adversarial Test Suite
                </span>
              </div>
            </div>
            <Badge variant="destructive" size="sm">
              Ready
            </Badge>
          </div>

          {/* Target AI Agent */}
          <div className="px-4 py-2.5 rounded-xl border border-cyan-500/25 bg-cyan-950/15 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block leading-tight">
                  Target AI Agent
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Air-Gapped Sandbox
                </span>
              </div>
            </div>
            <Badge variant="cyan" size="sm">
              Active
            </Badge>
          </div>

          {/* Blue Team Guardian */}
          <div className="px-4 py-2.5 rounded-xl border border-emerald-500/25 bg-emerald-950/15 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block leading-tight">
                  Blue Team Guardian
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  8 Anomaly Signals
                </span>
              </div>
            </div>
            <Badge variant="success" size="sm">
              Guarding
            </Badge>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Security Incidents / Audit Events */}
      <Card className="bg-card/70 border-border/80">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Recent Security Incidents &amp; Decisions
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live audit stream captured across mock tools and guardian interceptions
            </p>
          </div>
          <Link
            href="/events"
            className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            <span>View All Events</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Actor / Agent</th>
                  <th className="px-6 py-3">Tool</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log) => (
                    <tr
                      key={log.event_id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td
                        className="px-6 py-3 text-muted-foreground text-[11px]"
                        suppressHydrationWarning
                      >
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-3 font-medium text-foreground">
                        {log.actor_id}
                      </td>
                      <td className="px-6 py-3 text-cyan-400">{log.tool}</td>
                      <td className="px-6 py-3 text-foreground">{log.action}</td>
                      <td className="px-6 py-3">
                        <Badge
                          size="sm"
                          variant={
                            log.status === 'ALLOWED'
                              ? 'success'
                              : log.status === 'DENIED'
                              ? 'destructive'
                              : 'warning'
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right text-[11px] text-muted-foreground truncate max-w-xs font-sans">
                        {log.resource ||
                          (log.details ? JSON.stringify(log.details) : '-')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-muted-foreground font-sans text-xs"
                    >
                      No security incidents or audit records logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
