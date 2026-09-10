import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { SessionManagementError, type SessionManagementService } from '../../src/modules/auth/session-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const userId = '0123456789abcdef01234567';
const currentSessionId = '1123456789abcdef01234567';
const otherSessionId = '2123456789abcdef01234567';

function accessTokens(): AccessTokenService {
  return {
    issue() { return 'unused'; },
    verify(token) {
      const role = token === 'provider-token' ? 'provider' : token === 'admin-token' ? 'admin' : 'seeker';
      const status = token === 'restricted-token' ? 'restricted' : token === 'unverified-token' ? 'unverified' : 'verified';
      if (!token.endsWith('-token')) throw new Error('invalid');
      return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: userId, sid: currentSessionId, role, status, iat: 1, exp: 9999999999, jti: 'test' } satisfies AccessTokenClaims;
    }
  };
}

function service(): SessionManagementService {
  return {
    async list(principal) {
      return { items: [{ id: principal.sessionId, current: true, authenticationMethod: 'mfa', createdAt: '2026-09-10T00:00:00.000Z', lastUsedAt: null, expiresAt: '2026-10-10T00:00:00.000Z' }] };
    },
    async revoke(_principal, sessionId) {
      if (sessionId === '3123456789abcdef01234567') throw new SessionManagementError('SESSION_NOT_FOUND');
      if (sessionId === currentSessionId) throw new SessionManagementError('CURRENT_SESSION_LOGOUT_REQUIRED');
      return { sessionId: String(sessionId), revoked: true };
    }
  };
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({ database: { isReady: async () => true }, sessionManagement: { accessTokens: accessTokens(), service: service() } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); }
}

test('lists sessions for every verified account role without exposing session secrets', async () => {
  await withServer(async baseUrl => {
    assert.equal((await fetch(`${baseUrl}/api/v1/me/sessions`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/me/sessions`, { headers: { authorization: 'Bearer invalid' } })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/me/sessions`, { headers: { authorization: 'Bearer restricted-token' } })).status, 403);
    for (const token of ['seeker-token', 'provider-token', 'admin-token', 'unverified-token']) {
      const response = await fetch(`${baseUrl}/api/v1/me/sessions`, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = await response.json() as { data: { items: unknown[] } };
      assert.equal(body.data.items.length, 1);
      assert.doesNotMatch(JSON.stringify(body), /tokenHash|accessToken|refreshToken/u);
    }
  });
});

test('revokes an owned non-current session and preserves safe 404/409 boundaries', async () => {
  await withServer(async baseUrl => {
    const options = { method: 'DELETE', headers: { authorization: 'Bearer seeker-token' } } as const;
    assert.equal((await fetch(`${baseUrl}/api/v1/me/sessions/${otherSessionId}`, options)).status, 200);
    const missing = await fetch(`${baseUrl}/api/v1/me/sessions/3123456789abcdef01234567`, options);
    assert.equal(missing.status, 404);
    assert.equal(((await missing.json()) as { error: { code: string } }).error.code, 'SESSION_NOT_FOUND');
    const current = await fetch(`${baseUrl}/api/v1/me/sessions/${currentSessionId}`, options);
    assert.equal(current.status, 409);
    assert.equal(((await current.json()) as { error: { code: string } }).error.code, 'CURRENT_SESSION_LOGOUT_REQUIRED');
  });
});
