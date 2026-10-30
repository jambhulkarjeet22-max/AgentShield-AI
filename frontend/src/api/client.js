/**
 * Core API Client for AgentShield AI.
 * Handles HTTP requests, dynamic API Key authentication, and error propagation.
 */

const API_BASE = '/api/v1';

export function getStoredApiKey() {
  return sessionStorage.getItem('agentshield_api_key') || '';
}

export function setStoredApiKey(key) {
  if (key) {
    sessionStorage.setItem('agentshield_api_key', key.trim());
  } else {
    sessionStorage.removeItem('agentshield_api_key');
  }
}

export async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const apiKey = getStoredApiKey();

  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data = null;
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
        errorMessage = data.error.details.map((err) => `${err.loc ? err.loc.slice(1).join('.') : 'field'}: ${err.msg}`).join('; ');
      } else if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (typeof data?.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data?.detail)) {
        errorMessage = data.detail.map((err) => `${err.loc ? err.loc.slice(1).join('.') : 'field'}: ${err.msg}`).join('; ');
      } else if (data?.message) {
        errorMessage = data.message;
      }

      return {
        ok: false,
        status: response.status,
        error: errorMessage,
        data,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: `Network connection failed: ${err.message}`,
      data: null,
    };
  }
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};

