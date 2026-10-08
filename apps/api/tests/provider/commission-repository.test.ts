import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { createMongooseProviderCommissionSource } from '../../src/modules/provider/commission-repository.js';

const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const base = { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', kind: 'percentage', percentageBps: 250, version: 1, status: 'active', effectiveFrom: '2026-01-01T00:00:00Z' };
const connectionFor = (rows: Record<string, Record<string, unknown>[]>) => ({ collection(name: string) { return { find(filter: Record<string, unknown>) {
  const expectedIds = (filter.accountId as { $in: unknown[] } | undefined)?.$in;
  return { async toArray() { return (rows[name] ?? []).filter(row => row.status === filter.status && (!expectedIds || expectedIds.some(value => typeof value === typeof row.accountId && String(value) === String(row.accountId)))); } };
} }; } }) as unknown as Connection;

test('provider commission reads saved string account IDs and keeps exceptions ahead of newer default policies', async () => {
  const source = createMongooseProviderCommissionSource(connectionFor({
    commission_exceptions: [{ ...base, accountId, percentageBps: 100 }, { ...base, accountId: 'cccccccccccccccccccccccc', percentageBps: 900 }],
    commission_account_overrides: [{ ...base, accountId, percentageBps: 200 }],
    commission_policies: [{ ...base, effectiveFrom: new Date(Date.now() - 1000).toISOString(), percentageBps: 750 }]
  }));
  const resolution = await source.getForProvider(accountId);
  assert.equal(resolution?.source, 'exception'); assert.equal(resolution?.percentageBps, 100); assert.equal(resolution?.accountId, accountId);
});

test('provider commission accepts legacy ObjectId owners and falls back past expired or future exceptions', async () => {
  const source = createMongooseProviderCommissionSource(connectionFor({
    commission_exceptions: [{ ...base, accountId, effectiveTo: '2026-01-02T00:00:00Z' }, { ...base, accountId, effectiveFrom: new Date(Date.now() + 86_400_000).toISOString() }],
    commission_account_overrides: [{ ...base, accountId: new Types.ObjectId(accountId), percentageBps: 175 }],
    commission_policies: [{ ...base, percentageBps: 250 }]
  }));
  const resolution = await source.getForProvider(accountId);
  assert.equal(resolution?.source, 'account_override'); assert.equal(resolution?.percentageBps, 175);
  assert.equal((await source.getForProvider('cccccccccccccccccccccccc'))?.source, 'policy');
});
