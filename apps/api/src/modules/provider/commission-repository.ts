import { Types, type Connection } from 'mongoose';
import {
  commissionResolutionSchema,
  type CommissionPolicyKind,
  type CommissionResolution
} from '@sadat-real-estate/contracts';
import type { ProviderCommissionSource } from './commission.js';

type MongoRow = Record<string, unknown>;
type CommissionSource = Exclude<CommissionResolution['source'], 'none'>;

interface CommissionCandidate {
  id: string;
  source: CommissionSource;
  effectiveFrom: string;
  effectiveTo?: string;
  version: number;
  kind: CommissionPolicyKind;
  percentageBps?: number;
  fixedAmountMinor?: number;
  currency?: string;
}

const COMMISSION_PROJECTION = {
  _id: 1,
  id: 1,
  accountId: 1,
  scope: 1,
  kind: 1,
  percentageBps: 1,
  fixedAmountMinor: 1,
  currency: 1,
  effectiveFrom: 1,
  effectiveTo: 1,
  status: 1,
  version: 1
} as const;

function record(value: unknown): MongoRow {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as MongoRow
    : {};
}

function id(value: unknown): string | undefined {
  if (value instanceof Types.ObjectId) return value.toHexString();
  return typeof value === 'string' && /^[a-f0-9]{24}$/.test(value) ? value : undefined;
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function integer(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function date(value: unknown): string | undefined {
  const parsed = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : undefined;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : undefined;
}

function kind(value: unknown): CommissionPolicyKind | undefined {
  return value === 'percentage' || value === 'fixed' || value === 'exempt' ? value : undefined;
}

function candidate(value: unknown, source: CommissionSource): CommissionCandidate | undefined {
  const row = record(value);
  const candidateId = id(row.id ?? row._id);
  const effectiveFrom = date(row.effectiveFrom);
  const version = integer(row.version);
  const candidateKind = kind(row.kind);
  if (!candidateId || !effectiveFrom || version === undefined || !candidateKind) return undefined;

  const effectiveTo = date(row.effectiveTo);
  const percentageBps = integer(row.percentageBps);
  const fixedAmountMinor = integer(row.fixedAmountMinor);
  const currency = string(row.currency);
  return {
    id: candidateId,
    source,
    effectiveFrom,
    ...(effectiveTo ? { effectiveTo } : {}),
    version,
    kind: candidateKind,
    ...(percentageBps !== undefined ? { percentageBps } : {}),
    ...(fixedAmountMinor !== undefined ? { fixedAmountMinor } : {}),
    ...(currency ? { currency } : {})
  };
}

function activeAt(value: CommissionCandidate, at: Date): boolean {
  const current = at.getTime();
  return new Date(value.effectiveFrom).getTime() <= current
    && (!value.effectiveTo || new Date(value.effectiveTo).getTime() > current);
}

function choose(candidates: readonly CommissionCandidate[], at: Date): CommissionCandidate | undefined {
  return candidates
    .filter((value) => activeAt(value, at))
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom) || right.version - left.version || right.id.localeCompare(left.id))[0];
}

function resolve(accountId: string, selected: CommissionCandidate): CommissionResolution {
  return commissionResolutionSchema.parse({
    accountId,
    source: selected.source,
    effectiveAt: selected.effectiveFrom,
    sourceRecordId: selected.id,
    sourceVersion: selected.version,
    ...(selected.source === 'policy' ? { policyId: selected.id } : {}),
    ...(selected.source === 'exception' ? { exceptionId: selected.id } : {}),
    ...(selected.source === 'account_override' ? { accountOverrideId: selected.id } : {}),
    kind: selected.kind,
    ...(selected.percentageBps !== undefined ? { percentageBps: selected.percentageBps } : {}),
    ...(selected.fixedAmountMinor !== undefined ? { fixedAmountMinor: selected.fixedAmountMinor } : {}),
    ...(selected.currency ? { currency: selected.currency } : {})
  });
}

export function createMongooseProviderCommissionSource(connection: Connection): ProviderCommissionSource {
  return {
    async getForProvider(providerId: string): Promise<CommissionResolution | undefined> {
      const accountId = new Types.ObjectId(providerId);
      const now = new Date();
      const [exceptionRows, overrideRows, policyRows] = await Promise.all([
        connection.collection('commission_exceptions').find(
          { accountId, status: 'active' },
          { projection: COMMISSION_PROJECTION }
        ).toArray(),
        connection.collection('commission_account_overrides').find(
          { accountId, status: 'active' },
          { projection: COMMISSION_PROJECTION }
        ).toArray(),
        connection.collection('commission_policies').find(
          { 'scope.kind': 'default', status: 'active' },
          { projection: COMMISSION_PROJECTION }
        ).toArray()
      ]);

      const selected = choose([
        ...exceptionRows.flatMap((row) => {
          const value = candidate(row, 'exception');
          return value ? [value] : [];
        }),
        ...overrideRows.flatMap((row) => {
          const value = candidate(row, 'account_override');
          return value ? [value] : [];
        }),
        ...policyRows.flatMap((row) => {
          const value = candidate(row, 'policy');
          return value ? [value] : [];
        })
      ], now);

      return selected ? resolve(providerId, selected) : undefined;
    }
  };
}
