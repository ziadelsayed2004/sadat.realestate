import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClientSession, Connection } from 'mongoose';
import { commissionAccountOverrideSchema } from '@sadat-real-estate/contracts';
import { commissionAccountNotification, writeCommissionAccountNotification } from '../../src/modules/commissions/account-notifications.js';

test('account assignments notify their provider on activation and stopping with replay-safe identities', async () => {
  const item = commissionAccountOverrideSchema.parse({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', accountId: 'bbbbbbbbbbbbbbbbbbbbbbbb', kind: 'percentage', percentageBps: 350, effectiveFrom: '2026-10-15T00:00:00.000Z', status: 'active', version: 0, source: 'account_override', createdBy: 'cccccccccccccccccccccccc', updatedBy: 'cccccccccccccccccccccccc', createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z' });
  assert.equal(commissionAccountNotification({ ...item, status: 'draft' }), undefined);
  const notice = commissionAccountNotification(item)!;
  assert.equal(notice.recipientId.toHexString(), item.accountId);
  assert.equal(notice.audience, 'provider');
  assert.equal(notice.type, 'commission.account_changed');
  assert.match(notice.message.en, /3.5%/);
  assert.match(notice.message.en, /exceptions take priority/);
  assert.equal(notice._id.toHexString(), commissionAccountNotification(item)!._id.toHexString());
  const stopped = commissionAccountNotification({ ...item, status: 'archived', version: 1 }, 'active')!;
  assert.equal(stopped.type, 'commission.account_stopped');
  assert.notEqual(stopped._id.toHexString(), notice._id.toHexString());
  assert.equal(commissionAccountNotification({ ...item, status: 'archived' }, 'draft'), undefined);
  const session = {} as ClientSession;
  let written = false;
  const connection = { collection(name: string) { assert.equal(name, 'notifications'); return { async updateOne(filter: unknown, update: unknown, options: unknown) {
    assert.deepEqual(filter, { _id: notice._id }); assert.deepEqual(update, { $setOnInsert: notice }); assert.deepEqual(options, { upsert: true, session }); written = true;
  } }; } } as unknown as Connection;
  await writeCommissionAccountNotification(connection, item, undefined, session);
  assert.equal(written, true);
});
