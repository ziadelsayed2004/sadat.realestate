import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { readEnvironmentFile } from './environment-file.mjs';
import { createMongooseSeekerOverviewRepository } from '../apps/api/src/modules/seeker/overview.ts';
import { createMongooseFavoriteRepository } from '../apps/api/src/modules/favorites/repository.ts';
const env = await readEnvironmentFile('.env.local');
assert.equal(new URL(env.MONGODB_URI).hostname, '127.0.0.1');
const database = `overview_counts_${randomUUID().replaceAll('-', '')}`;
const db = await mongoose.createConnection(env.MONGODB_URI, { dbName: database }).asPromise();
const report = { status: 'RUNNING', environment: 'isolated-local-mongodb', checks: [], cleanup: false };
try {
  const owner = new Types.ObjectId();
  const other = new Types.ObjectId();
  const overview = createMongooseSeekerOverviewRepository(db);
  const empty = await overview.summary(owner.toHexString());
  assert.deepEqual([empty.requests, empty.activeRequests, empty.viewings, empty.savedProperties, empty.notifications, empty.unreadNotifications], [0,0,0,0,0,0]);
  assert.deepEqual([empty.recentRequests, empty.upcomingViewings, empty.recentNotifications], [[],[],[]]);
  report.checks.push('empty account: zero counts and empty projections');
  const properties = Array.from({ length: 5 }, (_, i) => ({ _id: new Types.ObjectId(), slug: `overview-${i}`, name: { en: 'Overview fixture' }, kind: 'property', transactionType: 'sale', active: i !== 2, status: i === 1 ? 'draft' : 'published', ...(i === 3 ? { expiresAt: new Date(0) } : {}) }));
  await db.collection('properties').insertMany(properties);
  await db.collection('favorites').insertMany(properties.map((p,i) => ({ seekerId: i === 4 ? other : owner, propertyId: p._id, savedAt: new Date() })));
  await db.collection('favorites').insertOne({ seekerId: owner, propertyId: new Types.ObjectId(), savedAt: new Date() });
  await db.collection('requests').insertMany([{ seekerId: owner, status: 'new' }, { seekerId: owner, status: 'completed' }, { seekerId: other, status: 'new' }]);
  await db.collection('viewings').insertMany([{ seekerId: owner, status: 'completed' }, { seekerId: other, status: 'requested' }]);
  await db.collection('notifications').insertMany([{ recipientId: owner, readAt: null }, { recipientId: owner, readAt: new Date() }, { recipientId: other, readAt: null }]);
  const summary = await overview.summary(owner.toHexString());
  assert.deepEqual([summary.requests, summary.activeRequests, summary.viewings, summary.savedProperties, summary.notifications, summary.unreadNotifications], [2,1,1,1,2,1]);
  const favorites = await createMongooseFavoriteRepository(db).list(owner.toHexString(), 1, 20);
  assert.equal(summary.savedProperties, favorites.total);
  report.checks.push('owned counts 2/1/1/1/2/1; foreign records excluded; available favorite count matches listing');
  await db.collection('properties').updateOne({ _id: properties[0]._id }, { $set: { active: false } });
  assert.equal((await overview.summary(owner.toHexString())).savedProperties, 0);
  report.checks.push('deactivation updates saved count to zero');
  report.status = 'PASS_LOCAL';
} finally {
  assert.equal(db.name, database);
  for (const name of ['properties','favorites','requests','viewings','notifications']) {
    if ((await db.db.listCollections({ name }).toArray()).length) await db.collection(name).drop();
  }
  report.cleanup = (await db.db.listCollections().toArray()).length === 0;
  await db.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/seeker-overview-counts-local-latest.json', JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
