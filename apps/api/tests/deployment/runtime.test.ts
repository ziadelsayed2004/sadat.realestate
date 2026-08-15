import assert from 'node:assert/strict';
import test from 'node:test';
import { DEPLOYMENT_MANIFEST, createGracefulShutdown, validateDeploymentManifest } from '../../src/modules/deployment/runtime.js';

test('declares a non-root Node 24 runtime with health and readiness probes', () => {
  assert.equal(DEPLOYMENT_MANIFEST.nodeMajor, 24);
  assert.equal(DEPLOYMENT_MANIFEST.nonRootUser, 'node');
  assert.equal(DEPLOYMENT_MANIFEST.healthPath, '/health');
  assert.equal(DEPLOYMENT_MANIFEST.readinessPath, '/ready');
  assert.deepEqual(DEPLOYMENT_MANIFEST.imageStages, ['dependencies', 'build', 'runtime']);
  assert.equal(validateDeploymentManifest(DEPLOYMENT_MANIFEST).shutdownGraceMs, 10_000);
  assert.throws(() => validateDeploymentManifest({ ...DEPLOYMENT_MANIFEST, nonRootUser: 'root' }), /deployment runtime must not run as root/);
});

test('shuts down the server before the database and is idempotent', async () => {
  const calls: string[] = [];
  const exitCodes: number[] = [];
  const shutdown = createGracefulShutdown({
    async stopServer() { calls.push('server'); },
    async disconnectDatabase() { calls.push('database'); },
    onExitCode(code) { exitCodes.push(code); }
  }, { graceMs: 100 });
  const [first, second] = await Promise.all([shutdown(), shutdown()]);
  assert.deepEqual(first, { status: 'stopped', code: 0 });
  assert.equal(second, first);
  assert.deepEqual(calls, ['server', 'database']);
  assert.deepEqual(exitCodes, [0]);
});

test('fails safely on dependency errors and bounded shutdown timeout', async () => {
  const failed = createGracefulShutdown({
    async stopServer() { throw new Error('private connection detail'); },
    async disconnectDatabase() {},
    onExitCode(code) { assert.equal(code, 1); }
  }, { graceMs: 100 });
  assert.deepEqual(await failed(), { status: 'failed', code: 1 });

  let databaseClosed = false;
  const timedOut = createGracefulShutdown({
    async stopServer() { await new Promise<void>(() => {}); },
    async disconnectDatabase() { databaseClosed = true; }
  }, { graceMs: 5 });
  assert.deepEqual(await timedOut(), { status: 'timed_out', code: 1 });
  assert.equal(databaseClosed, false);
});
