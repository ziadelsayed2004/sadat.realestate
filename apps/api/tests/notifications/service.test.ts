import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createNotificationService, NotificationServiceError, type NotificationRepository, type NotificationSource } from '../../src/modules/notifications/service.js';

const claims: AccessTokenClaims = {
  iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef',
  role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test'
};
const createdAt = new Date('2026-08-01T00:00:00.000Z');
const source: NotificationSource = {
  id: 'abcdefabcdefabcdefabcdef', type: 'request.updated', title: { ar: 'تحديث الطلب', en: 'Request updated' },
  message: { ar: 'تم تحديث طلبك', en: 'Your request was updated' }, link: '/seeker/requests/abcdefabcdefabcdefabcdef',
  readAt: null, createdAt
};

function repository(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    async list() { return { items: [source], total: 1, unreadCount: 1 }; },
    async markRead(_recipientId, _id, now) { return { ...source, readAt: now }; },
    async markAllRead() { return 1; },
    ...overrides
  };
}

test('lists bounded localized notifications with unread count and safe links', async () => {
  const service = createNotificationService({ repository: repository() });
  const result = await service.list(claims, { page: '1', limit: '20', unreadOnly: 'true' });
  assert.equal(result.total, 1);
  assert.equal(result.unreadCount, 1);
  assert.equal(result.items[0]?.link, '/seeker/requests/abcdefabcdefabcdefabcdef');
  assert.deepEqual(result.items[0]?.title, { ar: 'تحديث الطلب', en: 'Request updated' });
  await assert.rejects(() => service.list(claims, { page: '1', limit: '20', unknown: true }), /Unrecognized key/);
  await assert.rejects(() => service.list(claims, { page: '1', limit: '20', unreadOnly: 'maybe' }), /expected boolean/i);
});

test('marks only owned notifications and supports idempotent read-all', async () => {
  let recipient = '';
  const service = createNotificationService({
    repository: repository({
      async markRead(recipientId, _id, now) { recipient = recipientId; return { ...source, readAt: now }; },
      async markAllRead(recipientId) { recipient = recipientId; return 0; }
    }),
    now: () => new Date('2026-08-02T00:00:00.000Z')
  });
  const read = await service.markRead(claims, source.id);
  assert.equal(read.id, source.id);
  assert.equal(read.readAt, '2026-08-02T00:00:00.000Z');
  assert.equal((await service.markAllRead(claims)).updatedCount, 0);
  assert.equal(recipient, claims.sub);
  await assert.rejects(() => service.markRead(claims, 'bad-id'), /Invalid/);
});

test('rejects non-seeker and suspended access without touching the repository', async () => {
  let called = false;
  const service = createNotificationService({ repository: repository({ async list() { called = true; return { items: [], total: 0, unreadCount: 0 }; } }) });
  await assert.rejects(() => service.list({ ...claims, role: 'provider' } as AccessTokenClaims), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_FORBIDDEN');
  await assert.rejects(() => service.list({ ...claims, status: 'suspended' } as AccessTokenClaims), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_FORBIDDEN');
  assert.equal(called, false);
  const missing = createNotificationService({ repository: repository({ async markRead() { return undefined; } }) });
  await assert.rejects(() => missing.markRead(claims, source.id), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_NOT_FOUND');
});
