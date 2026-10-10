import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createNotificationService, NotificationServiceError, type NotificationRepository, type NotificationSource } from '../../src/modules/notifications/service.js';

const claims: AccessTokenClaims = {
  iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef',
  role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test'
};
const adminClaims: AccessTokenClaims = {
  ...claims, sub: 'fedcba9876543210fedcba98', role: 'admin', status: 'verified'
};
const providerClaims: AccessTokenClaims = {
  ...claims, sub: 'abcdefabcdefabcdefabcdef', role: 'provider', status: 'verified'
};

test('provider notifications redact historic customer text, identifiers and links while retaining the request number', async () => {
  const requestId = '1234567890abcdef12345678';
  const notice: NotificationSource = { id: 'abcdefabcdefabcdefabcdef', type: 'viewing.created', title: { en: 'Alice booked' }, message: { en: 'Alice alice@example.invalid +201012345678 customer-account-secret' }, link: `/provider/viewings?viewingId=${requestId}&seekerId=customer-account-secret`, readAt: null, createdAt: new Date(), audience: 'provider' };
  const service = createNotificationService({ isActiveAccount, repository: repository({ async list() { return { items: [notice], total: 1, unreadCount: 1 }; } }) });
  const result = await service.listProvider(providerClaims, {});
  const json = JSON.stringify(result);
  for (const secret of ['Alice', 'alice@example', '+201012345678', 'customer-account-secret', 'seekerId']) assert.equal(json.includes(secret), false);
  assert.ok(json.includes(requestId));
  assert.equal(result.items[0]?.link, '/provider/viewings');
});

test('marks queue attention read for active administrators without exposing it to other roles', async () => {
  let calls = 0;
  let pending = 2;
  const service = createNotificationService({
    isActiveAccount,
    repository: repository(),
    attention: { async read(adminId) { assert.equal(adminId, adminClaims.sub); calls++; return { counts: { 'property-review': pending }, total: pending }; }, async markRead(adminId, input) { assert.equal(adminId, adminClaims.sub); assert.deepEqual(input, {}); pending = 0; return 2; } }
  });
  assert.equal((await service.listAdmin(adminClaims, {})).attention?.total, 2);
  assert.equal('attention' in await service.list(claims, {}), false);
  assert.equal(calls, 1);
  await assert.rejects(service.listAdmin(providerClaims, {}));
  assert.equal(calls, 1);
  await service.markAllAdminRead(adminClaims);
  assert.equal((await service.listAdmin(adminClaims, { unreadOnly: true })).attention?.total, 0);
});

test('opening one detail marks its queue receipt and linked notifications without reading the whole inbox', async () => {
  const queueCalls: unknown[] = [];
  const relatedCalls: unknown[] = [];
  const service = createNotificationService({
    isActiveAccount,
    authorization: { authorize: async () => true, permissions: async () => ['admin:requests.view'] },
    repository: repository({
      async markAllRead() { assert.fail('A detail must not mark the whole inbox read'); },
      async markRelatedRead(recipientId, itemId, _now, permissions) { relatedCalls.push({ recipientId, itemId, permissions }); return 1; }
    }),
    attention: {
      async read() { return { counts: {}, total: 0 }; },
      async markRead(adminId, input, permissions) { queueCalls.push({ adminId, input, permissions }); return 1; }
    }
  });
  const input = { queueKey: 'contact-requests', itemId: 'abcdefabcdefabcdefabcdef' };
  assert.equal((await service.markAllAdminRead(adminClaims, input)).updatedCount, 2);
  assert.deepEqual(queueCalls, [{ adminId: adminClaims.sub, input, permissions: ['admin:requests.view'] }]);
  assert.deepEqual(relatedCalls, [{ recipientId: adminClaims.sub, itemId: input.itemId, permissions: ['admin:requests.view'] }]);
  await assert.rejects(service.markAllAdminRead(providerClaims, input));
  await assert.rejects(service.markAllAdminRead(adminClaims, { itemId: input.itemId }));
  assert.equal(queueCalls.length, 1);
});
const createdAt = new Date('2026-08-01T00:00:00.000Z');
const isActiveAccount = async () => true;
const source: NotificationSource = {
  id: 'abcdefabcdefabcdefabcdef', type: 'request.updated', title: { ar: 'تحديث الطلب', en: 'Request updated' },
  message: { ar: 'تم تحديث طلبك', en: 'Your request was updated' }, link: '/seeker/requests/abcdefabcdefabcdefabcdef',
  readAt: null, createdAt
};

function repository(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    async list() { return { items: [source], total: 1, unreadCount: 1 }; },
    async findById() { return source; },
    async markRead(_recipientId, _id, now) { return { ...source, readAt: now }; },
    async markAllRead() { return 1; },
    ...overrides
  };
}

