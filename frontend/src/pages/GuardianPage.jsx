import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Cpu, RefreshCw, Filter, Eye, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { JSONViewer } from '../components/common/JSONViewer';
import { listDecisions, getDecision } from '../api/guardian';

export function GuardianPage() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState('');
  const [selectedDecision, setSelectedDecision] = useState(null);

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    const res = await listDecisions(verdictFilter || null, 50, 0);
    if (res.ok && res.data) {
      setDecisions(res.data.decisions || []);
    } else {
      setError(res.error || 'Failed to load Guardian decisions');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDecisions();
  }, [verdictFilter]);

  const handleInspect = async (recordId) => {
    const res = await getDecision(recordId);
    if (res.ok && res.data) {
      setSelectedDecision(res.data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Blue Team Guardian & Risk Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative real-time action interception, intent alignment scoring, and ML advisory metadata.
          </p>
        </div>
        <button
          onClick={fetchDecisions}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Refresh decisions"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400 ml-1" />
        {[
          { label: 'All Verdicts', val: '' },
          { label: 'Blocked', val: 'BLOCK' },
          { label: 'Approval Required', val: 'REQUIRE_APPROVAL' },
          { label: 'Allowed', val: 'ALLOW' },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => setVerdictFilter(tab.val)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              verdictFilter === tab.val
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-navy-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Decisions List */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-navy-950/40">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Evaluation Ledger ({decisions.length})
          </span>
          <span className="text-xs text-slate-400">PolicyValidator & Guardian verdicts</span>
        </div>

        {decisions.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Guardian evaluation records found</p>
            <p className="text-xs mt-1">Actions executed by the Target Agent or Red Team will be audited here in real time.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {decisions.map((dec) => {
              const riskColor =
                dec.risk_score >= 80 ? 'text-rose-400' : dec.risk_score >= 50 ? 'text-amber-400' : 'text-emerald-400';

              return (
                <div key={dec.record_id} className="p-4 hover:bg-slate-800/30 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Badge variant={dec.verdict}>{dec.verdict}</Badge>
                      <span className="font-mono text-xs font-bold text-white">
                        {dec.tool}:{dec.action}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Actor: {dec.actor_id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Risk Score: <span className={riskColor}>{dec.risk_score}/100</span>
                      </span>
                      <button
                        onClick={() => handleInspect(dec.record_id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{dec.explanation}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="text-slate-400 font-semibold">Signals:</span>
                    {dec.signals_triggered?.map((sig, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]"
                      >
                        {sig}
                      </span>
                    ))}

                    {dec.ml_advisory && (
                      <div className="ml-auto flex items-center gap-2 text-cyan-400 font-mono text-[11px] bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-0.5 rounded-lg">
                        <Cpu className="w-3 h-3" />
                        <span>ML Advisory: {dec.ml_advisory.label}</span>
                        <span className="text-cyan-300 font-bold">({(dec.ml_advisory.probability * 100).toFixed(1)}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Inspection Modal */}
      {selectedDecision && (
        <Modal
          isOpen={Boolean(selectedDecision)}
          onClose={() => setSelectedDecision(null)}
          title={`Guardian Verdict Inspection: ${selectedDecision.record_id}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Verdict</span>
                <div className="mt-1">
                  <Badge variant={selectedDecision.verdict}>{selectedDecision.verdict}</Badge>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Risk Score</span>
                <div className="text-lg font-mono font-bold text-white mt-0.5">{selectedDecision.risk_score} / 100</div>
              </div>
              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Intent Alignment</span>
                <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">{selectedDecision.intent_alignment}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-400">Guardian Rationale</span>
              <p className="text-xs text-slate-200 leading-relaxed">{selectedDecision.explanation}</p>
            </div>

            {selectedDecision.ml_advisory && (
              <div className="p-3 rounded-xl bg-navy-950 border border-cyan-800/40 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Machine Learning Advisory Signals (Scikit-Learn Microservice)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-navy-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Classification</span>
                    <span className="font-bold text-white">{selectedDecision.ml_advisory.label}</span>
                  </div>
                  <div className="p-2 rounded bg-navy-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Probability</span>
                    <span className="font-bold text-cyan-300">{(selectedDecision.ml_advisory.probability * 100).toFixed(2)}%</span>
                  </div>
                  <div className="p-2 rounded bg-navy-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Decision Margin</span>
                    <span className="font-bold text-slate-300">{selectedDecision.ml_advisory.decision_margin?.toFixed(3) || 'N/A'}</span>
                  </div>
                  <div className="p-2 rounded bg-navy-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Service Status</span>
                    <span className="font-bold text-emerald-400">{selectedDecision.ml_advisory.service_available ? 'ONLINE' : 'FALLBACK'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Note: ML signals serve as advisory risk inputs only. The deterministic PolicyValidator remains authoritative.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Raw Decision Record JSON</span>
              <JSONViewer data={selectedDecision} title="Guardian Decision Record" />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDecision(null)}
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

