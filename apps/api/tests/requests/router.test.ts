import assert from 'node:assert/strict';
import test from 'node:test';
import type { RbacPermission } from '@sadat-real-estate/contracts';
import { registerAdminPrivacySecurityPolicy } from '../../src/modules/rbac/auth.js';
import { DEFAULT_PRIVACY_SECURITY_RUNTIME_SETTINGS } from '../../src/modules/settings/privacy-security-policy.js';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { createInMemoryRequestRepository, createRequestService } from '../../src/modules/requests/service.js';

const tokens: AccessTokenService = { issue: () => 'x', verify(token) { const role = token === 'provider' ? 'provider' : token === 'admin' ? 'admin' : 'seeker'; return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: '1123456789abcdef01234567', role, status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims; } };

test('request routes enforce role, validate payload, and return safe acknowledgements', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, requests: { accessTokens: tokens, service: createRequestService({ repository: createInMemoryRequestRepository() }) } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 }); const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${base}/api/v1/seeker/contact-requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hello' }) })).status, 401);
    const created = await fetch(`${base}/api/v1/seeker/contact-requests`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hello', status: 'resolved' }) });
    assert.equal(created.status, 400); const ok = await fetch(`${base}/api/v1/seeker/contact-requests`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hello', fullName: 'Example Seeker', phone: '+201001234567', preferredContactTime: 'morning' }) }); assert.equal(ok.status, 201); const okBody = await ok.json() as { data: Record<string, unknown> }; assert.equal(okBody.data.type, 'contact'); assert.equal(okBody.data.source, 'seeker'); assert.deepEqual(okBody.data.payload, { message: 'hello', fullName: 'Example Seeker', phone: '+201001234567', preferredContactTime: 'morning' });
    for (let attempt = 0; attempt < 4; attempt += 1) { const response = await fetch(`${base}/api/v1/seeker/contact-requests`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ message: `hello-${attempt}` }) }); assert.equal(response.status, 201); }
    const limited = await fetch(`${base}/api/v1/seeker/contact-requests`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'rate limited' }) }); assert.equal(limited.status, 429);
  } finally { await stopApiServer(server); }
});

test('provider customer request route enforces provider role and explicit source attribution', async () => {
  const server = createApiServer({ database: { isReady: async () => true }, requests: { accessTokens: tokens, service: createRequestService({ repository: createInMemoryRequestRepository() }) } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 }); const base = `http://127.0.0.1:${address.port}`;
  try {
    const forbidden = await fetch(`${base}/api/v1/provider/customer-requests`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ firstName: 'Mona', lastName: 'Hassan', phone: '+201000000000' }) });
    assert.equal(forbidden.status, 403);
    const created = await fetch(`${base}/api/v1/provider/customer-requests`, { method: 'POST', headers: { authorization: 'Bearer provider', 'content-type': 'application/json' }, body: JSON.stringify({ firstName: 'Mona', lastName: 'Hassan', phone: '+201000000000', sourceNote: 'showroom' }) });
    assert.equal(created.status, 201);
    const body = await created.json() as { data: Record<string, unknown> };
    assert.equal(body.data.source, 'provider');
    assert.equal(body.data.providerId, '0123456789abcdef01234567');
    assert.equal('seekerId' in body.data, false);
  } finally { await stopApiServer(server); }
});

test('seeker can cancel only an owned request through the versioned transition route', async () => {
  const repository = createInMemoryRequestRepository();
  const service = createRequestService({ repository });
  const seekerClaims = tokens.verify('seeker');
  const request = await service.create(seekerClaims, { type: 'property_search', payload: { locations: [], propertyTypes: ['apartment'] } });
  const server = createApiServer({ database: { isReady: async () => true }, requests: { accessTokens: tokens, service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 }); const base = `http://127.0.0.1:${address.port}`;
  try {
    const forbidden = await fetch(`${base}/api/v1/seeker/requests/${request.id}/transitions`, { method: 'POST', headers: { authorization: 'Bearer provider', 'content-type': 'application/json' }, body: JSON.stringify({ transition: 'cancel', reason: 'No longer needed', expectedVersion: 0 }) });
    assert.equal(forbidden.status, 403);
    const invalid = await fetch(`${base}/api/v1/seeker/requests/${request.id}/transitions`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ transition: 'contact', expectedVersion: 0 }) });
    assert.equal(invalid.status, 409);
    const cancelled = await fetch(`${base}/api/v1/seeker/requests/${request.id}/transitions`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ transition: 'cancel', reason: 'No longer needed', expectedVersion: 0 }) });
    assert.equal(cancelled.status, 200);
    const body = await cancelled.json() as { data: { status: string; availableActions: string[] } };
    assert.equal(body.data.status, 'cancelled');
    assert.deepEqual(body.data.availableActions, []);
  } finally { await stopApiServer(server); }
});

