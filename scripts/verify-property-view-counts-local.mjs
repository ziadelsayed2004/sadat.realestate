import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createMongoosePropertyViews } from '../apps/api/src/modules/public/property-views.ts';
import { createMongoosePublicPropertySearchRepository } from '../apps/api/src/modules/search/properties.ts';
import { publicPropertySearchQuerySchema } from '../packages/contracts/src/search/index.ts';

// Disposable database on the local QA replica set; never uses application data.
const database = `property_views_qa_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const result = { status: 'RUNNING', checks: [], cleanup: false };
try {
  const properties = connection.collection('properties');
  const events = connection.collection('property_view_events');
  const providerId = new mongoose.Types.ObjectId();
  const propertyId = new mongoose.Types.ObjectId();
  const legacyId = new mongoose.Types.ObjectId();
  const at = new Date('2026-10-15T12:00:00Z');
  const row = { providerId, name: { en: 'QA property' }, kind: 'property', transactionType: 'sale', status: 'published', active: true };
  await properties.insertMany([{ ...row, _id: propertyId, slug: 'counted', viewCount: 70 }, { ...row, _id: legacyId, slug: 'legacy' }]);
  await events.insertOne({ propertyId: legacyId, providerId, visitorHash: 'legacy-hash', day: '2026-10-14', month: '2026-10', expiresAt: new Date(at.getTime() + 86400000) });
  const views = createMongoosePropertyViews(connection, () => at);
  const search = createMongoosePublicPropertySearchRepository(connection);
  const query = publicPropertySearchQuerySchema.parse({});
  assert.equal((await search.list(query)).items.find(item => item.id === String(legacyId)).viewCount, 1);
  assert.equal(await views.record('legacy', 'new-browser'), true);
  assert.equal((await properties.findOne({ _id: legacyId })).viewCount, 2);
  result.checks.push('legacy_retained_views_visible_before_new_visit_and_initialized_once');
  assert.equal(await views.record('counted', 'owner', { sub: String(providerId), role: 'provider' }), false);
  assert.equal(await views.record('counted', 'admin', { sub: 'a'.repeat(24), role: 'admin' }), false);
  assert.deepEqual((await Promise.all(Array.from({ length: 5 }, () => views.record('counted', 'same-browser')))).sort(), [false, false, false, false, true]);
  await Promise.all(Array.from({ length: 5 }, (_, index) => views.record('counted', `browser-${index}`)));
  assert.equal((await properties.findOne({ _id: propertyId })).viewCount, 76);
  result.checks.push('concurrent_visits_increment_once_per_browser_day_and_skip_owner_admin');
  const broken = new Proxy(connection, { get(target, key) {
    if (key === 'collection') return name => {
      const collection = target.collection(name);
      return new Proxy(collection, { get(value, method) {
        if (name === 'properties' && method === 'updateOne') return async () => { throw new Error('INJECTED_COUNTER_FAILURE'); };
        const member = Reflect.get(value, method); return typeof member === 'function' ? member.bind(value) : member;
      } });
    };
    const member = Reflect.get(target, key); return typeof member === 'function' ? member.bind(target) : member;
  } });
  const before = await events.countDocuments();
  await assert.rejects(createMongoosePropertyViews(broken, () => at).record('counted', 'retry-browser'), /INJECTED_COUNTER_FAILURE/);
  assert.equal(await events.countDocuments(), before);
  assert.equal(await views.record('counted', 'retry-browser'), true);
  assert.equal((await properties.findOne({ _id: propertyId })).viewCount, 77);
  result.checks.push('counter_failure_rolls_back_dedup_event_and_retry_succeeds');
  await events.deleteMany({ propertyId });
  assert.equal((await search.list(query)).items.find(item => item.id === String(propertyId)).viewCount, 77);
  result.checks.push('public_total_survives_visitor_event_retention');
  result.status = 'PASS_LOCAL';
} catch (error) {
  result.status = 'FAIL_LOCAL'; result.failure = error.stack; process.exitCode = 1;
} finally {
  try { await connection.dropDatabase(); result.cleanup = true; } finally { await connection.close(); }
  await mkdir('.tmp/property-view-counts', { recursive: true });
  await writeFile('.tmp/property-view-counts/result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
