import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createAuthModels } from '../apps/api/src/modules/auth/models.ts';
import { createIdentityModels } from '../apps/api/src/modules/identity/models.ts';
import { createMongooseAuthRepository, createMongooseOtpRepository } from '../apps/api/src/modules/auth/repository.ts';
import { createAuthService } from '../apps/api/src/modules/auth/service.ts';
import { createArgon2PasswordHasher, createHmacAccessTokenService, createOpaqueTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createMongooseSeekerRepository } from '../apps/api/src/modules/seeker/repository.ts';
import { createSeekerService, SeekerServiceError } from '../apps/api/src/modules/seeker/service.ts';

function parseEnvironment(source) {
  const result = {};
  for (const raw of source.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[line.slice(0, index).trim()] = value;
  }
  return result;
}

const report = {
  status: 'RUNNING', journeys: ['GUIDE-04'], environment: 'isolated-local-MongoDB-rs0-real-services', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(),
  checks: [], cleanup: false
};
const env = parseEnvironment(await readFile('.env.local', 'utf8'));
assert.ok(env.MONGODB_URI);
const uri = new URL(env.MONGODB_URI);
assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname));
uri.pathname = `/guide04_guarantees_${Date.now()}`;
const connection = await mongoose.createConnection(uri.toString()).asPromise();

