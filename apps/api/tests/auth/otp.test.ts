import assert from 'node:assert/strict';
import test from 'node:test';
import type { OpaqueTokenService, OtpCodeHasher } from '../../src/modules/auth/crypto.js';
import {
  createDeterministicFakeOtpProvider,
  createDeterministicOtpCodeGenerator,
  createSmtpOtpProvider,
  createUnconfiguredOtpProvider,
  type OtpDelivery,
  type SmtpTransport
} from '../../src/modules/auth/otp-provider.js';
import {
  createOtpService,
  OtpServiceError
} from '../../src/modules/auth/otp-service.js';
import type {
  OtpChallenge,
  OtpRepository
} from '../../src/modules/auth/repository.js';

const now = new Date('2026-08-13T12:00:00.000Z');
const challengeId = '123e4567-e89b-42d3-a456-426614174000';
const challenge: OtpChallenge = {
  id: '0123456789abcdef01234567',
  email: 'seeker@example.com',
  roleType: 'seeker',
  purpose: 'login',
  codeHash: 'hash:000000',
  attemptsRemaining: 5
};

const codeHasher: OtpCodeHasher = {
  hash(_context, code) { return `hash:${code}`; },
  matches(_context, code, storedHash) { return storedHash === `hash:${code}`; }
};

const verificationTokens: OpaqueTokenService = {
  create: () => 'V'.repeat(43),
  hash: (token) => `hash-${token}`,
  isValid: (token) => token.length === 43
};

function repository(overrides: Partial<OtpRepository> = {}): OtpRepository {
  return {
    async createChallenge() { return { kind: 'created' }; },
    async cancelChallenge() {},
    async findChallenge() { return challenge; },
    async recordFailedAttempt() { return { kind: 'retry', attemptsRemaining: 4 }; },
    async consumeLoginChallenge() { return true; },
    async verifyRegistrationChallenge() { return true; },
    async findOtpAccount() {
      return { id: '0123456789abcdef01234567', roleType: 'seeker', status: 'verified' };
    },
    async redeemRegistrationGrant() { return undefined; },
    ...overrides
  };
}

function service(repo: OtpRepository, provider = createDeterministicFakeOtpProvider()) {
  return createOtpService({
    repository: repo,
    provider,
    codeGenerator: createDeterministicOtpCodeGenerator(),
    codeHasher,
    verificationTokens,
    authService: {
      async issueAccount(account) {
        return {
          data: {
            accessToken: 'header.payload.signature',
            tokenType: 'Bearer',
            expiresInSeconds: 900,
            user: account
          },
          refreshToken: 'R'.repeat(43),
          refreshExpiresAt: new Date('2026-09-12T12:00:00.000Z')
        };
      }
    },
    now: () => now,
    createChallengeId: () => challengeId
  });
}

async function rejectsWithCode(run: () => Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof OtpServiceError);
    assert.equal(error.code, code);
    return true;
  });
}

test('uses deterministic Local/Test adapters without logging or returning the raw OTP', async () => {
  let delivered: OtpDelivery | undefined;
  let persistedHash = '';
  const otp = service(repository({
    async createChallenge(input) {
      persistedHash = input.codeHash;
      return { kind: 'created' };
    }
  }), createDeterministicFakeOtpProvider((delivery) => { delivered = delivery; }));
  const result = await otp.send({
    email: 'seeker@example.com', roleType: 'seeker', purpose: 'login'
  });
  assert.deepEqual(result, {
    accepted: true,
    challengeId,
    expiresInSeconds: 300,
    retryAfterSeconds: 60
  });
  assert.equal(delivered?.code, '000000');
  assert.equal(persistedHash, 'hash:000000');
  assert.equal(JSON.stringify(result).includes('000000'), false);
});

test('delivers an Arabic-first OTP email to the email identity', async () => {
  let message: Parameters<SmtpTransport['sendMail']>[0] | undefined;
  const transport: SmtpTransport = {
    async verify() { return true; },
    async sendMail(value) { message = value; return { accepted: [value.to] }; }
  };
  const provider = createSmtpOtpProvider({
    host: 'smtp.hostinger.com',
    port: 465,
    tls: 'implicit',
    user: 'info@elsadatrealestate.com',
    password: 'synthetic',
    from: 'Elsadat Real Estate <info@elsadatrealestate.com>'
  }, transport);
  await provider.send({
    email: 'seeker@example.com',
    roleType: 'seeker',
    purpose: 'login',
    code: '123456',
    expiresAt: new Date(Date.now() + 300_000)
  });
  assert.equal(provider.kind, 'smtp');
  assert.equal(await provider.isReady(), true);
  assert.equal(await provider.verify(), true);
  assert.equal(message?.to, 'seeker@example.com');
  assert.equal(message?.from, 'Elsadat Real Estate <info@elsadatrealestate.com>');
  assert.doesNotMatch(message?.subject ?? '', /123456/);
  assert.match(message?.html ?? '', /رمز التحقق/);
  assert.match(message?.text ?? '', /Never share this code/);
  assert.equal(JSON.stringify(message).includes('+201000000000'), false);
});

