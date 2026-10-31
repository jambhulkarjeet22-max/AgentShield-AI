import { AttackCatalogEntry } from '@/types';
import { api, ApiResponse } from './api-client';

export async function fetchAttackCatalog(): Promise<ApiResponse<AttackCatalogEntry[]>> {
  const res = await api.get<any>('/agents/redteam/attacks/catalog');
  if (res.ok && res.data) {
    const rawList: any[] = Array.isArray(res.data) ? res.data : (res.data.attacks || []);
    const normalized: AttackCatalogEntry[] = rawList.map((a: any) => ({
      attack_id: a.attack_id,
      name: a.attack_name || a.name || a.attack_id,
      category: a.category,
      category_name:
        a.category_name ||
        (typeof a.category === 'string'
          ? a.category.replace(/_/g, ' ').toUpperCase()
          : 'GENERAL'),
      description: a.description || '',
      default_payload: a.default_payload || a.payload || '',
      target_tool:
        a.target_tool ||
        (a.category?.includes('email')
          ? 'email'
          : a.category?.includes('web')
          ? 'browser'
          : a.category?.includes('payment')
          ? 'payments'
          : 'filesystem'),
      severity:
        a.severity ||
        (a.category?.includes('payment') || a.category?.includes('privilege')
          ? 'CRITICAL'
          : 'HIGH'),
      expected_control:
        a.expected_control ||
        (a.expected_outcome === 'DEFENCE_HELD'
          ? 'Policy & Guardian Interception'
          : 'Sandbox Boundary Enforcement'),
    }));
    return {
      ...res,
      data: normalized,
    };
  }
  return {
    ...res,
    data: [],
  };
}
