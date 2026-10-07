import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createMongoosePublicPropertySearchRepository, createPublicPropertySearchService } from '../apps/api/src/modules/search/properties.ts';
import { writeFile } from 'node:fs/promises';
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/property_options_qa_${Date.now()}?replicaSet=rs0`).asPromise();
const report = { status: 'PASS_LOCAL', checks: [], cleanup: false };
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
} finally {
  await connection.dropDatabase();
  report.cleanup = true;
  await connection.close();
}
await writeFile('docs/quality/guide-runs/property-options-local-latest.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