const adminOperations = [
  { method: 'GET', suffix: '', permission: 'admin:requests.view' },
  { method: 'GET', suffix: '/overdue', permission: 'admin:requests.view' },
  { method: 'GET', suffix: '/4123456789abcdef01234567', permission: 'admin:requests.view' },
  { method: 'POST', suffix: '/4123456789abcdef01234567/assign', permission: 'admin:requests.assign' },
  { method: 'POST', suffix: '/4123456789abcdef01234567/notes', permission: 'admin:requests.notes' },
  { method: 'POST', suffix: '/4123456789abcdef01234567/transitions', permission: 'admin:requests.manage' }
] as const;

test('every admin request operation requires its own current RBAC permission before reading or writing', async () => {
  const checked: RbacPermission[] = [];
  let allowed: RbacPermission | undefined;
  const service = createRequestService({ repository: createInMemoryRequestRepository(), authorization: {
    async authorize(id, permission) {
      assert.equal(id, tokens.verify('admin').sub);
      checked.push(permission);
      return permission === allowed;
    }
  } });
  const server = createApiServer({ database: { isReady: async () => true }, requests: { accessTokens: tokens, service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    for (const operation of adminOperations) {
      const url = `http://127.0.0.1:${address.port}/api/v1/admin/requests${operation.suffix}`;
      const body = operation.suffix.endsWith('/notes') ? { body: 'Review note', expectedVersion: 0 }
        : operation.suffix.endsWith('/transitions') ? { transition: 'start_review', reason: 'Review request', expectedVersion: 0 }
        : { assigneeId: '5123456789abcdef01234567', reason: 'Assign review', expectedVersion: 0 };
      const options = { method: operation.method, headers: { authorization: 'Bearer admin', 'content-type': 'application/json' },
        ...(operation.method === 'POST' ? { body: JSON.stringify(body) } : {}) };
      allowed = undefined;
      assert.equal((await fetch(url, options)).status, 403, operation.suffix);
      assert.equal(checked.at(-1), operation.permission);
      allowed = operation.permission;
      assert.equal((await fetch(url, options)).status, operation.suffix === '' || operation.suffix === '/overdue' ? 200 : 404);
      // Revocation takes effect even while the same verified access token remains valid.
      allowed = undefined;
      assert.equal((await fetch(url, options)).status, 403);
    }
  } finally { await stopApiServer(server); }
});

test('admin request service fails closed without an authorization provider', async () => {
  const service = createRequestService({ repository: createInMemoryRequestRepository() });
  for (const action of [
    () => service.list(tokens.verify('admin'), {}),
    () => service.overdue(tokens.verify('admin'), {}),
    () => service.get(tokens.verify('admin'), '4123456789abcdef01234567'),
    () => service.assign(tokens.verify('admin'), '4123456789abcdef01234567', {}),
    () => service.addNote(tokens.verify('admin'), '4123456789abcdef01234567', {}),
    () => service.transition(tokens.verify('admin'), '4123456789abcdef01234567', {})
  ]) await assert.rejects(action, /REQUEST_FORBIDDEN/);
});

test('all admin request routes enforce session timeout and MFA before RBAC or payload processing', async () => {
  const protectedTokens: AccessTokenService = { ...tokens, verify: tokens.verify };
  let twoFactorAuthentication = false;
  registerAdminPrivacySecurityPolicy(protectedTokens, { read: async () => ({
    ...DEFAULT_PRIVACY_SECURITY_RUNTIME_SETTINGS, twoFactorAuthentication,
    ...(!twoFactorAuthentication ? { adminSessionTimeoutMinutes: 10 } : {})
  }) });
  const service = createRequestService({ repository: createInMemoryRequestRepository(), authorization: {
    authorize: async () => { assert.fail('Expired or non-MFA sessions must not reach authorization'); }
  } });
  const server = createApiServer({ database: { isReady: async () => true }, requests: { accessTokens: protectedTokens, service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    for (const requireMfa of [false, true]) {
      twoFactorAuthentication = requireMfa;
      for (const operation of adminOperations) {
        const url = `http://127.0.0.1:${address.port}/api/v1/admin/requests${operation.suffix}`;
        assert.equal((await fetch(url, { method: operation.method, headers: { authorization: 'Bearer admin' } })).status, 401);
      }
    }
  } finally { await stopApiServer(server); }
});
