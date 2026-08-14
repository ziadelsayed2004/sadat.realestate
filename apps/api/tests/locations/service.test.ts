import assert from 'node:assert/strict';
import test from 'node:test';
import type { LocationRepository, StoredLocation } from '../../src/modules/locations/repository.js';
import { createLocationService, LocationServiceError } from '../../src/modules/locations/service.js';

const adminId = '0123456789abcdef01234567';
const viewerId = '1123456789abcdef01234567';
const locationId = '2123456789abcdef01234567';
const neighborhoodId = '3123456789abcdef01234567';
const now = new Date('2026-08-14T08:00:00.000Z');

function record(overrides: Partial<StoredLocation> = {}): StoredLocation {
  return {
    id: locationId, kind: 'location', name: { ar: 'مدينة السادات' }, slug: 'sadat-city',
    order: 0, active: true, version: 0, createdAt: now, updatedAt: now, ...overrides
  };
}

function setup(options: { inUse?: boolean } = {}) {
  const records = new Map<string, StoredLocation>([[locationId, record()]]);
  let capturedQuery: unknown;
  const repository: LocationRepository = {
    async list(query) { capturedQuery = query; return { items: [...records.values()], total: records.size }; },
    async findById(id) { return records.get(id) ?? null; },
    async parentLocationExists(id) { return records.get(id)?.kind === 'location'; },
    async create(input) {
      if ([...records.values()].some((item) => item.slug === input.location.slug)) return { kind: 'slug_conflict' };
      const created = record({ ...input.location, id: neighborhoodId, version: 0 });
      records.set(created.id, created);
      return { kind: 'written', location: created };
    },
    async update(input) {
      const current = records.get(input.id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      if (input.changes.slug && [...records.values()].some((item) => item.id !== input.id && item.slug === input.changes.slug)) return { kind: 'slug_conflict' };
      const next = { ...current, ...input.changes, version: current.version + 1, updatedAt: input.metadata.changedAt };
      if (input.changes.coordinates === null) delete next.coordinates;
      records.set(input.id, next);
      return { kind: 'written', location: next };
    },
    async delete(input) {
      const current = records.get(input.id);
      if (!current) return { kind: 'not_found' };
      if (options.inUse) return { kind: 'in_use' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      records.delete(input.id);
      return { kind: 'deleted' };
    }
  };
  const authorization = {
    async authorize(userId: string, permission: string) {
      return userId === adminId || (userId === viewerId && permission.endsWith('.view'));
    }
  };
  return {
    records,
    capturedQuery: () => capturedQuery,
    service: createLocationService({ repository, authorization, now: () => now })
  };
}

test('lists with bounded filters and hides mutation actions from View Only', async () => {
  const fixture = setup();
  const result = await fixture.service.list({ userId: viewerId }, {
    kind: 'location', active: true, sort: 'order', direction: 'asc', page: 1, limit: 20
  });
  assert.equal(result.total, 1);
  assert.deepEqual(result.data.items[0]?.availableActions, []);
  assert.deepEqual(fixture.capturedQuery(), {
    kind: 'location', active: true, sort: 'order', direction: 'asc', page: 1, limit: 20
  });
});

test('creates localized neighborhoods only under an existing top-level location', async () => {
  const { service } = setup();
  const created = await service.create({ userId: adminId }, {
    kind: 'neighborhood', parentLocationId: locationId, name: { en: 'District One' },
    slug: 'district-one', order: 1, active: true, reason: 'Create approved neighborhood'
  }, { requestId: 'locations-1', traceId: 'a'.repeat(32) });
  assert.equal(created.kind, 'neighborhood');
  assert.equal(created.parentLocationId, locationId);
  await assert.rejects(service.create({ userId: adminId }, {
    kind: 'neighborhood', parentLocationId: '4123456789abcdef01234567', name: { en: 'Unknown' },
    slug: 'unknown-parent', order: 1, active: true, reason: 'Try unknown parent'
  }, { requestId: 'locations-2', traceId: 'b'.repeat(32) }), (error) => error instanceof LocationServiceError && error.code === 'LOCATION_PARENT_NOT_FOUND');
});

test('enforces manage permission, duplicate slugs, hierarchy, and optimistic concurrency', async () => {
  const { service } = setup();
  await assert.rejects(service.create({ userId: viewerId }, {
    kind: 'location', name: { en: 'Denied' }, slug: 'denied', order: 0, active: true,
    reason: 'Viewer cannot create'
  }, { requestId: 'locations-3', traceId: 'c'.repeat(32) }), /LOCATION_FORBIDDEN/);
  await assert.rejects(service.create({ userId: adminId }, {
    kind: 'location', name: { en: 'Duplicate' }, slug: 'sadat-city', order: 0, active: true,
    reason: 'Duplicate slug attempt'
  }, { requestId: 'locations-4', traceId: 'd'.repeat(32) }), /LOCATION_SLUG_EXISTS/);
  await assert.rejects(service.update({ userId: adminId }, locationId, {
    version: 0, parentLocationId: neighborhoodId, reason: 'Invalid parent assignment'
  }, { requestId: 'locations-5', traceId: 'e'.repeat(32) }), /LOCATION_PARENT_INVALID/);
  await assert.rejects(service.update({ userId: adminId }, locationId, {
    version: 9, order: 2, reason: 'Stale update attempt'
  }, { requestId: 'locations-6', traceId: 'f'.repeat(32) }), /LOCATION_VERSION_CONFLICT/);
});

test('updates order and activation, then rejects replayed or referenced deletion', async () => {
  const fixture = setup();
  const updated = await fixture.service.update({ userId: adminId }, locationId, {
    version: 0, order: 4, active: false, reason: 'Reorder and deactivate'
  }, { requestId: 'locations-7', traceId: '1'.repeat(32) });
  assert.equal(updated.order, 4);
  assert.equal(updated.active, false);
  await assert.rejects(fixture.service.delete({ userId: adminId }, locationId, {
    version: 0, reason: 'Stale delete attempt'
  }, { requestId: 'locations-8', traceId: '2'.repeat(32) }), /LOCATION_VERSION_CONFLICT/);
  const guarded = setup({ inUse: true });
  await assert.rejects(guarded.service.delete({ userId: adminId }, locationId, {
    version: 0, reason: 'Referenced delete attempt'
  }, { requestId: 'locations-9', traceId: '3'.repeat(32) }), /LOCATION_IN_USE/);
});
