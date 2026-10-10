import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createProjectModels } from '../apps/api/src/modules/projects/models.ts';
import { createMongooseProjectRepository } from '../apps/api/src/modules/projects/repository.ts';
import { createProjectService } from '../apps/api/src/modules/projects/service.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';

// Local QA only; the random database is the only database this script drops.
const database = `qa_admin_project_save_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`, { serverSelectionTimeoutMS: 10000 }).asPromise();
try {
  const models = createProjectModels(connection);
  const auditModels = createAuditModels(connection);
  await Promise.all([models.Project.init(), auditModels.AuditLog.init()]);
  const durable = createMongooseAuditWriter(auditModels);
  let failAudit = false;
  const repository = createMongooseProjectRepository(connection, models, { async record(event, session) {
    const result = await durable.record(event, session);
    if (failAudit) throw new Error('QA_AUDIT_FAILURE');
    return result;
  } });
  const administrator = new mongoose.Types.ObjectId().toHexString();
  const viewer = new mongoose.Types.ObjectId().toHexString();
  const providerId = new mongoose.Types.ObjectId();
  const organizationId = new mongoose.Types.ObjectId();
  await connection.collection('provider_profiles').insertOne({ _id: providerId, status: 'approved' });
  await connection.collection('organizations').insertOne({ _id: organizationId, providerId, status: 'approved', slug: 'qa-developer' });
  const row = await models.Project.create({ providerId, organizationId, name: { en: 'Original project' }, slug: 'original-project', status: 'published' });
  const id = row.id;
  const service = createProjectService({ repository, providerPolicy: { async canManageProjects() { return false; } }, authorization: { async authorize(actor, permission) { return actor === administrator || (actor === viewer && permission === 'admin:projects.view'); } } });
  const detail = await service.adminGet(administrator, id);
  assert.equal(detail.publicPath, '/developers/qa-developer#project-original-project');
  assert.ok(detail.availableActions.includes('update'));
  assert.deepEqual((await service.adminGet(viewer, id)).availableActions, []);
  const input = { version: 0, reason: 'Administrative project edit', name: { en: 'Updated project' }, description: { en: 'Updated description' }, slug: 'updated-project', website: 'https://example.com/project' };
  const context = { requestId: 'qa-project-save', traceId: 'a'.repeat(32) };
  await assert.rejects(service.adminUpdate(viewer, id, input, context), error => error.code === 'PROJECT_FORBIDDEN');
  const saved = await service.adminUpdate(administrator, id, input, context);
  assert.equal(saved.version, 1);
  assert.equal(saved.status, 'published');
  assert.equal(saved.publicPath, '/developers/qa-developer#project-updated-project');
  const persisted = await repository.findByIdAny(id);
  assert.deepEqual(persisted.name, input.name);
  assert.deepEqual(persisted.description, input.description);
  assert.equal(persisted.website, input.website);
  assert.equal(await auditModels.AuditLog.countDocuments({ targetId: id, action: 'project.update', actorType: 'admin', actorId: administrator }), 1);
  await assert.rejects(service.adminUpdate(administrator, id, input, context), error => error.code === 'PROJECT_VERSION_CONFLICT');
  failAudit = true;
  await assert.rejects(service.adminUpdate(administrator, id, { ...input, version: 1, name: { en: 'Uncommitted title' } }, context), /QA_AUDIT_FAILURE/);
  assert.deepEqual((await repository.findByIdAny(id)).name, input.name);
  assert.equal((await repository.findByIdAny(id)).version, 1);
  assert.equal(await auditModels.AuditLog.countDocuments({ action: 'project.update' }), 1);
  await connection.collection('provider_profiles').updateOne({ _id: providerId }, { $set: { status: 'pending_review' } });
  assert.equal((await service.adminGet(administrator, id)).publicPath, undefined);
  console.log('PASS: real Mongo project edits, admin audit, public destination, view-only permissions, stale protection and transactional rollback.');
} finally {
  await connection.dropDatabase();
  await connection.close();
}
