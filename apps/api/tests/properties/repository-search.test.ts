import assert from 'node:assert/strict';
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
