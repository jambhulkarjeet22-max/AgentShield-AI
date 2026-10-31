/**
 * Core Typed API Client for AgentShield
 * Communicates with FastAPI backend (/api/v1) and proxy routes.
 */

const API_BASE = '/api/v1';
export const DEFAULT_API_KEY = 'mock-key-admin-secret-9901';

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_API_KEY;
  return localStorage.getItem('agentshield_api_key') || DEFAULT_API_KEY;
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.setItem('agentshield_api_key', key.trim());
  } else {
    localStorage.removeItem('agentshield_api_key');
  }
}

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') || endpoint.startsWith('/health')
    ? endpoint
    : `${API_BASE}${endpoint}`;

  const apiKey = getStoredApiKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { raw: text } : null;
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      if (data?.error?.details && Array.isArray(data.error.details)) {
        errorMessage = data.error.details
          .map((err: any) => `${err.loc ? err.loc.slice(1).join('.') : 'field'}: ${err.msg}`)
          .join('; ');
      } else if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (typeof data?.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data?.detail)) {
        errorMessage = data.detail
          .map((err: any) => `${err.loc ? err.loc.slice(1).join('.') : 'field'}: ${err.msg}`)
          .join('; ');
      } else if (data?.message) {
        errorMessage = data.message;
      }

      return {
        data: null,
        error: errorMessage,
        status: response.status,
        ok: false,
      };
    }

    return {
      data: data as T,
      error: null,
      status: response.status,
      ok: true,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Network error: could not connect to backend server',
      status: 0,
      ok: false,
    };
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

