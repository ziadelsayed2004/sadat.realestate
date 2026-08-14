import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auditLogDataSchema,
  auditLogListQuerySchema,
  auditLogListSuccessEnvelopeSchema
} from '@sadat-real-estate/contracts';

const item = {
  id: '0123456789abcdef01234567',
  actorType: 'admin' as const,
  actorId: '1123456789abcdef01234567',
  targetType: 'user',
  targetId: '2123456789abcdef01234567',
  action: 'account.restrict',
  reason: 'Confirmed policy breach',
  before: { status: 'verified' },
  after: { status: 'restricted' },
  requestId: 'audit-contract-1',
  traceId: 'a'.repeat(32),
  createdAt: '2026-08-14T00:00:00.000Z'
};

test('parses bounded allowlisted audit filters and pagination defaults', () => {
  assert.deepEqual(auditLogListQuerySchema.parse({}), { page: 1, limit: 25 });
  const query = auditLogListQuerySchema.parse({
    page: '2',
    limit: '50',
    targetType: 'provider_application',
    targetId: '2123456789abcdef01234567',
    action: 'provider.verify',
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-14T00:00:00.000Z'
  });
  assert.equal(query.page, 2);
  assert.equal(query.limit, 50);
});

test('rejects unsafe, unbounded, ambiguous, and mass-assigned audit filters', () => {
  for (const query of [
    { page: '0' },
    { limit: '101' },
    { targetId: '2123456789abcdef01234567' },
    { targetType: { $ne: 'user' } },
    { action: 'Account Restrict' },
    { from: '2026-08-15T00:00:00.000Z', to: '2026-08-14T00:00:00.000Z' },
    { includeSecrets: 'true' }
  ]) assert.equal(auditLogListQuerySchema.safeParse(query).success, false);
});

test('exposes strict redacted audit projections and paginated envelopes', () => {
  assert.deepEqual(auditLogDataSchema.parse(item), item);
  assert.equal(auditLogDataSchema.safeParse({ ...item, storageKey: 'private/key' }).success, false);
  assert.equal(auditLogListSuccessEnvelopeSchema.safeParse({
    data: { items: [item] },
    meta: { requestId: 'audit-contract-2', page: 1, limit: 25, total: 1 }
  }).success, true);
  assert.equal(auditLogListSuccessEnvelopeSchema.safeParse({
    data: { items: [item] }, meta: { requestId: 'audit-contract-3' }
  }).success, false);
});
