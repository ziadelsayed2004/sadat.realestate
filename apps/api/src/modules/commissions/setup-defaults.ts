import type { AccessTokenClaims } from '../auth/crypto.js';
import type { CommissionPolicyService } from './policy-service.js';

export const AGREED_COMMISSION_DEFAULTS = [
  { key: 'platform.owner.sale-rent', label: 'عمولة مالك العقار', kind: 'percentage' as const, scope: { kind: 'provider_type' as const, key: 'individual_broker' }, percentageBps: 200, rentMonths: 0.5 },
  { key: 'platform.office.sale-rent', label: 'عمولة مكتب العقارات', kind: 'percentage' as const, scope: { kind: 'provider_type' as const, key: 'brokerage_office' }, percentageBps: 150, rentMonths: 0.5 }
];

// Explicit one-time setup. Existing admin decisions are never overwritten.
export async function setupAgreedCommissionDefaults(service: CommissionPolicyService, claims: AccessTokenClaims, apply = false) {
  const existing = [];
  for (let page = 1; ; page++) {
    const data = await service.listPolicies(claims, { page, limit: 100 });
    existing.push(...data.items);
    if (page * data.limit >= data.total) break;
  }
  const results = [];
  for (const preset of AGREED_COMMISSION_DEFAULTS) {
    const previous = existing.find(item => item.key === preset.key || (item.scope.kind === preset.scope.kind && item.scope.key === preset.scope.key));
    if (previous) { results.push({ category: preset.scope.key, status: 'existing-preserved', id: previous.id }); continue; }
    if (!apply) { results.push({ category: preset.scope.key, status: 'planned', salePercent: preset.percentageBps / 100, rentMonths: preset.rentMonths }); continue; }
    const draft = await service.createPolicy(claims, { ...preset, effectiveFrom: new Date().toISOString() });
    const active = await service.activatePolicy(claims, draft.id, draft.version, 'Initial setup of agreed owner/office sale and monthly rental commission');
    existing.push(active);
    results.push({ category: preset.scope.key, status: 'activated', id: active.id });
  }
  return results;
}