try {
  connection.base.set('transactionAsyncLocalStorage', true);
  const identity = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  await Promise.all([identity.User.init(), identity.SeekerProfile.init(), authModels.AdminCredential.init(), identity.Session.init(), authModels.OtpChallenge.init()]);
  const authRepository = createMongooseAuthRepository(identity, authModels);
  const otpRepository = createMongooseOtpRepository(identity, authModels);
  const registrationTokens = createOpaqueTokenService();
  const authService = createAuthService({
    repository: authRepository,
    passwordHasher: createArgon2PasswordHasher(),
    accessTokens: createHmacAccessTokenService('guide04-local-secret-that-is-long-enough-for-tests', 900),
    refreshTokens: createOpaqueTokenService(), accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 3600
  });
  const seeker = createSeekerService({
    repository: createMongooseSeekerRepository(identity), registrationTokens,
    redeemRegistrationGrant: (hash, role, now) => otpRepository.redeemRegistrationGrant(hash, role, now),
    authService, transaction: operation => connection.transaction(operation)
  });

  async function grant(email, token) {
    const now = new Date();
    await authModels.OtpChallenge.create({
      publicId: randomUUID(), normalizedEmail: email, roleType: 'seeker', purpose: 'registration',
      codeHash: 'C'.repeat(43), attemptsRemaining: 5, status: 'verified', verifiedAt: now,
      verificationTokenHash: registrationTokens.hash(token), expiresAt: new Date(now.getTime() + 60_000)
    });
  }

  const email = `guide04-success-${Date.now()}@example.invalid`;
  const token = registrationTokens.create();
  await grant(email, token);
  const registered = await seeker.register({ verificationToken: token, firstName: 'Guide', lastName: 'Guarantee', password: 'Guide04-Strong!2026', locale: 'en' });
  assert.equal(registered.data.outcome, 'registered');
  assert.equal(registered.data.session.user.roleType, 'seeker');
  const userId = registered.data.session.user.id;
  const objectId = new mongoose.Types.ObjectId(userId);
  assert.equal(await connection.collection('users').countDocuments({ _id: objectId, normalizedEmail: email, roleType: 'seeker', status: 'verified' }), 1);
  assert.equal(await connection.collection('seeker_profiles').countDocuments({ userId: objectId }), 1);
  assert.equal(await connection.collection('admin_credentials').countDocuments({ userId: objectId }), 1);
  assert.equal(await connection.collection('sessions').countDocuments({ userId: objectId, revokedAt: { $exists: false } }), 1);
  report.checks.push('registration_atomically_creates_user_profile_credential_and_session');

  await assert.rejects(seeker.register({ verificationToken: token, firstName: 'Replay', lastName: 'Denied', password: 'Guide04-Strong!2026' }),
    error => error instanceof SeekerServiceError && error.code === 'INVALID_REGISTRATION_TOKEN');
  assert.equal(await connection.collection('users').countDocuments({ normalizedEmail: email }), 1);
  report.checks.push('verification_grant_replay_rejected_without_duplicate_account');

  const duplicateToken = registrationTokens.create();
  await grant(email, duplicateToken);
  await assert.rejects(seeker.register({ verificationToken: duplicateToken, firstName: 'Duplicate', lastName: 'Denied', password: 'Guide04-Strong!2026' }),
    error => error instanceof SeekerServiceError && error.code === 'SEEKER_ALREADY_EXISTS');
  const duplicateGrant = await authModels.OtpChallenge.findOne({ verificationTokenHash: registrationTokens.hash(duplicateToken) }).select('+verificationTokenHash').lean();
  assert.equal(duplicateGrant?.status, 'verified');
  assert.equal(duplicateGrant?.consumedAt, undefined);
  report.checks.push('duplicate_email_rolls_back_grant_consumption_and_account_write');

  const failedEmail = `guide04-rollback-${Date.now()}@example.invalid`;
  const failedToken = registrationTokens.create();
  await grant(failedEmail, failedToken);
  const failure = createSeekerService({
    repository: createMongooseSeekerRepository(identity), registrationTokens,
    redeemRegistrationGrant: (hash, role, now) => otpRepository.redeemRegistrationGrant(hash, role, now),
    authService: { async setAccountPassword() { throw new Error('GUIDE04_FORCED_CREDENTIAL_FAILURE'); }, async issueAccount() { throw new Error('must not issue'); } },
    transaction: operation => connection.transaction(operation)
  });
  await assert.rejects(failure.register({ verificationToken: failedToken, firstName: 'Rollback', lastName: 'Proof', password: 'Guide04-Strong!2026' }), /GUIDE04_FORCED_CREDENTIAL_FAILURE/u);
  assert.equal(await connection.collection('users').countDocuments({ normalizedEmail: failedEmail }), 0);
  assert.equal(await connection.collection('seeker_profiles').countDocuments({ firstName: 'Rollback', lastName: 'Proof' }), 0);
  const failedGrant = await authModels.OtpChallenge.findOne({ verificationTokenHash: registrationTokens.hash(failedToken) }).select('+verificationTokenHash').lean();
  assert.equal(failedGrant?.status, 'verified');
  assert.equal(failedGrant?.consumedAt, undefined);
  report.checks.push('credential_failure_rolls_back_grant_user_and_profile');

  await authService.logout(registered.refreshToken);
  await assert.rejects(authService.refresh(registered.refreshToken));
  assert.equal(await connection.collection('sessions').countDocuments({ userId: objectId, revokedAt: { $exists: false } }), 0);
  report.checks.push('logout_revokes_current_refresh_session');
  report.mongo = {
    collections: ['otp_challenges', 'users', 'seeker_profiles', 'admin_credentials', 'sessions'],
    successAccountCount: 1, replayAccountCount: 1, duplicateGrantRestored: true, failedRegistrationResidue: 0, activeSessionsAfterLogout: 0
  };
  report.status = 'PASS_LOCAL';
  report.remaining = ['Production verification remains deferred while the project stays in Demo mode.'];
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
  process.exitCode = 1;
} finally {
  try {
    await connection.dropDatabase();
    report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
    assert.equal(report.cleanup, true);
  } catch (error) {
    report.status = 'FAIL_LOCAL';
    report.cleanupFailure = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
    process.exitCode = 1;
  }
  await connection.close();
  report.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/registration-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`REGISTRATION_GUARANTEES_${report.status} checks=${report.checks.length} cleanup=${report.cleanup}`);
}
