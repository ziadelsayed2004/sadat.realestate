import assert from 'node:assert/strict';
import test from 'node:test';

test('generates a project link without user input and keeps it on name changes', async () => {
  const { service } = fixture();
  const context = { requestId: 'auto-project', traceId: 'a'.repeat(32) };
  const created = await service.create(claims(), { name: { en: 'Nile Heights' }, reason: 'Create named project' }, context);
  assert.match(created.slug, /^nile-heights-[a-f0-9]{32}$/);
  const updated = await service.update(claims(), created.id, { version: created.version, name: { en: 'New name' }, reason: 'Rename project only' }, context);
  assert.equal(updated.slug, created.slug);
});
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import type { ProjectRepository, StoredProject } from '../../src/modules/projects/repository.js';
import { createProjectService, ProjectServiceError, publicProjectProjection } from '../../src/modules/projects/service.js';
import { Types, type Connection } from 'mongoose';
import { createMongooseProjectRepository } from '../../src/modules/projects/repository.js';
import type { ProjectModels } from '../../src/modules/projects/models.js';
import type { AuditWriter } from '../../src/modules/audit/writer.js';

const provider = '0123456789abcdef01234567';
const other = '1123456789abcdef01234567';
const admin = '3123456789abcdef01234567';
const id = '2123456789abcdef01234567';
const now = new Date('2026-08-14T08:00:00.000Z');
const claims = (sub = provider, status: 'verified' | 'pending_review' = 'verified') => ({ sub, role: 'provider', status, iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sid: '4123456789abcdef01234567', iat: 1, exp: 2, jti: 'j' } as AccessTokenClaims);
const adminClaims = (sub = admin) => ({ sub, role: 'admin', status: 'verified', iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sid: '4123456789abcdef01234567', iat: 1, exp: 2, jti: 'j' } as AccessTokenClaims);

test('archives projects with review permission and the current version while keeping creation developer-only', async () => {
  const context = { requestId: 'archive-project', traceId: 'a'.repeat(32) };
  const input = { version: 3, action: 'archive' as const, reason: 'Remove project from display' };
  const { service, rows } = fixture();
  for (const status of ['draft', 'pending_review', 'approved', 'needs_changes', 'published', 'hidden', 'rejected'] as const) {
    rows.set(id, record({ status, version: 3, organizationId: other }));
    assert.ok((await service.adminGet(admin, id)).availableActions.includes('archive'));
    await assert.rejects(service.review(other, id, input, context), error => error.code === 'PROJECT_FORBIDDEN');
    await assert.rejects(service.review(admin, id, { ...input, version: 2 }, context), error => error.code === 'PROJECT_VERSION_CONFLICT');
    const archived = await service.review(admin, id, input, context);
    assert.equal(archived.status, 'archived');
    assert.equal(archived.version, 4);
    assert.deepEqual(archived.availableActions, []);
    assert.equal(archived.publicPath, undefined);
    assert.equal(publicProjectProjection(rows.get(id)!), null);
    assert.equal(archived.reviewedBy, admin);
    assert.equal(archived.reviewReason, input.reason);
    await assert.rejects(service.review(admin, id, { ...input, version: 4 }, context), error => error.code === 'PROJECT_TRANSITION_INVALID');
  }
  const viewer = fixture(true, true, false);
  assert.deepEqual((await viewer.service.adminGet(admin, id)).availableActions, []);
  await assert.rejects(viewer.service.review(admin, id, input, context), error => error.code === 'PROJECT_FORBIDDEN');
  const create = { name: { en: 'Owner project' }, reason: 'Create project draft' };
  await assert.rejects(service.create(adminClaims(), create, context), error => error.code === 'PROJECT_FORBIDDEN');
  await assert.rejects(service.create(claims(provider, 'pending_review'), create, context), error => error.code === 'PROJECT_FORBIDDEN');
  await assert.rejects(fixture(true, false).service.create(claims(), create, context), error => error.code === 'PROJECT_FORBIDDEN');
});

