import { EmailMessage, PaymentTransaction, VirtualFile, WebPage } from '@/types';
import { api, ApiResponse } from './api-client';

// Email
export async function listEmails(
  folder: string = 'inbox',
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<{ messages: EmailMessage[]; total: number }>> {
  return await api.get<{ messages: EmailMessage[]; total: number }>(
    `/tools/email/messages?folder=${encodeURIComponent(folder)}&limit=${limit}&offset=${offset}`
  );
}

export async function sendEmail(payload: {
  recipient: string;
  subject: string;
  body: string;
}): Promise<ApiResponse<EmailMessage>> {
  return await api.post<EmailMessage>('/tools/email/send', payload);
}

// Files
export async function listFiles(
  folder?: string
): Promise<ApiResponse<{ files: VirtualFile[]; total: number }>> {
  const query = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  return await api.get<{ files: VirtualFile[]; total: number }>(`/tools/files${query}`);
}

export async function readFileContent(
  path: string
): Promise<ApiResponse<{ path: string; content: string }>> {
  return await api.get<{ path: string; content: string }>(
    `/tools/files/content?path=${encodeURIComponent(path)}`
  );
}

export async function writeFileContent(
  path: string,
  content: string
): Promise<ApiResponse<VirtualFile>> {
  return await api.post<VirtualFile>('/tools/files', { path, content });
}

// Browser
export async function listBrowserPages(): Promise<
  ApiResponse<{ pages: WebPage[]; total: number }>
> {
  return await api.get<{ pages: WebPage[]; total: number }>('/tools/browser/pages');
}

export async function openBrowserPage(
  pageId?: string,
  url?: string
): Promise<ApiResponse<WebPage>> {
  return await api.post<WebPage>('/tools/browser/open', {
    page_id: pageId,
    url,
  });
}

// Payments
export async function listPayments(
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<{ transactions: PaymentTransaction[]; total: number }>> {
  let query = `limit=${limit}&offset=${offset}`;
  if (status) query += `&status=${encodeURIComponent(status)}`;
  return await api.get<{ transactions: PaymentTransaction[]; total: number }>(
    `/tools/payments?${query}`
  );
}

export async function createPayment(payload: {
  recipient: string;
  amount: number;
  currency: string;
}): Promise<ApiResponse<PaymentTransaction>> {
  return await api.post<PaymentTransaction>('/tools/payments/request', payload);
}

export async function authorizePayment(
  transactionId: string,
  authCode: string
): Promise<ApiResponse<PaymentTransaction>> {
  return await api.post<PaymentTransaction>(`/tools/payments/${transactionId}/authorize`, {
    authorization_code: authCode,
  });
}

// Global Reset
export async function resetMockEnvironment(): Promise<ApiResponse<{ message: string }>> {
  return await api.post<{ message: string }>('/tools/reset', {});
}

