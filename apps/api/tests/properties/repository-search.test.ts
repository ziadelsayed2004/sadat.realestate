import assert from 'node:assert/strict';

test('rejects foreign project references within the property write transaction before saving or auditing', async () => {
  let filter: Record<string, unknown> = {}, writes = 0;
  const session = { withTransaction: async (run: () => Promise<unknown>) => run(), endSession: async () => {} };
  const connection = { startSession: async () => session, collection: () => ({ findOne: async (query: Record<string, unknown>, options: { session: unknown }) => { filter = query; assert.equal(options.session, session); return null; } }) } as unknown as Connection;
  const models = { Property: class { constructor() { writes += 1; } } } as unknown as PropertyModels;
  const repository = createMongoosePropertyRepository(connection, models, { record: async () => { writes += 1; } } as AuditWriter);
  const providerId = 'a'.repeat(24), organizationId = 'b'.repeat(24), projectId = 'c'.repeat(24);
  const result = await repository.create({ property: { providerId, source: { providerId, sourceType: 'developer_company', organizationId }, projectId, kind: 'unit', name: { en: 'Foreign attempt' }, slug: 'foreign-attempt', transactionType: 'sale', status: 'draft', active: true }, metadata: { actorId: providerId, reason: 'Validate project ownership', requestId: 'project-ownership', traceId: 'a'.repeat(32), changedAt: new Date() } });
  assert.equal(result.kind, 'not_found'); assert.equal(writes, 0);
  assert.equal(String(filter._id), projectId);
  assert.deepEqual((filter.providerId as { $in: unknown[] }).$in.map(String), [providerId, providerId]);
  assert.deepEqual((filter.organizationId as { $in: unknown[] }).$in.map(String), [organizationId, organizationId]);
  assert.deepEqual(filter.status, { $nin: ['archived', 'rejected'] });
});
import test from 'node:test';
import { type Connection, Types } from 'mongoose';
import { propertyAdminListQuerySchema, propertyListQuerySchema } from '@sadat-real-estate/contracts';
import type { PropertyModels } from '../../src/modules/properties/models.js';
import type { AuditWriter } from '../../src/modules/audit/writer.js';
import { createMongoosePropertyRepository } from '../../src/modules/properties/repository.js';

test('searches ID, public code and names without requiring a Mongo text index or losing list filters', async () => {
  let found: Record<string, unknown> = {}; let counted: Record<string, unknown> = {};
  const cursor = { sort() { return this; }, skip() { return this; }, limit() { return this; }, async lean() { return []; } };
  const models = { Property: { find(filter: Record<string, unknown>) { found = filter; return cursor; }, async countDocuments(filter: Record<string, unknown>) { counted = filter; return 0; } } } as unknown as PropertyModels;
  const repository = createMongoosePropertyRepository({} as Connection, models, {} as AuditWriter);
  for (const search of ['670000000000000000000007', '670000000000000000000007d', 'SDT-1234', 'literal+code']) {
    await repository.listAdmin(propertyAdminListQuerySchema.parse({ search, status: 'published', active: true }));
    assert.deepEqual(found, counted); assert.equal(found.status, 'published'); assert.equal(found.active, true); assert.equal('$text' in found, false);
    const clauses = found.$or as Array<Record<string, unknown>>;
    assert.equal(clauses.some(clause => clause._id instanceof Types.ObjectId), search.length === 24);
    const pattern = clauses.find(clause => clause.publicCode)?.publicCode as RegExp;
    assert.equal(pattern.test(search), true); if (search === 'literal+code') assert.equal(pattern.test('literalllcode'), false);
  }
  await repository.listOwned('b'.repeat(24), propertyListQuerySchema.parse({ search: 'SDT-1234', status: 'draft' }));
  assert.equal(String(found.providerId), 'b'.repeat(24)); assert.equal(found.status, 'draft'); assert.deepEqual(found, counted);
});

test('lists pending deactivation requests before paging and counts the same scoped queue', async () => {
  let found: Record<string, unknown> = {}, counted: Record<string, unknown> = {}, skipped = -1, limited = -1;
  const cursor = { sort() { return this; }, skip(value: number) { skipped = value; return this; }, limit(value: number) { limited = value; return this; }, async lean() { return []; } };
  const models = { Property: { find(filter: Record<string, unknown>) { found = filter; return cursor; }, async countDocuments(filter: Record<string, unknown>) { counted = filter; return 0; } } } as unknown as PropertyModels;
  const repository = createMongoosePropertyRepository({} as Connection, models, {} as AuditWriter);
  await repository.listAdmin(propertyAdminListQuerySchema.parse({ deactivationStatus: 'pending', providerId: 'b'.repeat(24), search: 'sold', page: 2, limit: 10 }));
  assert.equal(found.status, 'published'); assert.equal(found.active, true); assert.equal(found['deactivationRequest.status'], 'pending');
  assert.equal(String(found.providerId), 'b'.repeat(24)); assert.ok(found.$or); assert.equal(skipped, 10); assert.equal(limited, 10); assert.deepEqual(found, counted);
  for (const deactivationStatus of ['approved', 'rejected', { $ne: '' }]) assert.equal(propertyAdminListQuerySchema.safeParse({ deactivationStatus }).success, false);
});
