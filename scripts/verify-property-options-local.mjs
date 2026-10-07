import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createMongoosePublicPropertySearchRepository, createPublicPropertySearchService } from '../apps/api/src/modules/search/properties.ts';
import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createPropertyModels } from '../apps/api/src/modules/properties/models.ts';
import { createPropertyRuntime } from '../apps/api/src/modules/properties/runtime.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/property_options_qa_${Date.now()}?replicaSet=rs0`).asPromise();
const report = { status: 'PASS_LOCAL', checks: [], cleanup: false };
let server;
try {
  const ids = [new mongoose.Types.ObjectId(),new mongoose.Types.ObjectId(),new mongoose.Types.ObjectId()];
  await connection.collection('features_services').insertMany([
    { _id: ids[0], active: true, kind: 'feature', groupKey: 'building', name: { ar: 'مصعد', en: 'Elevator' }, slug: 'elevator', order: 1, internalNotes: 'private' },
    { _id: ids[1], active: true, kind: 'service', groupKey: 'education', name: { ar: 'مدرسة قريبة', en: 'Nearby school' }, slug: 'school', order: 2 },
    { _id: ids[2], active: false, kind: 'feature', groupKey: 'building', name: { ar: 'مخفي', en: 'Hidden' }, slug: 'hidden', order: 0 }
  ]);
  const service = createPublicPropertySearchService({ repository: createMongoosePublicPropertySearchRepository(connection) });
  const ordinary = await service.list({ limit: 1 });
  assert.equal(ordinary.amenities, undefined);
  report.checks.push('ordinary_search_does_not_fetch_amenities');
  const catalog = await service.list({ limit: 1, includeAmenities: true });
  assert.deepEqual(catalog.amenities?.map(item => item.id), [String(ids[0]),String(ids[1])]);
  assert.equal(JSON.stringify(catalog).includes('private'),false);
  assert.equal(JSON.stringify(catalog).includes('internalNotes'),false);
  report.checks.push('only_active_named_features_and_services_without_private_fields');
  const providerId = new mongoose.Types.ObjectId();
  const models = createPropertyModels(connection);
  const property = await models.Property.create({ providerId, sourceType: 'individual_broker', kind: 'property',
    name: { en: 'Amenity verification home' }, slug: 'amenity-verification-home', transactionType: 'sale', status: 'draft', active: true, version: 0 });
  const tokens = createHmacAccessTokenService(randomBytes(32), 900);
  server = createApiServer({ database: { isReady: async () => true },
    properties: createPropertyRuntime(connection, tokens, createMongooseAuditWriter(createAuditModels(connection))),
    observability: { logger: { log() {} } } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const token = tokens.issue({ id: String(providerId), roleType: 'provider', status: 'verified' }, String(new mongoose.Types.ObjectId()), new Date());
  const endpoint = `http://127.0.0.1:${address.port}/api/v1/provider/properties/${property._id}/steps/features-services`;
  const save = async (version, featureIds, serviceIds) => {
    const response = await fetch(endpoint, { method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ version, featureIds, serviceIds, reason: 'Verify optional amenity choices' }) });
    return { status: response.status, body: await response.json() };
  };
  const selected = await save(0, [String(ids[0])], [String(ids[1])]);
  assert.equal(selected.status, 200);
  assert.deepEqual(selected.body.data.featureIds, [String(ids[0])]);
  assert.deepEqual(selected.body.data.serviceIds, [String(ids[1])]);
  const stored = await models.Property.findById(property._id).lean();
  assert.deepEqual(stored.featureIds.map(String), [String(ids[0])]);
  report.checks.push('named_choices_save_through_real_API_and_persist_in_MongoDB');
  const empty = await save(selected.body.data.version, [], []);
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.data.featureIds, []);
  assert.deepEqual(empty.body.data.serviceIds, []);
  report.checks.push('empty_optional_choices_save_through_real_API');
  const malformed = await save(empty.body.data.version, ['not-an-id'], []);
  assert.equal(malformed.status, 400);
  assert.deepEqual((await models.Property.findById(property._id).lean()).featureIds, []);
  report.checks.push('malformed_choice_rejected_without_changing_saved_property');
} finally {
  if (server) await stopApiServer(server);
  await connection.dropDatabase();
  report.cleanup = true;
  await connection.close();
}
await writeFile('docs/quality/guide-runs/property-options-local-latest.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
