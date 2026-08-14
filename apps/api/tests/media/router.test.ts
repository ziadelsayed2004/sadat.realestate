import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { PropertyMediaRouterDependencies } from '../../src/modules/media/router.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const provider = '0123456789abcdef01234567'; const property = '1123456789abcdef01234567'; const media = '2123456789abcdef01234567';
const item = { id: media, propertyId: property, kind: 'image' as const, originalFilename: 'photo.jpg', detectedMime: 'image/jpeg' as const, byteSize: 6, sha256: 'a'.repeat(64), sortOrder: 0, isCover: true, processingState: 'ready' as const, active: true, version: 1, createdAt: '2026-08-14T09:00:00.000Z', updatedAt: '2026-08-14T09:00:00.000Z' };
const tokens: AccessTokenService = { issue() { return 'x'; }, verify(token) { return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: provider, sid: '3123456789abcdef01234567', role: token === 'admin' ? 'admin' : 'provider', status: token === 'pending' ? 'pending_review' : 'verified', iat: 1, exp: 2, jti: 'media-router' } as AccessTokenClaims; } };
const service: PropertyMediaRouterDependencies['service'] = { async upload() { return item; }, async list() { return [item]; }, async reorder() { return [item]; }, async update() { return item; }, async remove() { return { ...item, active: false, isCover: false, processingState: 'deleted' }; }, async listPublic() { return [item]; } };
async function run(fn: (url: string) => Promise<void>) { const server = createApiServer({ database: { isReady: async () => true }, propertyMedia: { service, accessTokens: tokens } }); const address = await startApiServer(server, { host: '127.0.0.1', port: 0 }); try { await fn(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); } }
const request = (url: string, method: string, path: string, token: string, body?: unknown, headers: Record<string, string> = {}) => fetch(url + path, { method, headers: { Authorization: `Bearer ${token}`, ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test('property media routes enforce verified-provider access and canonical upload/order/delete paths', async () => run(async url => {
  assert.equal((await fetch(`${url}/api/v1/provider/properties/${property}/media`)).status, 401);
  assert.equal((await request(url, 'POST', `/api/v1/provider/properties/${property}/media`, 'admin', undefined, { 'Content-Type': 'image/jpeg', 'x-media-kind': 'image', 'x-file-name': 'photo.jpg' })).status, 403);
  assert.equal((await fetch(`${url}/api/v1/provider/properties/${property}/media`, { method: 'POST', headers: { Authorization: 'Bearer provider', 'Content-Type': 'image/jpeg', 'x-media-kind': 'image', 'x-file-name': 'photo.jpg' }, body: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]) })).status, 201);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/properties/${property}/media/order`, 'provider', { version: 1, items: [{ mediaId: media, sortOrder: 0, isCover: true }], reason: 'Order property media' })).status, 200);
  assert.equal((await request(url, 'DELETE', `/api/v1/provider/properties/${property}/media/${media}`, 'provider')).status, 200);
}));
