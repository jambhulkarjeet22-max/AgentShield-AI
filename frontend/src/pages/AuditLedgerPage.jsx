import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Shield, KeyRound, RefreshCw, Eye, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { JSONViewer } from '../components/common/JSONViewer';
import { listAuditLogs } from '../api/tools';
import { useActor } from '../context/ActorContext';

export function AuditLedgerPage() {
  const { apiKey, actorLabel, updateApiKey } = useActor();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedTool, setSelectedTool] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [actorFilter, setActorFilter] = useState('');

  // Drilldown Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    const res = await listAuditLogs({
      tool: selectedTool || null,
      status: selectedStatus || null,
      actorId: actorFilter || null,
      limit: 100,
    });

    if (res.ok && res.data) {
      setLogs(res.data.logs || []);
    } else {
      setError(res.error || 'Failed to fetch audit logs (Permission audit:read or admin required)');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedTool, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Security Audit Ledger & RBAC Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident system activity log recording all tool interactions, permission validations, and policy denials.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Refresh audit ledger"
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

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-navy-900 border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold uppercase text-[10px]">Filter By Tool:</span>
        </div>

        {['', 'email', 'filesystem', 'browser', 'payments'].map((tool) => (
          <button
            key={tool || 'all'}
            onClick={() => setSelectedTool(tool)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedTool === tool
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-navy-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tool ? tool.toUpperCase() : 'ALL TOOLS'}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase text-slate-400">Status:</span>
          {['', 'ALLOWED', 'DENIED', 'BLOCKED'].map((st) => (
            <button
              key={st || 'all-st'}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedStatus === st
                  ? 'bg-slate-700 text-white'
                  : 'bg-navy-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-navy-950/40">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Audit Records ({logs.length})
          </span>
          <span className="text-xs text-slate-400">Audited via centralized SecurityAuditService</span>
        </div>

        {logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No audit log entries matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-navy-950/20">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Tool</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors font-mono">
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-bold">{log.actor_id}</td>
                    <td className="py-3 px-4 text-slate-400">{log.role}</td>
                    <td className="py-3 px-4 text-blue-400 font-bold">{log.tool}</td>
                    <td className="py-3 px-4 text-slate-200">{log.action}</td>
                    <td className="py-3 px-4">
                      <Badge variant={log.status}>{log.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold text-xs inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RBAC Privilege Matrix Card */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Shield className="w-4 h-4 text-blue-400" />
          <span>Role-Based Access Control (RBAC) Permission Matrix</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The table below illustrates deterministic privilege boundaries enforced by the backend PolicyValidator and mock actor registry.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-emerald-400 block">ADMIN</span>
            <p className="text-[11px] text-slate-400">Universal authority (<code className="text-emerald-300">*</code>). Can execute all tools, approve high-risk actions, and launch campaigns.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-blue-400 block">SECURITY_ANALYST</span>
            <p className="text-[11px] text-slate-400">Can launch Red Team campaigns, inspect Guardian decisions, and audit security events. Cannot approve payments.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-amber-400 block">EMPLOYEE</span>
            <p className="text-[11px] text-slate-400">Standard business workflows: read/send emails, create payments &lt; $1,000, write sandbox files. Confidential files forbidden.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5">
            <span className="font-bold text-rose-400 block">UNTRUSTED_AGENT</span>
            <p className="text-[11px] text-slate-400">Simulation subject: strictly quarantined. Cannot launch campaigns or access internal enterprise resources.</p>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Record: ${selectedLog.id}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Actor / Role</span>
                <span className="text-white font-bold">{selectedLog.actor_id} ({selectedLog.role})</span>
              </div>
              <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <Badge variant={selectedLog.status}>{selectedLog.status}</Badge>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 text-xs font-mono space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tool & Resource Target</span>
              <div className="text-blue-400 font-bold">{selectedLog.tool} : {selectedLog.action}</div>
              <div className="text-slate-300 text-[11px]">Target: {selectedLog.resource || 'None'}</div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Details & Context Payload:</span>
              <JSONViewer data={selectedLog.details} title="Audit Context" />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
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

