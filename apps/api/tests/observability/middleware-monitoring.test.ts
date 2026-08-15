import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createApp } from '../../src/app.js';
import { startApiServer, stopApiServer } from '../../src/server.js';
import { createInMemoryErrorReporter } from '../../src/modules/observability/error-reporting.js';
import { createMetricsRegistry } from '../../src/modules/observability/metrics.js';

test('records bounded request metrics and reports server errors with correlation only', async () => {
  const metrics = createMetricsRegistry(() => new Date('2026-01-01T00:00:00.000Z'));
  const reporter = createInMemoryErrorReporter();
  const app = createApp({ database: { isReady: async () => true }, observability: { metrics, errorReporter: reporter } });
  app.get('/synthetic-failure', (_request, response) => { response.status(500).json({ error: 'safe' }); });
  const server = createServer(app);
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/synthetic-failure`);
    assert.equal(response.status, 500);
    const snapshot = metrics.snapshot();
    assert.equal(snapshot.some((item) => item.name === 'http.requests.total' && item.labels?.status === '500'), true);
    assert.equal(snapshot.some((item) => item.name === 'http.request.duration_ms'), true);
    assert.equal(reporter.reports.length, 1);
    assert.equal(reporter.reports[0].statusCode, 500);
    assert.equal(reporter.reports[0].route, '/synthetic-failure');
  } finally {
    await stopApiServer(server);
  }
});
