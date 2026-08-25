import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Connection } from 'mongoose';
import {
  runDevelopmentSeed,
  SYNTHETIC_SHOWCASE_SEED_STEP,
  SYNTHETIC_WORKFLOW_SEED_STEP
} from '../../src/modules/database/seed.js';
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

test('approved showcase seed writes only explicit synthetic local-preview documents', async () => {
  const writes: Array<{ collection: string; document: Record<string, unknown> }> = [];
  const connection = {
    collection(name: string) {
      return {
        async updateOne(_filter: unknown, update: { $setOnInsert: Record<string, unknown> }) {
          writes.push({ collection: name, document: update.$setOnInsert });
          return { acknowledged: true };
        }
      };
    }
  } as unknown as Connection;

  await SYNTHETIC_SHOWCASE_SEED_STEP.run(connection);

  assert.ok(writes.length >= 15);
  assert.ok(writes.some((write) => write.collection === 'properties'));
  assert.ok(writes.some((write) => write.collection === 'articles'));
  assert.ok(writes.some((write) => write.collection === 'community_posts'));
  assert.ok(writes.every((write) => write.document.synthetic === true));
  assert.ok(writes.every((write) => write.document.seedKey === 'local-showcase-v1'));
  assert.equal(
    writes.some((write) => Object.keys(write.document).some((key) => /password|token|secret/i.test(key))),
    false
  );
});

test('workflow showcase seed covers authenticated surfaces without public private-file URLs', async () => {
  const writes: Array<{ collection: string; document: Record<string, unknown> }> = [];
  const connection = {
    collection(name: string) {
      return {
        async updateOne(_filter: unknown, update: { $setOnInsert: Record<string, unknown> }) {
          writes.push({ collection: name, document: update.$setOnInsert });
          return { acknowledged: true };
        }
      };
    }
  } as unknown as Connection;

  await SYNTHETIC_WORKFLOW_SEED_STEP.run(connection);
  const collections = new Set(writes.map((write) => write.collection));
  for (const required of [
    'seeker_profiles', 'provider_profiles', 'admin_accounts', 'roles',
    'requests', 'viewings', 'favorites', 'notifications', 'ad_requests',
    'ad_quotes', 'payment_proofs', 'commission_policies',
    'commission_confirmations', 'commission_snapshots'
  ]) assert.ok(collections.has(required), `missing ${required}`);
  assert.ok(writes.some((write) => write.collection === 'provider_profiles' && write.document.providerType === 'individual_broker'));
  assert.ok(writes.some((write) => write.collection === 'provider_profiles' && write.document.providerType === 'brokerage_office'));
  assert.ok(writes.some((write) => write.collection === 'roles' && write.document.accessMode === 'view_only'));
  const proof = writes.find((write) => write.collection === 'payment_proofs')?.document;
  assert.ok(proof);
  assert.equal('url' in proof, false);
  assert.equal(typeof proof.storageKey, 'string');
  assert.equal(typeof proof.passwordHash, 'undefined');
  assert.ok(writes.every((write) => write.document.synthetic === true && write.document.seedKey === 'local-showcase-v2'));
});
