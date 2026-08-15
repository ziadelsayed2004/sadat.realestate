import assert from 'node:assert/strict';
import test from 'node:test';
import type { Connection } from 'mongoose';
import {
  DatabaseMigrationError,
  runMigrations,
  validateMigrationDefinitions,
  type DatabaseMigrationDefinition,
  type DatabaseMigrationLedger
} from '../../src/modules/database/migrations.js';
import type { DatabaseMigrationRecord } from '@sadat-real-estate/contracts';

const checksumA = 'a'.repeat(64);
const checksumB = 'b'.repeat(64);
const fakeConnection = {} as Connection;

function ledger(initial: readonly DatabaseMigrationRecord[] = []): DatabaseMigrationLedger & { rows: DatabaseMigrationRecord[] } {
  const rows = [...initial];
  return {
    rows,
    async listApplied() { return rows; },
    async markApplied(record) { rows.push(record); }
  };
}

function migration(id: string, version: number, checksum: string, run: () => Promise<void>): DatabaseMigrationDefinition {
  return { id, version, checksum, description: `${id} migration`, up: async () => run() };
}

test('validates deterministic migration identity and ordering', () => {
  const definitions = validateMigrationDefinitions([
    migration('second', 2, checksumB, async () => {}),
    migration('first', 1, checksumA, async () => {})
  ]);
  assert.deepEqual(definitions.map(({ id }) => id), ['first', 'second']);
  assert.throws(() => validateMigrationDefinitions([
    migration('same', 1, checksumA, async () => {}),
    migration('same', 2, checksumB, async () => {})
  ]), (error: unknown) => error instanceof DatabaseMigrationError && error.code === 'MIGRATION_ID_DUPLICATE');
});

test('plans without writing and applies each migration exactly once after confirmation', async () => {
  const applied: string[] = [];
  const definitions = [
    migration('first', 1, checksumA, async () => { applied.push('first'); }),
    migration('second', 2, checksumB, async () => { applied.push('second'); })
  ];
  const store = ledger();
  const plan = await runMigrations(fakeConnection, definitions, { environment: 'production', ledger: store });
  assert.equal(plan.status, 'planned');
  assert.deepEqual(plan.pending.map(({ id }) => id), ['first', 'second']);
  assert.deepEqual(applied, []);
  await assert.rejects(
    runMigrations(fakeConnection, definitions, { environment: 'production', mode: 'apply', ledger: store }),
    (error: unknown) => error instanceof DatabaseMigrationError && error.code === 'MIGRATION_CONFIRMATION_REQUIRED'
  );
  const result = await runMigrations(fakeConnection, definitions, {
    environment: 'production',
    mode: 'apply',
    confirm: true,
    now: new Date('2026-01-01T00:00:00.000Z'),
    ledger: store
  });
  assert.equal(result.status, 'applied');
  assert.deepEqual(applied, ['first', 'second']);
  const replay = await runMigrations(fakeConnection, definitions, { environment: 'production', mode: 'apply', confirm: true, ledger: store });
  assert.deepEqual(replay.pending, []);
  assert.deepEqual(applied, ['first', 'second']);
});

test('fails closed when the ledger is unknown or its checksum changed', async () => {
  const unknownStore = ledger([{
    id: 'removed', version: 1, checksum: checksumA, description: 'removed', appliedAt: '2026-01-01T00:00:00.000Z'
  }]);
  await assert.rejects(
    runMigrations(fakeConnection, [migration('current', 2, checksumB, async () => {})], { environment: 'test', ledger: unknownStore }),
    (error: unknown) => error instanceof DatabaseMigrationError && error.code === 'MIGRATION_LEDGER_UNKNOWN'
  );
  const changedStore = ledger([{
    id: 'current', version: 1, checksum: checksumA, description: 'current', appliedAt: '2026-01-01T00:00:00.000Z'
  }]);
  await assert.rejects(
    runMigrations(fakeConnection, [migration('current', 1, checksumB, async () => {})], { environment: 'test', ledger: changedStore }),
    (error: unknown) => error instanceof DatabaseMigrationError && error.code === 'MIGRATION_CHECKSUM_MISMATCH'
  );
});

test('redacts migration handler failures and does not record a failed step', async () => {
  const store = ledger();
  await assert.rejects(
    runMigrations(fakeConnection, [migration('broken', 1, checksumA, async () => { throw new Error('mongodb://user:password@host.invalid'); })], { environment: 'test', mode: 'apply', confirm: true, ledger: store }),
    (error: unknown) => error instanceof DatabaseMigrationError && error.code === 'MIGRATION_FAILED' && !error.message.includes('password')
  );
  assert.deepEqual(store.rows, []);
});
