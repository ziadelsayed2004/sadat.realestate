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
import { createProviderModels } from '../apps/api/src/modules/provider/models.ts';
import { createMongooseProviderRepository } from '../apps/api/src/modules/provider/repository.ts';
import { createProviderService, ProviderServiceError } from '../apps/api/src/modules/provider/service.ts';

function parseEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap(raw => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return [];
    const index = line.indexOf('=');
    if (index < 1) return [];
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[line.slice(0, index).trim(), value]];
  }));
}

const report = {
  status: 'RUNNING', journeys: ['GUIDE-11', 'GUIDE-12', 'GUIDE-13'],
  environment: 'isolated-local-MongoDB-rs0-real-services', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(), checks: [], cleanup: false
};
const env = parseEnvironment(await readFile('.env.local', 'utf8'));
assert.ok(env.MONGODB_URI);
const uri = new URL(env.MONGODB_URI);
assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname));
uri.pathname = `/guide_provider_registration_${Date.now()}`;
const connection = await mongoose.createConnection(uri.toString()).asPromise();

try {
  connection.base.set('transactionAsyncLocalStorage', true);
  const identity = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  const providerModels = createProviderModels(connection);
  await Promise.all([
    identity.User.init(), identity.ProviderProfile.init(), identity.Session.init(),
    authModels.AdminCredential.init(), authModels.OtpChallenge.init(), providerModels.ProviderApplication.init()
  ]);
  const authRepository = createMongooseAuthRepository(identity, authModels);
  const otpRepository = createMongooseOtpRepository(identity, authModels);
  const registrationTokens = createOpaqueTokenService();
  const authService = createAuthService({
    repository: authRepository, passwordHasher: createArgon2PasswordHasher(),
    accessTokens: createHmacAccessTokenService('provider-registration-local-secret-long-enough', 900),
    refreshTokens: createOpaqueTokenService(), accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 3600
  });
  const dependencies = {
    repository: createMongooseProviderRepository(connection, identity, providerModels),
    documentInventory: { async list() { return []; } }, registrationTokens,
    redeemRegistrationGrant: (hash, role, now) => otpRepository.redeemRegistrationGrant(hash, role, now),
    authService, transaction: operation => connection.transaction(operation)
  };
  const provider = createProviderService(dependencies);

  async function grant(email, token) {
    const now = new Date();
    await authModels.OtpChallenge.create({
      publicId: randomUUID(), normalizedEmail: email, roleType: 'provider', purpose: 'registration',
      codeHash: 'C'.repeat(43), attemptsRemaining: 5, status: 'verified', verifiedAt: now,
      verificationTokenHash: registrationTokens.hash(token), expiresAt: new Date(now.getTime() + 60_000)
    });
  }

  const email = `provider-success-${Date.now()}@example.invalid`;
  const token = registrationTokens.create();
  await grant(email, token);
  const registered = await provider.registerDraft({ verificationToken: token, providerType: 'developer_company', password: 'Provider-Strong!2026' });
  const userId = registered.data.session.user.id;
  const objectId = new mongoose.Types.ObjectId(userId);
  assert.equal(registered.data.outcome, 'registered_draft');
  assert.equal(await connection.collection('users').countDocuments({ _id: objectId, normalizedEmail: email }), 1);
  assert.equal(await connection.collection('provider_profiles').countDocuments({ userId: objectId }), 1);
  assert.equal(await connection.collection('provider_applications').countDocuments({ userId: objectId }), 1);
  assert.equal(await connection.collection('admin_credentials').countDocuments({ userId: objectId }), 1);
  assert.equal(await connection.collection('sessions').countDocuments({ userId: objectId }), 1);
  report.checks.push('registration_atomically_creates_grant_user_profile_application_credential_and_session');

  await assert.rejects(provider.registerDraft({ verificationToken: token, providerType: 'developer_company', password: 'Provider-Strong!2026' }),
    error => error instanceof ProviderServiceError && error.code === 'INVALID_REGISTRATION_TOKEN');
  assert.equal(await connection.collection('users').countDocuments({ normalizedEmail: email }), 1);
  report.checks.push('verification_grant_replay_rejected_without_duplicate_account');

  const duplicateToken = registrationTokens.create();
  await grant(email, duplicateToken);
  await assert.rejects(provider.registerDraft({ verificationToken: duplicateToken, providerType: 'brokerage_office', password: 'Provider-Strong!2026' }),
    error => error instanceof ProviderServiceError && error.code === 'PROVIDER_ALREADY_EXISTS');
  const duplicateGrant = await authModels.OtpChallenge.findOne({ verificationTokenHash: registrationTokens.hash(duplicateToken) }).select('+verificationTokenHash').lean();
  assert.equal(duplicateGrant?.status, 'verified');
  assert.equal(duplicateGrant?.consumedAt, undefined);
  report.checks.push('duplicate_email_rolls_back_grant_consumption_without_second_provider');

  const failedEmail = `provider-rollback-${Date.now()}@example.invalid`;
  const failedToken = registrationTokens.create();
  await grant(failedEmail, failedToken);
  const failure = createProviderService({
    ...dependencies,
    authService: { async setAccountPassword() { throw new Error('FORCED_PROVIDER_CREDENTIAL_FAILURE'); }, async issueAccount() { throw new Error('must not issue'); } }
  });
  await assert.rejects(failure.registerDraft({ verificationToken: failedToken, providerType: 'individual_broker', password: 'Provider-Strong!2026' }), /FORCED_PROVIDER_CREDENTIAL_FAILURE/u);
  assert.equal(await connection.collection('users').countDocuments({ normalizedEmail: failedEmail }), 0);
  assert.equal(await connection.collection('provider_profiles').countDocuments({}), 1);
  assert.equal(await connection.collection('provider_applications').countDocuments({}), 1);
  assert.equal(await connection.collection('admin_credentials').countDocuments({ userId: { $ne: objectId } }), 0);
  assert.equal(await connection.collection('sessions').countDocuments({ userId: { $ne: objectId } }), 0);
  const failedGrant = await authModels.OtpChallenge.findOne({ verificationTokenHash: registrationTokens.hash(failedToken) }).select('+verificationTokenHash').lean();
  assert.equal(failedGrant?.status, 'verified');
  assert.equal(failedGrant?.consumedAt, undefined);
  report.checks.push('credential_failure_rolls_back_grant_and_all_provider_registration_records');

  report.mongo = { collections: ['otp_challenges', 'users', 'provider_profiles', 'provider_applications', 'admin_credentials', 'sessions'],
    successRecords: 5, failedRegistrationResidue: 0, duplicateGrantRestored: true };
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
  await writeFile('docs/quality/guide-runs/provider-registration-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PROVIDER_REGISTRATION_GUARANTEES_${report.status} checks=${report.checks.length} cleanup=${report.cleanup}`);
}
