import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';
import {
  createApiServer,
  startApiServer,
  stopApiServer
} from '../src/server.js';

test('creates a route-free Express application shell', () => {
  const app = createApp({ database: { isReady: async () => true } });
  assert.equal(typeof app, 'function');
});

test('starts on an ephemeral port and returns 404 for unimplemented routes', async () => {
  const server = createApiServer({ database: { isReady: async () => true } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/not-implemented`);
    assert.equal(response.status, 404);
  } finally {
    await stopApiServer(server);
  }
});

test('supports duplicate-start rejection and idempotent stop', async () => {
  const server = createApiServer({ database: { isReady: async () => true } });
  await startApiServer(server, { host: '127.0.0.1', port: 0 });

  await assert.rejects(
    startApiServer(server, { host: '127.0.0.1', port: 0 }),
    /already listening/
  );

  await stopApiServer(server);
  await stopApiServer(server);
  assert.equal(server.listening, false);
});
