import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createAccountRuntime } from '../apps/api/src/modules/accounts/runtime.ts';
import { createAccountDeleter } from '../apps/api/src/modules/accounts/deletion.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

// Always an isolated, uniquely named database on the local QA replica set.
const dbName = `account_deletion_qa_${Date.now()}_${randomBytes(4).toString('hex')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${dbName}?replicaSet=rs0`, { serverSelectionTimeoutMS: 5000 }).asPromise();
const report = { status: 'PASS_LOCAL', checks: [], cleanup: false };
let server;
async function cleanupOwnedDatabase() {
  if (connection.name !== dbName || !/^account_deletion_qa_\d+_[a-f0-9]{8}$/u.test(dbName)) throw new Error('Refusing cleanup outside owned QA database');
  await connection.dropDatabase(); await connection.close(); report.cleanup = true;
}
try {
  const [admin, viewer, seeker, provider, rollback, other] = Array.from({ length: 6 }, () => new mongoose.Types.ObjectId());
  const ids = { admin, viewer, seeker, provider, rollback, other };
  const stamp = new Date();
  await connection.collection('users').insertMany(Object.entries(ids).map(([name, _id]) => ({ _id, normalizedEmail: `${name}@example.test`, roleType: ['admin', 'viewer'].includes(name) ? 'admin' : name === 'provider' ? 'provider' : 'seeker', status: 'verified', locale: 'ar', version: 0, statusChangedAt: stamp, createdAt: stamp, updatedAt: stamp })));
  const sessions = new Map();
  for (const [name, userId] of Object.entries(ids)) {
    const _id = new mongoose.Types.ObjectId(); sessions.set(name, _id);
    await connection.collection('sessions').insertOne({ _id, userId, tokenHash: randomBytes(32).toString('base64url'), expiresAt: new Date(Date.now() + 600_000), createdAt: stamp });
  }
  const application = new mongoose.Types.ObjectId();
  await connection.collection('provider_applications').insertOne({ _id: application, userId: provider, providerType: 'developer_company', status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
  await connection.collection('provider_profiles').insertOne({ userId: provider, providerType: 'developer_company', status: 'approved', version: 0 });
  await connection.collection('organizations').insertOne({ providerId: provider, status: 'approved', version: 0 });
  for (const collection of ['properties', 'projects']) {
    await connection.collection(collection).insertMany([{ providerId: provider, status: 'published', version: 0 }, { providerId: other, status: 'published', version: 0 }]);
  }
  await connection.collection('requests').insertOne({ seekerId: seeker, providerId: provider, status: 'new' });
  const auditModels = createAuditModels(connection);
  await Promise.all(Object.values(auditModels).map(model => model.init()));
  const audit = createMongooseAuditWriter(auditModels);
  const authorization = { authorize: async id => id === String(admin) };
  const tokens = createHmacAccessTokenService(randomBytes(32), 900);
  const runtime = createAccountRuntime(connection, tokens, audit, authorization);
  server = createApiServer({ database: { isReady: async () => true }, accounts: runtime, observability: { logger: { log() {} } } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const origin = `http://127.0.0.1:${address.port}/api/v1/admin`;
  const token = name => tokens.issue({ id: String(ids[name]), roleType: ['admin', 'viewer'].includes(name) ? 'admin' : 'seeker', status: 'verified' }, String(sessions.get(name)), stamp);
  const headers = { authorization: `Bearer ${token('admin')}`, 'content-type': 'application/json' };
  const body = { version: 0, reason: 'Delete duplicate test account', confirmed: true };
  assert.equal((await fetch(`${origin}/providers/${application}`, { headers })).status, 200);
  assert.equal((await (await fetch(`${origin}/providers`, { headers })).json()).data.total, 1);
  const remove = async (id, input = body, requestHeaders = headers) => {
    const response = await fetch(`${origin}/users/${id}`, { method: 'DELETE', headers: requestHeaders, body: JSON.stringify(input) });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await remove(seeker, body, { 'content-type': 'application/json' })).status, 401);
  assert.equal((await remove(seeker, body, { ...headers, authorization: `Bearer ${token('viewer')}` })).status, 403);
  assert.equal((await remove(provider, body, { ...headers, authorization: `Bearer ${token('seeker')}` })).status, 403);
  report.checks.push('real_HTTP_denies_anonymous_view_only_and_wrong_role');
  assert.equal((await remove(admin)).status, 403);
  assert.equal((await remove(viewer)).status, 403);
  report.checks.push('self_and_administrator_targets_are_protected');
  assert.equal((await remove(seeker, { ...body, confirmed: false })).status, 400);
  assert.equal((await remove(seeker, { ...body, reason: 'x' })).status, 400);
  assert.equal((await remove(seeker, { ...body, version: 4 })).status, 409);
  report.checks.push('confirmation_reason_and_current_version_required');
  const result = await remove(seeker);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.deepEqual(result.body.data, { id: String(seeker), deleted: true });
  const stored = await connection.collection('users').findOne({ _id: seeker });
  assert.equal(stored.status, 'suspended'); assert(stored.deletedAt instanceof Date); assert.equal(stored.version, 1);
  assert((await connection.collection('sessions').findOne({ userId: seeker })).revokedAt instanceof Date);
  report.checks.push('successful_HTTP_deletion_retains_tombstone_and_revokes_sessions');
  assert.equal((await fetch(`${origin}/users/${seeker}`, { headers })).status, 404);
  const list = await (await fetch(`${origin}/users`, { headers })).json();
  assert.equal(list.data.items.some(user => user.id === String(seeker)), false); assert.equal(list.data.total, 3);
  assert.equal((await remove(seeker)).status, 404);
  report.checks.push('deleted_account_disappears_from_reads_counts_and_replays');
  const transition = await fetch(`${origin}/users/${seeker}/transitions`, { method: 'POST', headers, body: JSON.stringify({ action: 'verify', reason: 'Should not restore deleted account' }) });
  assert.equal(transition.status, 404);
  report.checks.push('deleted_account_cannot_be_reactivated_by_account_transitions');
  assert.equal((await remove(provider)).status, 200);
  for (const collection of ['properties', 'projects']) {
    assert.equal((await connection.collection(collection).findOne({ providerId: provider })).status, 'hidden');
    assert.equal((await connection.collection(collection).findOne({ providerId: other })).status, 'published');
  }
  assert.equal((await connection.collection('organizations').findOne({ providerId: provider })).status, 'inactive');
  assert.equal((await fetch(`${origin}/providers/${application}`, { headers })).status, 404);
  const providers = await (await fetch(`${origin}/providers`, { headers })).json();
  assert.equal(providers.data.total, 0); assert.deepEqual(providers.data.items, []);
  assert.equal(await connection.collection('requests').countDocuments(), 1);
  report.checks.push('provider_content_hidden_only_for_target_and_history_preserved');
  const review = await fetch(`${origin}/providers/${application}/review`, { method: 'POST', headers, body: JSON.stringify({ action: 'verify', reason: 'Should not restore deleted provider' }) });
  assert.equal(review.status, 404);
  report.checks.push('deleted_provider_cannot_be_restored_through_application_review');
  await connection.collection('users').updateOne({ _id: rollback }, { $set: { roleType: 'provider' } });
  for (const collection of ['provider_profiles', 'provider_applications']) {
    await connection.collection(collection).insertOne({ userId: rollback, providerType: 'developer_company', status: 'approved', version: 0, createdAt: stamp, updatedAt: stamp });
  }
  await connection.collection('organizations').insertOne({ providerId: rollback, status: 'approved', version: 0 });
  for (const collection of ['properties', 'projects']) await connection.collection(collection).insertOne({ providerId: rollback, status: 'published', version: 0 });
  const fail = createAccountDeleter(connection, authorization, { record: async () => { throw new Error('Simulated audit write failure'); } });
  await assert.rejects(fail({ userId: String(admin) }, String(rollback), body, { requestId: 'deletion-rollback', traceId: 'a'.repeat(32) }), /Simulated audit/);
  assert.equal((await connection.collection('users').findOne({ _id: rollback })).deletedAt, undefined);
  assert.equal((await connection.collection('sessions').findOne({ userId: rollback })).revokedAt, undefined);
  for (const collection of ['provider_profiles', 'provider_applications']) assert.equal((await connection.collection(collection).findOne({ userId: rollback })).status, 'approved');
  assert.equal((await connection.collection('organizations').findOne({ providerId: rollback })).status, 'approved');
  for (const collection of ['properties', 'projects']) assert.equal((await connection.collection(collection).findOne({ providerId: rollback })).status, 'published');
  report.checks.push('audit_failure_rolls_back_user_sessions_and_all_provider_content');
  assert.equal(await connection.collection('audit_logs').countDocuments({ action: 'account.delete' }), 2);
  assert.equal(await connection.collection('notifications').countDocuments(), 0);
  report.checks.push('successful_deletions_have_audit_evidence_without_notifications_or_email');
} finally {
  if (server) await stopApiServer(server);
  await cleanupOwnedDatabase();
}
await writeFile('.local/account-deletion-qa-report.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`ACCOUNT_DELETION_${report.status} checks=${report.checks.length} cleanup=${report.cleanup}`);
