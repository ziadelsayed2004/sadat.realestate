import { randomBytes } from 'node:crypto';
import {
  commissionApprovedEventSchema,
  commissionResolutionSchema,
  commissionSnapshotCreateSchema,
  commissionSnapshotSchema,
  type CommissionAccountOverride,
  type CommissionException,
  type CommissionPolicy,
  type CommissionResolution,
  type CommissionSnapshot
} from '@sadat-real-estate/contracts';

type CommissionResolverErrorCode =
  | 'COMMISSION_RESOLUTION_INVALID_ACCOUNT'
  | 'COMMISSION_RESOLUTION_EVENT_INVALID'
  | 'COMMISSION_RESOLUTION_SNAPSHOT_CONFLICT'
  | 'COMMISSION_RESOLUTION_SNAPSHOT_NOT_FOUND';

export class CommissionResolverServiceError extends Error {
  constructor(readonly code: CommissionResolverErrorCode) {
    super(code);
    this.name = 'CommissionResolverServiceError';
  }
}

const id = () => randomBytes(12).toString('hex');
const validAccountId = (accountId: string) => /^[a-f0-9]{24}$/.test(accountId);
const applies = (item: { effectiveFrom: string; effectiveTo?: string | undefined; status: string }, at: Date) =>
  item.status === 'active' && new Date(item.effectiveFrom).getTime() <= at.getTime() && (!item.effectiveTo || new Date(item.effectiveTo).getTime() > at.getTime());
const byEffectiveDate = (left: { effectiveFrom: string; version: number; id: string }, right: { effectiveFrom: string; version: number; id: string }) =>
  right.effectiveFrom.localeCompare(left.effectiveFrom) || right.version - left.version || right.id.localeCompare(left.id);

export function createCommissionResolverService(seed: {
  exceptions?: CommissionException[];
  overrides?: CommissionAccountOverride[];
  policies?: CommissionPolicy[];
  snapshots?: CommissionSnapshot[];
  now?: () => Date;
} = {}) {
  const exceptions = seed.exceptions ?? [];
  const overrides = seed.overrides ?? [];
  const policies = seed.policies ?? [];
  const snapshots = new Map((seed.snapshots ?? []).map(item => [item.commercialEventId, item]));
  const clock = seed.now ?? (() => new Date());
  const now = () => clock().toISOString();

  const resolveCommission = (accountId: string, at: Date = clock()): CommissionResolution => {
    if (!validAccountId(accountId)) throw new CommissionResolverServiceError('COMMISSION_RESOLUTION_INVALID_ACCOUNT');
    const exception = exceptions
      .filter(item => item.accountId === accountId && applies(item, at))
      .sort(byEffectiveDate)[0];
    if (exception) return commissionResolutionSchema.parse({ accountId, source: 'exception', effectiveAt: at.toISOString(), sourceRecordId: exception.id, sourceVersion: exception.version, exceptionId: exception.id, kind: exception.kind, ...(exception.percentageBps !== undefined ? { percentageBps: exception.percentageBps } : {}), ...(exception.fixedAmountMinor !== undefined ? { fixedAmountMinor: exception.fixedAmountMinor } : {}), ...(exception.currency ? { currency: exception.currency } : {}) });

    const override = overrides
      .filter(item => item.accountId === accountId && applies(item, at))
      .sort(byEffectiveDate)[0];
    if (override) return commissionResolutionSchema.parse({ accountId, source: 'account_override', effectiveAt: at.toISOString(), sourceRecordId: override.id, sourceVersion: override.version, accountOverrideId: override.id, kind: override.kind, ...(override.percentageBps !== undefined ? { percentageBps: override.percentageBps } : {}), ...(override.fixedAmountMinor !== undefined ? { fixedAmountMinor: override.fixedAmountMinor } : {}), ...(override.currency ? { currency: override.currency } : {}) });

    const policy = policies
      .filter(item => item.scope.kind === 'default' && applies(item, at))
      .sort(byEffectiveDate)[0];
    if (policy) return commissionResolutionSchema.parse({ accountId, source: 'policy', effectiveAt: at.toISOString(), sourceRecordId: policy.id, sourceVersion: policy.version, policyId: policy.id, kind: policy.kind, ...(policy.percentageBps !== undefined ? { percentageBps: policy.percentageBps } : {}), ...(policy.fixedAmountMinor !== undefined ? { fixedAmountMinor: policy.fixedAmountMinor } : {}), ...(policy.currency ? { currency: policy.currency } : {}) });
    return commissionResolutionSchema.parse({ accountId, source: 'none', effectiveAt: at.toISOString() });
  };

  const getSnapshot = (commercialEventId: string) => {
    const snapshot = snapshots.get(commercialEventId);
    if (!snapshot) throw new CommissionResolverServiceError('COMMISSION_RESOLUTION_SNAPSHOT_NOT_FOUND');
    return snapshot;
  };

  return {
    resolveCommission,
    resolve: resolveCommission,
    async saveSnapshotAtApprovedEvent(input: unknown): Promise<CommissionSnapshot> {
      const parsed = commissionSnapshotCreateSchema.parse(input);
      if (!validAccountId(parsed.accountId) || parsed.resolution.accountId !== parsed.accountId) throw new CommissionResolverServiceError('COMMISSION_RESOLUTION_INVALID_ACCOUNT');
      const approvedAt = new Date(parsed.approvedAt);
      if (approvedAt.getTime() > clock().getTime() || new Date(parsed.resolution.effectiveAt).getTime() > approvedAt.getTime()) throw new CommissionResolverServiceError('COMMISSION_RESOLUTION_EVENT_INVALID');
      const existing = snapshots.get(parsed.commercialEventId);
      if (existing) {
        const same = existing.accountId === parsed.accountId && existing.approvedAt === parsed.approvedAt && JSON.stringify(existing.resolution) === JSON.stringify(parsed.resolution);
        if (same) return existing;
        throw new CommissionResolverServiceError('COMMISSION_RESOLUTION_SNAPSHOT_CONFLICT');
      }
      const stamp = now();
      const snapshot = commissionSnapshotSchema.parse({ id: id(), ...parsed, capturedAt: stamp, createdAt: stamp });
      snapshots.set(snapshot.commercialEventId, snapshot);
      return snapshot;
    },
    async resolveAndSnapshot(input: unknown): Promise<CommissionSnapshot> {
      const event = commissionApprovedEventSchema.parse(input);
      const resolution = resolveCommission(event.accountId, new Date(event.approvedAt));
      return this.saveSnapshotAtApprovedEvent({ ...event, resolution });
    },
    getSnapshot
  };
}
