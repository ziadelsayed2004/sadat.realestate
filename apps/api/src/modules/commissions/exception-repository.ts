import type { Connection } from 'mongoose';
import {
  commissionExceptionSchema,
  type CommissionException
} from '@sadat-real-estate/contracts';

export type CommissionExceptionWriteResult =
  | { kind: 'written' }
  | { kind: 'duplicate' };

export type CommissionExceptionReplaceResult =
  | { kind: 'written' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export interface CommissionExceptionRepository {
  list(): Promise<CommissionException[]>;
  findById(exceptionId: string): Promise<CommissionException | undefined>;
  insert(exception: CommissionException): Promise<CommissionExceptionWriteResult>;
  replace(
    exception: CommissionException,
    expectedVersion: number
  ): Promise<CommissionExceptionReplaceResult>;
}

function document(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error('COMMISSION_EXCEPTION_SOURCE_INVALID');
}

function parseException(value: unknown): CommissionException {
  const row = document(value);
  delete row._id;
  return commissionExceptionSchema.parse(row);
}

const projection = {
  _id: 0,
  id: 1,
  accountId: 1,
  kind: 1,
  percentageBps: 1,
  fixedAmountMinor: 1,
  currency: 1,
  reason: 1,
  effectiveFrom: 1,
  effectiveTo: 1,
  status: 1,
  source: 1,
  approvedBy: 1,
  approvedAt: 1,
  approvalReason: 1,
  lastMutationReason: 1,
  version: 1,
  createdBy: 1,
  updatedBy: 1,
  createdAt: 1,
  updatedAt: 1
} as const;

export function createMongooseCommissionExceptionRepository(
  connection: Connection
): CommissionExceptionRepository {
  const collection = connection.collection('commission_exceptions');
  let indexes: Promise<unknown> | undefined;

  const ensureIndexes = (): Promise<unknown> => {
    indexes ??= Promise.all([
      collection.createIndex(
        { id: 1 },
        { unique: true, name: 'commission_exceptions_id_unique' }
      ),
      collection.createIndex(
        { accountId: 1, effectiveFrom: 1 },
        { unique: true, name: 'commission_exceptions_account_effective_unique' }
      ),
      collection.createIndex(
        { accountId: 1, status: 1, effectiveFrom: -1, version: -1, id: 1 },
        { name: 'commission_exceptions_account_status_effective' }
      )
    ]);
    return indexes;
  };

  return {
    async list() {
      await ensureIndexes();
      const rows = await collection.find({}, { projection }).toArray();
      return rows.map(parseException);
    },

    async findById(exceptionId) {
      await ensureIndexes();
      const row = await collection.findOne({ id: exceptionId }, { projection });
      return row ? parseException(row) : undefined;
    },

    async insert(exception) {
      await ensureIndexes();
      try {
        await collection.insertOne(exception);
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

    async replace(exception, expectedVersion) {
      await ensureIndexes();
      const result = await collection.replaceOne(
        { id: exception.id, version: expectedVersion },
        exception
      );
      if (result.matchedCount === 1) return { kind: 'written' };
      const current = await collection.findOne(
        { id: exception.id },
        { projection: { _id: 0, id: 1 } }
      );
      return current ? { kind: 'version_conflict' } : { kind: 'not_found' };
    }
  };
}
