import { randomBytes } from 'node:crypto';
import type { AccessTokenClaims } from '../auth/crypto.js';
import { commissionAccountCommissionSchema, commissionAccountOverrideCreateSchema, commissionAccountOverrideListQuerySchema, commissionAccountOverridePatchSchema, commissionAccountOverrideSchema, type CommissionAccountCommission, type CommissionAccountOverride, type CommissionAccountOverrideListData, type CommissionAccountOverrideListQuery, type CommissionPolicy } from '@sadat-real-estate/contracts';

type CommissionAccountErrorCode = 'COMMISSION_FORBIDDEN' | 'COMMISSION_ACCOUNT_NOT_FOUND' | 'COMMISSION_ACCOUNT_DUPLICATE' | 'COMMISSION_ACCOUNT_VERSION_CONFLICT' | 'COMMISSION_ACCOUNT_INVALID_STATE' | 'COMMISSION_ACCOUNT_OVERLAP';
export class CommissionAccountServiceError extends Error {
  constructor(readonly code: CommissionAccountErrorCode) { super(code); this.name = 'CommissionAccountServiceError'; }
}

const id = () => randomBytes(12).toString('hex');
const admin = (claims: AccessTokenClaims) => { if (claims.role !== 'admin' || claims.status !== 'verified') throw new CommissionAccountServiceError('COMMISSION_FORBIDDEN'); };
const overlaps = (left: { effectiveFrom: string; effectiveTo?: string | undefined }, right: { effectiveFrom: string; effectiveTo?: string | undefined }): boolean => left.effectiveFrom < (right.effectiveTo ?? '9999-12-31T23:59:59.999Z') && right.effectiveFrom < (left.effectiveTo ?? '9999-12-31T23:59:59.999Z');
const applies = (item: { effectiveFrom: string; effectiveTo?: string | undefined; status: string }, at: Date) => item.status === 'active' && new Date(item.effectiveFrom) <= at && (!item.effectiveTo || new Date(item.effectiveTo) > at);

export function createCommissionAccountService(seed: { overrides?: CommissionAccountOverride[]; policies?: CommissionPolicy[]; now?: () => Date } = {}) {
  const overrides = new Map((seed.overrides ?? []).map(item => [item.id, item]));
  const policies = seed.policies ?? [];
  const clock = seed.now ?? (() => new Date());
  const now = () => clock().toISOString();
  const get = (overrideId: string) => { const override = overrides.get(overrideId); if (!override) throw new CommissionAccountServiceError('COMMISSION_ACCOUNT_NOT_FOUND'); return override; };
  const validateActive = (override: CommissionAccountOverride) => {
    if (override.status !== 'active') return;
    const current = clock();
    if (!applies(override, current)) throw new CommissionAccountServiceError('COMMISSION_ACCOUNT_INVALID_STATE');
    if ([...overrides.values()].some(item => item.id !== override.id && item.accountId === override.accountId && item.status === 'active' && overlaps(item, override))) throw new CommissionAccountServiceError('COMMISSION_ACCOUNT_OVERLAP');
  };
  const toReadModel = (accountId: string, at: Date): CommissionAccountCommission => {
    const override = [...overrides.values()].filter(item => item.accountId === accountId && applies(item, at)).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version || b.id.localeCompare(a.id))[0];
    if (override) return commissionAccountCommissionSchema.parse({ accountId, source: 'account_override', effectiveAt: at.toISOString(), kind: override.kind, ...(override.percentageBps !== undefined ? { percentageBps: override.percentageBps } : {}), ...(override.fixedAmountMinor !== undefined ? { fixedAmountMinor: override.fixedAmountMinor } : {}), ...(override.currency ? { currency: override.currency } : {}) });
    const policy = policies.filter(item => item.scope.kind === 'default' && applies(item, at)).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version || b.id.localeCompare(a.id))[0];
    if (!policy) return commissionAccountCommissionSchema.parse({ accountId, source: 'none', effectiveAt: at.toISOString() });
    return commissionAccountCommissionSchema.parse({ accountId, source: 'policy', effectiveAt: at.toISOString(), policyId: policy.id, policyVersion: policy.version, kind: policy.kind, ...(policy.percentageBps !== undefined ? { percentageBps: policy.percentageBps } : {}), ...(policy.fixedAmountMinor !== undefined ? { fixedAmountMinor: policy.fixedAmountMinor } : {}), ...(policy.currency ? { currency: policy.currency } : {}) });
  };
  return {
    async createOverride(claims: AccessTokenClaims, accountId: string, input: unknown) {
      admin(claims);
      if (!/^[a-f0-9]{24}$/.test(accountId)) throw new CommissionAccountServiceError('COMMISSION_ACCOUNT_NOT_FOUND');
      const parsed = commissionAccountOverrideCreateSchema.parse(input);
      if ([...overrides.values()].some(item => item.accountId === accountId && item.effectiveFrom === parsed.effectiveFrom)) throw new CommissionAccountServiceError('COMMISSION_ACCOUNT_DUPLICATE');
      const stamp = now();
      const override = commissionAccountOverrideSchema.parse({ id: id(), accountId, ...parsed, status: 'draft', version: 0, source: 'account_override', createdBy: claims.sub, updatedBy: claims.sub, createdAt: stamp, updatedAt: stamp });
      overrides.set(override.id, override);
      return override;
    },
    async getOverride(claims: AccessTokenClaims, overrideId: string) { admin(claims); return get(overrideId); },
    async listOverrides(claims: AccessTokenClaims, input: unknown): Promise<CommissionAccountOverrideListData> {
      admin(claims);
      const query = commissionAccountOverrideListQuerySchema.parse(input) as CommissionAccountOverrideListQuery;
      const at = query.at ? new Date(query.at) : undefined;
      const values = [...overrides.values()].filter(item => (!query.accountId || item.accountId === query.accountId) && (!query.status || item.status === query.status) && (!at || applies(item, at))).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.accountId.localeCompare(b.accountId) || a.id.localeCompare(b.id));
      return { items: values.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: values.length };
    },
    async updateOverride(claims: AccessTokenClaims, overrideId: string, input: unknown) {
      admin(claims);
      const current = get(overrideId);
      const parsed = commissionAccountOverridePatchSchema.parse(input);
      if (parsed.expectedVersion !== current.version) throw new CommissionAccountServiceError('COMMISSION_ACCOUNT_VERSION_CONFLICT');
      const { expectedVersion: _expectedVersion, reason: _reason, ...patch } = parsed;
      void _expectedVersion; void _reason;
      const nextInput: Record<string, unknown> = { ...current, ...patch, version: current.version + 1, updatedBy: claims.sub, updatedAt: now() };
      if (patch.percentageBps === null) delete nextInput.percentageBps;
      if (patch.fixedAmountMinor === null) delete nextInput.fixedAmountMinor;
      if (patch.currency === null) delete nextInput.currency;
      if (patch.effectiveTo === null) delete nextInput.effectiveTo;
      const next = commissionAccountOverrideSchema.parse(nextInput);
      validateActive(next);
      overrides.set(next.id, next);
      return next;
    },
    async getAccountCommission(claims: AccessTokenClaims, accountId: string, at: Date = clock()) {
      admin(claims);
      if (!/^[a-f0-9]{24}$/.test(accountId)) throw new CommissionAccountServiceError('COMMISSION_ACCOUNT_NOT_FOUND');
      return toReadModel(accountId, at);
    },
    async readAccountCommission(claims: AccessTokenClaims, accountId: string, at?: Date) { return this.getAccountCommission(claims, accountId, at); }
  };
}
