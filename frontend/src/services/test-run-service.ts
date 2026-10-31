import { AttackCategory, AttackResult, CampaignResponse } from '@/types';
import { api, ApiResponse } from './api-client';

export interface CampaignLaunchPayload {
  campaign_name: string;
  description?: string;
  categories: AttackCategory[];
  target_actor_key?: string;
}

export async function launchCampaign(
  payload: CampaignLaunchPayload
): Promise<ApiResponse<CampaignResponse>> {
  return await api.post<CampaignResponse>('/agents/redteam/campaigns', payload);
}

export async function listCampaigns(
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<{ campaigns: CampaignResponse[]; total: number }>> {
  return await api.get<{ campaigns: CampaignResponse[]; total: number }>(
    `/agents/redteam/campaigns?limit=${limit}&offset=${offset}`
  );
}

export async function getCampaign(
  campaignId: string
): Promise<ApiResponse<CampaignResponse>> {
  return await api.get<CampaignResponse>(`/agents/redteam/campaigns/${campaignId}`);
}

export async function getCampaignAttacks(
  campaignId: string
): Promise<ApiResponse<{ attacks: AttackResult[]; total: number }>> {
  return await api.get<{ attacks: AttackResult[]; total: number }>(
    `/agents/redteam/campaigns/${campaignId}/attacks`
  );
}

