import assert from 'node:assert/strict';
import test from 'node:test';
import type { Connection } from 'mongoose';
import { createMongooseCommissionConfirmationRepository } from '../../src/modules/commissions/confirmation-repository.js';
import type { CommissionResolution } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createCommissionConfirmationService } from '../../src/modules/commissions/confirmation-service.js';
import {
  ProviderCommissionConfirmationError,
  createProviderCommissionConfirmationService
} from '../../src/modules/provider/commission-confirmation.js';

const providerId = '0123456789abcdef01234567';
const policyId = 'fedcba987654321001234567';
const claims: AccessTokenClaims = {
  iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: providerId,
  sid: 'aaaaaaaaaaaaaaaaaaaaaaaa', role: 'provider', status: 'verified',
  iat: 1, exp: 9_999_999_999, jti: 'provider-commission-confirmation'
};
const resolution: CommissionResolution = {
  accountId: providerId,
  source: 'policy',
  sourceRecordId: policyId,
  sourceVersion: 4,
  policyId,
  effectiveAt: '2026-09-01T00:00:00.000Z',
  kind: 'percentage',
  percentageBps: 250
};

test('acknowledges a different agreement with the same version and exposes it to the administrator', async () => {
  const confirmations = createCommissionConfirmationService();
  let current = resolution;
  const service = createProviderCommissionConfirmationService({ source: { getForProvider: async () => current }, confirmations });
  const first = await service.confirm(claims, { policyVersion: 4, acknowledge: true });
  current = { ...resolution, source: 'exception', policyId: undefined, sourceRecordId: 'b'.repeat(24), exceptionId: 'b'.repeat(24) };
  const next = await service.confirm(claims, { policyVersion: 4, acknowledge: true });
  assert.notEqual(next.confirmationId, first.confirmationId);
  assert.equal((await service.confirm(claims, { policyVersion: 4, acknowledge: true })).confirmationId, next.confirmationId);
  const list = await confirmations.listConfirmations({ ...claims, role: 'admin' }, { accountId: providerId });
  assert.equal(list.total, 2);
  assert.equal(list.items.find(item => item.id === first.confirmationId)?.status, 'superseded');
  assert.equal(list.items.find(item => item.id === next.confirmationId)?.exceptionId, 'b'.repeat(24));
});

test('retains exception identity and installs the source-aware index before retiring the legacy index', async () => {
  const exceptionId = 'b'.repeat(24);
  const memory = createCommissionConfirmationService();
  const saved = await memory.acknowledge(claims, { accountId: providerId, source: 'exception', sourceRecordId: exceptionId, exceptionId, policyVersion: 1, effectiveAt: resolution.effectiveAt, acknowledge: true });
  const operations: string[] = [];
  let legacyPresent = true;
  const collection = {
    async createIndex(keys: object, options: { name: string; unique?: boolean }) {
      operations.push(options.name);
      if (options.name === 'commission_confirmations_account_source_version_unique') {
        assert.deepEqual(keys, { accountId: 1, source: 1, sourceRecordId: 1, policyVersion: 1 });
        assert.equal(options.unique, true);
      }
    },
    async dropIndex(name: string) { operations.push(`drop:${name}`); if (!legacyPresent) throw Object.assign(new Error('Index not found'), { code: 27 }); legacyPresent = false; },
    find(_filter: unknown, options: { projection: Record<string, number> }) {
      return { toArray: async () => [Object.fromEntries(Object.entries(saved).filter(([key]) => options.projection[key] === 1))] };
    }
  };
  const connection = { collection: () => collection } as unknown as Connection;
  assert.deepEqual(await createMongooseCommissionConfirmationRepository(connection).list(), [saved]);
  assert.ok(operations.indexOf('commission_confirmations_account_source_version_unique') < operations.indexOf('drop:commission_confirmations_account_policy_unique'));
  assert.deepEqual(await createMongooseCommissionConfirmationRepository(connection).list(), [saved]);
});

test('preserves the legacy index on a failed replacement build and retries initialization later', async () => {
  let failed = false, drops = 0;
  const repository = createMongooseCommissionConfirmationRepository({ collection: () => ({
    async createIndex() { if (!failed) { failed = true; throw Object.assign(new Error('Index build failed'), { code: 13 }); } },
    async dropIndex() { drops++; },
    find: () => ({ toArray: async () => [] })
  }) } as unknown as Connection);
  await assert.rejects(repository.list(), /Index build failed/);
  assert.equal(drops, 0);
  assert.deepEqual(await repository.list(), []);
  assert.equal(drops, 1);
});

test('derives confirmation ownership and source fields from the current resolution', async () => {
  const service = createProviderCommissionConfirmationService({
    source: { getForProvider: async () => resolution },
    confirmations: createCommissionConfirmationService({ now: () => new Date('2026-09-02T00:00:00.000Z') })
  });
  const first = await service.confirm(claims, { policyVersion: 4, acknowledge: true });
  const replay = await service.confirm(claims, { policyVersion: 4, acknowledge: true });
  assert.equal(first.confirmationId, replay.confirmationId);
  assert.deepEqual(first, {
    confirmationId: first.confirmationId,
    policyVersion: 4,
    status: 'acknowledged',
    effectiveAt: resolution.effectiveAt,
    acknowledgedAt: '2026-09-02T00:00:00.000Z'
  });
});

test('rejects absent and stale effective policies without writing a confirmation', async () => {
  let writes = 0;
  const confirmations = {
    async acknowledge() {
      writes += 1;
      throw new Error('must not write');
    }
  };
  const absent = createProviderCommissionConfirmationService({
    source: { getForProvider: async () => undefined },
    confirmations
  });
  await assert.rejects(
    absent.confirm(claims, { policyVersion: 4, acknowledge: true }),
    (error: unknown) => error instanceof ProviderCommissionConfirmationError && error.code === 'PROVIDER_COMMISSION_CONFIRMATION_NOT_FOUND'
  );
  const stale = createProviderCommissionConfirmationService({
    source: { getForProvider: async () => resolution },
    confirmations
  });
  await assert.rejects(
    stale.confirm(claims, { policyVersion: 3, acknowledge: true }),
    (error: unknown) => error instanceof ProviderCommissionConfirmationError && error.code === 'PROVIDER_COMMISSION_CONFIRMATION_VERSION_CONFLICT'
  );
  assert.equal(writes, 0);
});
