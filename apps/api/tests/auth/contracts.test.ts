import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminLoginRequestSchema,
  authSessionSuccessEnvelopeSchema,
  emptyAuthRequestSchema,
  logoutSuccessEnvelopeSchema,
  normalizedPhoneSchema,
  passwordResetRequestSchema,
  passwordResetOtpSendRequestSchema,
  otpSendRequestSchema,
  otpSendSuccessEnvelopeSchema,
  otpVerifyRequestSchema,
  otpVerifySuccessEnvelopeSchema
} from '@sadat-real-estate/contracts';

test('accepts strong passwords from eight characters and rejects incomplete policies', () => {
  const verificationToken = 'V'.repeat(43);
  assert.equal(passwordResetRequestSchema.parse({ verificationToken, newPassword: 'Abc1!xyz' }).newPassword, 'Abc1!xyz');
  for (const newPassword of ['Ab1!xyz', 'abcdefgh!', 'ABCDEFGH1!', 'Abcdefgh!', 'Abcdefg1']) {
    assert.throws(() => passwordResetRequestSchema.parse({ verificationToken, newPassword }));
  }
});

test('normalizes strict Admin login requests without exposing a password policy to other roles', () => {
  const parsed = adminLoginRequestSchema.parse({
    email: ' Admin@Example.COM ',
    password: 'synthetic-password'
  });
  assert.equal(parsed.email, 'admin@example.com');
  assert.equal(parsed.password, 'synthetic-password');
  assert.throws(
    () => adminLoginRequestSchema.parse({
      email: 'admin@example.com',
      password: 'synthetic-password',
      roleType: 'seeker'
    }),
    /unrecognized/i
  );
  assert.throws(() => adminLoginRequestSchema.parse({ email: 'bad', password: '' }));
});

test('accepts account recovery OTP requests for every account role', () => {
  for (const roleType of ['seeker', 'provider', 'admin'] as const) {
    const parsed = passwordResetOtpSendRequestSchema.parse({
      email: ' Account@Example.COM ', roleType, purpose: 'password_reset'
    });
    assert.equal(parsed.email, 'account@example.com');
    assert.equal(parsed.roleType, roleType);
  }
});

test('keeps contact phone normalization separate and accepts only email OTP identity', () => {
  assert.equal(normalizedPhoneSchema.parse(' 0020 (100) 000-0000 '), '+201000000000');
  assert.equal(otpSendRequestSchema.parse({
    email: ' Seeker@Example.COM ',
    roleType: 'seeker',
    purpose: 'login'
  }).email, 'seeker@example.com');
  assert.equal(otpSendRequestSchema.parse({
    email: ' Seeker@Example.COM ',
    roleType: 'seeker',
    purpose: 'login'
  }).email, 'seeker@example.com');
  for (const invalid of [
    { phone: '+201000000000', email: 'seeker@example.com', roleType: 'seeker', purpose: 'login' },
    { email: 'bad', roleType: 'seeker', purpose: 'login' },
    { email: 'seeker@example.com', roleType: 'admin', purpose: 'login' },
    { email: 'seeker@example.com', roleType: 'seeker', purpose: 'password-reset' },
    { email: 'seeker@example.com', roleType: 'seeker', purpose: 'login', unexpected: true }
  ]) assert.throws(() => otpSendRequestSchema.parse(invalid));
  assert.throws(() => otpVerifyRequestSchema.parse({
    email: 'seeker@example.com', roleType: 'seeker', purpose: 'login',
    challengeId: 'not-a-uuid', code: '12345'
  }));
});

test('validates OTP send and discriminated verification envelopes without refresh-token leakage', () => {
  const send = {
    data: {
      accepted: true,
      challengeId: '123e4567-e89b-42d3-a456-426614174000',
      expiresInSeconds: 300,
      retryAfterSeconds: 60
    },
    meta: { requestId: 'otp-send-1' }
  };
  assert.deepEqual(otpSendSuccessEnvelopeSchema.parse(send), send);
  const verified = {
    data: {
      outcome: 'verified',
      verificationToken: 'V'.repeat(43),
      expiresInSeconds: 600,
      roleType: 'provider'
    },
    meta: { requestId: 'otp-verify-1' }
  };
  assert.deepEqual(otpVerifySuccessEnvelopeSchema.parse(verified), verified);
  assert.throws(() => otpVerifySuccessEnvelopeSchema.parse({
    ...verified,
    data: { ...verified.data, refreshToken: 'unsafe' }
  }));
});

test('validates strict auth success envelopes and empty refresh/logout commands', () => {
  const envelope = {
    data: {
      accessToken: 'header.payload.signature',
      tokenType: 'Bearer',
      expiresInSeconds: 900,
      user: {
        id: '0123456789abcdef01234567',
        roleType: 'admin',
        status: 'verified'
      }
    },
    meta: { requestId: 'request-1' }
  };
  assert.deepEqual(authSessionSuccessEnvelopeSchema.parse(envelope), envelope);
  assert.throws(() => authSessionSuccessEnvelopeSchema.parse({ ...envelope, refreshToken: 'unsafe' }));
  assert.deepEqual(emptyAuthRequestSchema.parse({}), {});
  assert.throws(() => emptyAuthRequestSchema.parse({ unexpected: true }));
  assert.deepEqual(logoutSuccessEnvelopeSchema.parse({
    data: { loggedOut: true },
    meta: { requestId: 'request-2' }
  }).data, { loggedOut: true });
});
