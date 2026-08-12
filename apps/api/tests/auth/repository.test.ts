import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import type { IdentityModels } from '../../src/modules/identity/models.js';
import type { AuthModels } from '../../src/modules/auth/models.js';
import {
  createMongooseAuthRepository,
  createMongooseOtpRepository
} from '../../src/modules/auth/repository.js';

function query<T>(value: T) {
  const chain = {
    select() { return chain; },
    lean() { return chain; },
    async exec() { return value; }
  };
  return chain;
}

test('loads only Admin credentials and creates hashed-token sessions', async () => {
  const userId = new Types.ObjectId('0123456789abcdef01234567');
  let created: Record<string, unknown> | undefined;
  const identityModels = {
    User: {
      findOne: () => query({ _id: userId, roleType: 'admin', status: 'verified' })
    },
    Session: {
      async create(value: Record<string, unknown>) {
        created = value;
        return { _id: new Types.ObjectId('abcdefabcdefabcdefabcdef') };
      }
    }
  } as unknown as IdentityModels;
  const authModels = {
    AdminCredential: {
      findOne: () => query({ userId, passwordHash: '$argon2id$synthetic' })
    }
  } as unknown as AuthModels;
  const repository = createMongooseAuthRepository(identityModels, authModels);
  const login = await repository.findAdminLogin('admin@example.com');
  assert.deepEqual(login, {
    id: userId.toHexString(),
    roleType: 'admin',
    status: 'verified',
    passwordHash: '$argon2id$synthetic'
  });
  const session = await repository.createSession({
    userId: userId.toHexString(),
    tokenHash: 'h'.repeat(43),
    expiresAt: new Date('2026-09-11T12:00:00.000Z')
  });
  assert.equal(session.sessionId, 'abcdefabcdefabcdefabcdef');
  assert.equal(created?.tokenHash, 'h'.repeat(43));
  assert.equal('refreshToken' in (created ?? {}), false);
});

test('allows one concurrent refresh winner and treats the loser as reuse', async () => {
  const userId = new Types.ObjectId('0123456789abcdef01234567');
  const currentId = new Types.ObjectId('111111111111111111111111');
  let updateAttempt = 0;
  let familyRevocations = 0;
  const current = {
    _id: currentId,
    userId,
    expiresAt: new Date('2026-09-11T12:00:00.000Z')
  };
  const Session = {
    findOne: () => query(current),
    async create() { return { _id: new Types.ObjectId() }; },
    updateOne: () => ({
      async exec() {
        updateAttempt += 1;
        return { modifiedCount: updateAttempt === 1 ? 1 : 0 };
      }
    }),
    updateMany: () => ({
      async exec() {
        familyRevocations += 1;
        return { modifiedCount: 2 };
      }
    })
  };
  const identityModels = {
    User: {
      findById: () => query({ _id: userId, roleType: 'admin', status: 'verified' })
    },
    Session
  } as unknown as IdentityModels;
  const authModels = { AdminCredential: {} } as unknown as AuthModels;
  const repository = createMongooseAuthRepository(identityModels, authModels);
  const [first, second] = await Promise.all([
    repository.rotateSession({
      currentTokenHash: 'a'.repeat(43),
      replacementTokenHash: 'b'.repeat(43),
      replacementExpiresAt: new Date('2026-09-11T12:00:00.000Z'),
      now: new Date('2026-08-12T12:00:00.000Z')
    }),
    repository.rotateSession({
      currentTokenHash: 'a'.repeat(43),
      replacementTokenHash: 'c'.repeat(43),
      replacementExpiresAt: new Date('2026-09-11T12:00:00.000Z'),
      now: new Date('2026-08-12T12:00:00.000Z')
    })
  ]);
  assert.deepEqual([first.kind, second.kind].sort(), ['reuse_detected', 'rotated']);
  assert.equal(familyRevocations, 1);
});

test('detects replayed rotated tokens, expired tokens, inactive accounts, and logout replay', async () => {
  const userId = new Types.ObjectId('0123456789abcdef01234567');
  let sessionValue: Record<string, unknown> | undefined = {
    _id: new Types.ObjectId(),
    userId,
    expiresAt: new Date('2026-09-11T12:00:00.000Z'),
    revokedAt: new Date('2026-08-12T12:00:00.000Z'),
    replacedBySessionId: new Types.ObjectId()
  };
  let revokedAll = 0;
  let logoutModified = 0;
  const Session = {
    findOne: () => query(sessionValue),
    async create() { return { _id: new Types.ObjectId() }; },
    updateOne: () => ({ async exec() { return { modifiedCount: logoutModified }; } }),
    updateMany: () => ({ async exec() { revokedAll += 1; return { modifiedCount: 1 }; } })
  };
  let accountStatus = 'verified';
  const identityModels = {
    User: { findById: () => query({ _id: userId, roleType: 'admin', status: accountStatus }) },
    Session
  } as unknown as IdentityModels;
  const repository = createMongooseAuthRepository(
    identityModels,
    { AdminCredential: {} } as unknown as AuthModels
  );
  assert.equal((await repository.rotateSession({
    currentTokenHash: 'a'.repeat(43),
    replacementTokenHash: 'b'.repeat(43),
    replacementExpiresAt: new Date('2026-09-11T12:00:00.000Z'),
    now: new Date('2026-08-12T12:00:00.000Z')
  })).kind, 'reuse_detected');
  assert.equal(revokedAll, 1);

  sessionValue = { _id: new Types.ObjectId(), userId, expiresAt: new Date('2026-08-01T00:00:00.000Z') };
  assert.equal((await repository.rotateSession({
    currentTokenHash: 'a'.repeat(43), replacementTokenHash: 'b'.repeat(43),
    replacementExpiresAt: new Date('2026-09-11T12:00:00.000Z'), now: new Date('2026-08-12T12:00:00.000Z')
  })).kind, 'invalid');

  sessionValue = { _id: new Types.ObjectId(), userId, expiresAt: new Date('2026-09-11T00:00:00.000Z') };
  accountStatus = 'suspended';
  assert.equal((await repository.rotateSession({
    currentTokenHash: 'a'.repeat(43), replacementTokenHash: 'b'.repeat(43),
    replacementExpiresAt: new Date('2026-09-11T12:00:00.000Z'), now: new Date('2026-08-12T12:00:00.000Z')
  })).kind, 'account_not_active');
  logoutModified = 1;
  assert.equal(await repository.revokeSession('a'.repeat(43), new Date()), true);
  logoutModified = 0;
  assert.equal(await repository.revokeSession('a'.repeat(43), new Date()), false);
});

