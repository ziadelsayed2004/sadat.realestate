import { randomBytes } from 'node:crypto';
import type { AccessTokenClaims } from '../auth/crypto.js';
import { commissionPolicyCreateSchema, commissionPolicyListQuerySchema, commissionPolicySchema, commissionPolicyPatchSchema, type CommissionPolicy, type CommissionPolicyListData, type CommissionPolicyListQuery } from '@sadat-real-estate/contracts';

type CommissionPolicyErrorCode = 'COMMISSION_FORBIDDEN' | 'COMMISSION_NOT_FOUND' | 'COMMISSION_DUPLICATE' | 'COMMISSION_VERSION_CONFLICT' | 'COMMISSION_INVALID_STATE' | 'COMMISSION_OVERLAP';
export class CommissionPolicyServiceError extends Error {
  constructor(readonly code: CommissionPolicyErrorCode) { super(code); this.name = 'CommissionPolicyServiceError'; }
}

const id = () => randomBytes(12).toString('hex');
const admin = (claims: AccessTokenClaims) => { if (claims.role !== 'admin' || claims.status !== 'verified') throw new CommissionPolicyServiceError('COMMISSION_FORBIDDEN'); };
const activeStatus = (status: CommissionPolicy['status']) => status === 'active';
const overlaps = (left: CommissionPolicy, right: CommissionPolicy): boolean => left.effectiveFrom < (right.effectiveTo ?? '9999-12-31T23:59:59.999Z') && right.effectiveFrom < (left.effectiveTo ?? '9999-12-31T23:59:59.999Z');

export function createCommissionPolicyService(seed: { policies?: CommissionPolicy[]; now?: () => Date } = {}) {
  const policies = new Map((seed.policies ?? []).map(item => [item.id, item]));
  const clock = seed.now ?? (() => new Date());
  const now = () => clock().toISOString();
  const get = (policyId: string) => { const policy = policies.get(policyId); if (!policy) throw new CommissionPolicyServiceError('COMMISSION_NOT_FOUND'); return policy; };
  const validateActive = (policy: CommissionPolicy) => {
    if (!activeStatus(policy.status)) return;
    const current = clock().getTime();
    if (new Date(policy.effectiveFrom).getTime() > current || (policy.effectiveTo && new Date(policy.effectiveTo).getTime() <= current)) throw new CommissionPolicyServiceError('COMMISSION_INVALID_STATE');
    if ([...policies.values()].some(item => item.id !== policy.id && activeStatus(item.status) && item.scope.kind === policy.scope.kind && item.scope.key === policy.scope.key && overlaps(item, policy))) throw new CommissionPolicyServiceError('COMMISSION_OVERLAP');
  };
  return {
    async createPolicy(claims: AccessTokenClaims, input: unknown) {
      admin(claims);
      const parsed = commissionPolicyCreateSchema.parse(input);
      if ([...policies.values()].some(item => item.key === parsed.key && item.effectiveFrom === parsed.effectiveFrom)) throw new CommissionPolicyServiceError('COMMISSION_DUPLICATE');
      const stamp = now();
      const policy = commissionPolicySchema.parse({ id: id(), ...parsed, status: 'draft', version: 0, createdBy: claims.sub, updatedBy: claims.sub, createdAt: stamp, updatedAt: stamp });
      policies.set(policy.id, policy);
      return policy;
    },
    async getPolicy(claims: AccessTokenClaims, policyId: string) { admin(claims); return get(policyId); },
    async listPolicies(claims: AccessTokenClaims, input: unknown): Promise<CommissionPolicyListData> {
      admin(claims);
      const query = commissionPolicyListQuerySchema.parse(input) as CommissionPolicyListQuery;
      const at = query.at ? new Date(query.at).getTime() : undefined;
      const values = [...policies.values()].filter(item => (!query.status || item.status === query.status) && (!query.scopeKind || item.scope.kind === query.scopeKind) && (at === undefined || (new Date(item.effectiveFrom).getTime() <= at && (!item.effectiveTo || new Date(item.effectiveTo).getTime() > at)))).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.key.localeCompare(b.key) || a.id.localeCompare(b.id));
      return { items: values.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: values.length };
    },
    async updatePolicy(claims: AccessTokenClaims, policyId: string, input: unknown) {
      admin(claims);
      const current = get(policyId);
      const parsed = commissionPolicyPatchSchema.parse(input);
      if (parsed.expectedVersion !== current.version) throw new CommissionPolicyServiceError('COMMISSION_VERSION_CONFLICT');
      const { expectedVersion: _expectedVersion, reason: _reason, ...patch } = parsed;
      void _expectedVersion; void _reason;
      const nextInput: Record<string, unknown> = { ...current, ...patch, version: current.version + 1, updatedBy: claims.sub, updatedAt: now() };
      if (patch.percentageBps === null) delete nextInput.percentageBps;
      if (patch.fixedAmountMinor === null) delete nextInput.fixedAmountMinor;
      if (patch.currency === null) delete nextInput.currency;
      if (patch.effectiveTo === null) delete nextInput.effectiveTo;
      const next = commissionPolicySchema.parse(nextInput);
      validateActive(next);
      policies.set(next.id, next);
      return next;
    },
    async activatePolicy(claims: AccessTokenClaims, policyId: string, expectedVersion: number, reason: string) {
      return this.updatePolicy(claims, policyId, { expectedVersion, reason, status: 'active' });
    }
  };
}
