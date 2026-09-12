import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { purgeProductionDatabase } from '../apps/api/src/modules/database/production-launch.ts';
import { createIdentityModels } from '../apps/api/src/modules/identity/models.ts';
import { createAuthModels } from '../apps/api/src/modules/auth/models.ts';
import { createMongooseAuthRepository } from '../apps/api/src/modules/auth/repository.ts';
import { createAuthService } from '../apps/api/src/modules/auth/service.ts';
import { createArgon2PasswordHasher, createHmacAccessTokenService, createOpaqueTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createAdminModels } from '../apps/api/src/modules/admin/models.ts';
import { createRbacModels } from '../apps/api/src/modules/rbac/models.ts';
import { createMongooseRbacRepository } from '../apps/api/src/modules/rbac/repository.ts';
import { createRbacService } from '../apps/api/src/modules/rbac/service.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createMongoosePrivacySecuritySettingsReader } from '../apps/api/src/modules/settings/privacy-security-policy.ts';

// Only a new, isolated database on the local replica set is allowed.
const uri = process.env.MONGODB_URI;
assert.ok(uri && /^mongodb:\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost):\d+\//u.test(uri), 'LOCAL_MONGODB_REQUIRED');
const dbName = `launch_verify_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(uri, { dbName, serverSelectionTimeoutMS: 5000 }).asPromise();
const rootId = new Types.ObjectId();
const otherId = new Types.ObjectId();
const email = 'launch-admin@example.invalid';
const password = randomUUID();
const hasher = createArgon2PasswordHasher();
const evidence = { environment: 'isolated-local-mongodb', mockedDatabase: false, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString(), checks: [], cleanup: false, status: 'RUNNING' };
try {
  assert.equal(connection.name, dbName);
  assert.ok((await connection.db.admin().command({ hello: 1 })).setName, 'REPLICA_SET_REQUIRED');
  const identity = createIdentityModels(connection);
  const authModels = createAuthModels(connection);
  await Promise.all([...Object.values(identity), ...Object.values(authModels)].map(model => model.init()));
  const auth = createAuthService({
    repository: createMongooseAuthRepository(identity, authModels), passwordHasher: hasher,
    accessTokens: createHmacAccessTokenService(randomUUID().repeat(2), 900),
    refreshTokens: createOpaqueTokenService(), accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 3600
  });
  await connection.collection('users').insertMany([
    { _id: rootId, email, normalizedEmail: email, roleType: 'admin', status: 'verified' },
    { _id: otherId, email: 'qa@example.invalid', normalizedEmail: 'qa@example.invalid', roleType: 'seeker', status: 'verified', synthetic: true }
  ]);
  await connection.collection('admin_profiles').insertOne({ userId: rootId });
  await connection.collection('admin_credentials').insertOne({ userId: rootId, passwordHash: await hasher.hash(password) });
  await connection.collection('admin_bootstrap').insertOne({ userId: rootId, accessLevel: 'super_admin' });
  await connection.collection('admin_accounts').insertOne({ userId: rootId, accessLevel: 'super_admin' });
  await connection.collection('roles').insertMany([{ name: 'Real role' }, { name: 'QA role', synthetic: true }]);
  await connection.collection('admin_settings').insertMany([{ namespace: 'privacy-security', schemaVersion: 1, version: 0, updatedBy: rootId, updatedAt: new Date(), values: { two_factor_authentication: true } }, { namespace: 'demo', seedKey: 'legacy-demo' }]);
  await connection.collection('properties').insertOne({ ownerId: otherId, synthetic: true });
  await connection.collection('community_reactions').insertOne({ userId: otherId, postId: new Types.ObjectId(), reaction: 'like' });
  await connection.collection('database_migrations').insertOne({ id: 'preserved' });
  const beforeLogin = await auth.loginAdmin({ email, password });
  const indexesBefore = await connection.collection('users').listIndexes().toArray();
  assert.ok('refreshToken' in beforeLogin);
  const planned = await purgeProductionDatabase(connection, { mode: 'plan', keepAdminEmail: email });
  assert.equal(planned.usersAfter, 2);
  assert.equal(await connection.collection('properties').countDocuments({}), 1);
  evidence.checks.push('dry-run retains all records');
  await connection.collection('unreviewed_fixture').insertOne({ value: 1 });
  await assert.rejects(purgeProductionDatabase(connection, { mode: 'apply', keepAdminEmail: email }), /UNREVIEWED_COLLECTION/);
  assert.equal(await connection.collection('users').countDocuments({}), 2);
  await connection.collection('unreviewed_fixture').drop();
  evidence.checks.push('unknown collection aborts before deletion');
  const parentId = new Types.ObjectId();
  await connection.collection('locations').insertMany([{ _id: parentId, synthetic: true }, { parentLocationId: parentId }]);
  await assert.rejects(purgeProductionDatabase(connection, { mode: 'apply', keepAdminEmail: email }), /REFERENCE_PARENT_MISSING/);
  assert.equal(await connection.collection('users').countDocuments({}), 2);
  await connection.collection('locations').updateOne({ _id: parentId }, { $unset: { synthetic: '' } });
  evidence.checks.push('retained location cannot lose its parent');
  await connection.collection('admin_credentials').updateOne({ userId: rootId }, { $set: { synthetic: true } });
  await assert.rejects(purgeProductionDatabase(connection, { mode: 'apply', keepAdminEmail: email }), /SYNTHETIC_RESIDUE/);
  assert.equal(await connection.collection('users').countDocuments({}), 2);
  assert.equal(await connection.collection('properties').countDocuments({}), 1);
  await connection.collection('admin_credentials').updateOne({ userId: rootId }, { $unset: { synthetic: '' } });
  evidence.checks.push('residue failure rolls back the complete MongoDB transaction');
  const applied = await purgeProductionDatabase(connection, { mode: 'apply', keepAdminEmail: email });
  assert.equal(applied.usersAfter, 1);
  assert.equal(applied.syntheticAfter, 0);
  assert.deepEqual(await connection.collection('users').listIndexes().toArray(), indexesBefore);
  evidence.checks.push('identity indexes are unchanged');
  assert.equal(await connection.collection('sessions').countDocuments({}), 0);
  assert.equal(await connection.collection('roles').countDocuments({}), 1);
  assert.equal(await connection.collection('admin_settings').countDocuments({}), 1);
  assert.equal(await connection.collection('database_migrations').countDocuments({}), 1);
  assert.equal(await connection.collection('properties').countDocuments({}), 0);
  assert.equal(await connection.collection('community_reactions').countDocuments({}), 0);
  evidence.checks.push('purge retains real references and administrator only', 'community reactions are removed', 'all old admin sessions revoked');
  await assert.rejects(auth.refresh(beforeLogin.refreshToken), /INVALID_REFRESH_TOKEN/);
  const newLogin = await auth.loginAdmin({ email, password });
  assert.equal(newLogin.data.user.id, rootId.toHexString());
  evidence.checks.push('real password login succeeds after purge', 'old refresh token fails');
  const rbac = createRbacService({ repository: createMongooseRbacRepository(connection, identity, createAdminModels(connection), createRbacModels(connection), createMongooseAuditWriter(createAuditModels(connection))) });
  assert.equal((await rbac.authorizationFor(rootId.toHexString())).isSuperAdmin, true);
  assert.equal((await createMongoosePrivacySecuritySettingsReader(connection).read()).twoFactorAuthentication, true);
  evidence.checks.push('runtime RBAC still grants Super Admin', 'runtime privacy reader retains configured 2FA');
  await purgeProductionDatabase(connection, { mode: 'apply', keepAdminEmail: email });
  const repeated = await purgeProductionDatabase(connection, { mode: 'apply', keepAdminEmail: email });
  assert.equal(repeated.collections.reduce((sum, row) => sum + row.deleted, 0), 0);
  evidence.checks.push('repeated purge is idempotent');
  evidence.status = 'PASS';
} finally {
  // Cleanup is confined to the unique database created by this invocation.
  assert.equal(connection.name, dbName);
  for (const { name } of await connection.db.listCollections().toArray()) await connection.collection(name).drop();
  evidence.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  assert.equal(evidence.cleanup, true);
  await connection.close();
}
await mkdir('docs/quality/guide-runs', { recursive: true });
await writeFile('docs/quality/guide-runs/production-launch-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`PRODUCTION_LAUNCH_LOCAL_PASS checks=${evidence.checks.length}`);
