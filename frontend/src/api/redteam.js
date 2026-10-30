import { api } from './client';

export async function fetchAttackCatalog() {
  return await api.get('/agents/redteam/attacks/catalog');
}

export async function launchCampaign(payload) {
  return await api.post('/agents/redteam/campaigns', payload);
}

export async function listCampaigns(limit = 50, offset = 0) {
  return await api.get(`/agents/redteam/campaigns?limit=${limit}&offset=${offset}`);
}

export async function getCampaign(campaignId) {
  return await api.get(`/agents/redteam/campaigns/${campaignId}`);
}

export async function getCampaignAttacks(campaignId) {
  return await api.get(`/agents/redteam/campaigns/${campaignId}/attacks`);
}

