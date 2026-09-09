import assert from 'node:assert/strict';
import test from 'node:test';
import { registerAdminPrivacySecurityPolicy } from '../../src/modules/rbac/auth.js';
import { DEFAULT_PRIVACY_SECURITY_RUNTIME_SETTINGS } from '../../src/modules/settings/privacy-security-policy.js';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { createInMemoryViewingRepository, createViewingService } from '../../src/modules/viewings/service.js';
const tokens: AccessTokenService = { issue: () => 'x', verify(token) { const role = token === 'provider' ? 'provider' : 'seeker'; return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: '1123456789abcdef01234567', role, status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims; } };
test('viewing routes enforce authentication and future appointment validation', async () => { const server = createApiServer({ database: { isReady: async () => true }, viewings: { accessTokens: tokens, service: createViewingService({ repository: createInMemoryViewingRepository(), now: () => new Date('2026-08-14T10:00:00.000Z') }) } }); const address = await startApiServer(server, { host: '127.0.0.1', port: 0 }); const base = `http://127.0.0.1:${address.port}`; try { assert.equal((await fetch(`${base}/api/v1/seeker/viewings`)).status, 401); const invalid = await fetch(`${base}/api/v1/seeker/viewings`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ propertyId: '3123456789abcdef01234567', requestedAt: '2020-01-01T00:00:00.000Z', timezone: 'UTC' }) }); assert.equal(invalid.status, 409); const ok = await fetch(`${base}/api/v1/seeker/viewings`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ propertyId: '3123456789abcdef01234567', requestedAt: '2026-08-15T10:00:00.000Z', timezone: 'UTC' }) }); assert.equal(ok.status, 201); } finally { await stopApiServer(server); } });

test('admin viewing list enforces current permissions, session expiry and MFA', async () => {
  let allowed = false;
  let mfa = false;
  let timeout = false;
  let permissionChecks = 0;
  const adminTokens: AccessTokenService = { issue: () => 'unused', verify: () => ({ ...tokens.verify('seeker'), role: 'admin' }) };
  registerAdminPrivacySecurityPolicy(adminTokens, { read: async () => ({ ...DEFAULT_PRIVACY_SECURITY_RUNTIME_SETTINGS,
    twoFactorAuthentication: mfa, ...(timeout ? { adminSessionTimeoutMinutes: 10 } : {}) }) });
  const service = createViewingService({ repository: createInMemoryViewingRepository(), authorization: { async authorize(id, permission) {
    assert.equal(id, tokens.verify('seeker').sub);
    assert.equal(permission, 'admin:viewings.view');
    permissionChecks++;
    return allowed;
  } } });
  const server = createApiServer({ database: { isReady: async () => true }, viewings: { accessTokens: adminTokens, service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const url = `http://127.0.0.1:${address.port}/api/v1/admin/viewings`;
  const headers = { authorization: 'Bearer admin' };
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers })).status, 403);
    allowed = true;
    assert.equal((await fetch(url, { headers })).status, 200);
    allowed = false;
    assert.equal((await fetch(url, { headers })).status, 403);
    const checked = permissionChecks;
    mfa = true;
    assert.equal((await fetch(url, { headers })).status, 401);
    mfa = false;
    timeout = true;
    assert.equal((await fetch(url, { headers })).status, 401);
    assert.equal(permissionChecks, checked);
  } finally { await stopApiServer(server); }
});

test('admin viewing service fails closed without RBAC and view permission never authorizes decisions', async () => {
  const admin = { ...tokens.verify('seeker'), role: 'admin' as const };
  const repository = createInMemoryViewingRepository();
  await assert.rejects(() => createViewingService({ repository }).list(admin, {}), /VIEWING_FORBIDDEN/);
  const service = createViewingService({ repository, authorization: { authorize: async () => true } });
  await assert.rejects(() => service.transition(admin, '3123456789abcdef01234567', { action: 'confirm', expectedVersion: 0 }), /VIEWING_FORBIDDEN/);
  const inactive = createViewingService({ repository: { ...repository, isActiveAccount: async () => false } });
  await assert.rejects(() => inactive.list(tokens.verify('seeker'), {}), /VIEWING_FORBIDDEN/);
});
