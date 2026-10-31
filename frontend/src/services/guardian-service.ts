import { ApprovalRequest, GuardianDecision, GuardianDecisionRecord } from '@/types';
import { api, ApiResponse } from './api-client';

export async function listDecisions(
  verdict?: GuardianDecision,
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<{ decisions: GuardianDecisionRecord[]; total: number }>> {
  let query = `limit=${limit}&offset=${offset}`;
  if (verdict) query += `&verdict=${encodeURIComponent(verdict)}`;
  return await api.get<{ decisions: GuardianDecisionRecord[]; total: number }>(
    `/agents/guardian/decisions?${query}`
  );
}

export async function getDecision(recordId: string): Promise<ApiResponse<GuardianDecisionRecord>> {
  return await api.get<GuardianDecisionRecord>(`/agents/guardian/decisions/${recordId}`);
}

export async function listApprovals(
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<{ approvals: ApprovalRequest[]; total: number }>> {
  let query = `limit=${limit}&offset=${offset}`;
  if (status) query += `&status=${encodeURIComponent(status)}`;
  return await api.get<{ approvals: ApprovalRequest[]; total: number }>(
    `/agents/guardian/approvals?${query}`
  );
}

export async function getApproval(approvalId: string): Promise<ApiResponse<ApprovalRequest>> {
  return await api.get<ApprovalRequest>(`/agents/guardian/approvals/${approvalId}`);
}

export async function decideApproval(
  approvalId: string,
  approve: boolean,
  decisionNote: string = ''
): Promise<ApiResponse<ApprovalRequest>> {
  return await api.post<ApprovalRequest>(`/agents/guardian/approvals/${approvalId}/decide`, {
    approve,
    decision_note: decisionNote,
  });
}