test('project archive stores one atomic versioned change and audit before/after without deleting documents', async () => {
  let current = { ...record({ status: 'published', version: 3 }), _id: new Types.ObjectId(id), providerId: new Types.ObjectId(provider) };
  const audits: Array<Parameters<AuditWriter['record']>[0]> = [];
  const session = { withTransaction: async (run: (session?: unknown) => unknown) => run(), endSession: async () => undefined };
  const models = { Project: {
    async findOneAndUpdate(filter: { _id: string; version: number; status: unknown }, update: { $set: typeof current; $inc: { version: number } }) {
      assert.deepEqual(filter.status, { $ne: 'archived' });
      assert.equal(filter._id, id);
      if (current.status === 'archived' || current.version !== filter.version) return null;
      current = { ...current, ...update.$set, version: current.version + update.$inc.version };
      return current;
    },
    findById() { const query = { lean: () => query, session: async () => current }; return query; }
  } } as unknown as ProjectModels;
  const repository = createMongooseProjectRepository({ startSession: async () => session } as unknown as Connection, models, { record: async input => { audits.push(input); } } as AuditWriter);
  const input = { id, expectedVersion: 3, toStatus: 'archived' as const, reviewerId: admin, before: record({ status: 'published', version: 3 }), metadata: { actorId: admin, reason: 'Remove displayed project', requestId: 'archive-project', traceId: 'a'.repeat(32), changedAt: now } };
  const saved = await repository.review(input);
  assert.equal(saved.kind, 'written');
  assert.equal(current.status, 'archived');
  assert.equal(current.version, 4);
  assert.equal((await repository.review(input)).kind, 'version_conflict');
  assert.equal((await repository.review({ ...input, expectedVersion: 4 })).kind, 'invalid_state');
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.action, 'project.archive');
  assert.equal(audits[0]?.actorId, admin);
  assert.equal(audits[0]?.actorType, 'admin');
  assert.equal((audits[0]?.before as StoredProject).status, 'published');
  assert.equal((audits[0]?.after as StoredProject).status, 'archived');
});

test('administrators open and edit published projects without republishing and providers cannot overwrite them', async () => {
  const { service, rows } = fixture();
  rows.set(id, record({ status: 'published', organizationId: '6123456789abcdef01234567', version: 3 }));
  const detail = await service.adminGet(admin, id);
  assert.ok(detail.availableActions.includes('update'));
  assert.equal(detail.publicPath, '/developers/qa-developer#project-project');
  const input = { version: 3, reason: 'Administrative project edit', name: { en: 'Updated project' }, description: { en: 'Previewed description' }, slug: 'updated-project' };
  const context = { requestId: 'admin-project-edit', traceId: 'a'.repeat(32) };
  await assert.rejects(service.adminGet(other, id), error => error.code === 'PROJECT_FORBIDDEN');
  await assert.rejects(service.adminUpdate(other, id, input, context), error => error.code === 'PROJECT_FORBIDDEN');
  await assert.rejects(service.update(claims(), id, input, context), error => error.code === 'PROJECT_TRANSITION_INVALID');
  const saved = await service.adminUpdate(admin, id, input, context);
  assert.equal(saved.version, 4);
  assert.equal(saved.status, 'published');
  assert.equal(saved.name.en, input.name.en);
  assert.equal(saved.description.en, input.description.en);
  assert.equal(saved.publicPath, '/developers/qa-developer#project-updated-project');
  await assert.rejects(service.adminUpdate(admin, id, input, context), error => error.code === 'PROJECT_VERSION_CONFLICT');
  rows.set(id, record({ status: 'archived', version: 4 }));
  assert.ok(!(await service.adminGet(admin, id)).availableActions.includes('update'));
  await assert.rejects(service.adminUpdate(admin, id, { ...input, version: 4 }, context), error => error.code === 'PROJECT_TRANSITION_INVALID');
});

function record(overrides: Partial<StoredProject> = {}): StoredProject {
  return { id, providerId: provider, name: { en: 'Project' }, slug: 'project', status: 'draft', version: 0, createdAt: now, updatedAt: now, ...overrides };
}

