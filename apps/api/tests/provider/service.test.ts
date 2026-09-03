import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, OpaqueTokenService } from '../../src/modules/auth/crypto.js';
import type { IssuedAuthSession } from '../../src/modules/auth/service.js';
import type {
  ProviderApplicationEntity,
  ProviderDocumentInventory,
  ProviderRepository
} from '../../src/modules/provider/repository.js';
import {
  createProviderService,
  ProviderServiceError
} from '../../src/modules/provider/service.js';
import {
  createProviderAdvertisingProjectionService,
  ProviderAdvertisingProjectionError,
  type ProviderAdvertisingRequestRecord
} from '../../src/modules/provider/advertising.js';
import {
  createProviderCommissionProjectionService,
  ProviderCommissionProjectionError
} from '../../src/modules/provider/commission.js';
import type { CommissionResolution } from '@sadat-real-estate/contracts';

const providerId = '0123456789abcdef01234567';
const applicationId = 'abcdefabcdefabcdefabcdef';
const claims: AccessTokenClaims = {
  iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: providerId,
  sid: '111111111111111111111111', role: 'provider', status: 'draft',
  iat: 1, exp: 9_999_999_999, jti: 'test'
};

const dates = {
  createdAt: new Date('2026-08-13T00:00:00.000Z'),
  updatedAt: new Date('2026-08-13T00:00:00.000Z')
};

function baseApplication(
  overrides: Partial<ProviderApplicationEntity> = {}
): ProviderApplicationEntity {
  return {
    id: applicationId,
    userId: providerId,
    phone: '+201000000000',
    email: 'provider@example.com',
    providerType: 'individual_broker',
    status: 'draft',
    version: 0,
    requirementVersion: '2026-08-13.1',
    ...dates,
    ...overrides
  };
}

function tokenService(): OpaqueTokenService {
  return {
    create: () => 'T'.repeat(43),
    hash: (token) => `hash:${token}`,
    isValid: (token) => token.length === 43
  };
}

function session(): IssuedAuthSession {
  return {
    data: {
      accessToken: 'header.payload.signature', tokenType: 'Bearer', expiresInSeconds: 900,
      user: { id: providerId, roleType: 'provider', status: 'draft' }
    },
    refreshToken: 'R'.repeat(43),
    refreshExpiresAt: new Date('2026-09-13T00:00:00.000Z')
  };
}

function repository(initial = baseApplication()): ProviderRepository {
  let current = initial;
  return {
    async createDraft(input) {
      current = baseApplication({
        providerType: input.providerType,
        phone: input.phone,
        email: input.email
      });
      return current;
    },
    async findByUserId(userId) {
      return userId === providerId ? current : undefined;
    },
    async updateDraft(userId, expectedVersion, patch) {
      if (userId !== providerId) return { kind: 'not_found' };
      if (current.status !== 'draft' && current.status !== 'needs_information') {
        return { kind: 'not_editable' };
      }
      if (current.version !== expectedVersion) return { kind: 'version_conflict' };
      current = { ...current, ...patch, version: current.version + 1, updatedAt: new Date('2026-08-13T01:00:00.000Z') };
      return { kind: 'updated', application: current };
    },
    async submit(userId, expectedVersion, snapshot, now) {
      if (userId !== providerId) return { kind: 'not_found' };
      if (current.status !== 'draft' && current.status !== 'needs_information') {
        return { kind: 'not_editable' };
      }
      if (current.version !== expectedVersion) return { kind: 'version_conflict' };
      current = {
        ...current,
        status: 'pending_review',
        version: current.version + 1,
        requirementsSnapshot: snapshot,
        submittedAt: now,
        updatedAt: now
      };
      return { kind: 'updated', application: current };
    }
  };
}

function inventory(categories: string[] = []): ProviderDocumentInventory {
  return {
    async list() {
      return categories.map((category) => ({
        category: category as 'government_id_front',
        status: 'uploaded' as const
      }));
    }
  };
}

