import { api } from './client';

export async function fetchHealth() {
  // Check the direct GET /health endpoint
  const res = await api.get('/health', { headers: {} });
  if (res.ok) return res;
  // Fallback to /api/v1/health
  return await api.get('/health');
}

