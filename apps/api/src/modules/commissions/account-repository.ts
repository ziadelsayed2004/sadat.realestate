import type { Connection } from 'mongoose';
import {
  commissionAccountOverrideSchema,
  type CommissionAccountOverride
} from '@sadat-real-estate/contracts';

export type CommissionAccountOverrideWriteResult =
  | { kind: 'written' }
  | { kind: 'duplicate' };

export type CommissionAccountOverrideReplaceResult =
  | { kind: 'written' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export interface CommissionAccountOverrideRepository {
  list(): Promise<CommissionAccountOverride[]>;
  findById(overrideId: string): Promise<CommissionAccountOverride | undefined>;
  insert(override: CommissionAccountOverride): Promise<CommissionAccountOverrideWriteResult>;
  replace(
    override: CommissionAccountOverride,
    expectedVersion: number
  ): Promise<CommissionAccountOverrideReplaceResult>;
}

function document(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error('COMMISSION_ACCOUNT_SOURCE_INVALID');
}

function parseOverride(value: unknown): CommissionAccountOverride {
  const row = document(value);
  delete row._id;
  return commissionAccountOverrideSchema.parse(row);
}

const projection = {
  _id: 0,
  id: 1,
  accountId: 1,
  kind: 1,
  percentageBps: 1,
  fixedAmountMinor: 1,
  currency: 1,
  effectiveFrom: 1,
  effectiveTo: 1,
  status: 1,
  version: 1,
  source: 1,
  createdBy: 1,
  updatedBy: 1,
  createdAt: 1,
  updatedAt: 1
} as const;

export function createMongooseCommissionAccountOverrideRepository(
  connection: Connection
): CommissionAccountOverrideRepository {
  const collection = connection.collection('commission_account_overrides');
  let indexes: Promise<unknown> | undefined;

  const ensureIndexes = (): Promise<unknown> => {
    indexes ??= Promise.all([
      collection.createIndex(
        { id: 1 },
        { unique: true, name: 'commission_account_overrides_id_unique' }
      ),
      collection.createIndex(
        { accountId: 1, effectiveFrom: 1 },
        { unique: true, name: 'commission_account_overrides_account_effective_unique' }
      ),
      collection.createIndex(
        { accountId: 1, status: 1, effectiveFrom: -1, version: -1, id: 1 },
        { name: 'commission_account_overrides_account_status_effective' }
      )
    ]);
    return indexes;
  };

  return {
    async list() {
      await ensureIndexes();
      const rows = await collection.find({}, { projection }).toArray();
      return rows.map(parseOverride);
    },

    async findById(overrideId) {
      await ensureIndexes();
      const row = await collection.findOne({ id: overrideId }, { projection });
      return row ? parseOverride(row) : undefined;
    },

    async insert(override) {
      await ensureIndexes();
      try {
        await collection.insertOne(override);
        return { kind: 'written' };
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 11000
        ) {
          return { kind: 'duplicate' };
        }
        throw error;
      }
    },

    async replace(override, expectedVersion) {
      await ensureIndexes();
      const result = await collection.replaceOne(
        { id: override.id, version: expectedVersion },
        override
      );
      if (result.matchedCount === 1) return { kind: 'written' };
      const current = await collection.findOne(
        { id: override.id },
        { projection: { _id: 0, id: 1 } }
      );
      return current ? { kind: 'version_conflict' } : { kind: 'not_found' };
    }
  };
}
