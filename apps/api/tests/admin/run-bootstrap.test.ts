import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Connection } from 'mongoose';
import type { DatabaseConnection } from '../../src/modules/database/connection.js';
import {
  parseAdminBootstrapEnvironment,
  runAdminBootstrapCommand
} from '../../src/modules/admin/run-bootstrap.js';

function environment() {
  return {
    APP_ENV: 'test',
    API_HOST: '127.0.0.1',
    API_PORT: '3000',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/sadat_admin_bootstrap_test',
    ADMIN_BOOTSTRAP_EMAIL: 'admin@example.com',
    ADMIN_BOOTSTRAP_PASSWORD: 'LongSynthetic9!Password',
    ADMIN_BOOTSTRAP_LOCALE: 'ar',
    ADMIN_BOOTSTRAP_CONFIRMATION: 'CREATE_FIRST_SUPER_ADMIN'
  };
}

test('requires explicit confirmation and never includes credential values in validation errors', () => {
  const source: Partial<ReturnType<typeof environment>> = environment();
  delete source.ADMIN_BOOTSTRAP_CONFIRMATION;
  assert.throws(
    () => parseAdminBootstrapEnvironment(source),
    (error: unknown) => !String(error).includes(source.ADMIN_BOOTSTRAP_PASSWORD ?? '')
  );
});

test('connects, bootstraps once through the runtime boundary, and always disconnects', async () => {
  const nativeConnection = new EventEmitter() as unknown as Connection;
  let connected = 0;
  let disconnected = 0;
  const database = {
    state: 'disconnected',
    indexPolicy: { autoIndex: false, synchronizeOnStartup: false },
    nativeConnection,
    async connect() { connected += 1; },
    async disconnect() { disconnected += 1; },
    async isReady() { return true; }
  } as DatabaseConnection;
  const result = await runAdminBootstrapCommand(
    environment(),
    () => database,
    () => ({
      async bootstrap(input) {
        assert.equal(input.password, 'LongSynthetic9!Password');
        return {
          adminId: '0123456789abcdef01234567',
          email: input.email,
          accessLevel: 'super_admin',
          status: 'verified',
          bootstrappedAt: '2026-08-13T18:00:00.000Z'
        };
      }
    })
  );
  assert.equal(result.email, 'admin@example.com');
  assert.equal(connected, 1);
  assert.equal(disconnected, 1);
});

test('validates all input before creating a database connection', async () => {
  const source = environment();
  source.ADMIN_BOOTSTRAP_PASSWORD = 'short';
  let factoryCalled = false;
  await assert.rejects(runAdminBootstrapCommand(source, () => {
    factoryCalled = true;
    throw new Error('must not connect');
  }));
  assert.equal(factoryCalled, false);
});

test('disconnects and does not expose the password when bootstrap fails', async () => {
  let disconnected = false;
  const database = {
    state: 'connected',
    indexPolicy: { autoIndex: false, synchronizeOnStartup: false },
    nativeConnection: new EventEmitter() as unknown as Connection,
    async connect() {},
    async disconnect() { disconnected = true; },
    async isReady() { return true; }
  } as DatabaseConnection;
  await assert.rejects(
    runAdminBootstrapCommand(environment(), () => database, () => ({
      async bootstrap() { throw new Error('safe failure'); }
    })),
    (error: unknown) => !String(error).includes(environment().ADMIN_BOOTSTRAP_PASSWORD)
  );
  assert.equal(disconnected, true);
});
