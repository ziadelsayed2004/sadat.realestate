import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { PropertyRouterDependencies } from '../../src/modules/properties/router.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const provider = '0123456789abcdef01234567';
const propertyId = '2123456789abcdef01234567';
const property = { id: propertyId, kind: 'property' as const, name: { en: 'Apartment' }, slug: 'apartment', transactionType: 'sale' as const, source: { providerId: provider, sourceType: 'individual_broker' as const }, status: 'draft' as const, active: true, version: 0, createdAt: '2026-08-14T08:00:00.000Z', updatedAt: '2026-08-14T08:00:00.000Z' };
const tokens: AccessTokenService = {
  issue() { return 'x'; },
  verify(token) { return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: provider, sid: '4123456789abcdef01234567', role: token === 'admin' ? 'admin' : 'provider', status: token === 'pending' ? 'pending_review' : 'verified', iat: 1, exp: 2, jti: 'j' } as AccessTokenClaims; }
};
const service: PropertyRouterDependencies['service'] = {
  async list() { return { data: { items: [{ ...property, availableActions: ['update', 'submit'] as const }] }, page: 1, limit: 20, total: 1 }; },
  async adminList() { return { data: { items: [{ ...property, availableActions: ['archive'] as const }] }, page: 1, limit: 20, total: 1 }; },
  async duplicates() { return { propertyId, items: [{ candidateId: propertyId, signals: ['same_slug'] as const, explanation: 'Deterministic signals: same_slug' }], total: 1 }; },
  async create() { return property; },
  async get() { return property; },
  async saveStep() { return { ...property, version: 1, locationId: '3123456789abcdef01234567' }; },
  async validate() { return { valid: true, issues: [] }; },
  async submit() { return { ...property, status: 'pending_review' as const, submittedAt: '2026-08-14T08:00:00.000Z', version: 1 }; },
  async review() { return { ...property, status: 'approved' as const, reviewedBy: provider, reviewedAt: '2026-08-14T08:00:00.000Z', reviewReason: 'Approve reviewed property', version: 1 }; },
  async visibility(_adminId: string, _id: string, input: { action: string }) { return { ...property, status: (input.action === 'hide' ? 'hidden' : input.action === 'archive' ? 'archived' : 'published') as 'hidden' | 'archived' | 'published', active: input.action === 'restore', version: 1 }; }
};

async function run(fn: (url: string) => Promise<void>): Promise<void> {
  const server = createApiServer({ database: { isReady: async () => true }, properties: { service, accessTokens: tokens } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try { await fn(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); }
}
const request = (url: string, method: string, path: string, token: string, body?: unknown) => fetch(url + path, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test('property draft routes require verified provider authentication', async () => run(async url => {
  assert.equal((await fetch(url + '/api/v1/provider/properties/' + propertyId)).status, 401);
  assert.equal((await request(url, 'GET', '/api/v1/provider/properties/' + propertyId, 'admin')).status, 403);
  assert.equal((await request(url, 'GET', '/api/v1/provider/properties/' + propertyId, 'pending')).status, 403);
}));

test('property draft routes expose strict create, get, and step-save envelopes', async () => run(async url => {
  assert.equal((await request(url, 'GET', '/api/v1/provider/properties?status=draft&limit=20', 'provider')).status, 200);
  assert.equal((await request(url, 'POST', '/api/v1/provider/properties', 'provider', { name: { en: 'Apartment' }, slug: 'apartment', transactionType: 'sale', source: { providerId: provider, sourceType: 'individual_broker' }, reason: 'Create property draft' })).status, 201);
  assert.equal((await request(url, 'GET', '/api/v1/provider/properties/' + propertyId, 'provider')).status, 200);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/properties/${propertyId}/steps/basic`, 'provider', { version: 0, name: { en: 'Updated' }, reason: 'Save basic property data' })).status, 200);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/properties/${propertyId}/steps/details`, 'provider', { version: 1, area: { value: 85, unit: 'sqm' }, reason: 'Save property details' })).status, 200);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/properties/${propertyId}/steps/price-payment`, 'provider', { version: 2, price: { amount: 1_000_000, currency: 'EGP' }, reason: 'Save property pricing' })).status, 200);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/properties/${propertyId}/steps/features-services`, 'provider', { version: 3, featureIds: [provider], serviceIds: ['3123456789abcdef01234567'], reason: 'Save property features' })).status, 200);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/properties/${propertyId}/steps/contact`, 'provider', { version: 4, contact: { phone: '+201234567890' }, reason: 'Save property contact' })).status, 200);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/properties/${propertyId}/steps/location`, 'provider', { version: 0, reason: 'Save location', extra: true })).status, 400);
  assert.equal((await request(url, 'POST', `/api/v1/provider/properties/${propertyId}/submit`, 'provider', { version: 0, reason: 'Submit property for review' })).status, 200);
}));

test('admin review and visibility routes require admin authentication and strict reasons', async () => run(async url => {
  assert.equal((await request(url, 'GET', '/api/v1/admin/properties?status=draft&limit=20', 'admin')).status, 200);
  assert.equal((await request(url, 'GET', `/api/v1/admin/properties/possible-duplicates?propertyId=${propertyId}&limit=20`, 'admin')).status, 200);
  assert.equal((await request(url, 'POST', `/api/v1/admin/properties/${propertyId}/review`, 'provider', { version: 0, action: 'approve', reason: 'Approve property' })).status, 403);
  assert.equal((await request(url, 'POST', `/api/v1/admin/properties/${propertyId}/review`, 'admin', { version: 0, action: 'approve', reason: 'Approve property' })).status, 200);
  assert.equal((await request(url, 'POST', `/api/v1/admin/properties/${propertyId}/visibility`, 'admin', { version: 0, action: 'hide', reason: 'Hide property' })).status, 200);
  assert.equal((await request(url, 'POST', `/api/v1/admin/properties/${propertyId}/visibility`, 'admin', { version: 0, action: 'hide' })).status, 400);
}));
