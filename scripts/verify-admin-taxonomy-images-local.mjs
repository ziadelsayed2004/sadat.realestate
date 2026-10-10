import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import mongoose from 'mongoose';
import { taxonomyCreateSchema } from '@sadat-real-estate/contracts';
import { createTaxonomyRuntime } from '../apps/api/src/modules/taxonomy/runtime.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

// Loopback QA only. Only this randomly named database is ever dropped.
const admin = await mongoose.createConnection('mongodb://127.0.0.1:27036/admin?directConnection=true', { serverSelectionTimeoutMS: 10000 }).asPromise();
try {
  const hello = await admin.db.admin().command({ hello: 1 });
  if (!hello.setName) await admin.db.admin().command({ replSetInitiate: { _id: 'taxonomyqa', members: [{ _id: 0, host: '127.0.0.1:27036' }] } });
  else assert.equal(hello.setName, 'taxonomyqa');
} finally { await admin.close(); }
const database = `qa_taxonomy_images_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27036/${database}?replicaSet=taxonomyqa`, { serverSelectionTimeoutMS: 20000 }).asPromise();
try {
  const auditModels = createAuditModels(connection);
  await auditModels.AuditLog.init();
  const durable = createMongooseAuditWriter(auditModels);
  let failAudit = false;
  const actor = new mongoose.Types.ObjectId().toHexString();
  const viewer = new mongoose.Types.ObjectId().toHexString();
  const runtime = createTaxonomyRuntime(connection, {}, { async record(event, session) {
    const result = await durable.record(event, session);
    if (failAudit && event.action === 'taxonomy.update') throw new Error('QA_AUDIT_FAILURE');
    return result;
  } }, { async authorize(id, permission) { return id === actor || (id === viewer && permission === 'admin:taxonomy.view'); } }, { mode: 'memory', scannerMode: 'deterministic-fake' });
  await connection.models.PropertyTaxonomy.init();
  const principal = { userId: actor };
  const claims = { sub: actor, role: 'admin', status: 'verified' };
  const context = { requestId: 'local-taxonomy-images', traceId: 'a'.repeat(32) };
  const category = await runtime.service.create(principal, taxonomyCreateSchema.parse({ kind: 'category', name: { en: 'Residential' }, reason: 'Create QA category' }), context);
  const bytes = await readFile(new URL('../apps/web/public/assets/canonical/public/sadat-city-entrance.jpg', import.meta.url));
  const first = await runtime.photos.upload(claims, Readable.from(bytes), 'image/jpeg', context);
  await assert.rejects(runtime.photos.open(first.id), error => error.statusCode === 404);
  let type = await runtime.service.create(principal, taxonomyCreateSchema.parse({ kind: 'type', categoryId: category.id, name: { en: 'QA custom type' }, imageUrl: first.imageUrl, order: 1, reason: 'Create QA type image' }), context);
  assert.equal(type.imageUrl, first.imageUrl);
  assert.equal((await connection.collection('property_taxonomy').findOne({ _id: new mongoose.Types.ObjectId(type.id) })).imageUrl, first.imageUrl);
  assert.equal((await runtime.photos.open(first.id)).mime, 'image/webp');
  const second = await runtime.photos.upload(claims, Readable.from(bytes), 'image/jpeg', context);
  const savedVersion = type.version;
  type = await runtime.service.update(principal, type.id, { version: type.version, imageUrl: second.imageUrl, reason: 'Replace QA type image' }, context);
  await assert.rejects(runtime.photos.open(first.id), error => error.statusCode === 404);
  assert.equal((await runtime.photos.open(second.id)).mime, 'image/webp');
  await assert.rejects(runtime.service.update(principal, type.id, { version: savedVersion, imageUrl: first.imageUrl, reason: 'Reject stale image' }, context), /TAXONOMY_VERSION_CONFLICT/);
  failAudit = true;
  await assert.rejects(runtime.service.update(principal, type.id, { version: type.version, imageUrl: first.imageUrl, reason: 'Rollback failed audit' }, context), /QA_AUDIT_FAILURE/);
  failAudit = false;
  const persisted = (await runtime.service.list(principal, { page: 1, limit: 100, sort: 'order', direction: 'asc' })).data.items.find(item => item.id === type.id);
  assert.equal(persisted.version, type.version); assert.equal(persisted.imageUrl, second.imageUrl);
  type = await runtime.service.update(principal, type.id, { version: type.version, active: false, reason: 'Deactivate QA type' }, context);
  await assert.rejects(runtime.photos.open(second.id), error => error.statusCode === 404);
  type = await runtime.service.update(principal, type.id, { version: type.version, active: true, imageUrl: '/assets/canonical/public/sadat-city-entrance.jpg', reason: 'Restore default gate image' }, context);
  assert.equal(type.imageUrl, '/assets/canonical/public/sadat-city-entrance.jpg');
  assert.equal(type.categoryId, category.id);
  await assert.rejects(runtime.photos.upload({ ...claims, sub: viewer }, Readable.from(bytes), 'image/jpeg', context), error => error.statusCode === 403);
  assert.equal(await connection.collection('audit_logs').countDocuments({ action: 'taxonomy.photo.upload', actorId: new mongoose.Types.ObjectId(actor) }), 2);
  console.log('PASS: real Mongo scanned taxonomy uploads, image persistence and replacement, active-only publication, default reset, permissions, stale protection and audit rollback.');
} finally {
  await connection.dropDatabase(); await connection.close();
}
