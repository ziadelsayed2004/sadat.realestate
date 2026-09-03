import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AccessTokenService,
  OpaqueTokenService,
  PasswordHasher
} from '../../src/modules/auth/crypto.js';
import type {
  AdminLoginRecord,
  AuthRepository,
  SessionRotationResult
} from '../../src/modules/auth/repository.js';
import {
  AuthServiceError,
  createAuthService
} from '../../src/modules/auth/service.js';

const account: AdminLoginRecord = {
  id: '0123456789abcdef01234567',
  roleType: 'admin',
  status: 'verified',
  passwordHash: 'admin-hash'
};

const passwordHasher: PasswordHasher = {
  async hash() { return 'dummy-hash'; },
  async verify(passwordHash, password) {
    return passwordHash === 'admin-hash' && password === 'correct-password';
  }
};

const accessTokens: AccessTokenService = {
  issue() { return 'header.payload.signature'; },
  verify() { throw new Error('not used by the auth service'); }
};

function tokenService(): OpaqueTokenService {
  let counter = 0;
  return {
    create() {
      counter += 1;
      return String(counter).padStart(43, 'A');
    },
    hash(token) { return `hash-${token}`; },
    isValid(token) { return token.length === 43; }
  };
}

function repository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    async findAdminLogin() { return account; },
    async createAccountPassword() { return true; },
    async updateAdminPassword() { return true; },
    async createSession() { return { sessionId: 'abcdefabcdefabcdefabcdef' }; },
    async rotateSession() {
      return {
        kind: 'rotated',
        account,
        sessionId: 'fedcbafedcbafedcbafedcba'
      };
    },
    async revokeSession() { return true; },
    ...overrides
  };
}

function service(repo: AuthRepository) {
  return createAuthService({
    repository: repo,
    passwordHasher,
    accessTokens,
    refreshTokens: tokenService(),
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 2_592_000,
    now: () => new Date('2026-08-12T12:00:00.000Z')
  });
}

async function rejectsWithCode(run: () => Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof AuthServiceError);
    assert.equal(error.code, code);
    return true;
  });
}

test('logs in only verified Admin credentials and issues a hashed refresh session', async () => {
  let created: Parameters<AuthRepository['createSession']>[0] | undefined;
  const auth = service(repository({
    async createSession(input) {
      created = input;
      return { sessionId: 'abcdefabcdefabcdefabcdef' };
    }
  }));
  const result = await auth.loginAdmin({
    email: 'admin@example.com',
    password: 'correct-password'
  });
  assert.equal(result.data.user.roleType, 'admin');
  assert.deepEqual(result.data.user, {
    id: account.id,
    roleType: 'admin',
    status: 'verified'
  });
  assert.equal(result.data.accessToken, 'header.payload.signature');
  assert.equal(result.refreshToken.length, 43);
  assert.equal(created?.userId, account.id);
  assert.match(created?.tokenHash ?? '', /^hash-/);
  assert.equal(created?.tokenHash.includes(result.refreshToken), true);
  assert.equal(created?.expiresAt.toISOString(), '2026-09-11T12:00:00.000Z');
});

test('logs in a provider through the same email/password endpoint', async () => {
  const provider = {
    id: '111111111111111111111111',
    roleType: 'provider' as const,
    status: 'pending_review' as const,
    passwordHash: 'admin-hash'
  };
  const auth = service(repository({
    async findAccountLogin() { return provider; }
  }));
  const result = await auth.loginAdmin({ email: 'provider@example.com', password: 'correct-password' });
  assert.deepEqual(result.data.user, {
    id: provider.id,
    roleType: 'provider',
    status: 'pending_review'
  });
});

test('resets a non-admin account password and revokes its sessions', async () => {
  let received: { email: string; roleType: string; passwordHash: string } | undefined;
  const auth = service(repository({
    async updateAccountPassword(email, roleType, passwordHash) {
      received = { email, roleType, passwordHash };
      return true;
    }
  }));
  await auth.resetAccountPassword?.('provider@example.com', 'provider', 'NewPassword1!');
  assert.deepEqual(received, {
    email: 'provider@example.com',
    roleType: 'provider',
    passwordHash: 'dummy-hash'
  });
});

test('uses a dummy Argon2 verification path and returns one generic invalid-credentials error', async () => {
  const auth = service(repository({ async findAdminLogin() { return undefined; } }));
  await rejectsWithCode(
    () => auth.loginAdmin({ email: 'missing@example.com', password: 'wrong' }),
    'INVALID_CREDENTIALS'
  );
  await rejectsWithCode(
    () => service(repository()).loginAdmin({ email: 'admin@example.com', password: 'wrong' }),
    'INVALID_CREDENTIALS'
  );
});

test('rejects valid credentials for a non-active Admin account', async () => {
  const auth = service(repository({
    async findAdminLogin() { return { ...account, status: 'suspended' }; }
  }));
  await rejectsWithCode(
    () => auth.loginAdmin({ email: 'admin@example.com', password: 'correct-password' }),
    'ACCOUNT_NOT_ACTIVE'
  );
});

test('issues the shared session model for active email-authenticated accounts only', async () => {
  const auth = service(repository());
  const issued = await auth.issueAccount({
    id: '111111111111111111111111', roleType: 'provider', status: 'pending_review'
  });
  assert.equal(issued.data.user.roleType, 'provider');
  assert.equal(issued.data.user.status, 'pending_review');
  await rejectsWithCode(
    () => auth.issueAccount({
      id: '111111111111111111111111', roleType: 'seeker', status: 'suspended'
    }),
    'ACCOUNT_NOT_ACTIVE'
  );
});

test('rotates an opaque refresh token and maps invalid, reuse, and inactive outcomes', async () => {
  let outcome: SessionRotationResult = {
    kind: 'rotated',
    account,
    sessionId: 'fedcbafedcbafedcbafedcba'
  };
  const auth = service(repository({ async rotateSession() { return outcome; } }));
  const first = await auth.refresh('R'.repeat(43));
  assert.equal(first.data.user.id, account.id);
  assert.notEqual(first.refreshToken, 'R'.repeat(43));

  outcome = { kind: 'invalid' };
  await rejectsWithCode(() => auth.refresh('R'.repeat(43)), 'INVALID_REFRESH_TOKEN');
  outcome = { kind: 'reuse_detected' };
  await rejectsWithCode(() => auth.refresh('R'.repeat(43)), 'REFRESH_TOKEN_REUSED');
  outcome = { kind: 'account_not_active' };
  await rejectsWithCode(() => auth.refresh('R'.repeat(43)), 'ACCOUNT_NOT_ACTIVE');
  await rejectsWithCode(() => auth.refresh('malformed'), 'INVALID_REFRESH_TOKEN');
});

test('revokes logout sessions and treats absent/replayed tokens as unauthenticated', async () => {
  let revoked = true;
  const auth = service(repository({ async revokeSession() { return revoked; } }));
  await auth.logout('L'.repeat(43));
  revoked = false;
  await rejectsWithCode(() => auth.logout('L'.repeat(43)), 'INVALID_REFRESH_TOKEN');
  await rejectsWithCode(() => auth.logout('bad'), 'INVALID_REFRESH_TOKEN');
});
