import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminToken = 'admin.settings.token';
const providerToken = 'provider.settings.token';
const accessTokens: AccessTokenService = {
  issue: () => adminToken,
  verify(value) {
    if (value === providerToken) return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef', role: 'provider', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' };
    if (value !== adminToken) throw new Error('invalid');
    return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef', role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' };
  }
};

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const settings = {
    accessTokens,
    service: {
      async get() { return { namespace: 'display' as const, schemaVersion: 1, values: { show_map: true }, version: 0, updatedBy: '0123456789abcdef01234567', updatedAt: '2026-08-01T00:00:00.000Z' }; },
      async update(_claims: unknown, namespace: unknown, input: unknown) { return { namespace: String(namespace) as 'display', schemaVersion: (input as { schemaVersion: number }).schemaVersion, values: (input as { values: Record<string, unknown> }).values, version: 1, updatedBy: '0123456789abcdef01234567', updatedAt: '2026-08-02T00:00:00.000Z' }; }
    }
  };
  const server = createApiServer({ database: { isReady: async () => true }, settings });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await run(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); }
}

test('protects unified settings routes and validates namespace and payload', async () => {
  await withServer(async baseUrl => {
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/settings/display`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/settings/display`, { headers: { authorization: `Bearer ${providerToken}` } })).status, 403);
    const read = await fetch(`${baseUrl}/api/v1/admin/settings/display`, { headers: { authorization: `Bearer ${adminToken}` } });
    assert.equal(read.status, 200);
    assert.equal((await read.json() as { data: { namespace: string } }).data.namespace, 'display');
    const write = await fetch(`${baseUrl}/api/v1/admin/settings/display`, { method: 'PUT', headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ schemaVersion: 1, values: { show_map: false }, expectedVersion: 0, reason: 'Update display' }) });
    assert.equal(write.status, 200);
    assert.equal((await write.json() as { data: { values: { show_map: boolean } } }).data.values.show_map, false);
    const unknownNamespace = await fetch(`${baseUrl}/api/v1/admin/settings/unknown`, { headers: { authorization: `Bearer ${adminToken}` } });
    assert.equal(unknownNamespace.status, 400);
    const unknownField = await fetch(`${baseUrl}/api/v1/admin/settings/display`, { method: 'PUT', headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ schemaVersion: 1, values: {}, expectedVersion: 0, reason: 'Update display', secret: 'x' }) });
    assert.equal(unknownField.status, 400);
  });
});
