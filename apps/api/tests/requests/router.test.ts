import assert from 'node:assert/strict';
import test from 'node:test';
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
    assert.equal(created.status, 400); const ok = await fetch(`${base}/api/v1/seeker/contact-requests`, { method: 'POST', headers: { authorization: 'Bearer seeker', 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hello' }) }); assert.equal(ok.status, 201); assert.deepEqual(Object.keys((await ok.json() as { data: Record<string, unknown> }).data).sort(), ['status']);
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