test('SMTP readiness verifies credentials and fails closed without exposing transport errors', async () => {
  const provider = createSmtpOtpProvider({
    host: 'smtp.hostinger.com',
    port: 465,
    tls: 'implicit',
    user: 'info@elsadatrealestate.com',
    password: 'synthetic',
    from: 'Elsadat Real Estate <info@elsadatrealestate.com>'
  }, {
    async verify() { throw new Error('synthetic credential detail'); },
    async sendMail() { throw new Error('must not send'); }
  });

  assert.equal(await provider.isReady(), false);
  assert.equal(await provider.verify(), false);
});

test('fails closed for unconfigured or failed providers and invalidates failed delivery', async () => {
  await rejectsWithCode(
    () => service(repository(), createUnconfiguredOtpProvider()).send({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login'
    }),
    'OTP_PROVIDER_UNAVAILABLE'
  );
  let cancelled = false;
  await rejectsWithCode(
    () => service(repository({ async cancelChallenge() { cancelled = true; } }), {
      kind: 'external', isReady: () => true, async send() { throw new Error('synthetic failure'); }
    }).send({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login'
    }),
    'OTP_PROVIDER_UNAVAILABLE'
  );
  assert.equal(cancelled, true);
});

test('enforces target resend cooldown and a bounded invalid-attempt state', async () => {
  await rejectsWithCode(
    () => service(repository({
      async createChallenge() { return { kind: 'cooldown', retryAfterSeconds: 42 }; }
    })).send({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login'
    }),
    'OTP_SEND_RATE_LIMITED'
  );
  await rejectsWithCode(
    () => service(repository()).verify({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '111111'
    }),
    'INVALID_OTP'
  );
  await rejectsWithCode(
    () => service(repository({
      async recordFailedAttempt() { return { kind: 'exhausted' }; }
    })).verify({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '111111'
    }),
    'OTP_ATTEMPTS_EXCEEDED'
  );
});

test('authenticates an existing email account through the shared rotating-session boundary', async () => {
  const result = await service(repository()).verify({
    email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '000000'
  });
  assert.equal(result.data.outcome, 'authenticated');
  if (result.data.outcome === 'authenticated' && 'refreshToken' in result) {
    assert.equal(result.data.user.roleType, 'seeker');
    assert.equal(result.refreshToken, 'R'.repeat(43));
  }
});

test('returns a hashed, one-time registration authority without creating an account', async () => {
  let storedTokenHash = '';
  let createdSession = false;
  const registrationChallenge = { ...challenge, purpose: 'registration' as const };
  const otp = createOtpService({
    repository: repository({
      async findChallenge() { return registrationChallenge; },
      async verifyRegistrationChallenge(_id, tokenHash) {
        storedTokenHash = tokenHash;
        return true;
      }
    }),
    provider: createDeterministicFakeOtpProvider(),
    codeGenerator: createDeterministicOtpCodeGenerator(),
    codeHasher,
    verificationTokens,
    authService: {
      async issueAccount() { createdSession = true; throw new Error('must not issue'); }
    },
    now: () => now,
    createChallengeId: () => challengeId
  });
  const result = await otp.verify({
    email: 'seeker@example.com', roleType: 'seeker', purpose: 'registration', challengeId, code: '000000'
  });
  assert.deepEqual(result.data, {
    outcome: 'verified',
    verificationToken: 'V'.repeat(43),
    expiresInSeconds: 600,
    roleType: 'seeker'
  });
  assert.equal(storedTokenHash, `hash-${'V'.repeat(43)}`);
  assert.equal(createdSession, false);
});

test('rejects expired, replayed, missing, or inactive login challenges without account enumeration', async () => {
  await rejectsWithCode(
    () => service(repository({ async findChallenge() { return undefined; } })).verify({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '000000'
    }),
    'INVALID_OTP'
  );
  await rejectsWithCode(
    () => service(repository({ async consumeLoginChallenge() { return false; } })).verify({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '000000'
    }),
    'INVALID_OTP'
  );
  await rejectsWithCode(
    () => service(repository({ async findOtpAccount() { return undefined; } })).verify({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '000000'
    }),
    'INVALID_OTP'
  );
  await rejectsWithCode(
    () => service(repository({
      async findOtpAccount() {
        return { id: '0123456789abcdef01234567', roleType: 'seeker', status: 'suspended' };
      }
    })).verify({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', challengeId, code: '000000'
    }),
    'ACCOUNT_NOT_ACTIVE'
  );
});
