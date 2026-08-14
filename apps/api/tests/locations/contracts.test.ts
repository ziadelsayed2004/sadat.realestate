import assert from 'node:assert/strict';
import test from 'node:test';
import {
  locationCreateRequestSchema,
  locationDeleteRequestSchema,
  locationListQuerySchema,
  locationPatchRequestSchema,
  locationSlugSchema
} from '@sadat-real-estate/contracts';

test('validates localized top-level locations and neighborhoods with deterministic defaults', () => {
  assert.deepEqual(locationCreateRequestSchema.parse({
    kind: 'location', name: { ar: 'مدينة السادات' }, slug: 'sadat-city', reason: 'Create master location'
  }), {
    kind: 'location', name: { ar: 'مدينة السادات' }, slug: 'sadat-city',
    order: 0, active: true, reason: 'Create master location'
  });
  assert.equal(locationCreateRequestSchema.safeParse({
    kind: 'neighborhood', name: { en: 'District One' }, slug: 'district-one', reason: 'Create neighborhood'
  }).success, false);
  assert.equal(locationCreateRequestSchema.safeParse({
    kind: 'location', parentLocationId: '0123456789abcdef01234567',
    name: { en: 'Invalid' }, slug: 'invalid', reason: 'Invalid hierarchy'
  }).success, false);
});

test('rejects malformed slugs, coordinates, unknown fields, and mass assignment', () => {
  for (const slug of ['Sadat City', 'sadat_city', '-sadat', 'ar/مدينة']) {
    assert.equal(locationSlugSchema.safeParse(slug).success, false);
  }
  assert.equal(locationCreateRequestSchema.safeParse({
    kind: 'location', name: { en: 'Sadat City' }, slug: 'sadat-city',
    coordinates: { latitude: 91, longitude: 30 }, reason: 'Invalid coordinates'
  }).success, false);
  assert.equal(locationCreateRequestSchema.safeParse({
    kind: 'location', name: { en: 'Sadat City' }, slug: 'sadat-city',
    reason: 'Mass assignment attempt', verified: true
  }).success, false);
});

test('requires optimistic versions and actual bounded mutations', () => {
  assert.equal(locationPatchRequestSchema.safeParse({ version: 0, reason: 'No actual update' }).success, false);
  assert.equal(locationPatchRequestSchema.safeParse({ version: 0, order: 7, reason: 'Reorder location' }).success, true);
  assert.equal(locationPatchRequestSchema.safeParse({ version: -1, active: false, reason: 'Deactivate location' }).success, false);
  assert.equal(locationDeleteRequestSchema.safeParse({ version: 0, reason: 'Remove unused location' }).success, true);
});

test('bounds list filters, sorting, search, and pagination', () => {
  assert.deepEqual(locationListQuerySchema.parse({ active: 'true', page: '2', limit: '10' }), {
    active: true, sort: 'order', direction: 'asc', page: 2, limit: 10
  });
  assert.equal(locationListQuerySchema.safeParse({ limit: '101' }).success, false);
  assert.equal(locationListQuerySchema.safeParse({ sort: '$where' }).success, false);
  assert.equal(locationListQuerySchema.safeParse({ search: { $gt: '' } }).success, false);
  assert.equal(locationListQuerySchema.safeParse({ active: '1' }).success, false);
});
