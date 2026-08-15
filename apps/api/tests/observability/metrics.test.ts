import assert from 'node:assert/strict';
import test from 'node:test';
import { createMetricsRegistry, ObservabilityMetricsError } from '../../src/modules/observability/metrics.js';

test('keeps bounded deterministic counters, gauges, and observations', () => {
  const metrics = createMetricsRegistry(() => new Date('2026-01-01T00:00:00.000Z'));
  metrics.increment('http.requests.total', { route: '/health', status: '200' });
  metrics.increment('http.requests.total', { status: '200', route: '/health' }, 2);
  metrics.setGauge('readiness.status', 1, { dependency: 'mongodb' });
  metrics.observe('http.request.duration_ms', 4.5, { route: '/health' });
  assert.deepEqual(metrics.snapshot(), [
    { name: 'http.request.duration_ms', type: 'histogram', value: 4.5, labels: { route: '/health' }, observedAt: '2026-01-01T00:00:00.000Z' },
    { name: 'http.requests.total', type: 'counter', value: 3, labels: { route: '/health', status: '200' }, observedAt: '2026-01-01T00:00:00.000Z' },
    { name: 'readiness.status', type: 'gauge', value: 1, labels: { dependency: 'mongodb' }, observedAt: '2026-01-01T00:00:00.000Z' }
  ]);
  metrics.reset();
  assert.deepEqual(metrics.snapshot(), []);
});

test('rejects unsafe labels, invalid values, and type conflicts', () => {
  const metrics = createMetricsRegistry();
  assert.throws(() => metrics.increment('http.requests.total', { email: 'person@example.test' }), (error: unknown) => error instanceof ObservabilityMetricsError && error.code === 'METRIC_LABEL_UNSAFE');
  assert.throws(() => metrics.increment('http.requests.total', { route: '/health' }, 0), /positive and finite/);
  assert.throws(() => metrics.observe('latency', -1), /cannot be negative/);
  metrics.increment('same.metric');
  assert.throws(() => metrics.setGauge('same.metric', 1), /another type/);
});