test('persists only hashed OTP material and enforces resend cooldown by normalized target', async () => {
  let created: Record<string, unknown> | undefined;
  const state: { active?: { createdAt: Date; expiresAt: Date } } = {};
  const OtpChallenge = {
    findOne: () => query(state.active),
    updateMany: () => ({ async exec() { return { modifiedCount: 1 }; } }),
    async create(value: Record<string, unknown>) { created = value; return value; }
  };
  const repository = createMongooseOtpRepository(
    { User: {} } as unknown as IdentityModels,
    { AdminCredential: {}, OtpChallenge } as unknown as AuthModels
  );
  const input = {
    publicId: '123e4567-e89b-42d3-a456-426614174000',
    phone: '+201000000000',
    roleType: 'seeker' as const,
    purpose: 'login' as const,
    codeHash: 'H'.repeat(43),
    attempts: 5,
    now: new Date('2026-08-13T12:00:00.000Z'),
    expiresAt: new Date('2026-08-13T12:05:00.000Z'),
    resendAfterSeconds: 60
  };
  assert.deepEqual(await repository.createChallenge(input), { kind: 'created' });
  assert.equal(created?.codeHash, 'H'.repeat(43));
  assert.equal('code' in (created ?? {}), false);
  assert.equal(created?.activeKey, 'seeker:login:+201000000000');

  state.active = {
    createdAt: new Date('2026-08-13T12:00:30.000Z'),
    expiresAt: input.expiresAt
  };
  assert.deepEqual(await repository.createChallenge({
    ...input,
    now: new Date('2026-08-13T12:01:00.000Z')
  }), { kind: 'cooldown', retryAfterSeconds: 30 });
});

test('atomically bounds failed OTP attempts, one-time verification, and grant redemption', async () => {
  const userId = new Types.ObjectId('0123456789abcdef01234567');
  let retryRemaining: number | undefined = 4;
  let updateModified = 1;
  let redeemed = true;
  const OtpChallenge = {
    findOneAndUpdate: () => query(redeemed
      ? {
          _id: new Types.ObjectId(),
          normalizedPhone: '+201000000000',
          roleType: 'seeker',
          purpose: 'registration',
          attemptsRemaining: retryRemaining ?? 0
        }
      : undefined),
    updateOne: () => ({ async exec() { return { modifiedCount: updateModified }; } })
  };
  const User = {
    findOne: () => query({ _id: userId, roleType: 'seeker', status: 'verified' })
  };
  const repository = createMongooseOtpRepository(
    { User } as unknown as IdentityModels,
    { AdminCredential: {}, OtpChallenge } as unknown as AuthModels
  );
  assert.deepEqual(
    await repository.recordFailedAttempt('111111111111111111111111', new Date()),
    { kind: 'retry', attemptsRemaining: 4 }
  );
  retryRemaining = undefined;
  redeemed = false;
  assert.deepEqual(
    await repository.recordFailedAttempt('111111111111111111111111', new Date()),
    { kind: 'exhausted' }
  );
  assert.equal(await repository.consumeLoginChallenge('111111111111111111111111', new Date()), true);
  assert.equal(await repository.verifyRegistrationChallenge(
    '111111111111111111111111', 'V'.repeat(43), new Date(), new Date(Date.now() + 60_000)
  ), true);
  assert.deepEqual(await repository.findPhoneAccount('+201000000000', 'seeker'), {
    id: userId.toHexString(), roleType: 'seeker', status: 'verified'
  });
  redeemed = true;
  assert.deepEqual(await repository.redeemRegistrationGrant('V'.repeat(43), 'seeker', new Date()), {
    phone: '+201000000000', roleType: 'seeker', purpose: 'registration'
  });
  redeemed = false;
  assert.equal(await repository.redeemRegistrationGrant('V'.repeat(43), 'seeker', new Date()), undefined);
  updateModified = 0;
  assert.equal(await repository.consumeLoginChallenge('111111111111111111111111', new Date()), false);
});
