import assert from 'node:assert/strict';
import test from 'node:test';
import { adminAttentionSchema, adminAttentionReadRequestSchema, notificationListDataSchema } from '@sadat-real-estate/contracts';
import { createAdminAttentionSource } from '../../src/modules/notifications/attention.js';

test('counts authorized submissions and reports across all dates without returning private records', async () => {
  const filters: Array<{ collection: string; filter: Record<string, unknown> }> = [];
  const source = createAdminAttentionSource(async (collection, filter) => {
    filters.push({ collection, filter }); return collection === 'properties' ? 3 : collection.endsWith('_reports') ? 2 : 0;
  }, async () => true);
  const result = await source.read('admin');
  assert.equal(result.counts['property-review'], 3);
  assert.equal(result.counts['account-reports'], 2);
  assert.equal(result.counts['property-reports'], 2);
  assert.equal(result.counts['community-reports'], 2);
  assert.equal(result.total, 9);
  assert.deepEqual(filters.find(row => row.collection === 'properties')?.filter, { status: 'pending_review' });
  assert.deepEqual(filters.find(row => row.collection === 'ad_requests')?.filter, { status: { $in: ['review', 'waiting_pricing'] } });
  assert.deepEqual(filters.find(row => row.collection === 'viewings')?.filter, { status: 'requested' });
  assert.equal(filters.some(row => 'createdAt' in row.filter || 'updatedAt' in row.filter), false);
  assert.deepEqual(Object.keys(result).sort(), ['counts', 'total']);
});

test('does not query or disclose queues outside the administrator permissions', async () => {
  const queried: string[] = [];
  const source = createAdminAttentionSource(async collection => { queried.push(collection); return 7; }, async (_id, permission) => permission === 'admin:properties.review');
  assert.deepEqual(await source.read('restricted-admin'), { counts: { 'property-review': 7 }, total: 7 });
  assert.deepEqual(queried, ['properties']);
});

test('fresh queue reads remove processed submissions and retain independent request types', async () => {
  let pending = 2;
  const source = createAdminAttentionSource(async (collection, filter) => collection === 'properties' ? pending : filter.type === 'contact' ? 3 : collection === 'viewings' ? 1 : 0, async () => true);
  assert.equal((await source.read('admin')).total, 6);
  pending = 0;
  const result = await source.read('admin');
  assert.equal(result.counts['property-review'], 0);
  assert.equal(result.counts['contact-requests'], 3);
  assert.equal(result.counts['viewing-requests'], 1);
  assert.equal(result.total, 4);
});

test('failed or malformed database counts cannot masquerade as an empty queue', async () => {
  await assert.rejects(createAdminAttentionSource(async () => { throw new Error('database unavailable'); }, async () => true).read('admin'), /database unavailable/);
  await assert.rejects(createAdminAttentionSource(async () => -1, async () => true).read('admin'));
  assert.equal(adminAttentionSchema.safeParse({ counts: { privateQueue: 3 }, total: 3 }).success, false);
  assert.equal(notificationListDataSchema.safeParse({ items: [], total: 0, unreadCount: 0, page: 1, limit: 1, attention: { counts: {}, total: 0 } }).success, false);
});

test('acknowledges only the selected authorized queue and item, scoped to the administrator', async () => {
  const writes: unknown[] = [];
  const source = createAdminAttentionSource(async () => 3, async (_id, permission) => permission === 'admin:properties.review', async (collection, filter, adminId, key, itemId) => {
    writes.push({ collection, filter, adminId, key, itemId }); return 1;
  });
  assert.equal(await source.markRead('admin-a', { queueKey: 'property-review', itemId: 'record1' }), 1);
  assert.deepEqual(writes, [{ collection: 'properties', filter: { status: 'pending_review' }, adminId: 'admin-a', key: 'property-review', itemId: 'record1' }]);
  assert.equal(await source.markRead('admin-a', { queueKey: 'account-reports' }), 0);
  assert.equal(writes.length, 1);
  assert.equal(adminAttentionReadRequestSchema.safeParse({ itemId: 'record1' }).success, false);
  assert.equal(adminAttentionReadRequestSchema.safeParse({ queueKey: 'property-review', itemId: '$bad.regex' }).success, false);
});
