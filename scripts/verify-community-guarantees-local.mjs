import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createRbacRuntime } from '../apps/api/src/modules/rbac/runtime.ts';
import { createCommunityRuntime } from '../apps/api/src/modules/community/runtime.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

const database = `community_guarantees_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = { status: 'RUNNING', journeys: ['GUIDE-03', 'GUIDE-22'],
  environment: 'isolated-local-MongoDB-real-HTTP', mockedRoutes: false,
  faultInjection: 'durable audit writer throws after insert within transaction',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: true, checks: [], cleanup: false };
let server;
try {
  const accessTokens = createHmacAccessTokenService(randomBytes(32), 3600);
  const models = createAuditModels(connection);
  await models.AuditLog.init();
  const durable = createMongooseAuditWriter(models);
  let failAudit = false;
  const audit = { async record(entry, session) {
    const id = await durable.record(entry, session);
    if (failAudit) throw new Error('INJECTED_AUDIT_FAILURE');
    return id;
  } };
  const rbac = createRbacRuntime(connection, accessTokens, audit);
  const community = createCommunityRuntime(connection, accessTokens, rbac.service, audit);
  const adminId = new Types.ObjectId();
  const roleId = new Types.ObjectId();
  await connection.collection('users').insertOne({ _id: adminId, roleType: 'admin', status: 'verified' });
  await connection.collection('roles').insertOne({ _id: roleId, name: 'Community verifier', nameKey: 'community-verifier', active: true, accessMode: 'custom', permissions: ['admin:community.view', 'admin:community.moderate'], version: 0 });
  await connection.collection('admin_role_assignments').insertOne({ adminUserId: adminId, roleIds: [roleId] });
  const token = accessTokens.issue({ id: adminId.toHexString(), roleType: 'admin', status: 'verified' }, new Types.ObjectId().toHexString(), new Date());
  const postId = new Types.ObjectId().toHexString();
  const stamp = new Date().toISOString();
  await connection.collection('community_posts').insertOne({ id: postId, authorId: new Types.ObjectId().toHexString(), title: 'Isolated moderation guarantee', body: 'Local test fixture', status: 'draft', version: 0, createdAt: stamp, updatedAt: stamp });
  server = createApiServer({ database: { isReady: async () => true }, community });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const moderate = body => fetch(`${base}/admin/community/posts/${postId}/moderate`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const unchanged = async () => {
    const post = await connection.collection('community_posts').findOne({ id: postId });
    assert.equal(post.status, 'draft');
    assert.equal(post.version, 0);
    assert.equal(await models.AuditLog.countDocuments({ targetId: postId }), 0);
  };
  for (const action of ['publish', 'hide', 'reject']) {
    for (const reason of [undefined, '', '   ']) {
      assert.equal((await moderate({ action, expectedVersion: 0, ...(reason === undefined ? {} : { reason }) })).status, 400);
      await unchanged();
    }
  }
  report.checks.push('all_moderation_actions_missing_empty_whitespace_reason_400_without_write');
  failAudit = true;
  assert.equal((await moderate({ action: 'publish', expectedVersion: 0, reason: 'Verify atomic rollback' })).status, 500);
  await unchanged();
  assert.equal((await fetch(`${base}/public/community/posts/${postId}`)).status, 404);
  report.checks.push('audit_failure_rolls_back_post_and_inserted_audit');
  failAudit = false;
  assert.equal((await moderate({ action: 'publish', expectedVersion: 0, reason: 'Recover after audit failure' })).status, 200);
  assert.equal(await models.AuditLog.countDocuments({ targetId: postId }), 1);
  assert.equal((await fetch(`${base}/public/community/posts/${postId}`)).status, 200);
  report.checks.push('same_version_retry_after_rollback_publishes_once');
  await connection.collection('users').updateOne({ _id: adminId }, { $set: { status: 'suspended' } });
  assert.equal((await moderate({ action: 'hide', expectedVersion: 1, reason: 'Attempt with previously issued token' })).status, 403);
  assert.equal((await connection.collection('community_posts').findOne({ id: postId })).version, 1);
  assert.equal(await models.AuditLog.countDocuments({ targetId: postId }), 1);
  report.checks.push('current_admin_status_overrides_previously_issued_token');
  report.status = 'PASS_LOCAL';
} finally {
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^community_guarantees_[a-f0-9]{32}$/u);
  for (const collection of await connection.db.listCollections().toArray()) await connection.db.collection(collection.name).drop();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  report.finishedAt = new Date().toISOString();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  await writeFile('docs/quality/guide-runs/community-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`COMMUNITY_GUARANTEES_PASS checks=${report.checks.length} cleanup=${report.cleanup}`);