function service(
  repo: ProviderRepository = repository(),
  documents: ProviderDocumentInventory = inventory()
) {
  return createProviderService({
    repository: repo,
    documentInventory: documents,
    registrationTokens: tokenService(),
    redeemRegistrationGrant: async () => ({
      phone: '+201000000000', email: 'provider@example.com', roleType: 'provider', purpose: 'registration'
    }),
    authService: { issueAccount: async () => session(), setAccountPassword: async () => {} },
    now: () => new Date('2026-08-13T02:00:00.000Z')
  });
}

const completeCommon = {
  accountOwnerFullName: 'Mona Hassan',
  displayName: 'Mona Properties',
  email: 'mona@example.com',
  primaryLocationId: '222222222222222222222222',
  serviceAreaIds: ['333333333333333333333333'],
  preferredLocale: 'ar' as const,
  termsAcceptedAt: new Date('2026-08-13T00:00:00.000Z'),
  privacyAcceptedAt: new Date('2026-08-13T00:00:00.000Z')
};

test('registers a provider draft from a one-time provider OTP authority and issues a shared session', async () => {
  let redeemed = '';
  const result = await createProviderService({
    repository: repository(),
    documentInventory: inventory(),
    registrationTokens: tokenService(),
    redeemRegistrationGrant: async (hash) => {
      redeemed = hash;
      return {
        phone: '+201000000000',
        email: 'provider@example.com',
        roleType: 'provider',
        purpose: 'registration'
      };
    },
    authService: { issueAccount: async () => session(), setAccountPassword: async () => {} }
  }).registerDraft({ verificationToken: 'T'.repeat(43), providerType: 'brokerage_office', password: 'Abc1!xyz' });
  assert.equal(redeemed, 'hash:' + 'T'.repeat(43));
  assert.equal(result.data.outcome, 'registered_draft');
  assert.equal(result.data.application.providerType, 'brokerage_office');
  assert.equal(result.data.session.user.roleType, 'provider');
});

test('rejects invalid registration authority and preserves subject-only ownership', async () => {
  const invalid = createProviderService({
    repository: repository(), documentInventory: inventory(), registrationTokens: tokenService(),
    redeemRegistrationGrant: async () => undefined,
    authService: { issueAccount: async () => session() }
  });
  await assert.rejects(
    () => invalid.registerDraft({ verificationToken: 'T'.repeat(43), providerType: 'individual_broker' }),
    (error: unknown) => error instanceof ProviderServiceError && error.code === 'INVALID_REGISTRATION_TOKEN'
  );
  await assert.rejects(
    () => service().getApplication({ ...claims, sub: '999999999999999999999999' }),
    (error: unknown) => error instanceof ProviderServiceError && error.code === 'PROVIDER_APPLICATION_NOT_FOUND'
  );
});

test('saves incomplete drafts, enforces step type, and detects stale versions', async () => {
  const provider = service();
  const updated = await provider.updateAccount(claims, { version: 0, displayName: 'Updated Name' });
  assert.equal(updated.version, 1);
  assert.equal(updated.email, 'provider@example.com');
  assert.equal(updated.missingFields.includes('email'), false);
  await assert.rejects(
    () => provider.updateAccount(claims, { version: 0, displayName: 'Stale' }),
    (error: unknown) => error instanceof ProviderServiceError
      && error.code === 'PROVIDER_APPLICATION_VERSION_CONFLICT'
  );
  await assert.rejects(
    () => provider.updateBusiness(claims, { version: 1, legalBusinessName: 'Wrong step' }),
    (error: unknown) => error instanceof ProviderServiceError
      && error.code === 'PROVIDER_STEP_NOT_APPLICABLE'
  );
});

test('blocks incomplete submission with safe field/document details', async () => {
  await assert.rejects(
    () => service().submit(claims, { version: 0 }),
    (error: unknown) => {
      assert.ok(error instanceof ProviderServiceError);
      assert.equal(error.code, 'PROVIDER_APPLICATION_INCOMPLETE');
      assert.ok(error.details.some((detail) => detail.path[0] === 'accountOwnerFullName'));
      assert.ok(error.details.some((detail) => detail.path[1] === 'government_id_front'));
      return true;
    }
  );
});

