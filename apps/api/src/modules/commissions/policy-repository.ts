import type { ClientSession, Connection } from 'mongoose';
import {
  commissionPolicySchema,
  type CommissionPolicy
} from '@sadat-real-estate/contracts';
import type { AuditRecordInput, AuditWriter } from '../audit/writer.js';

export type CommissionPolicyWriteResult =
  | { kind: 'written' }
  | { kind: 'duplicate' };

export type CommissionPolicyReplaceResult =
  | { kind: 'written' }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' };

export interface CommissionPolicyRepository {
  list(): Promise<CommissionPolicy[]>;
  findById(policyId: string): Promise<CommissionPolicy | undefined>;
  insert(policy: CommissionPolicy): Promise<CommissionPolicyWriteResult>;
  insertWithAudit?(policy: CommissionPolicy, event: AuditRecordInput): Promise<CommissionPolicyWriteResult>;
  replace(policy: CommissionPolicy, expectedVersion: number): Promise<CommissionPolicyReplaceResult>;
}

function document(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error('COMMISSION_POLICY_SOURCE_INVALID');
}

function parsePolicy(value: unknown): CommissionPolicy {
  const row = document(value);
  delete row._id;
  return commissionPolicySchema.parse(row);
}

export function createMongooseCommissionPolicyRepository(
  connection: Connection,
  audit?: AuditWriter
): CommissionPolicyRepository {
  const collection = connection.collection('commission_policies');
  let indexes: Promise<unknown> | undefined;

  const ensureIndexes = (): Promise<unknown> => {
    indexes ??= Promise.all([
      collection.createIndex(
        { id: 1 },
        { unique: true, name: 'commission_policies_id_unique' }
      ),
      collection.createIndex(
        { key: 1, effectiveFrom: 1 },
        { unique: true, name: 'commission_policies_key_effective_unique' }
      ),
      collection.createIndex(
        { status: 1, effectiveFrom: -1, key: 1, id: 1 },
        { name: 'commission_policies_status_effective' }
      )
    ]);
    return indexes;
  };

  async function insert(policy: CommissionPolicy, session?: ClientSession): Promise<CommissionPolicyWriteResult> {
    await ensureIndexes();
    try {
      await collection.insertOne(policy, session ? { session } : {});
      return { kind: 'written' };
    } catch (error) {
      if (!session && error && typeof error === 'object' && 'code' in error && error.code === 11000) return { kind: 'duplicate' };
      throw error;
    }
  }

  return {
    async list() {
      await ensureIndexes();
      const rows = await collection.find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            key: 1,
            label: 1,
            kind: 1,
            scope: 1,
            percentageBps: 1,
            fixedAmountMinor: 1,
            currency: 1,
            effectiveFrom: 1,
            effectiveTo: 1,
            status: 1,
            version: 1,
            createdBy: 1,
            updatedBy: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      ).toArray();
      return rows.map(parsePolicy);
    },

    async findById(policyId) {
      await ensureIndexes();
      const row = await collection.findOne(
        { id: policyId },
        {
          projection: {
            _id: 0,
            id: 1,
            key: 1,
            label: 1,
            kind: 1,
            scope: 1,
            percentageBps: 1,
            fixedAmountMinor: 1,
            currency: 1,
            effectiveFrom: 1,
            effectiveTo: 1,
            status: 1,
            version: 1,
            createdBy: 1,
            updatedBy: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      );
      return row ? parsePolicy(row) : undefined;
    },

    insert,

    async insertWithAudit(policy, event) {
      if (!audit) throw new Error('COMMISSION_POLICY_AUDIT_UNAVAILABLE');
      const session = await connection.startSession();
      try {
        return await session.withTransaction(async () => {
          const result = await insert(policy, session);
          if (result.kind === 'written') await audit.record(event, session);
          return result;
        });
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return { kind: 'duplicate' };
        throw error;
      } finally {
        await session.endSession();
      }
    },

    async replace(policy, expectedVersion) {
      await ensureIndexes();
      const result = await collection.replaceOne(
        { id: policy.id, version: expectedVersion },
        policy
      );
      if (result.matchedCount === 1) return { kind: 'written' };
      const current = await collection.findOne(
        { id: policy.id },
        { projection: { _id: 0, id: 1 } }
      );
      return current ? { kind: 'version_conflict' } : { kind: 'not_found' };
    }
  };
}
