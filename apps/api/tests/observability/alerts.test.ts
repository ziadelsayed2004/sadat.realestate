import assert from 'node:assert/strict';
import test from 'node:test';
import { OBSERVABILITY_ALERT_DEFINITIONS, ObservabilityAlertError, evaluateObservabilityAlert } from '../../src/modules/observability/alerts.js';

test('evaluates only registered PII-free alert signals with a runbook key', () => {
  assert.equal(OBSERVABILITY_ALERT_DEFINITIONS.length, 3);
  const alert = evaluateObservabilityAlert('readiness_not_ready', {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    context: { requestId: 'req-alert-1', traceId: '22222222222222222222222222222222' }
  });
  assert.deepEqual(alert, {
    id: 'readiness-not-ready',
    severity: 'critical',
    signal: 'readiness_not_ready',
    runbook: 'readiness-failure',
    occurredAt: '2026-01-01T00:00:00.000Z',
    requestId: 'req-alert-1',
    traceId: '22222222222222222222222222222222'
  });
  assert.doesNotMatch(JSON.stringify(alert), /email|phone|address|user/);
});

test('rejects an unregistered signal instead of inventing an alert', () => {
  assert.throws(() => evaluateObservabilityAlert('unknown_signal' as never), (error: unknown) => error instanceof ObservabilityAlertError);
});
