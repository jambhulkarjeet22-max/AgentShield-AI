import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Swords,
  UserCheck,
  Activity,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { listCampaigns } from '../api/redteam';
import { listDecisions, listApprovals } from '../api/guardian';
import { listTasks } from '../api/target';
import { listAuditLogs } from '../api/tools';

export function DashboardPage({ setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real backend metrics state
  const [campaigns, setCampaigns] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [campRes, decRes, apprRes, taskRes, auditRes] = await Promise.all([
        listCampaigns(10, 0),
        listDecisions(null, 10, 0),
        listApprovals(null, 10, 0),
        listTasks(null, 10, 0),
        listAuditLogs({ limit: 10 }),
      ]);

      if (campRes.ok && campRes.data) {
        setCampaigns(campRes.data.campaigns || []);
      }
      if (decRes.ok && decRes.data) {
        setDecisions(decRes.data.decisions || []);
      }
      if (apprRes.ok && apprRes.data) {
        setApprovals(apprRes.data.approvals || []);
      }
      if (taskRes.ok && taskRes.data) {
        setTasks(taskRes.data.tasks || []);
      }
      if (auditRes.ok && auditRes.data) {
        setRecentAudits(auditRes.data.logs || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to aggregate dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute actual aggregated numbers strictly from real data
  const totalCampaigns = campaigns.length;
  const totalAttacksExecuted = campaigns.reduce((acc, c) => acc + (c.total_attacks || 0), 0);
  const totalDefencesHeld = campaigns.reduce((acc, c) => acc + (c.defences_held || 0), 0);
  const totalAttacksLanded = campaigns.reduce((acc, c) => acc + (c.attacks_landed || 0), 0);

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const guardianBlocksCount = decisions.filter((d) => d.verdict === 'BLOCK').length;

  const defenseRate = totalAttacksExecuted > 0
    ? `${((totalDefencesHeld / totalAttacksExecuted) * 100).toFixed(1)}%`
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Executive Security Posture
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-agent adversarial simulation and containment telemetry.
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Telemetry
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Error loading dashboard metrics: {error}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Defence Success Rate"
          value={defenseRate}
          subtitle={totalAttacksExecuted > 0 ? `${totalDefencesHeld}/${totalAttacksExecuted} attacks contained` : 'No campaigns run yet'}
          icon={ShieldCheck}
          color={totalAttacksLanded > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="Adversarial Campaigns"
          value={totalCampaigns}
          subtitle={totalAttacksExecuted > 0 ? `${totalAttacksExecuted} attack vectors simulated` : 'Ready to launch'}
          icon={Swords}
          color="blue"
        />
        <MetricCard
          title="Guardian Blocks"
          value={guardianBlocksCount}
          subtitle={`${decisions.length} total evaluations rendered`}
          icon={ShieldAlert}
          color="cyan"
        />
        <MetricCard
          title="Pending Approvals"
          value={pendingApprovalsCount}
          subtitle={pendingApprovalsCount > 0 ? 'Admin authorization required' : 'Queue clear'}
          icon={UserCheck}
          color={pendingApprovalsCount > 0 ? 'amber' : 'blue'}
        />
      </div>

      {/* Two Column Layout: Recent Campaigns vs Guardian Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Red Team Campaigns */}
        <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Recent Red Team Campaigns</h3>
            </div>
            <button
              onClick={() => setActivePage('campaigns')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <Swords className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">No campaigns launched yet.</p>
              <button
                onClick={() => setActivePage('campaigns')}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition"
              >
                Launch First Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-80">
              {campaigns.map((camp) => (
                <div
                  key={camp.campaign_id}
                  className="p-3.5 rounded-xl bg-navy-950/70 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{camp.campaign_name}</span>
                      <Badge variant={camp.status}>{camp.status}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3 font-mono">
                      <span>Attacks: {camp.total_attacks}</span>
                      <span className="text-emerald-400">Held: {camp.defences_held}</span>
                      <span className={camp.attacks_landed > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                        Landed: {camp.attacks_landed}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {camp.started_at ? new Date(camp.started_at).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Blue Team Guardian Decisions */}
        <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Guardian Risk Interceptions</h3>
            </div>
            <button
              onClick={() => setActivePage('guardian')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {decisions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <ShieldCheck className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">No Guardian evaluation records rendered yet.</p>
              <button
                onClick={() => setActivePage('studio')}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition"
              >
                Submit Agent Task
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-80">
              {decisions.map((dec) => (
                <div
                  key={dec.record_id}
                  className="p-3 rounded-xl bg-navy-950/70 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        {dec.tool}:{dec.action}
                      </span>
                      <Badge variant={dec.verdict}>{dec.verdict}</Badge>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        Risk: {dec.risk_score}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{dec.explanation}</p>
                  </div>
                  {dec.ml_advisory && (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-2 py-0.5 rounded">
                      ML: {(dec.ml_advisory.probability * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Recent Security Audit Activity */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Live Security Audit Log Stream</h3>
          </div>
          <button
            onClick={() => setActivePage('audit')}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
          >
            <span>Full Audit Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAudits.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No audit log records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Actor</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Tool</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {recentAudits.slice(0, 5).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 font-mono">
                    <td className="py-2.5 text-slate-400 text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="py-2.5 text-slate-300">{log.actor_id}</td>
                    <td className="py-2.5 text-slate-400">{log.role}</td>
                    <td className="py-2.5 text-blue-400">{log.tool}</td>
                    <td className="py-2.5 text-slate-200">{log.action}</td>
                    <td className="py-2.5">
                      <Badge variant={log.status}>{log.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

