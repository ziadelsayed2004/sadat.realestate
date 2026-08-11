import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../src/app.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

async function requestWithReadiness(readiness: () => Promise<boolean>): Promise<{ health: Response; ready: Response }> {
  const server = createApiServer({ database: { isReady: readiness } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    return {
      health: await fetch(`http://127.0.0.1:${address.port}/health`),
      ready: await fetch(`http://127.0.0.1:${address.port}/ready`)
    };
  } finally {
    await stopApiServer(server);
  }
}

test('health is process liveness and readiness reflects MongoDB availability', async () => {
  const responses = await requestWithReadiness(async () => true);
  assert.equal(responses.health.status, 200);
  assert.deepEqual(await responses.health.json(), { status: 'ok' });
  assert.equal(responses.ready.status, 200);
  assert.deepEqual(await responses.ready.json(), { status: 'ready', checks: { mongodb: 'ready' } });
});

test('readiness returns non-success without connection details when MongoDB is unavailable', async () => {
  const responses = await requestWithReadiness(async () => { throw new Error('secret connection string'); });
  assert.equal(responses.health.status, 200);
  assert.equal(responses.ready.status, 503);
  assert.deepEqual(await responses.ready.json(), { status: 'not_ready', checks: { mongodb: 'not_ready' } });
});

test('application requires an explicit database readiness boundary', () => {
  assert.throws(() => createApp({ database: undefined as never }));
});
