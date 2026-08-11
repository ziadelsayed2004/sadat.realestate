import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { createApp } from '../../src/app.js';

async function withServer(
  security: Parameters<typeof createApp>[0]['security'],
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = createApiServer({ database: { isReady: async () => true }, security });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('sets Helmet headers, explicit CORS, and a closed proxy policy', async () => {
  await withServer({ allowedOrigins: ['https://app.example'] }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, { headers: { Origin: 'https://app.example' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(response.headers.get('content-security-policy'));
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://app.example');
  });
  const app = createApp({ database: { isReady: async () => true } });
  assert.equal(app.get('trust proxy'), false);
  const trusted = createApp({ database: { isReady: async () => true }, security: { trustProxy: 1 } });
  assert.equal(trusted.get('trust proxy'), 1);
});

test('rejects disallowed CORS preflight without exposing internals', async () => {
  await withServer({ allowedOrigins: ['https://app.example'] }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' }
    });
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, 'CORS_ORIGIN_NOT_ALLOWED');
    assert.equal(body.error.messageKey, 'errors.corsOriginNotAllowed');
    assert.deepEqual(body.error.details, []);
    assert.equal(typeof body.error.requestId, 'string');
  });
});

test('enforces JSON body limits and returns a redacted error envelope', async () => {
  await withServer({ jsonBodyLimit: 32 }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: 'this body is larger than the configured limit' })
    });
    assert.equal(response.status, 413);
    const body = await response.json();
    assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
    assert.equal(typeof body.error.requestId, 'string');
    assert.equal('stack' in body.error, false);
  });
});

test('rate-limits repeated requests by the socket-derived client key', async () => {
  await withServer({ rateLimit: { max: 2, windowMs: 10_000 } }, async (baseUrl) => {
    const statuses: number[] = [];
    for (let index = 0; index < 3; index += 1) statuses.push((await fetch(`${baseUrl}/api/v1/not-implemented`)).status);
    assert.deepEqual(statuses, [404, 404, 429]);
  });
});

test('rejects MongoDB operators and dotted keys before route handling', async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health?%24where=1`);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, 'UNSAFE_INPUT');
    assert.equal(body.error.messageKey, 'errors.unsafeInput');
    assert.equal(JSON.stringify(body).includes('$where'), false);
  });
});
