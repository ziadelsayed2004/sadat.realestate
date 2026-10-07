import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { type ClientSession, type Connection } from 'mongoose';
import type { AuditRecordInput, AuditWriter } from '../../src/modules/audit/writer.js';
import type { IdentityModels } from '../../src/modules/identity/models.js';
import type { ProviderModels } from '../../src/modules/provider/models.js';
import type { AccountModels } from '../../src/modules/accounts/models.js';
import { createMongooseAccountRepository } from '../../src/modules/accounts/repository.js';
import type { ProviderReviewWriteInput } from '../../src/modules/accounts/repository.js';

const actorId = '0123456789abcdef01234567';
const userId = '1123456789abcdef01234567';
const changedAt = new Date('2026-08-14T00:00:00.000Z');

function connection(
  session: ClientSession,
  onNotification: (document: Record<string, unknown>) => void = () => {}
): Connection {
  return {
    async transaction<T>(work: (current: ClientSession) => Promise<T>) { return work(session); },
    collection(name: string) {
      assert.equal(name, 'notifications');
      return {
        async insertOne(document: Record<string, unknown>, options: { session: ClientSession }) {
          assert.equal(options.session, session);
          onNotification(document);
          return { insertedId: document._id };
        }
      };
    }
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

for (const [action, accountStatus, applicationStatus, shouldRevoke] of [
  ['needs_information', 'needs_information', 'needs_information', false],
  ['verify', 'verified', 'approved', false],
  ['reject', 'rejected', 'rejected', true],
  ['suspend', 'suspended', 'suspended', true]
] as const) {
  test(`provider ${action} ${shouldRevoke ? 'revokes' : 'preserves'} sessions with atomic state and audit writes`, async () => {
    const transactionSession = { id: 'provider-review' } as unknown as ClientSession;
    const value = models();
    const writes: string[] = [];
    const notifications: Array<Record<string, unknown>> = [];
    const update = (collection: string) => () => ({ async exec() { writes.push(collection); return { modifiedCount: 1 }; } });
    value.identity.User.updateOne = update('user') as typeof value.identity.User.updateOne;
    value.identity.ProviderProfile = { updateOne: update('profile') } as IdentityModels['ProviderProfile'];
    value.identity.Session.updateMany = update('sessions') as typeof value.identity.Session.updateMany;
    value.provider.ProviderApplication = { updateOne: update('application') } as ProviderModels['ProviderApplication'];
    const writer: AuditWriter = { async record(input, session) {
      assert.equal(session, transactionSession);
      assert.equal(input.action, `provider.${action}`);
      writes.push('audit');
      return '3123456789abcdef01234567';
    } };
    const repository = createMongooseAccountRepository(connection(transactionSession, document => {
      notifications.push(document);
      writes.push('notification');
    }), value.identity, value.provider, value.account, writer);
    const input: ProviderReviewWriteInput = {
      target: { providerApplicationId: '4123456789abcdef01234567', userId, providerType: 'individual_broker', accountStatus: 'pending_review', accountVersion: 1, applicationStatus: 'pending_review', applicationVersion: 1, profileStatus: 'pending_review', profileVersion: 1 },
      actorAdminId: actorId, action, toAccountStatus: accountStatus, toProviderStatus: applicationStatus,
      reason: 'Document review decision', requestId: 'review-session-test', traceId: 'a'.repeat(32), changedAt
    };
    assert.equal((await repository.reviewProvider(input)).kind, 'written');
    assert.deepEqual(writes, ['application', 'profile', 'user', ...(shouldRevoke ? ['sessions'] : []), 'notification', 'audit']);
    assert.equal(notifications.length, 1);
    assert.deepEqual(notifications[0]?.recipientId, new mongoose.Types.ObjectId(userId));
    assert.equal(notifications[0]?.audience, 'provider');
    assert.equal(notifications[0]?.type, `provider.review.${action}`);
    assert.deepEqual(notifications[0]?.message, { ar: input.reason, en: input.reason });
    assert.equal(notifications[0]?.link, '/provider');
    if (action === 'verify') assert.deepEqual(notifications[0]?.title, { ar: 'تم تفعيل حسابك', en: 'Your account is activated' });
  });
}

test('appends the unified audit in the same transaction as an account transition', async () => {
  const transactionSession = { id: 'transaction-session' } as unknown as ClientSession;
  const records: Array<{ input: AuditRecordInput; session?: ClientSession }> = [];
  const notifications: Array<Record<string, unknown>> = [];
  const writer: AuditWriter = {
    async record(input, session) {
      records.push({ input, ...(session ? { session } : {}) });
      return '3123456789abcdef01234567';
    }
  };
  const value = models();
  const repository = createMongooseAccountRepository(
    connection(transactionSession, document => notifications.push(document)), value.identity, value.provider, value.account, writer
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
  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0]?.recipientId, new mongoose.Types.ObjectId(userId));
  assert.equal(notifications[0]?.audience, 'seeker');
  assert.equal(notifications[0]?.type, 'account.restrict');
  assert.deepEqual(notifications[0]?.message, { ar: 'Confirmed policy breach', en: 'Confirmed policy breach' });
  assert.equal(notifications[0]?.link, '/seeker');
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

test('fails the account transaction when notification persistence fails before audit', async () => {
  const value = models();
  let auditWrites = 0;
  const repository = createMongooseAccountRepository(
    connection({} as ClientSession, () => { throw new Error('NOTIFICATION_UNAVAILABLE'); }),
    value.identity,
    value.provider,
    value.account,
    { async record() { auditWrites += 1; return '3123456789abcdef01234567'; } }
  );
  await assert.rejects(repository.transitionAccount({
    target: { userId, roleType: 'seeker', status: 'verified', version: 0 },
    toStatus: 'suspended',
    actorAdminId: actorId,
    action: 'suspend',
    reason: 'Confirmed temporary suspension',
    requestId: 'notification-account-1',
    traceId: '2'.repeat(32),
    changedAt
  }), /NOTIFICATION_UNAVAILABLE/);
  assert.equal(auditWrites, 0);
});
