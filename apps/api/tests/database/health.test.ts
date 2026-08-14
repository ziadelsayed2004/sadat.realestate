import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../src/app.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

async function requestWithReadiness(
  readiness: () => Promise<boolean>,
  otpReady?: () => boolean | Promise<boolean>
): Promise<{ health: Response; ready: Response }> {
  const server = createApiServer({
    database: { isReady: readiness },
    ...(otpReady
      ? {
          auth: {
            service: {} as never,
            otpService: { isReady: otpReady } as never,
            cookie: {} as never
          }
        }
      : {})
  });
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

test('readiness includes the OTP adapter and fails closed when a required provider is unavailable', async () => {
  const unavailable = await requestWithReadiness(async () => true, () => false);
  assert.equal(unavailable.health.status, 200);
  assert.equal(unavailable.ready.status, 503);
  assert.deepEqual(await unavailable.ready.json(), {
    status: 'not_ready', checks: { mongodb: 'ready', otp: 'not_ready' }
  });
  const ready = await requestWithReadiness(async () => true, () => true);
  assert.equal(ready.ready.status, 200);
  assert.deepEqual(await ready.ready.json(), {
    status: 'ready', checks: { mongodb: 'ready', otp: 'ready' }
  });
});

test('application requires an explicit database readiness boundary', () => {
  assert.throws(() => createApp({ database: undefined as never }));
});

test('readiness exposes private-document capability and fails closed when adapters are unavailable', async () => {
  const server = createApiServer({
    database: { isReady: async () => true },
    uploads: {
      service: {} as never,
      accessTokens: {} as never,
      readiness: { isReady: () => false }
    }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/ready`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: 'not_ready', checks: { mongodb: 'ready', privateDocuments: 'not_ready' }
    });
  } finally {
    await stopApiServer(server);
  }
});
