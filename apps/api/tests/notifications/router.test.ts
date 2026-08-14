import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const token = 'header.payload.signature';
const accessTokens: AccessTokenService = {
  issue: () => token,
  verify(value) {
    if (value === 'provider') return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef', role: 'provider', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' };
    if (value !== token) throw new Error('invalid');
    return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef', role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' };
  }
};
async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = createApiServer({
    database: { isReady: async () => true },
    notifications: {
      accessTokens,
      service: {
        async list() { return { items: [{ id: 'abcdefabcdefabcdefabcdef', type: 'system', title: { en: 'Welcome' }, readAt: null, createdAt: '2026-08-01T00:00:00.000Z' }], unreadCount: 1, page: 1, limit: 20, total: 1 }; },
        async markRead(_claims, id) { return { id: String(id), readAt: '2026-08-02T00:00:00.000Z' }; },
        async markAllRead() { return { updatedCount: 1 }; }
      }
    }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); }
}

test('requires seeker authentication and serves inbox/read transitions', async () => {
  await withServer(async baseUrl => {
    assert.equal((await fetch(`${baseUrl}/api/v1/seeker/notifications`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/seeker/notifications`, { headers: { authorization: 'Bearer provider' } })).status, 403);
    const list = await fetch(`${baseUrl}/api/v1/seeker/notifications?unreadOnly=true`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(list.status, 200);
    assert.equal((await list.json() as { data: { unreadCount: number } }).data.unreadCount, 1);
    const read = await fetch(`${baseUrl}/api/v1/seeker/notifications/abcdefabcdefabcdefabcdef/read`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    assert.equal(read.status, 200);
    const all = await fetch(`${baseUrl}/api/v1/seeker/notifications/read-all`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    assert.equal(all.status, 200);
    assert.equal((await all.json() as { data: { updatedCount: number } }).data.updatedCount, 1);
  });
});

test('rejects unknown notification query fields', async () => {
  await withServer(async baseUrl => {
    const unknown = await fetch(`${baseUrl}/api/v1/seeker/notifications?extra=true`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(unknown.status, 400);
  });
});