test('submits complete drafts with an immutable requirement snapshot and no approval claim', async () => {
  const repo = repository(baseApplication(completeCommon));
  const provider = service(repo, inventory(['government_id_front', 'government_id_back']));
  const submitted = await provider.submit(claims, { version: 0 });
  assert.equal(submitted.status, 'pending_review');
  assert.equal(submitted.version, 1);
  assert.equal(submitted.requirementsSnapshot?.version, '2026-08-13.1');
  assert.deepEqual(submitted.availableActions, ['view_status']);
  assert.equal(submitted.status === 'approved', false);
  await assert.rejects(
    () => provider.submit(claims, { version: 1 }),
    (error: unknown) => error instanceof ProviderServiceError
      && error.code === 'PROVIDER_APPLICATION_NOT_EDITABLE'
  );
});

test('projects provider-owned advertising history, quote, payment, and schedule without admin or storage internals', async () => {
  const verifiedClaims = { ...claims, status: 'verified' as const };
  const request = {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa', providerId, placementKey: 'homepage.hero', purpose: 'Promote a reviewed project',
    intervalStart: '2026-09-01T09:00:00+00:00', intervalEnd: '2026-09-02T09:00:00+00:00', status: 'waiting_payment' as const,
    version: 4, createdAt: '2026-08-13T00:00:00+00:00', updatedAt: '2026-08-13T01:00:00+00:00'
  };
  const record: ProviderAdvertisingRequestRecord = {
    request,
    history: [
      { status: 'draft', version: 0, changedAt: '2026-08-13T00:00:00+00:00' },
      { status: 'waiting_payment', version: 4, reason: 'Quote accepted', changedAt: '2026-08-13T01:00:00+00:00' }
    ],
    quote: {
      id: 'bbbbbbbbbbbbbbbbbbbbbbbb', requestId: request.id, providerId, currency: 'EGP',
      lineItems: [{ description: 'Placement day', quantity: 1, unitAmountMinor: 1000 }], totalMinor: 1000,
      validUntil: '2026-10-01T00:00:00+00:00', terms: 'Manual quote', status: 'accepted', issuerId: 'cccccccccccccccccccccccc',
      version: 1, decisionHistory: [
        { action: 'issued', actorId: 'cccccccccccccccccccccccc', actorRole: 'admin', version: 0, createdAt: '2026-08-13T00:30:00+00:00' },
        { action: 'accepted', actorId: providerId, actorRole: 'provider', version: 1, createdAt: '2026-08-13T01:00:00+00:00' }
      ], createdAt: '2026-08-13T00:30:00+00:00', updatedAt: '2026-08-13T01:00:00+00:00'
    },
    paymentProofs: [{
      id: 'dddddddddddddddddddddddd', adRequestId: request.id, providerId, originalFilename: 'proof.png', normalizedExtension: '.png', detectedMime: 'image/png', byteSize: 100,
      sha256: 'e'.repeat(64), version: 1, securityState: 'clean', status: 'pending_review', reviewHistory: [], uploadedAt: '2026-08-13T01:00:00+00:00', active: true, idempotentReplay: false
    }],
    schedule: { requestId: request.id, placementKey: request.placementKey, providerId, status: 'scheduled', startsAt: request.intervalStart, endsAt: request.intervalEnd, timezone: 'Africa/Cairo', localStart: '2026-09-01T12:00:00', localEnd: '2026-09-02T12:00:00', version: 5 }
  };
  const projection = createProviderAdvertisingProjectionService({ source: { listForProvider: async (ownerId) => ownerId === providerId ? [record] : [], findForProvider: async (ownerId, requestId) => ownerId === providerId && requestId === request.id ? record : undefined } });
  const list = await projection.list(verifiedClaims, { page: 1, limit: 10 });
  assert.equal(list.total, 1);
  assert.equal(list.items[0]?.quote?.totalMinor, 1000);
  assert.equal(list.items[0]?.paymentProofs[0]?.status, 'pending_review');
  assert.equal(list.items[0]?.schedule?.timezone, 'Africa/Cairo');
  assert.equal('providerId' in list.items[0]!, false);
  assert.equal('storageKey' in list.items[0]!, false);
  const detail = await projection.get(verifiedClaims, request.id);
  assert.equal(detail.history.length, 2);
  await assert.rejects(() => projection.list(claims, {}), (error) => error instanceof ProviderAdvertisingProjectionError && error.code === 'PROVIDER_AD_FORBIDDEN');
  await assert.rejects(() => projection.get(verifiedClaims, 'ffffffffffffffffffffffff'), (error) => error instanceof ProviderAdvertisingProjectionError && error.code === 'PROVIDER_AD_NOT_FOUND');
  const idor = createProviderAdvertisingProjectionService({ source: { listForProvider: async () => [{ ...record, request: { ...record.request, providerId: '999999999999999999999999' } }] } });
  await assert.rejects(() => idor.list(verifiedClaims, {}), (error) => error instanceof ProviderAdvertisingProjectionError && error.code === 'PROVIDER_AD_NOT_FOUND');
});

