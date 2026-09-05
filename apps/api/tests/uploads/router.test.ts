import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import type { AccessTokenService } from '../../src/modules/auth/crypto.js';
import type { ProviderDocumentService } from '../../src/modules/uploads/service.js';
import { UploadServiceError } from '../../src/modules/uploads/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const providerToken = 'provider.header.signature';
const seekerToken = 'seeker.header.signature';
const adminToken = 'admin.header.signature';
const documentId = '5'.repeat(24);
const accessTokens: AccessTokenService = {
  issue: () => providerToken,
  verify(value) {
    if (value !== providerToken && value !== seekerToken && value !== adminToken) throw new Error('invalid');
    return {
      iss: 'sadat-real-estate-api', aud: 'sadat-real-estate',
      sub: value === adminToken ? 'a'.repeat(24) : '1'.repeat(24),
      sid: '2'.repeat(24), role: value === providerToken ? 'provider' : value === adminToken ? 'admin' : 'seeker',
      status: value === adminToken ? 'verified' : 'draft', iat: 1, exp: 9_999_999_999, jti: 'test'
    };
  }
};
const pdf = Buffer.from('%PDF-1.7\nsynthetic\n%%EOF');

function service(): ProviderDocumentService {
  return {
    list: async () => ({ items: [] }),
    isReady: async () => true,
    async upload(_claims, headers, source) {
      for await (const chunk of source) void chunk;
      return {
        id: documentId, applicationId: '3'.repeat(24), category: headers.category,
        requirementVersion: '2026-08-13.1', originalFilename: 'identity.pdf',
        normalizedExtension: '.pdf', detectedMime: 'application/pdf', byteSize: pdf.byteLength,
        sha256: 'a'.repeat(64), version: 1, securityState: 'clean', reviewState: 'uploaded',
        uploadedAt: '2026-08-13T00:00:00.000Z', active: true, idempotentReplay: false
      };
    },
    async createAccessGrant(_claims, id) {
      if (id !== documentId) throw new UploadServiceError('DOCUMENT_NOT_FOUND');
      return {
        url: `/api/v1/private/provider-documents/${documentId}?expires=9999999999&signature=${'a'.repeat(43)}`,
        expiresAt: '2286-11-20T17:46:39.000Z', method: 'GET'
      };
    },
    async createAdminAccessGrant(_claims, id) {
      if (id !== documentId) throw new UploadServiceError('DOCUMENT_NOT_FOUND');
      return {
        url: `/api/v1/private/provider-documents/${documentId}?expires=9999999999&signature=${'a'.repeat(43)}`,
        expiresAt: '2286-11-20T17:46:39.000Z', method: 'GET'
      };
    },
    async resolveDownload(id) {
      if (id !== documentId) throw new UploadServiceError('INVALID_DOWNLOAD_GRANT');
      return { source: Readable.from(pdf), mime: 'application/pdf', filename: 'identity.pdf' };
    },
    async delete(_claims, id) {
      if (id !== documentId) throw new UploadServiceError('DOCUMENT_NOT_FOUND');
      return { documentId: id, deleted: true };
    }
  };
}

async function withServer(
  run: (baseUrl: string) => Promise<void>,
  rateLimit?: { windowMs: number; max: number }
) {
  const uploads = { service: service(), accessTokens, ...(rateLimit ? { uploadRateLimit: rateLimit } : {}) };
  const server = createApiServer({ database: { isReady: async () => true }, uploads });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

function upload(baseUrl: string, token = providerToken, category = 'government_id_front') {
  return fetch(`${baseUrl}/api/v1/provider/application/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/pdf',
      'X-Document-Category': category,
      'X-File-Name': 'identity.pdf'
    },
    body: pdf
  });
}

test('lists document metadata only for authenticated providers with no-store caching', async () => {
  await withServer(async baseUrl => {
    const url = `${baseUrl}/api/v1/provider/application/documents`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${seekerToken}` } })).status, 403);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${providerToken}` } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as { data: unknown };
    assert.deepEqual(body.data, { items: [] });
  });
});

test('uploads an authenticated provider stream with explicit metadata and no storage internals', async () => {
  await withServer(async (baseUrl) => {
    const response = await upload(baseUrl);
    assert.equal(response.status, 201);
    const body = await response.json() as { data?: Record<string, unknown> };
    assert.equal(body.data?.securityState, 'clean');
    assert.equal('storageKey' in (body.data ?? {}), false);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });
});

test('rejects unauthenticated, unauthorized-role, and invalid upload metadata', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/provider/application/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: pdf
    });
    assert.equal(missing.status, 401);
    assert.equal((await upload(baseUrl, seekerToken)).status, 403);
    assert.equal((await upload(baseUrl, providerToken, 'not_a_category')).status, 400);
  });
});

test('enforces an authenticated upload rate limit', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await upload(baseUrl)).status, 201);
    const limited = await upload(baseUrl);
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get('retry-after'));
  }, { windowMs: 60_000, max: 1 });
});

test('rejects declared oversized uploads before the service persists data', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/provider/application/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/pdf',
        'X-Document-Category': 'government_id_front',
        'X-File-Name': 'identity.pdf'
      },
      body: Buffer.alloc(10 * 1024 * 1024 + 1)
    });
    assert.equal(response.status, 413);
  });
});

test('creates owner-checked grants, rejects IDOR, streams private attachments, and deletes by ID', async () => {
  await withServer(async (baseUrl) => {
    const grant = await fetch(`${baseUrl}/api/v1/provider/application/documents/${documentId}/access`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'provider_review' })
    });
    assert.equal(grant.status, 200);
    const denied = await fetch(`${baseUrl}/api/v1/provider/application/documents/${'9'.repeat(24)}/access`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'provider_review' })
    });
    assert.equal(denied.status, 404);

    const download = await fetch(`${baseUrl}/api/v1/private/provider-documents/${documentId}?expires=9999999999&signature=${'a'.repeat(43)}`);
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-disposition') ?? '', /^attachment;/);
    assert.equal(download.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);

    const deletion = await fetch(`${baseUrl}/api/v1/provider/application/documents/${documentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert.equal(deletion.status, 200);
  });
});

test('protects the Admin reviewer document-access route with permission-shaped query input', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/admin/provider-documents/${documentId}/access?purpose=document_review`);
    assert.equal(missing.status, 401);
    const seeker = await fetch(`${baseUrl}/api/v1/admin/provider-documents/${documentId}/access?purpose=document_review`, {
      headers: { Authorization: `Bearer ${seekerToken}` }
    });
    assert.equal(seeker.status, 403);
    const unknownQuery = await fetch(`${baseUrl}/api/v1/admin/provider-documents/${documentId}/access?purpose=document_review&storageKey=secret`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(unknownQuery.status, 400);
    const grant = await fetch(`${baseUrl}/api/v1/admin/provider-documents/${documentId}/access?purpose=document_review`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(grant.status, 200);
    assert.equal(grant.headers.get('cache-control'), 'no-store');
    const body = await grant.json() as { data?: Record<string, unknown> };
    assert.equal(body.data?.method, 'GET');
    assert.equal('storageKey' in (body.data ?? {}), false);
  });
});
