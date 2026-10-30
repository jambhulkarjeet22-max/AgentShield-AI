import React, { useState, useEffect } from 'react';
import {
  Swords,
  Play,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Eye,
  Sliders,
  Shield,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { JSONViewer } from '../components/common/JSONViewer';
import { launchCampaign, listCampaigns, getCampaign } from '../api/redteam';

const AVAILABLE_CATEGORIES = [
  { id: 'prompt_injection_email', label: 'Prompt Injection (Email)', desc: 'Indirect instructions hidden in unread emails' },
  { id: 'prompt_injection_web', label: 'Prompt Injection (Web)', desc: 'Adversarial directives embedded in fetched web pages' },
  { id: 'privilege_escalation', label: 'Privilege Escalation', desc: 'Attempts to read confidential records or bypass roles' },
  { id: 'payment_fraud', label: 'Payment Fraud', desc: 'Autonomous payment creation or limit exceeding' },
  { id: 'tool_abuse', label: 'Tool Abuse & Path Traversal', desc: 'Arbitrary sandbox escapes, path traversals' },
  { id: 'loop_exhaustion', label: 'Loop Exhaustion', desc: 'Runaway tool recursion exhausting execution limits' },
];

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Launch Modal State
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [campaignName, setCampaignName] = useState('Automated Adversarial Campaign');
  const [targetActorKey, setTargetActorKey] = useState('mock-key-employee-secret-3303');
  const [description, setDescription] = useState('Adversarial validation of agent security guardrails');
  const [selectedCategories, setSelectedCategories] = useState([
    'prompt_injection_email',
    'prompt_injection_web',
    'privilege_escalation',
    'payment_fraud',
    'tool_abuse',
    'loop_exhaustion',
  ]);
  const [launchError, setLaunchError] = useState(null);

  // Drilldown Modal State
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCampaignsList = async () => {
    setLoading(true);
    setError(null);
    const res = await listCampaigns(50, 0);
    if (res.ok && res.data) {
      setCampaigns(res.data.campaigns || []);
    } else {
      setError(res.error || 'Failed to fetch campaigns history');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaignsList();
  }, []);

  const handleToggleCategory = (catId) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) return; // Keep at least one
      setSelectedCategories(selectedCategories.filter((c) => c !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleLaunchCampaign = async (e) => {
    e.preventDefault();
    setLaunching(true);
    setLaunchError(null);

    const payload = {
      campaign_name: campaignName.trim() || 'Automated Adversarial Campaign',
      categories: selectedCategories,
      target_actor_key: targetActorKey.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
    };

    const res = await launchCampaign(payload);
    if (res.ok && res.data) {
      setIsLaunchModalOpen(false);
      await fetchCampaignsList();
      setSelectedCampaign(res.data);
    } else {
      setLaunchError(res.error || 'Failed to launch adversarial campaign');
    }
    setLaunching(false);
  };

  const handleViewDetail = async (campId) => {
    setDetailLoading(true);
    const res = await getCampaign(campId);
    if (res.ok && res.data) {
      setSelectedCampaign(res.data);
    }
    setDetailLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Launch Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Swords className="w-5 h-5 text-blue-400" />
            Red Team Adversarial Campaigns
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate dynamic multi-vector attacks against the Target Agent and evaluate containment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCampaignsList}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setLaunchError(null);
              setIsLaunchModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            Launch New Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Campaigns History Table */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-navy-950/40">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Campaign Ledger ({campaigns.length})
          </span>
          <span className="text-xs text-slate-400">Strictly evaluates real execution records</span>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Swords className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No campaigns found in registry</p>
            <p className="text-xs mt-1">Launch a campaign to test prompt injection, loop defense, and privilege isolation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-navy-950/20">
                  <th className="py-3.5 px-4">Campaign Name / ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4 text-center">Attacks</th>
                  <th className="py-3.5 px-4 text-center">Held</th>
                  <th className="py-3.5 px-4 text-center">Landed</th>
                  <th className="py-3.5 px-4">Started At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {campaigns.map((camp) => (
                  <tr key={camp.campaign_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{camp.campaign_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{camp.campaign_id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={camp.status}>{camp.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{camp.launched_by}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-white">{camp.total_attacks}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-emerald-400">{camp.defences_held}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-rose-400">{camp.attacks_landed}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {camp.started_at ? new Date(camp.started_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewDetail(camp.campaign_id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-semibold text-xs transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Launch Campaign Modal */}
      <Modal
        isOpen={isLaunchModalOpen}
        onClose={() => !launching && setIsLaunchModalOpen(false)}
        title="Configure & Launch Adversarial Campaign"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleLaunchCampaign} className="space-y-4">
          {launchError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{launchError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Campaign Name
            </label>
            <input
              type="text"
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Attack Categories ({selectedCategories.length}/6)
            </label>
            <div className="space-y-2">
              {AVAILABLE_CATEGORIES.map((cat) => {
                const checked = selectedCategories.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      checked
                        ? 'bg-blue-600/10 border-blue-500/40 text-white'
                        : 'bg-navy-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="text-xs font-semibold">{cat.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{cat.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Target Actor Key (Victim Context)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Required by Campaign API</span>
            </div>
            <input
              type="text"
              required
              value={targetActorKey}
              onChange={(e) => setTargetActorKey(e.target.value)}
              placeholder="e.g. mock-key-employee-secret-3303"
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-slate-400">Presets:</span>
              <button
                type="button"
                onClick={() => setTargetActorKey('mock-key-employee-secret-3303')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              >
                Employee (Default Victim)
              </button>
              <button
                type="button"
                onClick={() => setTargetActorKey('mock-key-guest-secret-1104')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              >
                Guest User
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Campaign Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Adversarial evaluation of agent security boundaries"
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={launching}
              onClick={() => setIsLaunchModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={launching}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {launching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Simulating Attacks...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Campaign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Campaign Detail Drilldown Modal */}
      {selectedCampaign && (
        <Modal
          isOpen={Boolean(selectedCampaign)}
          onClose={() => setSelectedCampaign(null)}
          title={`Campaign Results: ${selectedCampaign.campaign_name}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Attacks</span>
                <div className="text-xl font-mono font-bold text-white mt-1">{selectedCampaign.total_attacks}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Defences Held</span>
                <div className="text-xl font-mono font-bold text-emerald-400 mt-1">{selectedCampaign.defences_held}</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[10px] uppercase font-bold text-rose-400">Attacks Landed</span>
                <div className="text-xl font-mono font-bold text-rose-400 mt-1">{selectedCampaign.attacks_landed}</div>
              </div>
              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                <div className="mt-1">
                  <Badge variant={selectedCampaign.status}>{selectedCampaign.status}</Badge>
                </div>
              </div>
            </div>

            {/* Individual Attack Execution Results */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-3 bg-navy-950 border-b border-slate-800 text-xs font-semibold text-slate-300">
                Attack Outcomes ({selectedCampaign.attack_results?.length || 0})
              </div>
              <div className="divide-y divide-slate-850 max-h-96 overflow-y-auto">
                {selectedCampaign.attack_results?.map((atk) => (
                  <div key={atk.attack_id} className="p-3.5 hover:bg-slate-800/20 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">{atk.attack_id}</span>
                        <span className="text-xs font-semibold text-white">{atk.attack_name}</span>
                        <Badge variant={atk.outcome}>{atk.outcome}</Badge>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Task: {atk.target_task_id || 'N/A'} [{atk.target_task_status}]
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-mono bg-navy-950/60 p-2 rounded border border-slate-800">
                      Payload: {atk.payload}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>Total Steps: {atk.steps_total} | Blocked: {atk.steps_blocked} | Succeeded: {atk.steps_succeeded}</span>
                      <span className="text-slate-300 italic">{atk.evaluation_notes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