test('projects the effective commission read-only and strips resolver internals', async () => {
  const verifiedClaims = { ...claims, status: 'verified' as const };
  const resolution: CommissionResolution = {
    accountId: providerId,
    source: 'exception',
    effectiveAt: '2026-08-13T00:00:00.000Z',
    sourceRecordId: 'eeeeeeeeeeeeeeeeeeeeeeee',
    sourceVersion: 3,
    exceptionId: 'eeeeeeeeeeeeeeeeeeeeeeee',
    kind: 'percentage',
    percentageBps: 275
  };
  const projection = createProviderCommissionProjectionService({ source: { getForProvider: async () => resolution } });
  const result = await projection.get(verifiedClaims);
  assert.deepEqual(result, {
    accountId: providerId,
    source: 'exception',
    effectiveAt: '2026-08-13T00:00:00.000Z',
    policyVersion: 3,
    kind: 'percentage',
    percentageBps: 275,
    readOnly: true
  });
  assert.equal('sourceRecordId' in result, false);
  assert.equal('exceptionId' in result, false);
  assert.equal('update' in projection, false);
  assert.equal('acknowledge' in projection, false);
});

test('returns an explicit none projection when no commission is available', async () => {
  const verifiedClaims = { ...claims, status: 'verified' as const };
  const projection = createProviderCommissionProjectionService({
    source: { getForProvider: async () => undefined },
    now: () => new Date('2026-08-14T00:00:00.000Z')
  });
  assert.deepEqual(await projection.getCommission(verifiedClaims), {
    accountId: providerId,
    source: 'none',
    effectiveAt: '2026-08-14T00:00:00.000Z',
    readOnly: true
  });
});

test('enforces verified provider access, owner binding, and strict source validation', async () => {
  const verifiedClaims = { ...claims, status: 'verified' as const };
  const resolution: CommissionResolution = {
    accountId: providerId,
    source: 'policy',
    effectiveAt: '2026-08-13T00:00:00.000Z',
    sourceRecordId: 'ffffffffffffffffffffffff',
    sourceVersion: 1,
    policyId: 'ffffffffffffffffffffffff',
    kind: 'fixed',
    fixedAmountMinor: 150_000,
    currency: 'EGP'
  };
  const projection = createProviderCommissionProjectionService({ source: { getForProvider: async () => resolution } });
  await assert.rejects(() => projection.get(claims), (error) => error instanceof ProviderCommissionProjectionError && error.code === 'PROVIDER_COMMISSION_FORBIDDEN');
  await assert.rejects(
    () => createProviderCommissionProjectionService({ source: { getForProvider: async () => ({ ...resolution, accountId: '999999999999999999999999' }) } }).get(verifiedClaims),
    (error) => error instanceof ProviderCommissionProjectionError && error.code === 'PROVIDER_COMMISSION_NOT_FOUND'
  );
  await assert.rejects(
    () => createProviderCommissionProjectionService({ source: { getForProvider: async () => ({ ...resolution, sourceVersion: undefined }) as unknown as CommissionResolution } }).get(verifiedClaims),
    (error) => error instanceof ProviderCommissionProjectionError && error.code === 'PROVIDER_COMMISSION_SOURCE_INVALID'
  );
  assert.throws(
    () => projection.validateProjection({
      accountId: providerId,
      source: 'policy',
      effectiveAt: '2026-08-13T00:00:00.000Z',
      policyVersion: 1,
      kind: 'fixed',
      fixedAmountMinor: 150_000,
      currency: 'EGP',
      readOnly: true,
      unexpected: true
    }),
    /Unrecognized key/
  );
});
