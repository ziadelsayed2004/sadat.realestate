import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestContext } from '../../src/modules/observability/context.js';
import { createInMemoryErrorReporter, createSafeErrorReport, reportSafeError } from '../../src/modules/observability/error-reporting.js';

test('creates an allowlisted error report without message, stack, or PII', () => {
  const context = createRequestContext({}, {
    requestId: () => 'req-error-1',
    traceId: () => '11111111111111111111111111111111',
    spanId: () => '1111111111111111'
  });
  const report = createSafeErrorReport({
    error: new Error('password=secret person@example.test'),
    route: '/api/v1/admin/settings/:namespace',
    statusCode: 503,
    context,
    now: () => new Date('2026-01-01T00:00:00.000Z')
  });
  assert.deepEqual(report, {
    errorType: 'Error',
    requestId: 'req-error-1',
    traceId: '11111111111111111111111111111111',
    route: '/api/v1/admin/settings/:namespace',
    statusCode: 503,
    occurredAt: '2026-01-01T00:00:00.000Z'
  });
  assert.doesNotMatch(JSON.stringify(report), /password|secret|person@example/);
});

test('swallows reporter failures and keeps a deterministic in-memory sink', () => {
  const failing = { report() { throw new Error('vendor unavailable'); } };
  assert.doesNotThrow(() => reportSafeError(failing, { error: new Error('private'), route: '/health', statusCode: 500 }));
  const sink = createInMemoryErrorReporter();
  reportSafeError(sink, { error: new TypeError('private'), route: '/ready', statusCode: 500 });
  assert.equal(sink.reports.length, 1);
  assert.equal(sink.reports[0].errorType, 'TypeError');
});
