import assert from 'node:assert/strict';
import test from 'node:test';
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
