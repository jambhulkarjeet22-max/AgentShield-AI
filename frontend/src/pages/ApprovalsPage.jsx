import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldAlert, CheckCircle, XCircle, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { JSONViewer } from '../components/common/JSONViewer';
import { listApprovals, decideApproval } from '../api/guardian';

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Action Modal State
  const [activeApproval, setActiveApproval] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'reject'
  const [decisionNote, setDecisionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchApprovalsList = async () => {
    setLoading(true);
    setError(null);
    const res = await listApprovals(statusFilter || null, 50, 0);
    if (res.ok && res.data) {
      setApprovals(res.data.approvals || []);
    } else {
      setError(res.error || 'Failed to fetch approval queue');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApprovalsList();
  }, [statusFilter]);

  const handleOpenActionModal = (approval, type) => {
    setActiveApproval(approval);
    setActionType(type);
    setDecisionNote('');
    setActionError(null);
  };

  const handleConfirmDecision = async (e) => {
    e.preventDefault();
    if (!activeApproval) return;

    setSubmitting(true);
    setActionError(null);

    const approve = actionType === 'approve';
    const res = await decideApproval(activeApproval.approval_id, approve, decisionNote);

    if (res.ok) {
      setActiveApproval(null);
      await fetchApprovalsList();
    } else {
      setActionError(res.error || 'Failed to submit approval decision');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            Human-in-the-Loop Approval Queue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative gate for high-risk actions held by Blue Team Guardian (e.g. payments &gt; $1,000, sensitive exports).
          </p>
        </div>
        <button
          onClick={fetchApprovalsList}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Refresh queue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* RBAC Error Banner if Not Authorized */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Access Denied (RBAC Enforced):</span>
            <p className="leading-relaxed">{error}</p>
            <p className="text-[11px] text-slate-400">
              Only actors with the <code className="text-rose-300 font-mono">ADMIN</code> role holding universal authorization (<code className="text-rose-300 font-mono">*</code>) can view and decide approvals. Switch to Admin key via the top-bar key manager.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { label: 'All Requests', val: '' },
          { label: 'Pending Only', val: 'PENDING' },
          { label: 'Approved', val: 'APPROVED' },
          { label: 'Rejected', val: 'REJECTED' },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatusFilter(tab.val)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === tab.val
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-navy-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approvals Table */}
      <div className="rounded-2xl bg-navy-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-navy-950/40">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Approval Requests ({approvals.length})
          </span>
          <span className="text-xs text-slate-400">Strictly evaluated in PostgreSQL & InMemory store</span>
        </div>

        {approvals.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <UserCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Approval queue is clear</p>
            <p className="text-xs mt-1">Actions triggering elevated risk scores or policy requirements will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {approvals.map((appr) => {
              const isPending = appr.status === 'PENDING';
              return (
                <div key={appr.approval_id} className="p-5 hover:bg-slate-800/30 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge variant={appr.status}>{appr.status}</Badge>
                      <span className="font-mono text-xs font-bold text-white">
                        {appr.tool}:{appr.action}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Task: {appr.task_id || 'N/A'} (Step #{appr.step_number})
                      </span>
                    </div>

                    {isPending ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenActionModal(appr, 'approve')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-600/20"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Authorize</span>
                        </button>
                        <button
                          onClick={() => handleOpenActionModal(appr, 'reject')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-md shadow-rose-600/20"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-mono">
                        Decided by: <span className="text-white font-semibold">{appr.decided_by || 'Admin'}</span>
                        {appr.decision_note && <span className="ml-2 italic text-slate-300">"{appr.decision_note}"</span>}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{appr.explanation}</p>

                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Held Action Parameters:</span>
                    <JSONViewer data={appr.parameters} title="Payload Context" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Authorization Modal */}
      {activeApproval && (
        <Modal
          isOpen={Boolean(activeApproval)}
          onClose={() => !submitting && setActiveApproval(null)}
          title={actionType === 'approve' ? 'Authorize Held Action' : 'Reject Held Action'}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleConfirmDecision} className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1 text-xs">
              <span className="text-slate-400">Target Action:</span>
              <div className="font-mono font-bold text-white">
                {activeApproval.tool}:{activeApproval.action}
              </div>
              <p className="text-slate-300 text-[11px] pt-1">{activeApproval.explanation}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Administrator Audit Note (Optional)
              </label>
              <textarea
                rows="3"
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Enter justification or verification context..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setActiveApproval(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : actionType === 'approve' ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

