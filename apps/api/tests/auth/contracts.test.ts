import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminLoginRequestSchema,
  authSessionSuccessEnvelopeSchema,
  emptyAuthRequestSchema,
  logoutSuccessEnvelopeSchema,
  normalizedPhoneSchema,
  otpSendRequestSchema,
  otpSendSuccessEnvelopeSchema,
  otpVerifyRequestSchema,
  otpVerifySuccessEnvelopeSchema
} from '@sadat-real-estate/contracts';

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

test('normalizes E.164 phone inputs and rejects local, Admin, malformed, or loose OTP requests', () => {
  assert.equal(normalizedPhoneSchema.parse(' 0020 (100) 000-0000 '), '+201000000000');
  assert.equal(otpSendRequestSchema.parse({
    phone: '+20 100 000 0000',
    roleType: 'seeker',
    purpose: 'login'
  }).phone, '+201000000000');
  for (const invalid of [
    { phone: '01000000000', roleType: 'seeker', purpose: 'login' },
    { phone: '+201000000000', roleType: 'admin', purpose: 'login' },
    { phone: '+201000000000', roleType: 'seeker', purpose: 'password-reset' },
    { phone: '+201000000000', roleType: 'seeker', purpose: 'login', unexpected: true }
  ]) assert.throws(() => otpSendRequestSchema.parse(invalid));
  assert.throws(() => otpVerifyRequestSchema.parse({
    phone: '+201000000000', roleType: 'seeker', purpose: 'login',
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
