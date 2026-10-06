import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { cmsAdminAboutBlockPutSchema, cmsAdminTeamMemberDeleteSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { CmsAdminContentService } from '../../src/modules/cms/admin-content-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';

function claims(role: 'admin' | 'seeker'): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: adminId,
    sid: '1123456789abcdef01234567', role, status: 'verified', iat: 1, exp: 9_999_999_999, jti: 'cms-router'
  };
}

function accessTokens(): AccessTokenService {
  return {
    issue() { return 'unused'; },
    verify(token) {
      if (token === 'admin-token') return claims('admin');
      if (token === 'seeker-token') return claims('seeker');
      throw new Error('invalid');
    }
  };
}

function service(): CmsAdminContentService {
  return {
    async deleteTeam(principal, input) {
      assert.equal(principal.userId, adminId);
      cmsAdminTeamMemberDeleteSchema.parse(input);
      return { namespace: 'team', items: [] };
    },
    async get(principal, namespace) {
      assert.equal(principal.userId, adminId);
      return namespace === 'about'
        ? { namespace, items: [] }
        : namespace === 'team'
          ? { namespace, items: [] }
          : { namespace, items: [] };
    },
    async put(principal, namespace, input) {
      assert.equal(principal.userId, adminId);
      if (namespace === 'about') cmsAdminAboutBlockPutSchema.parse(input);
      return namespace === 'about'
        ? { namespace, items: [] }
        : namespace === 'team'
          ? { namespace, items: [] }
          : { namespace, items: [] };
    }
  };
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    cmsAdminContent: { accessTokens: accessTokens(), service: service() }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); }
}

test('protects the team upload and preview routes and streams published public portraits', async () => {
  const assetId = 'd'.repeat(24); let uploads = 0;
  const server = createApiServer({ database: { isReady: async () => true }, cmsAdminContent: {
    accessTokens: accessTokens(), service: service(), photos: {
      async validateAttach() {},
      async upload(actor, source, mime) { assert.equal(actor.role, 'admin'); assert.equal(mime, 'image/png'); let bytes = 0; for await (const chunk of source) bytes += chunk.length; assert.equal(bytes, 3); uploads += 1; return { id: assetId, imageUrl: `/api/v1/public/team-photos/${assetId}` }; },
      async open(id, actor) { assert.equal(id, assetId); if (actor) assert.equal(actor.role, 'admin'); return { mime: 'image/webp', stream: Readable.from('photo') }; }
    }
  } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 }); const base = `http://127.0.0.1:${address.port}/api/v1`;
  try {
    const url = `${base}/admin/content/team/photos`;
    assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'image/png' }, body: 'png' })).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { authorization: 'Bearer seeker-token', 'content-type': 'image/png' }, body: 'png' })).status, 403);
    const uploaded = await fetch(url, { method: 'POST', headers: { authorization: 'Bearer admin-token', 'content-type': 'image/png' }, body: 'png' });
    assert.equal(uploaded.status, 201); assert.equal(uploads, 1);
    assert.equal((await fetch(`${url}/${assetId}`)).status, 401);
    const preview = await fetch(`${url}/${assetId}`, { headers: { authorization: 'Bearer admin-token' } }); assert.equal(await preview.text(), 'photo');
    const publicPhoto = await fetch(`${base}/public/team-photos/${assetId}`); assert.equal(publicPhoto.headers.get('content-type'), 'image/webp'); assert.equal(publicPhoto.headers.get('x-content-type-options'), 'nosniff'); assert.equal(publicPhoto.headers.get('cache-control'), 'no-store'); assert.equal(await publicPhoto.text(), 'photo');
  } finally { await stopApiServer(server); }
});

test('protects and validates team deletion', async () => {
  await withServer(async baseUrl => {
    const route = `${baseUrl}/api/v1/admin/content/team`;
    const body = JSON.stringify({ id: adminId, version: 1, reason: 'Member left the team' });
    assert.equal((await fetch(route, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body })).status, 401);
    assert.equal((await fetch(route, { method: 'DELETE', headers: { authorization: 'Bearer seeker-token', 'content-type': 'application/json' }, body })).status, 403);
    const headers = { authorization: 'Bearer admin-token', 'content-type': 'application/json' };
    assert.equal((await fetch(route, { method: 'DELETE', headers, body: JSON.stringify({ id: adminId, version: 1, reason: 'x' }) })).status, 400);
    const response = await fetch(route, { method: 'DELETE', headers, body });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await response.json() as { data: unknown }).data, { namespace: 'team', items: [] });
  });
});

test('protects CMS namespaces with admin authentication and rejects unknown fields', async () => {
  await withServer(async baseUrl => {
    const route = `${baseUrl}/api/v1/admin/content/about`;
    assert.equal((await fetch(route)).status, 401);
    assert.equal((await fetch(route, { headers: { authorization: 'Bearer seeker-token' } })).status, 403);
    const response = await fetch(route, { headers: { authorization: 'Bearer admin-token', 'x-request-id': 'cms-router-1' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as { data?: { namespace?: string }; meta?: { requestId?: string } };
    assert.equal(body.data?.namespace, 'about');
    assert.equal(body.meta?.requestId, 'cms-router-1');
    const tips = await fetch(`${baseUrl}/api/v1/admin/content/tips`, { headers: { authorization: 'Bearer admin-token' } });
    assert.equal(tips.status, 200);
    assert.equal((await tips.json() as { data?: { namespace?: string } }).data?.namespace, 'tips');
    const homepage = await fetch(`${baseUrl}/api/v1/admin/content/homepage`, { headers: { authorization: 'Bearer admin-token' } });
    assert.equal(homepage.status, 200);
    assert.equal((await homepage.json() as { data?: { namespace?: string } }).data?.namespace, 'homepage');
    const display = await fetch(`${baseUrl}/api/v1/admin/content/display`, { headers: { authorization: 'Bearer admin-token' } });
    assert.equal(display.status, 200);
    assert.equal((await display.json() as { data?: { namespace?: string } }).data?.namespace, 'display');
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/content/unknown`, { headers: { authorization: 'Bearer admin-token' } })).status, 400);
    assert.equal((await fetch(route, {
      method: 'PUT', headers: { authorization: 'Bearer admin-token', 'content-type': 'application/json' },
      body: JSON.stringify({ unknown: true })
    })).status, 400);
  });
});
