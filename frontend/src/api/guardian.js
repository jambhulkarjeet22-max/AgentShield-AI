import { api } from './client';

export async function listDecisions(verdict = null, limit = 50, offset = 0) {
  let query = `limit=${limit}&offset=${offset}`;
  if (verdict) query += `&verdict=${encodeURIComponent(verdict)}`;
  return await api.get(`/agents/guardian/decisions?${query}`);
}

export async function getDecision(recordId) {
  return await api.get(`/agents/guardian/decisions/${recordId}`);
}

export async function listApprovals(status = null, limit = 50, offset = 0) {
  let query = `limit=${limit}&offset=${offset}`;
  if (status) query += `&status=${encodeURIComponent(status)}`;
  return await api.get(`/agents/guardian/approvals?${query}`);
}

export async function getApproval(approvalId) {
  return await api.get(`/agents/guardian/approvals/${approvalId}`);
}

export async function decideApproval(approvalId, approve, decisionNote = '') {
  return await api.post(`/agents/guardian/approvals/${approvalId}/decide`, {
    approve,
    decision_note: decisionNote,
  });
}

