import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { readEnvironmentFile } from './environment-file.mjs';
import { createMongooseSeekerOverviewRepository } from '../apps/api/src/modules/seeker/overview.ts';
const env = await readEnvironmentFile('.env.local');
assert.equal(new URL(env.MONGODB_URI).hostname, '127.0.0.1');
const database = `overview_projection_${randomUUID().replaceAll('-', '')}`;
const db = await mongoose.createConnection(env.MONGODB_URI, { dbName: database }).asPromise();
const report = { status: 'RUNNING', environment: 'isolated-local-mongodb', checks: [], cleanup: false };
try {
  const owner = new Types.ObjectId();
  const other = new Types.ObjectId();
  const overview = createMongooseSeekerOverviewRepository(db);
  const propertyId = new Types.ObjectId();
  const rows = Array.from({length: 5}, (_, i) => ({ _id: new Types.ObjectId(), i, stamp: new Date(Date.UTC(2026,8,12,10,i)) }));
  await db.collection('requests').insertMany(rows.map(({_id,stamp}) => ({_id,seekerId:owner,type:'contact',status:'new',payload:{message:'Public message'},createdAt:stamp,updatedAt:stamp,internalNotes:'PRIVATE',assignedTo:other})));
  await db.collection('viewings').insertMany(rows.map(({_id,stamp}) => ({_id,seekerId:owner,propertyId,status:'confirmed',requestedAt:stamp,timezone:'Africa/Cairo',note:'Public note',internalNotes:'PRIVATE'})));
  await db.collection('notifications').insertMany(rows.map(({_id,stamp}) => ({_id,recipientId:owner,type:'request.updated',title:{en:'Update'},createdAt:stamp,readAt:null,permission:'admin:requests.manage',internalNotes:'PRIVATE'})));
  for (const name of ['requests','viewings','notifications']) {
    const original = await db.collection(name).findOne({_id:rows[0]._id});
    await db.collection(name).insertOne({...original,_id:new Types.ObjectId(),seekerId:other,recipientId:other,createdAt:new Date('2099-01-01'),updatedAt:new Date('2099-01-01'),requestedAt:new Date(0)});
  }
  const data = await overview.summary(owner.toHexString());
  const descending = rows.slice(2).reverse().map(r=>r._id.toHexString());
  assert.deepEqual(data.recentRequests.map(r=>r.id),descending);
  assert.deepEqual(data.recentNotifications.map(r=>r.id),descending);
  assert.deepEqual(data.upcomingViewings.map(r=>r.id),rows.slice(0,3).map(r=>r._id.toHexString()));
  assert.deepEqual([data.requests,data.activeRequests,data.viewings,data.notifications,data.unreadNotifications],[5,5,5,5,5]);
  assert.ok(!JSON.stringify(data).includes('PRIVATE'));
  for (const item of [...data.recentRequests,...data.recentNotifications,...data.upcomingViewings]) {
    for (const field of ['internalNotes','assignedTo','permission','seekerId','recipientId']) assert.equal(field in item,false);
  }
  report.checks.push('three newest owned requests/notifications; three earliest active owned viewings; foreign records excluded');
  report.checks.push('five-record counts preserved despite three-row projections; internal top-level fields excluded');
  report.status = 'PASS_LOCAL';
} finally {
  assert.equal(db.name, database);
  for (const name of ['properties','favorites','requests','viewings','notifications']) {
    if ((await db.db.listCollections({ name }).toArray()).length) await db.collection(name).drop();
  }
  report.cleanup = (await db.db.listCollections().toArray()).length === 0;
  await db.close();
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/seeker-overview-projection-local-latest.json', JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
