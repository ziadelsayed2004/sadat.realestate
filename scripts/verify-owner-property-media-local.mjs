import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createPropertyMediaModels } from '../apps/api/src/modules/media/models.ts';
import { createMongoosePropertyMediaRepository } from '../apps/api/src/modules/media/repository.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createPropertyMediaContentReader } from '../apps/api/src/modules/media/content.ts';

const database = `qa_owner_property_media_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`).asPromise();
try {
  const models = createPropertyMediaModels(connection);
  const auditModels = createAuditModels(connection);
  await Promise.all([models.PropertyMedia.init(), auditModels.AuditLog.init()]);
  const durable = createMongooseAuditWriter(auditModels);
  let fail = false;
  const repository = createMongoosePropertyMediaRepository(connection, models, { async record(event, session) {
    await durable.record(event, session);
    if (fail) throw new Error('QA_AUDIT_FAILURE');
    return 'unused';
  } });
  const propertyId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  await connection.collection('properties').insertOne({ _id: propertyId, providerId, version: 2, status: 'published', active: true });
  const metadata = { actorType: 'admin', actorId: new mongoose.Types.ObjectId().toHexString(), reason: 'Correct property photos', requestId: 'media-local-qa', traceId: 'a'.repeat(32), changedAt: new Date() };
  async function photo(checksum) {
    const created = await repository.create({ propertyId: propertyId.toHexString(), providerId: providerId.toHexString(), kind: 'image', originalFilename: 'photo.jpg', declaredMime: 'image/jpeg', detectedMime: 'image/jpeg', byteSize: 6, sha256: checksum.repeat(64), storageKey: `quarantine/${checksum.repeat(32)}`, capacity: 10, metadata });
    assert.equal(created.kind, 'written');
    const ready = await repository.updateProcessing({ providerId: providerId.toHexString(), mediaId: created.media.id, state: 'ready', metadata });
    assert.equal(ready.kind, 'written');
    return ready.media;
  }
  const first = await photo('a'); const second = await photo('b');
  const storage = { openPrivate: async () => { throw new Error('Only metadata is read in this check'); } };
  const publicContent = createPropertyMediaContentReader(connection, models, storage);
  const adminContent = createPropertyMediaContentReader(connection, models, storage, 'admin');
  assert.ok(await publicContent(propertyId.toHexString(), first.id));
  await connection.collection('properties').updateOne({ _id: propertyId }, { $set: { status: 'draft' } });
  assert.equal(await publicContent(propertyId.toHexString(), first.id), null);
  assert.ok(await adminContent(propertyId.toHexString(), first.id));
  assert.equal(await adminContent(new mongoose.Types.ObjectId().toHexString(), first.id), null);
  await connection.collection('properties').updateOne({ _id: propertyId }, { $set: { status: 'published' } });
  const coverUrl = id => `/api/v1/public/properties/${propertyId}/media/${id}/content`;
  const saved = () => connection.collection('properties').findOne({ _id: propertyId });
  assert.equal((await saved()).imageUrl, coverUrl(first.id));
  const owner = { providerId: providerId.toHexString(), propertyId: propertyId.toHexString(), metadata };
  const stale = await repository.update({ ...owner, mediaId: second.id, expectedVersion: 999, changes: { version: 999, reason: metadata.reason, isCover: true }, before: second });
  assert.equal(stale.kind, 'version_conflict');
  assert.equal((await models.PropertyMedia.findById(first.id).lean()).isCover, true);
  const items = [{ mediaId: first.id, sortOrder: 1, isCover: false }, { mediaId: second.id, sortOrder: 0, isCover: true }];
  assert.equal((await repository.reorder({ ...owner, expectedVersion: 999, changes: { version: 999, reason: metadata.reason, items } }))[0].kind, 'version_conflict');
  await repository.reorder({ ...owner, expectedVersion: 2, changes: { version: 2, reason: metadata.reason, items } });
  assert.equal((await saved()).imageUrl, coverUrl(second.id));
  assert.equal(await auditModels.AuditLog.countDocuments({ action: 'property_media.reorder', actorType: 'admin' }), 1);
  fail = true;
  await assert.rejects(repository.markDeleted({ ...owner, mediaId: second.id }), /QA_AUDIT_FAILURE/);
  assert.equal((await saved()).imageUrl, coverUrl(second.id));
  assert.equal((await models.PropertyMedia.findById(second.id).lean()).active, true);
  fail = false;
  await repository.markDeleted({ ...owner, mediaId: second.id });
  assert.equal((await saved()).imageUrl, coverUrl(first.id));
  await repository.markDeleted({ ...owner, mediaId: first.id });
  assert.equal((await saved()).imageUrl, undefined);
  assert.equal((await repository.listPublic(propertyId.toHexString())).length, 0);
  console.log('PASS: real Mongo cover synchronization, stale cover/order protection, ownership, administrative audit, rollback and deletion.');
} finally { await connection.dropDatabase(); await connection.close(); }
