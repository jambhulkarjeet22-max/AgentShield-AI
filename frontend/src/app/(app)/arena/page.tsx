'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api as convexApi } from '@convex/_generated/api';
import {
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  Shield,
  Layers,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { JSONViewer } from '@/components/ui/JSONViewer';
import { BattlefieldMaze3D } from '@/components/arena/BattlefieldMaze3D';
import { ArenaMetrics } from '@/components/arena/ArenaMetrics';
import { ArenaLiveEvents, LiveEventItem } from '@/components/arena/ArenaLiveEvents';
import { fetchAttackCatalog } from '@/services/scenario-service';
import { launchCampaign, listCampaigns } from '@/services/test-run-service';
import { resetMockEnvironment } from '@/services/tool-service';
import { AttackCatalogEntry, AttackResult, CampaignResponse } from '@/types';

function normalizeCampaign(campaign: any): CampaignResponse {
  if (!campaign) return campaign;
  const rawList = campaign.attack_results || campaign.results || [];
  const normalizedResults: AttackResult[] = rawList.map((r: any) => ({
    attack_id: r.attack_id || 'unknown',
    name: r.attack_name || r.name || r.attack_id || 'Unknown Attack',
    category: r.category,
    payload: r.payload || '',
    outcome: r.outcome,
    defended: r.defended ?? (r.outcome === 'DEFENCE_HELD'),
    defence_mechanism:
      r.defence_mechanism ||
      r.evaluation_notes ||
      (r.outcome === 'DEFENCE_HELD'
        ? 'Policy & Guardian Boundary Held'
        : 'Unchecked Action'),
    task_id: r.target_task_id || r.task_id,
    details: r,
    timestamp: r.timestamp || new Date().toISOString(),
  }));

  return {
    ...campaign,
    results: normalizedResults,
  };
}

function resolveToolFromCategory(category?: string, attackName?: string): 'FILES' | 'MAILBOX' | 'BROWSER' | 'PAYMENTS' {
  const cat = (category || '').toLowerCase();
  const name = (attackName || '').toLowerCase();

  if (cat.includes('email') || cat.includes('mail') || name.includes('email') || name.includes('ceo')) {
    return 'MAILBOX';
  }
  if (cat.includes('web') || cat.includes('browser') || name.includes('browse') || name.includes('page')) {
    return 'BROWSER';
  }
  if (cat.includes('payment') || name.includes('pay') || name.includes('wire') || name.includes('invoice')) {
    return 'PAYMENTS';
  }
  return 'FILES';
}

export default function ArenaPage() {
  const [catalog, setCatalog] = useState<AttackCatalogEntry[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('ALL');
  const [simulationState, setSimulationState] = useState<
    'IDLE' | 'ATTACKING' | 'DEFENDING' | 'BLOCKED' | 'BREACHED'
  >('IDLE');
  const [currentTargetTool, setCurrentTargetTool] = useState<string>('TARGET AI');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState<CampaignResponse | null>(null);
  const [totalCampaignsCount, setTotalCampaignsCount] = useState<number>(0);
  const [liveEvents, setLiveEvents] = useState<LiveEventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<LiveEventItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convex Real-Time Reactive Queries & Mutations
  const convexCatalog = useQuery(convexApi.catalog.list);
  const convexLatestCampaign = useQuery(convexApi.campaigns.getLatest);
  const saveCampaignMutation = useMutation(convexApi.campaigns.save);
  const recordAuditBatchMutation = useMutation(convexApi.events.recordBatch);
  const recordDecisionBatchMutation = useMutation(convexApi.guardian.recordDecisionBatch);

  // Sync catalog from Convex if available
  useEffect(() => {
    if (convexCatalog && convexCatalog.length > 0 && catalog.length === 0) {
      setCatalog(
        convexCatalog.map((c: any) => ({
          attack_id: c.attack_id,
          name: c.name,
          category: c.category,
          category_name: c.category.replace(/_/g, ' ').toUpperCase(),
          description: c.description,
          default_payload: '',
          target_tool: c.target_tool,
          severity: c.severity,
          expected_control: c.expected_outcome,
        }))
      );
    }
  }, [convexCatalog, catalog.length]);

  // Reactively sync latest campaign from Convex Cloud
  useEffect(() => {
    if (convexLatestCampaign && !loading && simulationState === 'IDLE') {
      const norm = normalizeCampaign(convexLatestCampaign as unknown as CampaignResponse);
      setCurrentCampaign(norm);
      if (norm.results && norm.results.length > 0) {
        setLiveEvents(
          norm.results.map((r, i) => ({
            id: `evt-${i}`,
            type: 'ATTACK_EVALUATED',
            title: r.name,
            category: r.category,
            status: r.defended ? 'BLOCKED' : 'BREACHED',
            timestamp: r.timestamp || new Date().toISOString(),
            payload: r.payload,
            mechanism: r.defence_mechanism,
            details: r,
          }))
        );
      }
    }
  }, [convexLatestCampaign, loading, simulationState]);

  // Load attack catalog and latest campaign on mount
  useEffect(() => {
    async function init() {
      try {
        const [catRes, campRes] = await Promise.all([
          fetchAttackCatalog(),
          listCampaigns(10, 0),
        ]);

        const catList = Array.isArray(catRes.data)
          ? catRes.data
          : (catRes.data as any)?.attacks || [];
        if (catList.length > 0) {
          setCatalog(catList);
        }
        if (campRes.data && campRes.data.campaigns?.length > 0) {
          setTotalCampaignsCount(campRes.data.total || campRes.data.campaigns.length);
          const latest = campRes.data.campaigns[0];
          const norm = normalizeCampaign(latest);
          setCurrentCampaign(norm);
          if (norm.results && norm.results.length > 0) {
            setLiveEvents(
              norm.results.map((r, i) => ({
                id: `evt-${i}`,
                type: 'ATTACK_EVALUATED',
                title: r.name,
                category: r.category,
                status: r.defended ? 'BLOCKED' : 'BREACHED',
                timestamp: r.timestamp || new Date().toISOString(),
                payload: r.payload,
                mechanism: r.defence_mechanism,
                details: r,
              }))
            );
          }
        }
      } catch (err: any) {
        setError('Failed to initialize cyber arena.');
      }
    }
    init();
  }, []);

  // Launch Attack Campaign
  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setSimulationState('ATTACKING');

    try {
      let categories: any[] = [];
      let name = 'Adversarial Cyber Campaign';

      if (selectedScenarioId === 'ALL') {
        categories = [
          'prompt_injection_email',
          'prompt_injection_web',
          'privilege_escalation',
          'payment_fraud',
          'tool_abuse',
          'loop_exhaustion',
        ];
        name = 'Full 15-Attack Triad Suite';
      } else {
        const scenario = catalog.find((c) => c.attack_id === selectedScenarioId);
        if (scenario) {
          categories = [scenario.category];
          name = `Targeted: ${scenario.name}`;
        }
      }

      const res = await launchCampaign({
        campaign_name: name,
        categories,
        target_actor_key: 'mock-key-employee-secret-3303',
      });

      if (!res.ok || !res.data) {
        setError(res.error || 'Campaign launch failed.');
        setSimulationState('IDLE');
        setLoading(false);
        return;
      }

      const campaign = normalizeCampaign(res.data);
      setCurrentCampaign(campaign);
      setTotalCampaignsCount((prev) => prev + 1);

      // Persist campaign and telemetry into Convex Cloud DB
      try {
        const attackList = campaign.results || [];
        await saveCampaignMutation({
          campaign_id: campaign.campaign_id,
          campaign_name: campaign.campaign_name,
          description: campaign.description,
          status: campaign.status,
          total_attacks: campaign.total_attacks,
          defences_held: campaign.defences_held,
          attacks_landed: campaign.attacks_landed,
          failed_to_trigger: 0,
          errors: 0,
          categories: campaign.categories || [],
          started_at: campaign.started_at,
          completed_at: campaign.completed_at || new Date().toISOString(),
          summary: `Campaign completed with ${campaign.defences_held}/${campaign.total_attacks} defenses held.`,
          attack_results: attackList,
        });

        // Record audit events into Convex audit_logs table
        const auditEvents = attackList.map((att, idx) => ({
          event_id: `evt-${campaign.campaign_id}-${idx}-${Date.now()}`,
          timestamp: att.timestamp || new Date().toISOString(),
          actor_id: att.defended ? 'blue_guardian' : 'redteam_agent',
          role: att.defended ? 'DEFENDER' : 'ATTACKER',
          tool: resolveToolFromCategory(att.category, att.name).toLowerCase(),
          action: att.name || att.attack_id,
          status: att.defended ? 'ALLOWED' : 'DENIED',
          resource: att.attack_id,
          details: att,
        }));
        if (auditEvents.length > 0) {
          await recordAuditBatchMutation({ events: auditEvents });
        }

        // Record guardian decisions into Convex guardian_decisions table
        const guardianDecisions = attackList.map((att, idx) => ({
          decision_id: `dec-${campaign.campaign_id}-${idx}-${Date.now()}`,
          task_id: att.task_id || att.attack_id,
          step_number: idx + 1,
          verdict: att.defended ? 'ALLOW' : 'BLOCK',
          risk_score: att.defended ? 15 : 95,
          explanation: att.defence_mechanism || 'PolicyValidator Hard Boundary evaluation',
          signals: [{ type: 'POLICY', outcome: att.defended ? 'PASS' : 'FAIL' }],
          timestamp: att.timestamp || new Date().toISOString(),
        }));
        if (guardianDecisions.length > 0) {
          await recordDecisionBatchMutation({ decisions: guardianDecisions });
        }
      } catch (convexSyncErr) {
        console.warn('Convex persistence warning (non-blocking):', convexSyncErr);
      }

      // Playback simulation events with realistic animated cadence
      const attackResults = campaign.results || [];
      const newEvents: LiveEventItem[] = [];

      for (let i = 0; i < attackResults.length; i++) {
        const attack = attackResults[i];
        const targetTool = resolveToolFromCategory(attack.category, attack.name);
        setCurrentTargetTool(targetTool);

        // Step 1: Red Team moves along maze to attack tool (Deliberate cinematic pace)
        setSimulationState('ATTACKING');
        await new Promise((r) => setTimeout(r, Math.round(1400 / speedMultiplier)));

        // Step 2: Blue Team rushes to intercept
        setSimulationState('DEFENDING');
        await new Promise((r) => setTimeout(r, Math.round(1200 / speedMultiplier)));

        // Step 3: Verdict reached (Shield flares or breach recorded)
        const finalStatus = attack.defended ? 'BLOCKED' : 'BREACHED';
        setSimulationState(finalStatus);

        const eventItem: LiveEventItem = {
          id: `live-${i}-${Date.now()}`,
          type: 'ATTACK_EVALUATED',
          title: attack.name,
          category: attack.category,
          status: finalStatus,
          timestamp: attack.timestamp || new Date().toISOString(),
          payload: attack.payload,
          mechanism: attack.defence_mechanism,
          details: attack,
        };

        newEvents.unshift(eventItem);
        setLiveEvents([...newEvents]);
        setSelectedEvent(eventItem);

        // Step 4: Hold on verdict so user can clearly absorb the defense outcome
        await new Promise((r) => setTimeout(r, Math.round(1400 / speedMultiplier)));
      }

      // Final standing state
      setSimulationState(campaign.attacks_landed === 0 ? 'BLOCKED' : 'BREACHED');
    } catch (err: any) {
      setError(err?.message || 'Simulation execution error.');
      setSimulationState('IDLE');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    await resetMockEnvironment();
    setLiveEvents([]);
    setSelectedEvent(null);
    setCurrentCampaign(null);
    setSimulationState('IDLE');
    setCurrentTargetTool('TARGET AI');
    setResetting(false);
  };

  const handleReplay = async () => {
    if (!currentCampaign?.results?.length) return;
    setLoading(true);

    for (let idx = 0; idx < currentCampaign.results.length; idx++) {
      const item = currentCampaign.results[idx];
      const targetTool = resolveToolFromCategory(item.category, item.name);
      setCurrentTargetTool(targetTool);

      setSimulationState('ATTACKING');
      await new Promise((r) => setTimeout(r, Math.round(1200 / speedMultiplier)));

      setSimulationState('DEFENDING');
      await new Promise((r) => setTimeout(r, Math.round(1200 / speedMultiplier)));

      setSimulationState(item.defended ? 'BLOCKED' : 'BREACHED');
      setSelectedEvent({
        id: `replay-${idx}`,
        type: 'ATTACK_EVALUATED',
        title: item.name,
        category: item.category,
        status: item.defended ? 'BLOCKED' : 'BREACHED',
        timestamp: new Date().toISOString(),
        payload: item.payload,
        mechanism: item.defence_mechanism,
        details: item,
      });

      await new Promise((r) => setTimeout(r, Math.round(1200 / speedMultiplier)));
    }

    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            CYBER ARENA
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live System
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Watch real-time Red vs Blue multi-agent combat in the visual arena.
          </p>
        </div>
      </div>

      {/* 2. Compact Security Metrics Row */}
      <ArenaMetrics
        campaign={currentCampaign}
        totalCampaigns={totalCampaignsCount}
      />

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Main Cyber Battlefield Card (Maze + Live Events Split) */}
      <div className="rounded-xl border border-border/80 bg-card/75 backdrop-blur-md overflow-hidden shadow-xl">
        {/* Card Header & Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border/70 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_#a855f7]" />
            <span className="text-xs font-bold font-mono tracking-wider text-foreground uppercase">
              CYBER BATTLEFIELD
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Speed Multiplier Control */}
            <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs font-mono">
              <span className="px-2 text-[10px] text-muted-foreground uppercase font-bold hidden sm:inline">Speed:</span>
              {[
                { label: '0.5x Slow', value: 0.5 },
                { label: '1x Normal', value: 1 },
                { label: '2x Fast', value: 2 },
              ].map((spd) => (
                <button
                  key={spd.value}
                  type="button"
                  onClick={() => setSpeedMultiplier(spd.value)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    speedMultiplier === spd.value
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {spd.label}
                </button>
              ))}
            </div>

            {/* Scenario Selector Dropdown */}
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              disabled={loading}
              className="h-8 bg-muted/70 hover:bg-muted border border-border/80 rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-xs truncate transition-colors"
            >
              <option value="ALL">Select Scenario: Full Suite (15 Attacks)</option>
              {catalog.map((sc) => (
                <option key={sc.attack_id} value={sc.attack_id}>
                  [{sc.attack_id}] {sc.name}
                </option>
              ))}
            </select>

            {/* START Button */}
            <Button
              size="sm"
              onClick={handleStart}
              loading={loading}
              className="h-8 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/25 px-4"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              <span>Start</span>
            </Button>

            {/* PAUSE Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 text-xs px-3"
            >
              <Pause className="w-3.5 h-3.5 mr-1.5" />
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </Button>

            {/* RESET Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={resetting}
              className="h-8 text-xs px-3"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>Reset</span>
            </Button>

            {/* REPLAY Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleReplay}
              disabled={loading || !currentCampaign?.results?.length}
              className="h-8 text-xs px-3"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Replay</span>
            </Button>
          </div>
        </div>

        {/* 70% / 30% Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left Column: 3D Pac-Man Network Maze (8 cols / ~68%) */}
          <div className="lg:col-span-8 p-3 bg-black/30 border-b lg:border-b-0 lg:border-r border-border/60">
            <BattlefieldMaze3D
              simulationState={simulationState}
              currentTargetTool={currentTargetTool}
              activeScenarioName={
                selectedScenarioId !== 'ALL'
                  ? catalog.find((c) => c.attack_id === selectedScenarioId)?.name
                  : currentCampaign?.campaign_name
              }
            />
          </div>

          {/* Right Column: Live Events Panel (4 cols / ~32%) */}
          <div className="lg:col-span-4 p-3 bg-muted/5 flex flex-col justify-stretch">
            <ArenaLiveEvents
              events={liveEvents}
              selectedEventId={selectedEvent?.id}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              simulationState={simulationState}
            />
          </div>
        </div>
      </div>

      {/* 4. Selected Event Granular Telemetry Card (Shown when an event is clicked) */}
      {selectedEvent && (
        <Card className="bg-card/75 border-border/80 backdrop-blur-md animate-in fade-in-0 duration-200">
          <CardHeader className="py-3 px-6 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-violet-400" />
              <CardTitle className="text-sm font-semibold">
                Event Telemetry Detail: {selectedEvent.title}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={selectedEvent.status === 'BLOCKED' ? 'success' : 'destructive'}
              >
                {selectedEvent.status === 'BLOCKED' ? 'DEFENSE HELD' : 'BREACH LANDED'}
              </Badge>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
              >
                Close
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-3 min-w-0">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Attack Payload Dispatched:
                </span>
                <pre className="mt-1 p-3 rounded-lg bg-black/60 border border-border/70 text-xs font-mono text-rose-400 overflow-y-auto overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[140px] custom-scrollbar">
                  {selectedEvent.payload || 'N/A'}
                </pre>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/70 text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Defending Subsystem & Mechanism:
                </span>
                <span className="text-foreground font-semibold mt-0.5 block">
                  {selectedEvent.mechanism || 'PolicyValidator Hard Boundary'}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <JSONViewer
                title="Full Adversarial Evaluation Record"
                data={selectedEvent.details || selectedEvent}
                maxHeight="max-h-[220px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Bottom Banner Card (Matching reference design) */}
      <div className="p-4 rounded-xl border border-violet-500/20 bg-card/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/35 text-violet-400 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Cyber Arena 3D Battlefield</h4>
            <p className="text-xs text-muted-foreground">Experience the real-time AI security battle.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/learning">
            <Button variant="outline" size="sm" className="text-xs h-9">
              View Learning Progress
            </Button>
          </Link>
          <Link href="/runs">
            <Button size="sm" className="text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-md shadow-violet-600/25">
              Enter Cyber Arena <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
