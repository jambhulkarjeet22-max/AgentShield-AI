import { TaskResponse } from '@/types';
import { api, ApiResponse } from './api-client';

export async function submitTargetTask(
  instruction: string,
  maxSteps: number = 10,
  context?: Record<string, any>
): Promise<ApiResponse<TaskResponse>> {
  return await api.post<TaskResponse>('/agents/target/tasks', {
    instruction,
    max_steps: maxSteps,
    context: context || {},
  });
}

export async function listTargetTasks(
  actorId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<{ tasks: TaskResponse[]; total: number }>> {
  let query = `limit=${limit}&offset=${offset}`;
  if (actorId) query += `&actor_id=${encodeURIComponent(actorId)}`;
  return await api.get<{ tasks: TaskResponse[]; total: number }>(
    `/agents/target/tasks?${query}`
  );
}

export async function getTargetTask(taskId: string): Promise<ApiResponse<TaskResponse>> {
  return await api.get<TaskResponse>(`/agents/target/tasks/${taskId}`);
}

export async function getTargetTaskSteps(taskId: string): Promise<ApiResponse<any>> {
  return await api.get(`/agents/target/tasks/${taskId}/steps`);
}

