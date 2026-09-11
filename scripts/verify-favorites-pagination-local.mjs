import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { readEnvironmentFile } from './environment-file.mjs';
import { createFavoriteRuntime } from '../apps/api/src/modules/favorites/runtime.ts';
const env = await readEnvironmentFile('.env.local');
assert.equal(new URL(env.MONGODB_URI).hostname, '127.0.0.1');
const dbName = `favorites_pagination_${Date.now()}`;
const db = await mongoose.createConnection(env.MONGODB_URI, { dbName }).asPromise();
const owner = new mongoose.Types.ObjectId();
const other = new mongoose.Types.ObjectId();
const claims = { sub: owner.toHexString(), role: 'seeker', status: 'verified' };
const service = createFavoriteRuntime(db, {}).service;
const report = { status: 'RUNNING', environment: 'isolated-local-mongodb', mockedRoutes: false, checks: [], cleanup: false };
try {
  await db.collection('users').insertOne({ _id: owner, roleType: 'seeker', status: 'verified' });
  const properties = Array.from({ length: 29 }, (_, i) => ({ _id: new mongoose.Types.ObjectId(), slug: `saved-${i}`, kind: 'property', name: { en: 'Property' }, transactionType: 'sale', status: i === 25 ? 'draft' : 'published', active: i !== 26, ...(i === 27 ? { expiresAt: new Date(0) } : {}) }));
  await db.collection('properties').insertMany(properties);
  await db.collection('favorites').insertMany(properties.map((p, i) => ({ seekerId: i === 28 ? other : owner, propertyId: p._id, savedAt: new Date(i * 1000) })));
  await db.collection('favorites').insertOne({ seekerId: owner, propertyId: new mongoose.Types.ObjectId(), savedAt: new Date(999999) });
  const first = await service.list(claims, { page: 1, limit: 20 });
  const second = await service.list(claims, { page: 2, limit: 20 });
  const beyond = await service.list(claims, { page: 3, limit: 20 });
  assert.deepEqual([first.total, second.total, beyond.total], [25, 25, 25]);
  assert.deepEqual([first.items.length, second.items.length, beyond.items.length], [20, 5, 0]);
  assert.equal(new Set([...first.items, ...second.items].map(p => p.id)).size, 25);
  report.checks.push('25 available favorites paginate 20/5/0 with stable total; hidden, inactive, expired, missing and foreign favorites excluded');
  for (const state of ['suspended', 'rejected', 'role_changed', 'deleted']) {
    if (state === 'deleted') await db.collection('users').deleteOne({ _id: owner });
    else await db.collection('users').updateOne({ _id: owner }, { $set: { status: state === 'role_changed' ? 'verified' : state, roleType: state === 'role_changed' ? 'provider' : 'seeker' } });
    await assert.rejects(service.list(claims, {}), /FAVORITE_FORBIDDEN/);
    await assert.rejects(service.save(claims, properties[0]._id.toHexString()), /FAVORITE_FORBIDDEN/);
    await assert.rejects(service.remove(claims, properties[0]._id.toHexString()), /FAVORITE_FORBIDDEN/);
    assert.equal(await db.collection('favorites').countDocuments(), 30);
    report.checks.push(`${state}: old-token list/save/remove denied without favorite writes`);
  }
  report.status = 'PASS_LOCAL';
} finally {
  for (const name of ['favorites', 'properties', 'users']) await db.collection(name).drop();
  report.cleanup = (await db.db.listCollections().toArray()).length === 0;
  await db.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/favorites-pagination-local-latest.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
