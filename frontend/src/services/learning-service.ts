import { api, ApiResponse } from './api-client';

export interface MLModelInfo {
  model_type: string;
  calibrated: boolean;
  feature_count: number;
  sample_size: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  timestamp?: string;
}

export async function fetchMLModelInfo(): Promise<ApiResponse<MLModelInfo>> {
  // Query backend or ML service
  return await api.get<MLModelInfo>('/health');
}

