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
  status: 'RUNNING', journeys: ['client-followups-2026-10-17'], environment: 'isolated-local-MongoDB-rs0-real-services', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(),
  checks: [], cleanup: false
};
const env = parseEnvironment(await readFile('.env.local', 'utf8'));
assert.ok(env.MONGODB_URI);
const uri = new URL(env.MONGODB_URI);
assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname));
assert.equal(uri.port, '27018');
uri.pathname = `/oct17_followups_${Date.now()}`;
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

  const { createAccountDeleter } = await import('../apps/api/src/modules/accounts/deletion.ts');
  const { createRoleDeleter } = await import('../apps/api/src/modules/rbac/deletion.ts');
  const { createOrganizationManager } = await import('../apps/api/src/modules/accounts/organization-management.ts');
  const { createFeaturedPropertyManager } = await import('../apps/api/src/modules/properties/featured.ts');
  const { createPropertyModels } = await import('../apps/api/src/modules/properties/models.ts');
  const { createMongoosePropertyRepository } = await import('../apps/api/src/modules/properties/repository.ts');
  const { createAuditModels } = await import('../apps/api/src/modules/audit/models.ts');
  const { createMongooseAuditWriter } = await import('../apps/api/src/modules/audit/writer.ts');
  const auditModels = createAuditModels(connection), audit = createMongooseAuditWriter(auditModels);
  const allow = { authorize: async () => true }, deny = { authorize: async () => false };
  const adminId = new mongoose.Types.ObjectId(), roleId = new mongoose.Types.ObjectId(), assignedRole = new mongoose.Types.ObjectId();
  const context = { requestId: randomUUID(), traceId: 'a'.repeat(32) };
  const deleter = createAccountDeleter(connection, allow, audit);
  await connection.collection('payment_proofs').insertOne({ providerId: objectId, history: 'retained' });
  await assert.rejects(createAccountDeleter(connection, deny, audit)({ userId: String(adminId) }, userId, { version: 0, confirmed: true, reason: 'Client requested account removal' }, context), error => error.code === 'ACCOUNT_FORBIDDEN');
  await deleter({ userId: String(adminId) }, userId, { version: 0, confirmed: true, reason: 'Client requested account removal' }, context);
  const removed = await connection.collection('users').findOne({ _id: objectId });
  assert(removed.deletedAt && removed.normalizedEmail === undefined);
  assert.equal(await authRepository.findAccountLogin(email), undefined);
  await assert.rejects(authService.refresh(registered.refreshToken));
  assert.equal(await connection.collection('payment_proofs').countDocuments({ providerId: objectId }), 1);
  const replacementToken = registrationTokens.create(); await grant(email, replacementToken);
  const replacement = await seeker.register({ verificationToken: replacementToken, firstName: 'New', lastName: 'Account', password: 'Replacement-Strong!2026', locale: 'ar' });
  assert.notEqual(replacement.data.session.user.id, userId);
  assert.equal((await authService.loginAdmin({ email, password: 'Replacement-Strong!2026' })).data.user.id, replacement.data.session.user.id);
  await assert.rejects(authService.loginAdmin({ email, password: 'Guide04-Strong!2026' }));
  report.checks.push('deletion_releases_email_new_identity_password_login_old_sessions_revoked_history_preserved');
  const historicalId = new mongoose.Types.ObjectId(), historicalEmail = 'historically-deleted@example.invalid';
  await connection.collection('users').insertOne({ _id: historicalId, normalizedEmail: historicalEmail, roleType: 'provider', status: 'suspended', deletedAt: new Date() });
  assert.equal(await otpRepository.findRegistrationAccount(historicalEmail), undefined);
  assert.equal((await connection.collection('users').findOne({ _id: historicalId })).normalizedEmail, undefined);
  assert(await otpRepository.findRegistrationAccount(email));
  report.checks.push('historical_deleted_email_released_active_email_still_reserved');

  await connection.collection('roles').insertMany([{ _id: roleId, version: 0, name: 'Removable' }, { _id: assignedRole, version: 0, name: 'Assigned' }]);
  await connection.collection('admin_role_assignments').insertOne({ adminUserId: adminId, roleIds: [assignedRole] });
  const deleteRole = createRoleDeleter(connection, allow, audit);
  await assert.rejects(createRoleDeleter(connection, deny, audit)(String(adminId), String(roleId), { version: 0, reason: 'Remove obsolete role' }, context), error => error.code === 'RBAC_FORBIDDEN');
  await assert.rejects(deleteRole(String(adminId), String(roleId), { version: 1, reason: 'Remove obsolete role' }, context), error => error.code === 'RBAC_ROLE_VERSION_CONFLICT');
  await assert.rejects(deleteRole(String(adminId), String(assignedRole), { version: 0, reason: 'Remove assigned role' }, context), error => error.code === 'RBAC_ROLE_ASSIGNED');
  await deleteRole(String(adminId), String(roleId), { version: 0, reason: 'Remove obsolete role' }, context);
  assert.equal(await connection.collection('roles').countDocuments({ _id: roleId }), 0);
  assert.equal(await connection.collection('roles').countDocuments({ _id: assignedRole }), 1);
  report.checks.push('role_delete_permissions_version_and_assigned_guard_real_transaction');

  const owner = new mongoose.Types.ObjectId(), profile = new mongoose.Types.ObjectId(), company = new mongoose.Types.ObjectId(), photo = new mongoose.Types.ObjectId(), foreignPhoto = new mongoose.Types.ObjectId();
  await connection.collection('users').insertOne({ _id: owner, normalizedEmail: 'developer@example.invalid', roleType: 'provider', status: 'verified', deletedAt: null });
  await connection.collection('provider_profiles').insertOne({ _id: profile, userId: owner, providerType: 'developer_company', status: 'approved' });
  await connection.collection('provider_applications').insertOne({ userId: owner, providerType: 'developer_company', status: 'approved' });
  await connection.collection('organizations').insertOne({ _id: company, providerId: profile, kind: 'developer_company', name: { en: 'Original company' }, slug: 'client-company', status: 'approved', version: 0 });
  await connection.collection('organization_photos').insertMany([{ _id: photo, createdBy: owner }, { _id: foreignPhoto, createdBy: adminId }]);
  const manage = createOrganizationManager(connection, allow, audit);
  assert.equal((await manage(String(adminId), String(owner))).slug, 'client-company');
  await assert.rejects(createOrganizationManager(connection, deny, audit)(String(adminId), String(owner)), error => error.statusCode === 403);
  await assert.rejects(manage(String(adminId), String(owner), undefined, context, true), error => error.statusCode === 403);
  await assert.rejects(manage(String(owner), String(owner), { version: 0, imageUrl: `/api/v1/public/organization-photos/${foreignPhoto}`, reason: 'Company image update' }, context, true), error => error.code === 'PHOTO_NOT_FOUND');
  await assert.rejects(manage(String(owner), String(owner), { version: 0, status: 'inactive', reason: 'Company directory change' }, context, true), error => error.statusCode === 403);
  const updatedCompany = await manage(String(owner), String(owner), { version: 0, name: { en: 'Edited company' }, imageUrl: `/api/v1/public/organization-photos/${photo}`, reason: 'Company profile update' }, context, true);
  assert.equal(updatedCompany.version, 1); assert.equal(updatedCompany.name.en, 'Edited company');
  assert.equal((await manage(String(adminId), String(owner), { version: 1, status: 'inactive', reason: 'Remove from public directory' }, context)).status, 'inactive');
  assert.equal((await manage(String(adminId), String(owner), { version: 2, status: 'approved', reason: 'Restore public directory' }, context)).status, 'approved');
  report.checks.push('company_owner_edit_photo_ownership_admin_hide_restore_provider_profile_alias');

  const models = createPropertyModels(connection), propertyId = new mongoose.Types.ObjectId();
  await models.Property.create({ _id: propertyId, providerId: owner, sourceType: 'developer_company', organizationId: company, kind: 'property', slug: 'client-property', name: { en: 'Client property' }, transactionType: 'sale', status: 'pending_review', active: true });
  const repository = createMongoosePropertyRepository(connection, models, audit);
  const before = await repository.findByIdAny(String(propertyId));
  assert(before);
  const review = { id: String(propertyId), expectedVersion: 0, toStatus: 'published', reviewerId: String(adminId), before, metadata: { actorId: String(adminId), reason: 'Publish verified client property', ...context, changedAt: new Date() } };
  const reviewed = await repository.review(review);
  assert.equal(reviewed.kind, 'written');
  const notification = await connection.collection('notifications').findOne({ recipientId: owner, type: 'property.published' });
  assert(notification && notification.link === `/provider/properties/${propertyId}`);
  await repository.review(review);
  assert.equal(await connection.collection('notifications').countDocuments({ recipientId: owner, type: 'property.published' }), 1);
  report.checks.push('real_property_review_atomically_publishes_and_notifies_owner_no_duplicate_on_retry');
  const featured = createFeaturedPropertyManager(connection, allow, audit);
  await assert.rejects(createFeaturedPropertyManager(connection, deny, audit)(String(adminId), String(propertyId), { version: 1, featured: true, order: 0, reason: 'Feature on homepage' }, context), error => error.statusCode === 403);
  await featured(String(adminId), String(propertyId), { version: 1, featured: true, order: 2, reason: 'Feature on homepage' }, context);
  const persisted = await repository.findByIdAny(String(propertyId)); assert.equal(persisted.featured, true); assert.equal(persisted.featuredOrder, 2);
  await assert.rejects(featured(String(adminId), String(propertyId), { version: 1, featured: false, order: 0, reason: 'Remove homepage feature' }, context), error => error.code === 'PROPERTY_VERSION_CONFLICT');
  const failing = createFeaturedPropertyManager(connection, allow, { record: async () => { throw new Error('forced audit rollback'); } });
  await assert.rejects(failing(String(adminId), String(propertyId), { version: 2, featured: false, order: 0, reason: 'Remove homepage feature' }, context), /forced audit rollback/);
  assert.equal((await repository.findByIdAny(String(propertyId))).featured, true);
  report.checks.push('featured_flag_and_order_persisted_permission_version_and_audit_rollback');

  await assert.rejects(authService.logout(registered.refreshToken));
  await assert.rejects(authService.refresh(registered.refreshToken));
  assert.equal(await connection.collection('sessions').countDocuments({ userId: objectId, revokedAt: { $exists: false } }), 0);
  report.checks.push('logout_revokes_current_refresh_session');
  report.status = 'PASS_LOCAL';
  report.deliveryScope = 'Local verification only; no production deployment.';
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
  await writeFile('docs/quality/guide-runs/client-followups-services-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`CLIENT_FOLLOWUPS_SERVICES_${report.status} checks=${report.checks.length} cleanup=${report.cleanup}`);
}
