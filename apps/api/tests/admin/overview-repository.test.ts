import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAdminOverviewSource,
  type AdminOverviewCollectionName,
  type AdminOverviewFilter
} from '../../src/modules/admin/overview-repository.js';

const range = {
  from: '2026-08-01T00:00:00+00:00',
  to: '2026-08-14T00:00:00+00:00'
} as const;

test('uses time-bounded activity filters and current published inventory', async () => {
  const calls: Array<{ collection: AdminOverviewCollectionName; filter: AdminOverviewFilter }> = [];
  const source = createAdminOverviewSource({
    async count(collection, filter) {
      calls.push({ collection, filter });
      return [12, 7, 5, 3, 9, 4, 2, 1, 3][calls.length - 1] ?? 0;
    }
  });

  const result = await source.aggregate(range);

  assert.deepEqual(result, {
    users: 12,
    seekers: 7,
    providers: 5,
    verifiedProviders: 3,
    publishedProperties: 9,
    openRequests: 4,
    pendingReviews: 6
  });
  assert.deepEqual(calls.map(({ collection }) => collection), [
    'users', 'users', 'users', 'users', 'properties', 'requests',
    'provider_applications', 'projects', 'properties'
  ]);

  const dateBounds = { $gte: new Date(range.from), $lt: new Date(range.to) };
  assert.deepEqual(calls[1]?.filter, { createdAt: dateBounds, roleType: 'seeker' });
  assert.deepEqual(calls[3]?.filter, { createdAt: dateBounds, roleType: 'provider', status: 'verified' });
  assert.deepEqual(calls[4]?.filter, { status: 'published', active: true });
  assert.deepEqual(calls[5]?.filter, {
    createdAt: dateBounds,
    status: { $nin: ['resolved', 'cancelled', 'closed'] }
  });
  assert.deepEqual(calls[6]?.filter, { updatedAt: dateBounds, status: 'pending_review' });
  assert.deepEqual(calls[7]?.filter, { updatedAt: dateBounds, status: 'pending_review' });
  assert.deepEqual(calls[8]?.filter, { updatedAt: dateBounds, $or: [{ status: 'pending_review' }, { status: 'published', active: true, 'deactivationRequest.status': 'pending' }] });
});

test('published inventory includes older and undated records, stays independent of range and excludes inactive or unpublished records', async () => {
  const properties = [
    { status: 'published', active: true, publishedAt: new Date('2025-01-01T00:00:00Z') },
    { status: 'published', active: true, publishedAt: new Date('2026-08-10T00:00:00Z') },
    { status: 'published', active: true },
    { status: 'published', active: false, publishedAt: new Date('2026-08-10T00:00:00Z') },
    { status: 'hidden', active: false },
    { status: 'archived', active: false },
    { status: 'draft', active: true },
    { status: 'pending_review', active: true }
  ];
  const source = createAdminOverviewSource({
    async count(collection, filter) {
      if (collection !== 'properties' || filter.status !== 'published') return 0;
      return properties.filter(property => property.status === filter.status && property.active === filter.active && (!filter.publishedAt || property.publishedAt !== undefined && property.publishedAt >= new Date(range.from) && property.publishedAt < new Date(range.to))).length;
    }
  });
  assert.equal((await source.aggregate(range)).publishedProperties, 3);
  assert.equal((await source.aggregate({ from: '2026-07-01T00:00:00Z', to: '2026-07-02T00:00:00Z' })).publishedProperties, 3);
  properties[0]!.status = 'hidden'; properties[0]!.active = false;
  assert.equal((await source.aggregate(range)).publishedProperties, 2);
});
