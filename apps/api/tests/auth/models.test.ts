import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { createArgon2PasswordHasher } from '../../src/modules/auth/crypto.js';
import { createAuthModels } from '../../src/modules/auth/models.js';

test('registers strict connection-scoped Admin credentials with a unique owner index', async () => {
  const connection = mongoose.createConnection();
  const first = createAuthModels(connection);
  const second = createAuthModels(connection);
  assert.equal(first.AdminCredential, second.AdminCredential);
  const passwordHash = await createArgon2PasswordHasher().hash('synthetic-admin-password');
  const credential = new first.AdminCredential({
    userId: new mongoose.Types.ObjectId(),
    passwordHash
  });
  await credential.validate();
  assert.equal(credential.toJSON().passwordHash, undefined);
  assert.equal(first.AdminCredential.schema.path('passwordHash').options.select, false);
  const index = first.AdminCredential.schema.indexes()
    .find(([, options]) => options.name === 'admin_credentials_user_unique');
  assert.deepEqual(index?.[0], { userId: 1 });
  assert.equal(index?.[1].unique, true);
  assert.throws(
    () => new first.AdminCredential({ userId: new mongoose.Types.ObjectId(), passwordHash, phone: '+201000000000' }),
    /strict mode/
  );
  await assert.rejects(
    new first.AdminCredential({ userId: new mongoose.Types.ObjectId(), passwordHash: 'plaintext' }).validate(),
    /passwordHash/
  );
});

test('registers private OTP challenges with explicit active, target, grant, and TTL indexes', async () => {
  const connection = mongoose.createConnection();
  const models = createAuthModels(connection);
  const challenge = new models.OtpChallenge({
    publicId: '123e4567-e89b-42d3-a456-426614174000',
    activeKey: 'seeker:login:+201000000000:seeker@example.com',
    normalizedPhone: '+201000000000',
    normalizedEmail: 'seeker@example.com',
    roleType: 'seeker',
    purpose: 'login',
    codeHash: 'H'.repeat(43),
    attemptsRemaining: 5,
    status: 'pending',
    expiresAt: new Date('2026-08-13T12:05:00.000Z')
  });
  await challenge.validate();
  const json = challenge.toJSON();
  assert.equal(json.codeHash, undefined);
  assert.equal(json.activeKey, undefined);
  assert.equal(models.OtpChallenge.schema.path('codeHash').options.select, false);
  assert.equal(models.OtpChallenge.schema.path('verificationTokenHash').options.select, false);
  const indexes = new Map(models.OtpChallenge.schema.indexes().map(([keys, options]) => [options.name, { keys, options }]));
  assert.equal(indexes.get('otp_challenges_public_id_unique')?.options.unique, true);
  assert.equal(indexes.get('otp_challenges_active_key_unique')?.options.unique, true);
  assert.deepEqual(indexes.get('otp_challenges_target_created')?.keys, {
    normalizedPhone: 1, normalizedEmail: 1, roleType: 1, purpose: 1, createdAt: -1
  });
  assert.equal(indexes.get('otp_challenges_verification_token_unique')?.options.unique, true);
  assert.equal(indexes.get('otp_challenges_expiry_ttl')?.options.expireAfterSeconds, 0);
  assert.throws(
    () => new models.OtpChallenge({
      publicId: '123e4567-e89b-42d3-a456-426614174000',
      normalizedPhone: '+201000000000', normalizedEmail: 'seeker@example.com', roleType: 'seeker', purpose: 'login',
      codeHash: 'H'.repeat(43), attemptsRemaining: 5, status: 'pending',
      expiresAt: new Date(), rawCode: '000000'
    }),
    /strict mode/
  );
  await connection.close();
});
