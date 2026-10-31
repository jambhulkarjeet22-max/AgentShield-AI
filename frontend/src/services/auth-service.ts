import { MockActor, Role, UserSession } from '@/types';
import { api, getStoredApiKey, setStoredApiKey } from './api-client';
export { setStoredApiKey, getStoredApiKey };

export const PRECONFIGURED_ACTORS: Record<string, MockActor> = {
  admin: {
    actor_id: 'admin-001',
    role: 'ADMIN',
    description: 'System Administrator with full universal access (*)',
    api_key: 'mock-key-admin-secret-7701',
    permissions: ['*'],
  },
  analyst: {
    actor_id: 'analyst-001',
    role: 'SECURITY_ANALYST',
    description: 'Blue Team / Security Analyst with investigation and campaign permissions',
    api_key: 'mock-key-analyst-secret-5502',
    permissions: [
      'email:read',
      'email:list',
      'files:read_public',
      'files:read_internal',
      'files:read_confidential',
      'files:list',
      'browser:open',
      'browser:list',
      'payments:read',
      'payments:list',
      'audit:read',
      'agent:submit',
      'agent:read',
      'agent:list',
    ],
  },
  employee: {
    actor_id: 'employee-001',
    role: 'EMPLOYEE',
    description: 'Enterprise Employee with standard task submission and sandbox writes',
    api_key: 'mock-key-employee-secret-3303',
    permissions: [
      'email:read',
      'email:list',
      'email:send',
      'files:read_public',
      'files:read_internal',
      'files:write_sandbox',
      'files:list',
      'browser:open',
      'browser:list',
      'payments:create',
      'payments:read',
      'payments:list',
      'agent:submit',
      'agent:read',
      'agent:list',
    ],
  },
  guest: {
    actor_id: 'guest-001',
    role: 'GUEST',
    description: 'External guest with read-only access to public files',
    api_key: 'mock-key-guest-secret-1104',
    permissions: ['files:read_public', 'files:list', 'browser:open', 'browser:list'],
  },
  untrusted: {
    actor_id: 'untrusted-agent-001',
    role: 'UNTRUSTED_AGENT',
    description: 'Simulated Red Team target agent with least privileges',
    api_key: 'mock-key-untrusted-agent-0000',
    permissions: ['files:read_public', 'browser:open', 'browser:list', 'payments:list'],
  },
};

export function getActorFromKey(apiKey: string): MockActor {
  const found = Object.values(PRECONFIGURED_ACTORS).find((a) => a.api_key === apiKey);
  if (found) return found;

  return {
    actor_id: 'custom-actor',
    role: 'EMPLOYEE',
    description: 'Custom Key Authenticated User',
    api_key: apiKey,
    permissions: ['files:read_public', 'browser:open'],
  };
}

export function getCurrentSession(): UserSession {
  const key = getStoredApiKey();
  const actor = getActorFromKey(key);

  const emailMap: Record<Role, string> = {
    ADMIN: 'admin@agentra.internal',
    SECURITY_ANALYST: 'analyst@agentra.internal',
    EMPLOYEE: 'employee@agentra.internal',
    GUEST: 'guest@external.partner',
    UNTRUSTED_AGENT: 'untrusted@simulator.adversary',
    ANONYMOUS: 'anonymous@visitor.local',
  };

  return {
    actor_id: actor.actor_id,
    role: actor.role,
    name: actor.role.replace('_', ' '),
    email: emailMap[actor.role] || 'user@agentra.internal',
    api_key: actor.api_key,
  };
}

export async function verifyApiKey(apiKey: string): Promise<boolean> {
  const res = await api.get('/health', {
    headers: { 'X-API-Key': apiKey },
  });
  return res.ok;
}

export function switchActor(actorKey: string): UserSession {
  const target = PRECONFIGURED_ACTORS[actorKey] || PRECONFIGURED_ACTORS.admin;
  setStoredApiKey(target.api_key);
  return getCurrentSession();
}

export function logout(): void {
  setStoredApiKey('');
}
