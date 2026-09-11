import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createCommunityRuntime } from '../apps/api/src/modules/community/runtime.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

const database = `community_accounts_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = { status: 'RUNNING', environment: 'isolated-local-MongoDB-real-HTTP', mockedRoutes: false,
  journeys: ['GUIDE-03'], commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: true, checks: [], cleanup: false };
let server;
try {
  const accessTokens = createHmacAccessTokenService(randomBytes(32), 3600);
  const community = createCommunityRuntime(connection, accessTokens);
  server = createApiServer({ database: { isReady: async () => true }, community });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}/api/v1/public/community/posts`;
  const postId = new Types.ObjectId().toHexString();
  const stamp = new Date().toISOString();
  await connection.collection('community_posts').insertOne({ id: postId, authorId: new Types.ObjectId().toHexString(), title: 'Published test', body: 'Local fixture', status: 'published', version: 0, createdAt: stamp, updatedAt: stamp });
  const counts = async () => Promise.all(['community_posts', 'community_comments', 'community_reports'].map(name => connection.collection(name).countDocuments()));
  for (const roleType of ['seeker', 'provider', 'admin']) {
    const userId = new Types.ObjectId();
    await connection.collection('users').insertOne({ _id: userId, roleType, status: 'verified' });
    const token = accessTokens.issue({ id: userId.toHexString(), roleType, status: 'verified' }, new Types.ObjectId().toHexString(), new Date());
    const calls = [
      ['', { title: 'New valid post', body: 'New valid content', category: 'advice' }],
      [`/${postId}/comments`, { body: 'Valid comment' }],
      [`/${postId}/reports`, { reason: 'other', details: 'A local report' }],
    ];
    const invoke = ([suffix, body]) => fetch(`${base}${suffix}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    for (const call of calls) assert.equal((await invoke(call)).status, 201);
    const before = await counts();
    for (const state of ['suspended', 'rejected', 'role_changed', 'deleted']) {
      if (state === 'deleted') await connection.collection('users').deleteOne({ _id: userId });
      else await connection.collection('users').updateOne({ _id: userId }, { $set: state === 'role_changed' ? { status: 'verified', roleType: roleType === 'seeker' ? 'provider' : 'seeker' } : { status: state } });
      for (const call of calls) assert.equal((await invoke(call)).status, 403, `${roleType}/${state}/${call[0]}`);
      assert.deepEqual(await counts(), before);
      const claims = accessTokens.verify(token);
      await assert.rejects(() => community.service.listOwned(claims), /FORBIDDEN/u);
      await assert.rejects(() => community.service.update(claims, postId, { title: 'Denied' }), /FORBIDDEN/u);
      await assert.rejects(() => community.service.remove(claims, postId), /FORBIDDEN/u);
      await assert.rejects(() => community.service.removeComment(claims, new Types.ObjectId().toHexString()), /FORBIDDEN/u);
      report.checks.push({ roleType, state, mutationsDenied: 3, directServiceOperationsDenied: 4, writes: 0 });
    }
  }
  assert.equal((await fetch(`${base}/${postId}`)).status, 200);
  report.publicReadAvailable = true;
  report.status = 'PASS_LOCAL';
} finally {
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^community_accounts_[a-f0-9]{32}$/u);
  for (const collection of await connection.db.listCollections().toArray()) await connection.db.collection(collection.name).drop();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/community-account-state-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`COMMUNITY_ACCOUNT_STATE_PASS cases=${report.checks.length} cleanup=${report.cleanup}`);
