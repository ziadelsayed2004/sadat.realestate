import assert from 'node:assert/strict';
import test from 'node:test';
import {
  featureDataSchema,
  featureDeleteDataSchema,
  featureListDataSchema,
  featureListSuccessEnvelopeSchema,
  featureSuccessEnvelopeSchema
} from '@sadat-real-estate/contracts';

const item = {
  id: '2123456789abcdef01234567',
  kind: 'feature' as const,
  groupKey: 'building_amenities',
  name: { en: 'Elevator' },
  slug: 'elevator',
  order: 1,
  active: true,
  version: 0,
  createdAt: '2026-08-14T08:00:00.000Z',
  updatedAt: '2026-08-14T08:00:00.000Z',
  availableActions: ['update', 'delete'] as const
};

test('validates feature projections, envelopes, deletion data, and rejects private fields', () => {
  assert.equal(featureDataSchema.safeParse(item).success, true);
  assert.equal(featureListDataSchema.safeParse({ items: [item] }).success, true);
  assert.equal(featureSuccessEnvelopeSchema.safeParse({ data: item, meta: { requestId: 'feature-contract-test' } }).success, true);
  assert.equal(featureListSuccessEnvelopeSchema.safeParse({ data: { items: [item] }, meta: { requestId: 'feature-list-contract-test' } }).success, true);
  assert.equal(featureDeleteDataSchema.safeParse({ id: item.id, deleted: true }).success, true);
  assert.equal(featureDataSchema.safeParse({ ...item, storageKey: 'private' }).success, false);
});
