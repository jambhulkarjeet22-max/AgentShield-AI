import { request, ApiResponse } from './api-client';

export interface ObservabilityStatus {
  enabled: boolean;
  configured: boolean;
  host: string;
  public_key_hint: string;
  dashboard_url: string;
  traces_url: string;
  timestamp: string;
}

export async function getObservabilityStatus(): Promise<ApiResponse<ObservabilityStatus>> {
  return request<ObservabilityStatus>('/observability/status');
}

export async function sendHeartbeatTrace(): Promise<ApiResponse<{ status: string; message: string }>> {
  return request<{ status: string; message: string }>('/observability/test', {
    method: 'POST',
  });
}

