import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { ProjectRouterDependencies } from '../../src/modules/projects/router.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const provider = '0123456789abcdef01234567';
const projectId = '2123456789abcdef01234567';
const project = { id: projectId, providerId: provider, name: { en: 'Project' }, slug: 'project', status: 'draft' as const, version: 0, createdAt: '2026-08-14T08:00:00.000Z', updatedAt: '2026-08-14T08:00:00.000Z', availableActions: ['update', 'submit'] as ('update' | 'submit')[] };
const tokens: AccessTokenService = {
  issue() { return 'x'; },
  verify(token) {
    if (token === 'bad') throw Error('bad');
    return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: token === 'admin' ? '3123456789abcdef01234567' : provider, sid: '4123456789abcdef01234567', role: token === 'admin' ? 'admin' : 'provider', status: token === 'pending' ? 'pending_review' : 'verified', iat: 1, exp: 2, jti: 'j' } as AccessTokenClaims;
  }
};
const service: ProjectRouterDependencies['service'] = {
  async list() { return { data: { items: [project] }, page: 1, limit: 20, total: 1 }; },
  async listAdmin() { return { data: { items: [{ ...project, availableActions: ['approve' as const] }] }, page: 1, limit: 20, total: 1 }; },
  async create() { return project; },
  async update() { return project; },
  async submit() { return { ...project, status: 'pending_review' as const, availableActions: [] }; },
  async review(_adminId, _id, input) { return { ...project, status: input.action === 'approve' ? 'approved' as const : input.action === 'publish' ? 'published' as const : input.action === 'reject' ? 'rejected' as const : 'needs_changes' as const, availableActions: [] }; }
};

async function run(fn: (url: string) => Promise<void>): Promise<void> {
  const server = createApiServer({ database: { isReady: async () => true }, projects: { service, accessTokens: tokens } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await fn(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); }
}

const request = (url: string, method: string, path: string, token: string, body?: unknown) => fetch(url + path, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test('project routes require provider/admin authentication and reject unauthorized roles', async () => run(async url => {
  assert.equal((await fetch(url + '/api/v1/provider/projects')).status, 401);
  assert.equal((await request(url, 'GET', '/api/v1/provider/projects', 'admin')).status, 403);
  assert.equal((await request(url, 'GET', '/api/v1/provider/projects', 'pending')).status, 403);
  assert.equal((await request(url, 'POST', `/api/v1/provider/projects/${projectId}/submit`, 'admin', { version: 0, reason: 'Submit project' })).status, 403);
  assert.equal((await request(url, 'POST', `/api/v1/admin/projects/${projectId}/review`, 'provider', { version: 0, action: 'approve', reason: 'Approve project' })).status, 403);
  assert.equal((await request(url, 'GET', '/api/v1/admin/projects', 'provider')).status, 403);
  assert.equal((await request(url, 'GET', '/api/v1/admin/projects', 'admin')).status, 200);
  assert.equal((await request(url, 'GET', '/api/v1/provider/projects?limit=101', 'provider')).status, 400);
}));

test('project routes expose strict CRUD, submit, and review envelopes', async () => run(async url => {
  assert.equal((await request(url, 'GET', '/api/v1/provider/projects', 'provider')).status, 200);
  assert.equal((await request(url, 'GET', '/api/v1/admin/projects?page=1&limit=20', 'admin')).status, 200);
  assert.equal((await request(url, 'POST', '/api/v1/provider/projects', 'provider', { name: { en: 'Project' }, slug: 'project', reason: 'Create project' })).status, 201);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/projects/${projectId}`, 'provider', { version: 0, name: { en: 'Updated' }, reason: 'Update project' })).status, 200);
  assert.equal((await request(url, 'POST', `/api/v1/provider/projects/${projectId}/submit`, 'provider', { version: 0, reason: 'Submit project for review' })).status, 200);
  assert.equal((await request(url, 'POST', `/api/v1/admin/projects/${projectId}/review`, 'admin', { version: 1, action: 'approve', reason: 'Approve project review' })).status, 200);
  assert.equal((await request(url, 'POST', '/api/v1/provider/projects', 'provider', { name: { en: 'Project' }, slug: 'project', reason: 'Create project', extra: true })).status, 400);
  assert.equal((await request(url, 'POST', `/api/v1/admin/projects/${projectId}/review`, 'admin', { version: 1, action: 'approve', reason: 'no' })).status, 400);
  assert.equal((await request(url, 'GET', '/api/v1/admin/projects?limit=101', 'admin')).status, 400);
}));
