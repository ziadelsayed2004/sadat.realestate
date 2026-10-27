import assert from 'node:assert/strict';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import { createMongooseProviderCommissionSource } from '../../src/modules/provider/commission-repository.js';

const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const base = { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', scope: { kind: 'default' }, kind: 'percentage', percentageBps: 250, version: 1, status: 'active', effectiveFrom: '2026-01-01T00:00:00Z' };
const connectionFor = (rows: Record<string, Record<string, unknown>[]>) => ({ collection(name: string) { return { find(filter: Record<string, unknown>) {
  const expectedIds = (filter.accountId as { $in: unknown[] } | undefined)?.$in;
  return { async toArray() { return (rows[name] ?? []).filter(row => row.status === filter.status && (!expectedIds || expectedIds.some(value => typeof value === typeof row.accountId && String(value) === String(row.accountId)))); } };
}, async findOne(filter: Record<string, unknown>) {
  const expected = (filter.userId as { $in: unknown[] }).$in;
  return (rows[name] ?? []).find(row => expected.some(value => String(value) === String(row.userId))) ?? null;
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

test('owner/office/developer policies resolve by actual account type; company agreements and exceptions win', async () => {
  const office = '111111111111111111111111', developer = '222222222222222222222222';
  const rows: Record<string, Record<string, unknown>[]> = {
    provider_profiles: [{ userId: accountId, providerType: 'individual_broker' }, { userId: new Types.ObjectId(office), providerType: 'brokerage_office' }, { userId: developer, providerType: 'developer_company' }],
    commission_policies: [
      { ...base, percentageBps: 800 },
      { ...base, scope: { kind: 'provider_type', key: 'individual_broker' }, percentageBps: 200, rentMonths: 0.5 },
      { ...base, scope: { kind: 'provider_type', key: 'brokerage_office' }, percentageBps: 150, rentMonths: 0.5 },
      { ...base, scope: { kind: 'provider_type', key: 'developer_company' }, percentageBps: 300 },
      { ...base, scope: { kind: 'account', key: developer }, percentageBps: 175 },
      { ...base, scope: { kind: 'provider_type', key: 'individual_broker' }, percentageBps: 900, effectiveFrom: '2099-01-01T00:00:00Z' }
    ],
    commission_account_overrides: [{ ...base, accountId: developer, percentageBps: 125, rentMonths: 0.75 }],
    commission_exceptions: [{ ...base, accountId: developer, kind: 'exempt', percentageBps: undefined, rentMonths: 0 }]
  };
  const source = createMongooseProviderCommissionSource(connectionFor(rows));
  assert.equal((await source.getForProvider(accountId))?.percentageBps, 200);
  assert.equal((await source.getForProvider(accountId))?.rentMonths, 0.5);
  assert.equal((await source.getForProvider(office))?.percentageBps, 150);
  assert.equal((await source.getForProvider(developer))?.kind, 'exempt');
  assert.equal((await source.getForProvider(developer))?.rentMonths, 0);
  rows.commission_exceptions![0]!.status = 'inactive';
  assert.equal((await source.getForProvider(developer))?.percentageBps, 125);
  assert.equal((await source.getForProvider(developer))?.rentMonths, 0.75);
  rows.commission_account_overrides![0]!.status = 'inactive';
  assert.equal((await source.getForProvider(developer))?.percentageBps, 175);
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
