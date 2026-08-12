import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import {
  createRequestContext,
  getRequestContext,
  runWithRequestContext
} from '../../src/modules/observability/context.js';
import { createStructuredLogger } from '../../src/modules/observability/logger.js';

interface CapturedRecord {
  timestamp: string;
  level: string;
  event: string;
  requestId?: string;
  traceId?: string;
  data: Record<string, unknown>;
}

function captureLogger(): { logger: ReturnType<typeof createStructuredLogger>; records: CapturedRecord[] } {
  const records: CapturedRecord[] = [];
  return {
    records,
    logger: createStructuredLogger({
      now: () => new Date('2026-08-12T00:00:00.000Z'),
      write: (line) => records.push(JSON.parse(line) as CapturedRecord)
    })
  };
}

async function withServer(
  run: (baseUrl: string, records: CapturedRecord[]) => Promise<void>
): Promise<void> {
  const captured = captureLogger();
  const server = createApiServer({
    database: { isReady: async () => true },
    observability: { logger: captured.logger }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`, captured.records);
  } finally {
    await stopApiServer(server);
  }
}

test('propagates validated request and trace IDs without changing operational bodies', async () => {
  const traceId = '1234567890abcdef1234567890abcdef';
  await withServer(async (baseUrl, records) => {
    const response = await fetch(`${baseUrl}/health?email=person@example.test`, {
      headers: {
        'X-Request-Id': 'req-observability-1',
        Traceparent: `00-${traceId}-1234567890abcdef-01`,
        Authorization: 'Bearer not-for-logs',
        Cookie: 'session=not-for-logs'
      }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(response.headers.get('x-request-id'), 'req-observability-1');
    assert.match(response.headers.get('traceparent') ?? '', new RegExp(`^00-${traceId}-[0-9a-f]{16}-01$`));
    assert.equal(records.length, 1);
    assert.equal(records[0].event, 'http.request.completed');
    assert.equal(records[0].requestId, 'req-observability-1');
    assert.equal(records[0].traceId, traceId);
    assert.deepEqual({
      method: records[0].data.method,
      route: records[0].data.route,
      statusCode: records[0].data.statusCode
    }, { method: 'GET', route: '/health', statusCode: 200 });
    assert.doesNotMatch(JSON.stringify(records), /person@example\.test|not-for-logs|session=/);
  });
});

test('replaces malformed correlation headers and aligns security error envelopes', async () => {
  await withServer(async (baseUrl, records) => {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://not-allowed.example',
        'Access-Control-Request-Method': 'GET',
        'X-Request-Id': 'bad request id',
        Traceparent: '00-00000000000000000000000000000000-0000000000000000-01'
      }
    });
    assert.equal(response.status, 403);
    const requestId = response.headers.get('x-request-id');
    assert.match(requestId ?? '', /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
    assert.notEqual(requestId, 'bad request id');
    const body = await response.json();
    assert.equal(body.error.requestId, requestId);
    assert.match(response.headers.get('traceparent') ?? '', /^00-(?!0{32})[0-9a-f]{32}-(?!0{16})[0-9a-f]{16}-01$/);
    assert.equal(records[0].level, 'warn');
    assert.equal(records[0].data.statusCode, 403);
  });
});

test('redacts nested PII, credentials, token values, URLs, and error internals', () => {
  const captured = captureLogger();
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  captured.logger.error('security.failure', {
    authorization: 'Bearer visible-token',
    profile: { email: 'person@example.test', phone: '+201012345678' },
    clientIp: '203.0.113.9',
    fullName: 'Private Person',
    note: 'Bearer another-token mongodb://user:password@db.invalid/private',
    refresh_token: 'refresh-value',
    error: new Error('secret message with stack'),
    circular
  });
  const serialized = JSON.stringify(captured.records);
  assert.doesNotMatch(serialized, /visible-token|another-token|person@example\.test|201012345678|203\.0\.113\.9|Private Person|password|refresh-value|secret message|stack/);
  assert.match(serialized, /\[REDACTED\]/);
  assert.deepEqual(captured.records[0].data.error, { name: 'Error' });
  assert.deepEqual(captured.records[0].data.circular, { self: '[CIRCULAR]' });
});

test('keeps concurrent asynchronous request contexts isolated', async () => {
  const first = createRequestContext({}, {
    requestId: () => 'req-first',
    traceId: () => '11111111111111111111111111111111',
    spanId: () => '1111111111111111'
  });
  const second = createRequestContext({}, {
    requestId: () => 'req-second',
    traceId: () => '22222222222222222222222222222222',
    spanId: () => '2222222222222222'
  });
  const [firstObserved, secondObserved] = await Promise.all([
    runWithRequestContext(first, async () => {
      await delay(5);
      return getRequestContext();
    }),
    runWithRequestContext(second, async () => {
      await delay(1);
      return getRequestContext();
    })
  ]);
  assert.equal(firstObserved?.requestId, 'req-first');
  assert.equal(secondObserved?.requestId, 'req-second');
  assert.equal(getRequestContext(), undefined);
});

test('rejects invalid custom ID factories instead of logging malformed identifiers', () => {
  assert.throws(() => createRequestContext({}, {
    requestId: () => 'invalid request id',
    traceId: () => '11111111111111111111111111111111',
    spanId: () => '1111111111111111'
  }), /requestId factory returned an invalid value/);
});
