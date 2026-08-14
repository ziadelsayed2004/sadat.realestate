import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import type { ProjectRepository, StoredProject } from '../../src/modules/projects/repository.js';
import { createProjectService, ProjectServiceError, publicProjectProjection } from '../../src/modules/projects/service.js';

const provider = '0123456789abcdef01234567';
const other = '1123456789abcdef01234567';
const admin = '3123456789abcdef01234567';
const id = '2123456789abcdef01234567';
const now = new Date('2026-08-14T08:00:00.000Z');
const claims = (sub = provider, status: 'verified' | 'pending_review' = 'verified') => ({ sub, role: 'provider', status, iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sid: '4123456789abcdef01234567', iat: 1, exp: 2, jti: 'j' } as AccessTokenClaims);

function record(overrides: Partial<StoredProject> = {}): StoredProject {
  return { id, providerId: provider, name: { en: 'Project' }, slug: 'project', status: 'draft', version: 0, createdAt: now, updatedAt: now, ...overrides };
}

function fixture() {
  const rows = new Map([[id, record()]]);
  const repository: ProjectRepository = {
    async list(owner, query) {
      const items = [...rows.values()].filter(project => project.providerId === owner && (!query.status || project.status === query.status));
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
      if (input.toStatus === 'published' ? project.status !== 'approved' : project.status !== 'pending_review') return { kind: 'invalid_state' };
      const next = { ...project, status: input.toStatus, reviewedBy: input.reviewerId, reviewedAt: input.metadata.changedAt, reviewReason: input.metadata.reason, ...(input.toStatus === 'published' ? { publishedAt: input.metadata.changedAt } : {}), version: project.version + 1, updatedAt: input.metadata.changedAt };
      rows.set(project.id, next);
      return { kind: 'written', project: next };
    }
  };
  return { service: createProjectService({ repository, authorization: { authorize: async actor => actor === admin }, now: () => now }), rows };
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
