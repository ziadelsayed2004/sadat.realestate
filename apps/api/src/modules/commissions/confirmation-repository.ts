import type { Connection } from 'mongoose';
import {
  commissionConfirmationSchema,
  type CommissionConfirmation
} from '@sadat-real-estate/contracts';

export type CommissionConfirmationWriteResult =
  | { kind: 'written' }
  | { kind: 'duplicate' };

export type CommissionConfirmationReplaceResult =
  | { kind: 'written' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export interface CommissionConfirmationRepository {
  list(): Promise<CommissionConfirmation[]>;
  findById(confirmationId: string): Promise<CommissionConfirmation | undefined>;
  insert(confirmation: CommissionConfirmation): Promise<CommissionConfirmationWriteResult>;
  replace(
    confirmation: CommissionConfirmation,
    expectedVersion: number
  ): Promise<CommissionConfirmationReplaceResult>;
}

function document(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error('COMMISSION_CONFIRMATION_SOURCE_INVALID');
}

function parseConfirmation(value: unknown): CommissionConfirmation {
  const row = document(value);
  delete row._id;
  return commissionConfirmationSchema.parse(row);
}

const projection = {
  _id: 0,
  id: 1,
  accountId: 1,
  source: 1,
  sourceRecordId: 1,
  policyVersion: 1,
  policyId: 1,
  accountOverrideId: 1,
  effectiveAt: 1,
  status: 1,
  acknowledgedAt: 1,
  acknowledgedBy: 1,
  revokedAt: 1,
  revokedBy: 1,
  revokeReason: 1,
  version: 1,
  createdAt: 1,
  updatedAt: 1
} as const;

export function createMongooseCommissionConfirmationRepository(
  connection: Connection
): CommissionConfirmationRepository {
  const collection = connection.collection('commission_confirmations');
  let indexes: Promise<unknown> | undefined;

  const ensureIndexes = (): Promise<unknown> => {
    indexes ??= Promise.all([
      collection.createIndex(
        { id: 1 },
        { unique: true, name: 'commission_confirmations_id_unique' }
      ),
      collection.createIndex(
        { accountId: 1, policyVersion: 1 },
        { unique: true, name: 'commission_confirmations_account_policy_unique' }
      ),
      collection.createIndex(
        { accountId: 1, status: 1, acknowledgedAt: -1, policyVersion: -1, id: 1 },
        { name: 'commission_confirmations_account_status_acknowledged' }
      )
    ]);
    return indexes;
  };

  return {
    async list() {
      await ensureIndexes();
      const rows = await collection.find({}, { projection }).toArray();
      return rows.map(parseConfirmation);
    },

    async findById(confirmationId) {
      await ensureIndexes();
      const row = await collection.findOne({ id: confirmationId }, { projection });
      return row ? parseConfirmation(row) : undefined;
    },

    async insert(confirmation) {
      await ensureIndexes();
      try {
        await collection.insertOne(confirmation);
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

    async replace(confirmation, expectedVersion) {
      await ensureIndexes();
      const result = await collection.replaceOne(
        { id: confirmation.id, version: expectedVersion },
        confirmation
      );
      if (result.matchedCount === 1) return { kind: 'written' };
      const current = await collection.findOne(
        { id: confirmation.id },
        { projection: { _id: 0, id: 1 } }
      );
      return current ? { kind: 'version_conflict' } : { kind: 'not_found' };
    }
  };
}
