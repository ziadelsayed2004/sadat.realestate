import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, OpaqueTokenService } from '../../src/modules/auth/crypto.js';
import type { AuthService, IssuedAuthSession } from '../../src/modules/auth/service.js';
import type {
  ProviderApplicationEntity,
  ProviderDocumentInventory,
  ProviderRepository
} from '../../src/modules/provider/repository.js';
import {
  createProviderService,
  ProviderServiceError
} from '../../src/modules/provider/service.js';

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
      current = baseApplication({ providerType: input.providerType, phone: input.phone });
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
      phone: '+201000000000', roleType: 'provider', purpose: 'registration'
    }),
    authService: { issueAccount: async () => session() } as Pick<AuthService, 'issueAccount'>,
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
      return { phone: '+201000000000', roleType: 'provider', purpose: 'registration' };
    },
    authService: { issueAccount: async () => session() }
  }).registerDraft({ verificationToken: 'T'.repeat(43), providerType: 'brokerage_office' });
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
  assert.ok(updated.missingFields.includes('email'));
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
