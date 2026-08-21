import assert from 'node:assert/strict';
import test from 'node:test';
import { cmsAdminAboutBlockPutSchema } from '@sadat-real-estate/contracts';
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
