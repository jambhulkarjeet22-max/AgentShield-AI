import { AuditLogEntry } from '@/types';
import { api, ApiResponse } from './api-client';

export interface AuditLogFilter {
  tool?: string;
  actorId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditLogs(
  filter: AuditLogFilter = {}
): Promise<ApiResponse<{ logs: AuditLogEntry[]; total: number }>> {
  const { tool, actorId, status, limit = 100, offset = 0 } = filter;
  let query = `limit=${limit}&offset=${offset}`;
  if (tool) query += `&tool=${encodeURIComponent(tool)}`;
  if (actorId) query += `&actor_id=${encodeURIComponent(actorId)}`;
  if (status) query += `&status=${encodeURIComponent(status)}`;

  return await api.get<{ logs: AuditLogEntry[]; total: number }>(`/tools/audit-logs?${query}`);
}

