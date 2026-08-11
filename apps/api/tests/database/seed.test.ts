import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Connection } from 'mongoose';
import { runDevelopmentSeed } from '../../src/modules/database/seed.js';
import { runSeedCommand } from '../../src/modules/database/run-seed.js';

test('development seed refuses non-local environments before writing', async () => {
  const connection = new EventEmitter() as unknown as Connection;
  await assert.rejects(
    runDevelopmentSeed('production', connection, []),
    /local and UAT environments/
  );
});

test('empty seed registry is an explicit no-op until approved domain fixtures exist', async () => {
  const connection = new EventEmitter() as unknown as Connection;
  assert.equal(await runDevelopmentSeed('local', connection, []), 0);
});

test('seed command rejects production before creating a database connection', async () => {
  let factoryCalled = false;
  await assert.rejects(
    runSeedCommand(
      { APP_ENV: 'production', API_HOST: '127.0.0.1', API_PORT: '3000', MONGODB_URI: 'mongodb://user:password@production.invalid/data' },
      () => {
        factoryCalled = true;
        throw new Error('connection factory must not run');
      }
    ),
    /local and UAT environments/
  );
  assert.equal(factoryCalled, false);
});

test('seed ledger makes approved synthetic steps idempotent across repeated runs', async () => {
  const appliedIds = new Set<string>();
  const ledger = {
    async createIndex() { return 'id_1'; },
    async findOne(query: { id: string }) {
      return appliedIds.has(query.id) ? { id: query.id, appliedAt: new Date(0) } : null;
    },
    async updateOne(query: { id: string }) {
      appliedIds.add(query.id);
      return { acknowledged: true };
    }
  };
  const connection = {
    db: { collection: () => ledger }
  } as unknown as Connection;
  let executions = 0;
  const steps = [{ id: 'synthetic-location-v1', async run() { executions += 1; } }];

  assert.equal(await runDevelopmentSeed('uat', connection, steps), 1);
  assert.equal(await runDevelopmentSeed('uat', connection, steps), 0);
  assert.equal(executions, 1);
});
