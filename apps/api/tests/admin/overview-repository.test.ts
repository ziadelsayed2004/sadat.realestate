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

test('uses explicit time-bounded collection filters and documented KPI definitions', async () => {
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
  assert.deepEqual(calls[4]?.filter, { publishedAt: dateBounds, status: 'published', active: true });
  assert.deepEqual(calls[5]?.filter, {
    createdAt: dateBounds,
    status: { $nin: ['resolved', 'cancelled', 'closed'] }
  });
  assert.deepEqual(calls[6]?.filter, { updatedAt: dateBounds, status: 'pending_review' });
  assert.deepEqual(calls[7]?.filter, { updatedAt: dateBounds, status: 'pending_review' });
  assert.deepEqual(calls[8]?.filter, { updatedAt: dateBounds, status: 'pending_review' });
});