test('lists bounded localized notifications with unread count and safe links', async () => {
  const service = createNotificationService({ isActiveAccount, repository: repository() });
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
    isActiveAccount,
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
  const service = createNotificationService({ isActiveAccount, repository: repository({ async list() { called = true; return { items: [], total: 0, unreadCount: 0 }; } }) });
  await assert.rejects(() => service.list({ ...claims, role: 'provider' } as AccessTokenClaims), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_FORBIDDEN');
  await assert.rejects(() => service.list({ ...claims, status: 'suspended' } as AccessTokenClaims), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_FORBIDDEN');
  assert.equal(called, false);
  const missing = createNotificationService({ isActiveAccount, repository: repository({ async markRead() { return undefined; } }) });
  await assert.rejects(() => missing.markRead(claims, source.id), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_NOT_FOUND');
});

test('rejects stale claims when the current account state or role no longer matches', async () => {
  let called = false;
  const service = createNotificationService({
    repository: repository({ async list() { called = true; return { items: [], total: 0, unreadCount: 0 }; } }),
    isActiveAccount: async () => false
  });
  await assert.rejects(
    () => service.list(claims, { page: '1', limit: '20' }),
    (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_FORBIDDEN'
  );
  assert.equal(called, false);
});

test('lists and updates only the verified provider audience', async () => {
  let listAudience = '';
  let mutationAudience = '';
  const service = createNotificationService({
    isActiveAccount,
    repository: repository({
      async list(_recipientId, _query, audience) { listAudience = audience ?? ''; return { items: [{ ...source, audience: 'provider', link: '/provider/notifications' }], total: 1, unreadCount: 1 }; },
      async markRead(_recipientId, _id, now, audience) { mutationAudience = audience ?? ''; return { ...source, audience: 'provider', readAt: now }; },
      async markAllRead(_recipientId, _now, audience) { mutationAudience = audience ?? ''; return 1; }
    }),
    now: () => new Date('2026-08-02T00:00:00.000Z')
  });
  const result = await service.listProvider(providerClaims, { page: '1', limit: '20', unreadOnly: 'true' });
  assert.equal(result.total, 1);
  assert.equal(listAudience, 'provider');
  assert.equal((await service.markProviderRead(providerClaims, source.id)).id, source.id);
  assert.equal((await service.markAllProviderRead(providerClaims)).updatedCount, 1);
  assert.equal(mutationAudience, 'provider');
  await assert.rejects(() => service.listProvider({ ...providerClaims, status: 'pending' } as AccessTokenClaims, { page: '1', limit: '20' }), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_FORBIDDEN');
});

test('lists an admin-owned inbox with permission-aware projections and bounded deep links', async () => {
  const adminSource: NotificationSource = {
    ...source,
    audience: 'admin',
    requiredPermission: 'admin:requests.view',
    link: '/admin/requests/abcdefabcdefabcdefabcdef'
  };
  let listAudience = '';
  const service = createNotificationService({
    isActiveAccount,
    authorization: {
      async authorize(_adminId, permission) { return permission === 'admin:requests.view'; },
      async permissions() { return ['admin:requests.view']; }
    },
    repository: repository({
      async list(_recipientId, _query, audience) { listAudience = audience ?? ''; return { items: [adminSource], total: 1, unreadCount: 1 }; },
      async findById() { return adminSource; },
      async markRead(_recipientId, _id, now, audience) { assert.equal(audience, 'admin'); return { ...adminSource, readAt: now }; },
      async markAllRead(_recipientId, _now, audience) { assert.equal(audience, 'admin'); return 1; }
    })
  });
  const result = await service.listAdmin(adminClaims, { page: '1', limit: '20', unreadOnly: 'true' });
  assert.equal(listAudience, 'admin');
  assert.equal(result.unreadCount, 1);
  assert.equal(result.items[0]?.link, '/admin/requests/abcdefabcdefabcdefabcdef');
  const read = await service.markAdminRead(adminClaims, adminSource.id);
  assert.equal(read.id, adminSource.id);
  assert.equal((await service.markAllAdminRead(adminClaims)).updatedCount, 1);
});

test('filters admin notifications when the source permission is not granted and rejects non-admins', async () => {
  const restricted: NotificationSource = { ...source, audience: 'admin', requiredPermission: 'admin:requests.manage' };
  let called = false;
  let mutated = false;
  const service = createNotificationService({
    isActiveAccount,
    authorization: { async authorize() { return false; } },
    repository: repository({
      async list() { called = true; return { items: [restricted], total: 1, unreadCount: 1 }; },
      async findById() { return restricted; },
      async markRead() { mutated = true; return restricted; }
    })
  });
  const result = await service.listAdmin(adminClaims, { page: '1', limit: '20' });
  assert.equal(called, true);
  assert.equal(result.items.length, 0);
  await assert.rejects(() => service.markAdminRead(adminClaims, restricted.id), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_NOT_FOUND');
  assert.equal(mutated, false);
  await assert.rejects(() => service.listAdmin({ ...adminClaims, role: 'provider' } as AccessTokenClaims), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_FORBIDDEN');
  await assert.rejects(() => service.listAdmin({ ...adminClaims, status: 'suspended' } as AccessTokenClaims), (error: unknown) => error instanceof NotificationServiceError && error.code === 'NOTIFICATION_FORBIDDEN');
  await assert.rejects(() => service.listAdmin(adminClaims, { page: '1', unknown: true }), /Unrecognized key/);
});
