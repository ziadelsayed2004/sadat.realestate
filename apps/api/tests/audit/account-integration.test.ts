import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { type ClientSession, type Connection } from 'mongoose';
import type { AuditRecordInput, AuditWriter } from '../../src/modules/audit/writer.js';
import type { IdentityModels } from '../../src/modules/identity/models.js';
import type { ProviderModels } from '../../src/modules/provider/models.js';
import type { AccountModels } from '../../src/modules/accounts/models.js';
import { createMongooseAccountRepository } from '../../src/modules/accounts/repository.js';

const actorId = '0123456789abcdef01234567';
const userId = '1123456789abcdef01234567';
const changedAt = new Date('2026-08-14T00:00:00.000Z');

function connection(session: ClientSession): Connection {
  return {
    async transaction<T>(work: (current: ClientSession) => Promise<T>) { return work(session); }
  } as unknown as Connection;
}

function models() {
  return {
    identity: {
      User: { updateOne() { return { async exec() { return { modifiedCount: 1 }; } }; } },
      Session: { updateMany() { return { async exec() { return { modifiedCount: 1 }; } }; } }
    } as unknown as IdentityModels,
    provider: {} as ProviderModels,
    account: {
      AccountStateTransition: {
        async create() {
          return [{ _id: new mongoose.Types.ObjectId('2123456789abcdef01234567') }];
        }
      }
    } as unknown as AccountModels
  };
}

test('appends the unified audit in the same transaction as an account transition', async () => {
  const transactionSession = { id: 'transaction-session' } as unknown as ClientSession;
  const records: Array<{ input: AuditRecordInput; session?: ClientSession }> = [];
  const writer: AuditWriter = {
    async record(input, session) {
      records.push({ input, ...(session ? { session } : {}) });
      return '3123456789abcdef01234567';
    }
  };
  const value = models();
  const repository = createMongooseAccountRepository(
    connection(transactionSession), value.identity, value.provider, value.account, writer
  );
  const result = await repository.transitionAccount({
    target: { userId, roleType: 'seeker', status: 'verified', version: 3 },
    toStatus: 'restricted',
    actorAdminId: actorId,
    action: 'restrict',
    reason: 'Confirmed policy breach',
    requestId: 'audit-account-1',
    traceId: 'f'.repeat(32),
    changedAt
  });
  assert.equal(result.kind, 'written');
  assert.equal(records[0]?.session, transactionSession);
  assert.equal(records[0]?.input.action, 'account.restrict');
  assert.deepEqual(records[0]?.input.before, {
    roleType: 'seeker', status: 'verified', version: 3
  });
  assert.deepEqual(records[0]?.input.after, {
    roleType: 'seeker', status: 'restricted', version: 4
  });
});

test('fails the account transaction when mandatory audit persistence fails', async () => {
  const value = models();
  const repository = createMongooseAccountRepository(
    connection({} as ClientSession),
    value.identity,
    value.provider,
    value.account,
    { async record() { throw new Error('AUDIT_UNAVAILABLE'); } }
  );
  await assert.rejects(repository.transitionAccount({
    target: { userId, roleType: 'seeker', status: 'verified', version: 0 },
    toStatus: 'suspended',
    actorAdminId: actorId,
    action: 'suspend',
    reason: 'Confirmed temporary suspension',
    requestId: 'audit-account-2',
    traceId: '1'.repeat(32),
    changedAt
  }), /AUDIT_UNAVAILABLE/);
});
