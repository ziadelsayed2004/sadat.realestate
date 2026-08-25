import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AccessTokenValidationError,
  createArgon2PasswordHasher,
  createHmacAccessTokenService,
  createHmacOtpCodeHasher,
  createOpaqueTokenService
} from '../../src/modules/auth/crypto.js';

test('hashes and verifies Admin passwords with Argon2id', async () => {
  const hasher = createArgon2PasswordHasher();
  const passwordHash = await hasher.hash('synthetic-admin-password');
  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(await hasher.verify(passwordHash, 'synthetic-admin-password'), true);
  assert.equal(await hasher.verify(passwordHash, 'wrong-password'), false);
  assert.equal(await hasher.verify('not-a-hash', 'wrong-password'), false);
});

test('uses a domain-separated keyed hash for OTP codes and constant-time verification', () => {
  const hasher = createHmacOtpCodeHasher(new Uint8Array(32).fill(4));
  const context = {
    phone: '+201000000000',
    email: 'seeker@example.com',
    roleType: 'seeker' as const,
    purpose: 'login' as const
  };
  const hashed = hasher.hash(context, '123456');
  assert.equal(hashed.length, 43);
  assert.notEqual(hashed, '123456');
  assert.equal(hasher.matches(context, '123456', hashed), true);
  assert.equal(hasher.matches(context, '000000', hashed), false);
  assert.equal(hasher.matches({ ...context, phone: '+201000000001' }, '123456', hashed), false);
  assert.equal(hasher.matches({ ...context, email: 'other@example.com' }, '123456', hashed), false);
});

test('issues signed short-lived access tokens and rejects tampering or expiry', () => {
  const service = createHmacAccessTokenService(
    new Uint8Array(32).fill(9),
    900,
    () => 'test-jti'
  );
  const issuedAt = new Date('2026-08-12T12:00:00.000Z');
  const token = service.issue({
    id: '0123456789abcdef01234567',
    roleType: 'admin',
    status: 'verified'
  }, 'abcdefabcdefabcdefabcdef', issuedAt);
  const claims = service.verify(token, new Date(issuedAt.getTime() + 1_000));
  assert.equal(claims.sub, '0123456789abcdef01234567');
  assert.equal(claims.sid, 'abcdefabcdefabcdefabcdef');
  assert.equal(claims.exp - claims.iat, 900);
  const segments = token.split('.');
  assert.throws(
    () => service.verify(`${segments[0]}.${segments[1]}.invalid`, issuedAt),
    AccessTokenValidationError
  );
  assert.throws(
    () => service.verify(token, new Date(issuedAt.getTime() + 900_000)),
    AccessTokenValidationError
  );
});

test('creates opaque refresh tokens and stores only deterministic SHA-256 hashes', () => {
  const tokens = createOpaqueTokenService(() => Buffer.alloc(32, 3));
  const token = tokens.create();
  assert.equal(token.length, 43);
  assert.equal(tokens.isValid(token), true);
  assert.equal(tokens.hash(token).length, 43);
  assert.notEqual(tokens.hash(token), token);
  assert.equal(tokens.isValid('raw-token'), false);
  assert.throws(() => tokens.hash('raw-token'), /invalid/);
});
