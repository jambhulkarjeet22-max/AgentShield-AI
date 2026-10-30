import { api } from './client';

// Email Tool
export async function listEmails(folder = 'inbox', limit = 50, offset = 0) {
  return await api.get(`/tools/email/messages?folder=${encodeURIComponent(folder)}&limit=${limit}&offset=${offset}`);
}

export async function getEmail(messageId) {
  return await api.get(`/tools/email/messages/${messageId}`);
}

export async function sendEmail(payload) {
  return await api.post('/tools/email/send', payload);
}

// Filesystem Tool
export async function listFiles(folder = null) {
  const query = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  return await api.get(`/tools/files${query}`);
}

export async function readFileContent(path) {
  return await api.get(`/tools/files/content?path=${encodeURIComponent(path)}`);
}

export async function writeFileContent(path, content) {
  return await api.post('/tools/files', { path, content });
}

// Browser Tool
export async function listBrowserPages() {
  return await api.get('/tools/browser/pages');
}

export async function getBrowserPage(pageId) {
  return await api.get(`/tools/browser/pages/${pageId}`);
}

export async function openBrowserPage(pageId = null, url = null) {
  return await api.post('/tools/browser/open', {
    page_id: pageId,
    url,
  });
}

// Payments Tool
export async function listPayments(status = null, limit = 50, offset = 0) {
  let query = `limit=${limit}&offset=${offset}`;
  if (status) query += `&status=${encodeURIComponent(status)}`;
  return await api.get(`/tools/payments?${query}`);
}

export async function getPayment(transactionId) {
  return await api.get(`/tools/payments/${transactionId}`);
}

export async function createPaymentRequest(payload) {
  return await api.post('/tools/payments/request', payload);
}

export async function authorizePayment(transactionId, authorizationCode) {
  return await api.post(`/tools/payments/${transactionId}/authorize`, {
    authorization_code: authorizationCode,
  });
}

// Audit Logs & Tool Reset
export async function listAuditLogs({ tool = null, actorId = null, status = null, limit = 100, offset = 0 } = {}) {
  let query = `limit=${limit}&offset=${offset}`;
  if (tool) query += `&tool=${encodeURIComponent(tool)}`;
  if (actorId) query += `&actor_id=${encodeURIComponent(actorId)}`;
  if (status) query += `&status=${encodeURIComponent(status)}`;
  return await api.get(`/tools/audit-logs?${query}`);
}

export async function resetMockEnvironment() {
  return await api.post('/tools/reset', {});
}

