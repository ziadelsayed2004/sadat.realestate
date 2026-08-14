import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { FavoriteRouterDependencies } from '../../src/modules/favorites/router.js';

const id = '0123456789abcdef01234567';
const seekerClaims = { role: 'seeker', status: 'verified', sub: '1123456789abcdef01234567', sid: '2123456789abcdef01234567' } as AccessTokenClaims;
const providerClaims = { ...seekerClaims, role: 'provider' } as AccessTokenClaims;
const tokens: AccessTokenService = { issue() { return 'token'; }, verify(token) { if (token === 'provider') return providerClaims; return seekerClaims; } };
const service: FavoriteRouterDependencies['service'] = { async list() { return { items: [], page: 1, limit: 20, total: 0 }; }, async save() { return { saved: true, alreadySaved: false, item: { id, slug: 'saved-property', kind: 'property', name: { en: 'Property' }, transactionType: 'sale', savedAt: '2026-01-01T00:00:00.000Z' } }; }, async remove() { return { removed: true }; } };

test('favorites require seeker authentication and support idempotent mutation routes', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, favorites: { service, accessTokens: tokens } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/seeker/favorites`)).status, 401);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/seeker/favorites`, { headers: { authorization: 'Bearer provider' } })).status, 403);
    const list = await fetch(`http://127.0.0.1:${address.port}/api/v1/seeker/favorites`, { headers: { authorization: 'Bearer seeker' } });
    assert.equal(list.status, 200);
    const save = await fetch(`http://127.0.0.1:${address.port}/api/v1/seeker/favorites/${id}`, { method: 'PUT', headers: { authorization: 'Bearer seeker' } });
    assert.equal(save.status, 200);
    assert.equal((await save.json() as { data: { saved: boolean } }).data.saved, true);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/v1/seeker/favorites/BAD`, { method: 'DELETE', headers: { authorization: 'Bearer seeker' } })).status, 400);
  } finally { await stopApiServer(server); }
});
