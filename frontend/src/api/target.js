import { api } from './client';

export async function submitTask(instruction, maxSteps = 10) {
  return await api.post('/agents/target/tasks', {
    instruction,
    max_steps: maxSteps,
  });
}

export async function listTasks(actorId = null, limit = 50, offset = 0) {
  let query = `limit=${limit}&offset=${offset}`;
  if (actorId) query += `&actor_id=${encodeURIComponent(actorId)}`;
  return await api.get(`/agents/target/tasks?${query}`);
}

export async function getTask(taskId) {
  return await api.get(`/agents/target/tasks/${taskId}`);
}

export async function getTaskSteps(taskId) {
  return await api.get(`/agents/target/tasks/${taskId}/steps`);
}

