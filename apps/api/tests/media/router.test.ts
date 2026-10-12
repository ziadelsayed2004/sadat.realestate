import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PropertyMediaServiceError } from '../../src/modules/media/service.js';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { PropertyMediaRouterDependencies } from '../../src/modules/media/router.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const provider = '0123456789abcdef01234567'; const property = '1123456789abcdef01234567'; const media = '2123456789abcdef01234567';
const item = { id: media, propertyId: property, kind: 'image' as const, originalFilename: 'photo.jpg', detectedMime: 'image/jpeg' as const, byteSize: 6, sha256: 'a'.repeat(64), sortOrder: 0, isCover: true, processingState: 'ready' as const, active: true, version: 1, createdAt: '2026-08-14T09:00:00.000Z', updatedAt: '2026-08-14T09:00:00.000Z' };
const tokens: AccessTokenService = { issue() { return 'x'; }, verify(token) { return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: provider, sid: '3123456789abcdef01234567', role: token === 'admin' ? 'admin' : 'provider', status: token === 'pending' ? 'pending_review' : 'verified', iat: 1, exp: 2, jti: 'media-router' } as AccessTokenClaims; } };
const service: PropertyMediaRouterDependencies['service'] = { async upload() { return item; }, async list() { return [item]; }, async reorder() { return [item]; }, async update() { return item; }, async remove() { return { ...item, active: false, isCover: false, processingState: 'deleted' }; }, async listPublic() { return [item]; } };
async function run(fn: (url: string) => Promise<void>) { const server = createApiServer({ database: { isReady: async () => true }, propertyMedia: { service, accessTokens: tokens } }); const address = await startApiServer(server, { host: '127.0.0.1', port: 0 }); try { await fn(`http://127.0.0.1:${address.port}`); } finally { await stopApiServer(server); } }
const request = (url: string, method: string, path: string, token: string, body?: unknown, headers: Record<string, string> = {}) => fetch(url + path, { method, headers: { Authorization: `Bearer ${token}`, ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test('image previews preserve aspect ratio, reuse derived bytes, revalidate and still enforce current access', async () => {
  const original = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#267457' } }).jpeg({ quality: 95 }).toBuffer();
  const etag = `"${createHash('sha256').update(original).digest('hex')}"`;
  let opened = 0;
  let published = true;
  let allowed = true;
  const content = async () => ({ mime: 'image/jpeg', size: original.length, etag, async open() { opened++; return Readable.from(original); } });
  const server = createApiServer({ database: { isReady: async () => true }, propertyMedia: {
    accessTokens: tokens, service: { ...service, async list() { if (!allowed) throw new PropertyMediaServiceError('MEDIA_FORBIDDEN'); return [item]; } },
    adminContent: content, async content() { return published ? content() : null; }
  } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}`;
  const admin = `/api/v1/admin/properties/${property}/media/${media}/content`;
  const publicPath = `/api/v1/public/properties/${property}/media/${media}/content`;
  try {
    const preview = await request(base, 'GET', `${admin}?width=320`, 'admin');
    assert.equal(preview.status, 200);
    assert.equal(preview.headers.get('content-type'), 'image/webp');
    assert.equal(preview.headers.get('cache-control'), 'private, no-cache');
    const bytes = Buffer.from(await preview.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 320);
    assert.equal(metadata.height, 240);
    assert.ok(bytes.length < original.length / 4);
    const previewEtag = preview.headers.get('etag')!;
    assert.notEqual(previewEtag, etag);
    const cached = await request(base, 'GET', `${admin}?width=320`, 'admin', undefined, { 'if-none-match': previewEtag, 'cache-control': 'max-age=0' });
    assert.equal(cached.status, 304);
    assert.equal(opened, 1);
    const publicPreview = await fetch(`${base}${publicPath}?width=320`);
    assert.deepEqual(Buffer.from(await publicPreview.arrayBuffer()), bytes);
    assert.equal(opened, 1);
    const otherSize = await request(base, 'GET', `${admin}?width=960`, 'admin');
    assert.notEqual(otherSize.headers.get('etag'), previewEtag);
    assert.equal((await sharp(Buffer.from(await otherSize.arrayBuffer())).metadata()).width, 960);
    const full = await request(base, 'GET', admin, 'admin');
    assert.deepEqual(Buffer.from(await full.arrayBuffer()), original);
    const invalid = await request(base, 'GET', `${admin}?width=99999`, 'admin');
    assert.equal(invalid.status, 400);
    assert.notEqual(invalid.headers.get('etag'), previewEtag);
    assert.equal(invalid.headers.get('cache-control'), 'no-store');
    allowed = false;
    assert.equal((await request(base, 'GET', `${admin}?width=320`, 'admin', undefined, { 'if-none-match': previewEtag })).status, 403);
    published = false;
    assert.equal((await fetch(`${base}${publicPath}?width=320`, { headers: { 'if-none-match': previewEtag } })).status, 404);
  } finally { await stopApiServer(server); }
});

test('property media routes enforce verified-provider access and canonical upload/order/delete paths', async () => run(async url => {
  assert.equal((await fetch(`${url}/api/v1/provider/properties/${property}/media`)).status, 401);
  assert.equal((await request(url, 'POST', `/api/v1/provider/properties/${property}/media`, 'admin', undefined, { 'Content-Type': 'image/jpeg', 'x-media-kind': 'image', 'x-file-name': 'photo.jpg' })).status, 403);
  assert.equal((await fetch(`${url}/api/v1/provider/properties/${property}/media`, { method: 'POST', headers: { Authorization: 'Bearer provider', 'Content-Type': 'image/jpeg', 'x-media-kind': 'image', 'x-file-name': 'photo.jpg' }, body: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]) })).status, 201);
  assert.equal((await request(url, 'PATCH', `/api/v1/provider/properties/${property}/media/order`, 'provider', { version: 1, items: [{ mediaId: media, sortOrder: 0, isCover: true }], reason: 'Order property media' })).status, 200);
  assert.equal((await request(url, 'DELETE', `/api/v1/provider/properties/${property}/media/${media}`, 'provider')).status, 200);
}));

test('public media revalidates cached bytes and refuses cached access after unpublishing', async () => {
  let published = true;
  let opened = 0;
  const etag = `"${'a'.repeat(64)}"`;
  const server = createApiServer({ database: { isReady: async () => true }, propertyMedia: { service, accessTokens: tokens, async content() {
    return published ? { mime: 'image/jpeg', size: 5, etag, async open() { opened++; return Readable.from(Buffer.from('photo')); } } : null;
  } } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const url = `http://127.0.0.1:${address.port}/api/v1/public/properties/${property}/media/${media}/content`;
  try {
    const initial = await fetch(url);
    assert.equal(initial.headers.get('cache-control'), 'private, no-cache');
    assert.equal(initial.headers.get('etag'), etag);
    assert.equal(await initial.text(), 'photo');
    const cached = await fetch(url, { headers: { 'if-none-match': etag, 'cache-control': 'max-age=0' } });
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), '');
    assert.equal(opened, 1);
    published = false;
    assert.equal((await fetch(url, { headers: { 'if-none-match': etag } })).status, 404);
    assert.equal(opened, 1);
  } finally { await stopApiServer(server); }
});

test('streams public media with HEAD and byte ranges, rejects invalid ranges and unavailable private media', async () => {
  const contentBytes = Buffer.from('0123456789');
  const server = createApiServer({ database: { isReady: async () => true }, propertyMedia: { service, accessTokens: tokens, async content(propertyId, mediaId) {
    if (propertyId !== property || mediaId !== media) return null;
    return { mime: 'video/mp4', size: contentBytes.length, async open(range) { return Readable.from(range ? contentBytes.subarray(range.start, range.end + 1) : contentBytes); } };
  } } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const url = `http://127.0.0.1:${address.port}/api/v1/public/properties/${property}/media/${media}/content`;
  try {
    const full = await fetch(url); assert.equal(full.status, 200); assert.equal(await full.text(), '0123456789');
    const range = await fetch(url, { headers: { range: 'bytes=3-6' } }); assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 3-6/10'); assert.equal(await range.text(), '3456');
    const head = await fetch(url, { method: 'HEAD' }); assert.equal(head.headers.get('content-length'), '10'); assert.equal(await head.text(), '');
    const bad = await fetch(url, { headers: { range: 'bytes=10-' } }); assert.equal(bad.status, 416); assert.equal(bad.headers.get('content-range'), 'bytes */10');
    assert.equal((await fetch(url.replace(media, 'f'.repeat(24)))).status, 404);
  } finally { await stopApiServer(server); }
});


test('administrative media endpoints require administrative authentication and decode audit reasons safely', async () => run(async url => {
  const path = `/api/v1/admin/properties/${property}/media`;
  assert.equal((await fetch(url + path)).status, 401);
  assert.equal((await request(url, 'GET', path, 'provider')).status, 403);
  assert.equal((await request(url, 'GET', path, 'admin')).status, 200);
  assert.equal((await request(url, 'DELETE', `${path}/${media}`, 'admin', undefined, { 'x-edit-reason': '%broken' })).status, 400);
  const result = await fetch(url + path, { method: 'POST', headers: { Authorization: 'Bearer admin', 'Content-Type': 'image/jpeg', 'x-media-kind': 'image', 'x-file-name': encodeURIComponent('WhatsApp Image 2026-10-08 at 3.16.50 PM.jpeg'), 'x-edit-reason': encodeURIComponent('Correct property cover') }, body: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]) });
  assert.equal(result.status, 201);
}));

test('administrative photo previews require authentication and permission and bind the asset to the property', async () => {
  let reads = 0;
  const server = createApiServer({ database: { isReady: async () => true }, propertyMedia: {
    service, accessTokens: tokens,
    async adminContent() { reads++; return { mime: 'image/jpeg', size: 5, async open() { return Readable.from(Buffer.from('photo')); } }; }
  } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}`;
  const path = `/api/v1/admin/properties/${property}/media/${media}/content`;
  try {
    assert.equal((await fetch(base + path)).status, 401);
    assert.equal((await request(base, 'GET', path, 'provider')).status, 403);
    assert.equal((await request(base, 'GET', path.replace(media, 'f'.repeat(24)), 'admin')).status, 404);
    assert.equal(reads, 0);
    const result = await request(base, 'GET', path, 'admin');
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('cache-control'), 'private, no-cache');
    assert.equal(await result.text(), 'photo');
    const head = await request(base, 'HEAD', path, 'admin');
    assert.equal(head.headers.get('content-length'), '5');
    assert.equal(await head.text(), '');
  } finally { await stopApiServer(server); }
});
