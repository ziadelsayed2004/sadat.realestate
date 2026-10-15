import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { commissionAccountOverrideSchema, type CommissionAccountOverride } from '@sadat-real-estate/contracts';
import { createMongooseCommissionAccountOverrideRepository } from '../../src/modules/commissions/account-repository.js';

test('Mongo insert cannot add _id to the account commission response or its audit snapshot', async () => {
  const override = commissionAccountOverrideSchema.parse({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', accountId: 'bbbbbbbbbbbbbbbbbbbbbbbb', kind: 'percentage', percentageBps: 300, effectiveFrom: '2026-01-01T00:00:00.000Z', status: 'active', version: 0, source: 'account_override', createdBy: 'cccccccccccccccccccccccc', updatedBy: 'cccccccccccccccccccccccc', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' });
  const connection = {
    collection() { return {
      async createIndex() {},
      async dropIndex() {},
      async updateOne() {},
      async insertOne(row: CommissionAccountOverride & { _id?: Types.ObjectId }) { row._id = new Types.ObjectId(); }
    }; },
    async startSession() { return { async withTransaction<T>(run: () => Promise<T>) { return run(); }, async endSession() {} }; }
  } as unknown as Connection;
  let audited = false;
  const repository = createMongooseCommissionAccountOverrideRepository(connection, { async record(event) {
    assert.deepEqual(commissionAccountOverrideSchema.parse(event.after), override);
    audited = true;
    return 'dddddddddddddddddddddddd';
  } });
  await repository.insertWithAudit!(override, { actorType: 'admin', actorId: override.createdBy, targetType: 'commission_account_override', targetId: override.id, action: 'commission_account_override.create', reason: 'Apply account commission', before: {}, after: override, requestId: 'account-repository-test', traceId: 'a'.repeat(32), occurredAt: new Date() });
  assert.equal(audited, true);
  assert.equal('_id' in override, false);
  assert.deepEqual(commissionAccountOverrideSchema.parse(override), override);
});