function fixture(allowProjectView = true, canManageProjects = true, allowProjectReview = true) {
  const rows = new Map([[id, record()]]);
  const repository: ProjectRepository = {
    async publicPath(project) { return project.status === 'published' && project.organizationId ? `/developers/qa-developer#project-${project.slug}` : undefined; },
    async list(owner, query) {
      const items = [...rows.values()].filter(project => project.providerId === owner && (!query.status || project.status === query.status));
      return { items, total: items.length };
    },
    async listAll(query) {
      const items = [...rows.values()].filter(project => !query.status || project.status === query.status);
      return { items, total: items.length };
    },
    async findById(owner, target) { const project = rows.get(target); return project?.providerId === owner ? project : null; },
    async findByIdAny(target) { return rows.get(target) ?? null; },
    async create(input) {
      if ([...rows.values()].some(project => project.providerId === input.project.providerId && project.slug === input.project.slug)) return { kind: 'slug_conflict' };
      const project = record({ ...input.project, id: '4123456789abcdef01234567', version: 0, createdAt: input.metadata.changedAt, updatedAt: input.metadata.changedAt });
      rows.set(project.id, project);
      return { kind: 'written', project };
    },
    async update(input) {
      const project = rows.get(input.id);
      if (!project || project.providerId !== input.providerId) return { kind: 'not_found' };
      if (project.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const next = { ...project, ...input.changes, version: project.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(project.id, next);
      return { kind: 'written', project: next };
    },
    async submit(input) {
      const project = rows.get(input.id);
      if (!project || project.providerId !== input.providerId) return { kind: 'not_found' };
      if (project.version !== input.expectedVersion) return { kind: 'version_conflict' };
      if (!['draft', 'needs_changes'].includes(project.status)) return { kind: 'invalid_state' };
      const next = { ...project, status: 'pending_review' as const, submittedAt: input.metadata.changedAt, reviewedBy: undefined, reviewedAt: undefined, reviewReason: undefined, version: project.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(project.id, next);
      return { kind: 'written', project: next };
    },
    async review(input) {
      const project = rows.get(input.id);
      if (!project) return { kind: 'not_found' };
      if (project.version !== input.expectedVersion) return { kind: 'version_conflict' };
      if (input.toStatus === 'archived' ? project.status === 'archived' : input.toStatus === 'published' ? project.status !== 'approved' : project.status !== 'pending_review') return { kind: 'invalid_state' };
      const next = { ...project, status: input.toStatus, reviewedBy: input.reviewerId, reviewedAt: input.metadata.changedAt, reviewReason: input.metadata.reason, ...(input.toStatus === 'published' ? { publishedAt: input.metadata.changedAt } : {}), version: project.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(project.id, next);
      return { kind: 'written', project: next };
    }
  };
  return { service: createProjectService({ repository, providerPolicy: { canManageProjects: async () => canManageProjects }, authorization: { authorize: async (actor, permission) => actor === admin && ((allowProjectReview && permission === 'admin:projects.review') || (allowProjectView && permission === 'admin:projects.view')) }, now: () => now }), rows };
}

test('creates and lists only provider-owned localized drafts with safe projections', async () => {
  const fixtureData = fixture();
  const created = await fixtureData.service.create(claims(), { name: { en: 'New project' }, slug: 'new-project', description: { en: 'Description' }, reason: 'Create project draft' }, { requestId: 'project-1', traceId: 'a'.repeat(32) });
  assert.equal(created.status, 'draft');
  assert.equal(created.providerId, provider);
  assert.deepEqual((await fixtureData.service.list(claims(), { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' })).data.items.map(project => project.slug), ['project', 'new-project']);
  assert.equal('createdBy' in created, false);
  assert.equal('verified' in created, false);
});

test('rejects pending providers, cross-provider access, unknown fields, and stale updates', async () => {
  const fixtureData = fixture();
  await assert.rejects(fixtureData.service.list(claims(provider, 'pending_review'), { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' }), error => error instanceof ProjectServiceError && error.code === 'PROJECT_FORBIDDEN');
  await assert.rejects(fixtureData.service.update(claims(other), id, { version: 0, slug: 'other', reason: 'Cross provider update' }, { requestId: 'project-2', traceId: 'b'.repeat(32) }), error => error instanceof ProjectServiceError && error.code === 'PROJECT_NOT_FOUND');
  await assert.rejects(fixtureData.service.create(claims(), { name: { en: 'Invalid' }, slug: 'invalid', reason: 'Valid reason', extra: true } as never, { requestId: 'project-3', traceId: 'c'.repeat(32) }));
  await assert.rejects(fixtureData.service.update(claims(), id, { version: 9, slug: 'new-slug', reason: 'Stale project update' }, { requestId: 'project-4', traceId: 'd'.repeat(32) }), error => error instanceof ProjectServiceError && error.code === 'PROJECT_VERSION_CONFLICT');
});

test('allows projects only for approved developer-company providers', async () => {
  const service = fixture(true, false).service;
  await assert.rejects(
    service.create(claims(), { name: { en: 'Not allowed' }, slug: 'not-allowed', reason: 'Attempt project creation' }, { requestId: 'project-provider-type', traceId: '0'.repeat(32) }),
    error => error instanceof ProjectServiceError && error.code === 'PROJECT_FORBIDDEN'
  );
});

test('lists all projects for an authorized admin with review-safe projections', async () => {
  const fixtureData = fixture();
  fixtureData.rows.set('5123456789abcdef01234567', record({ id: '5123456789abcdef01234567', providerId: other, status: 'pending_review', reviewedBy: admin, reviewReason: 'Needs more details' }));
  const result = await fixtureData.service.listAdmin(adminClaims(), { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' });
  assert.equal(result.total, 2);
  assert.deepEqual(result.data.items.map(project => project.providerId), [provider, other]);
  assert.equal(result.data.items[1]?.availableActions.includes('approve'), true);
  assert.equal('audit' in (result.data.items[1] ?? {}), false);
  await assert.rejects(fixtureData.service.listAdmin(claims(), { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' }), error => error instanceof ProjectServiceError && error.code === 'PROJECT_FORBIDDEN');
  await assert.rejects(fixture(false).service.listAdmin(adminClaims(), { page: 1, limit: 20, sort: 'updatedAt', direction: 'desc' }), error => error instanceof ProjectServiceError && error.code === 'PROJECT_FORBIDDEN');
});

test('updates with optimistic version and rejects duplicate project slugs', async () => {
  const fixtureData = fixture();
  const updated = await fixtureData.service.update(claims(), id, { version: 0, name: { en: 'Updated project' }, locationId: '4123456789abcdef01234567', reason: 'Update project details' }, { requestId: 'project-5', traceId: 'e'.repeat(32) });
  assert.equal(updated.version, 1);
  assert.equal(updated.name.en, 'Updated project');
  const duplicate = await fixtureData.service.create(claims(), { name: { en: 'Duplicate' }, slug: 'project', reason: 'Attempt duplicate slug' }, { requestId: 'project-6', traceId: 'f'.repeat(32) }).catch(error => error);
  assert.equal(duplicate.code, 'PROJECT_SLUG_EXISTS');
});

test('submits, reviews, and publishes projects with reviewer evidence and state guards', async () => {
  const fixtureData = fixture();
  const submitted = await fixtureData.service.submit(claims(), id, { version: 0, reason: 'Submit project for review' }, { requestId: 'project-7', traceId: '1'.repeat(32) });
  assert.equal(submitted.status, 'pending_review');
  assert.equal(submitted.submittedAt, now.toISOString());
  const changes = await fixtureData.service.review(admin, id, { version: 1, action: 'needs_changes', reason: 'Add complete project details' }, { requestId: 'project-8', traceId: '2'.repeat(32) });
  assert.equal(changes.status, 'needs_changes');
  assert.equal(changes.reviewedBy, admin);
  const resubmitted = await fixtureData.service.submit(claims(), id, { version: 2, reason: 'Address review feedback' }, { requestId: 'project-9', traceId: '3'.repeat(32) });
  const approved = await fixtureData.service.review(admin, id, { version: 3, action: 'approve', reason: 'Project meets review requirements' }, { requestId: 'project-10', traceId: '4'.repeat(32) });
  assert.equal(resubmitted.status, 'pending_review');
  assert.equal(approved.status, 'approved');
  const published = await fixtureData.service.review(admin, id, { version: 4, action: 'publish', reason: 'Publish approved project' }, { requestId: 'project-11', traceId: '5'.repeat(32) });
  assert.equal(published.status, 'published');
  assert.equal(published.publishedAt, now.toISOString());
  await assert.rejects(fixtureData.service.review(admin, id, { version: 5, action: 'reject', reason: 'Invalid post-publication rejection' }, { requestId: 'project-12', traceId: '6'.repeat(32) }), error => error instanceof ProjectServiceError && error.code === 'PROJECT_TRANSITION_INVALID');
});

test('requires project review permission and optimistic version', async () => {
  const fixtureData = fixture();
  await fixtureData.service.submit(claims(), id, { version: 0, reason: 'Submit project for review' }, { requestId: 'project-13', traceId: '7'.repeat(32) });
  await assert.rejects(fixtureData.service.review(other, id, { version: 1, action: 'approve', reason: 'Unauthorized approval' }, { requestId: 'project-14', traceId: '8'.repeat(32) }), error => error instanceof ProjectServiceError && error.code === 'PROJECT_FORBIDDEN');
  await assert.rejects(fixtureData.service.review(admin, id, { version: 9, action: 'approve', reason: 'Stale approval' }, { requestId: 'project-15', traceId: '9'.repeat(32) }), error => error instanceof ProjectServiceError && error.code === 'PROJECT_VERSION_CONFLICT');
});

test('projects expose a published-only public projection with approved developer and published properties', () => {
  const developer = { id: '5123456789abcdef01234567', slug: 'trusted-developer', name: { en: 'Trusted Developer' } };
  const properties = [
    { id: '6123456789abcdef01234567', slug: 'zeta-home', name: { en: 'Zeta Home' }, active: true, status: 'published' as const },
    { id: '7123456789abcdef01234567', slug: 'draft-home', name: { en: 'Draft Home' }, active: true, status: 'published' as const },
    { id: '8123456789abcdef01234567', slug: 'hidden-home', name: { en: 'Hidden Home' }, active: false, status: 'published' as const }
  ];
  const projection = publicProjectProjection(record({ status: 'published', providerId: other, description: { en: 'Public description' } }), developer, properties);
  assert.equal('providerId' in (projection ?? {}), false);
  assert.deepEqual(projection?.linkedPublishedProperties.map(property => property.slug), ['draft-home', 'zeta-home']);
  assert.equal(publicProjectProjection(record({ status: 'approved' }), developer, properties), null);
  assert.equal(publicProjectProjection(record({ status: 'draft' }), developer, properties), null);
});
