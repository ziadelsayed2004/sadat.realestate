import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClientSession, Connection } from 'mongoose';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createCommissionExceptionService } from '../../src/modules/commissions/exception-service.js';
import { commissionExceptionNotification, writeCommissionExceptionNotification } from '../../src/modules/commissions/exception-notifications.js';

const admin = { sub: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'admin', status: 'verified' } as AccessTokenClaims;
test('commission notices go only to the provider on activation or stopping, with stable replay identities', async () => {
  const service = createCommissionExceptionService({ now: () => new Date('2026-10-08T10:00:00Z') });
  const draft = await service.createException(admin, { accountId: 'bbbbbbbbbbbbbbbbbbbbbbbb', kind: 'percentage', percentageBps: 100, reason: 'Private administrative reason', effectiveFrom: '2026-10-08T09:00:00Z' });
  assert.equal(commissionExceptionNotification(draft, 'draft'), undefined);
  const active = await service.updateException(admin, draft.id, { expectedVersion: draft.version, status: 'active', reason: 'Approve exception' });
  const notice = commissionExceptionNotification(active, draft.status)!;
  assert.equal(notice.recipientId.toHexString(), active.accountId);
  assert.equal(notice.audience, 'provider');
  assert.equal(notice.link, '/provider/commission');
  assert.match(notice.message.en, /1%/);
  assert.equal(JSON.stringify(notice).includes(draft.reason), false);
  assert.equal(notice._id.toHexString(), commissionExceptionNotification(active, draft.status)!._id.toHexString());
  const stopped = await service.updateException(admin, active.id, { expectedVersion: active.version, status: 'inactive', reason: 'Stop exception' });
  assert.equal(commissionExceptionNotification(stopped, 'active')?.type, 'commission.exception_stopped');
  const session = {} as ClientSession;
  let written = 0;
  const connection = { collection(name: string) { assert.equal(name, 'notifications'); return { async updateOne(filter: unknown, change: unknown, options: unknown) {
    written++; assert.deepEqual(filter, { _id: notice._id }); assert.deepEqual(change, { $setOnInsert: notice }); assert.deepEqual(options, { upsert: true, session });
  } }; } } as unknown as Connection;
  await writeCommissionExceptionNotification(connection, draft, 'draft', session);
  assert.equal(written, 0);
  await writeCommissionExceptionNotification(connection, active, 'draft', session);
  assert.equal(written, 1);
});
