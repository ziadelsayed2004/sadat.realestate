import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import type { AuthService, IssuedAuthSession } from '../../src/modules/auth/service.js';
import {
  createSeekerService,
  SeekerServiceError
} from '../../src/modules/seeker/service.js';
import type { SeekerRepository } from '../../src/modules/seeker/repository.js';
import type { OpaqueTokenService } from '../../src/modules/auth/crypto.js';

const claims: AccessTokenClaims = {
  iss: 'sadat-real-estate-api', aud: 'sadat-real-estate',
  sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef',
  role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test'
};

const account = {
  id: claims.sub,
  email: 'seeker@example.com',
  status: 'verified' as const,
  locale: 'ar' as const,
  firstName: 'Salma',
  lastName: 'Hassan'
};

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
      user: { id: account.id, roleType: 'seeker', status: account.status }
    },
    refreshToken: 'R'.repeat(43),
    refreshExpiresAt: new Date('2026-09-01T00:00:00.000Z')
  };
}

function repository(overrides: Partial<SeekerRepository> = {}): SeekerRepository {
  let preferences = { preferences: {}, updatedAt: new Date('2026-08-01T00:00:00.000Z') };
  return {
    async create() { return account; },
    async findByUserId() { return account; },
    async updateProfile(_id, patch) {
      return { ...account, ...patch };
    },
    async findPreferences() { return preferences; },
    async updatePreferences(_id, value) {
      preferences = { preferences: value, updatedAt: new Date('2026-08-02T00:00:00.000Z') };
      return preferences;
    },
    ...overrides
  };
}

function authService(): Pick<AuthService, 'issueAccount'> {
  return { async issueAccount() { return session(); } };
}

function service(repo: SeekerRepository = repository(), redeem = async () => ({
  email: account.email,
  roleType: 'seeker' as const,
  purpose: 'registration' as const
})) {
  return createSeekerService({
    repository: repo,
    registrationTokens: tokenService(),
    redeemRegistrationGrant: redeem,
    authService: authService(),
    now: () => new Date('2026-08-01T00:00:00.000Z')
  });
}

test('registers a verified seeker from a one-time OTP grant and issues a shared session', async () => {
  let hashInput = '';
  const result = await createSeekerService({
    repository: repository(),
    registrationTokens: { ...tokenService(), hash: (value) => { hashInput = value; return `hash:${value}`; } },
    redeemRegistrationGrant: async (hash) => {
      assert.equal(hash, 'hash:' + 'T'.repeat(43));
      return {
        email: account.email,
        roleType: 'seeker',
        purpose: 'registration'
      };
    },
    authService: authService()
  }).register({ verificationToken: 'T'.repeat(43), firstName: 'Salma', lastName: 'Hassan' });
  assert.equal(hashInput, 'T'.repeat(43));
  assert.equal(result.data.outcome, 'registered');
  assert.equal(result.data.session.user.roleType, 'seeker');
});

test('rejects invalid grants and preserves strict self ownership for profile/preferences', async () => {
  await assert.rejects(
    () => service(repository(), async () => undefined).register({
      verificationToken: 'T'.repeat(43), firstName: 'Salma', lastName: 'Hassan'
    }),
    (error: unknown) => error instanceof SeekerServiceError && error.code === 'INVALID_REGISTRATION_TOKEN'
  );
  const seeker = service();
  assert.equal((await seeker.getProfile(claims)).id, claims.sub);
  assert.equal((await seeker.updateProfile(claims, { firstName: 'Mariam' })).firstName, 'Mariam');
  assert.deepEqual((await seeker.getPreferences(claims)).data, {});
  assert.deepEqual(
    (await seeker.updatePreferences(claims, { locations: ['new-cairo'] })).data,
    { locations: ['new-cairo'] }
  );
  await assert.rejects(
    () => seeker.getProfile({ ...claims, role: 'admin' } as AccessTokenClaims),
    (error: unknown) => error instanceof SeekerServiceError && error.code === 'ACCOUNT_NOT_ACTIVE'
  );
});
