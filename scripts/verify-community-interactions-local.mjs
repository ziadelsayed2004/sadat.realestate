import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createCommunityRuntime } from '../apps/api/src/modules/community/runtime.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

const database = `community_interactions_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = {
  status: 'RUNNING', environment: 'isolated-local-MongoDB-real-HTTP', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: true, checks: [], cleanup: false
};
let server;
try {
  const accessTokens = createHmacAccessTokenService(randomBytes(32), 3600);
  const community = createCommunityRuntime(connection, accessTokens);
  server = createApiServer({ database: { isReady: async () => true }, community });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const origin = `http://127.0.0.1:${address.port}`;
  const postId = new Types.ObjectId().toHexString();
  const authorId = new Types.ObjectId().toHexString();
  const userId = new Types.ObjectId();
  const stamp = new Date().toISOString();
  await connection.collection('community_posts').insertOne({ id: postId, authorId, title: 'Interaction verification', body: 'Isolated local post', status: 'published', version: 0, likeCount: 0, dislikeCount: 0, createdAt: stamp, updatedAt: stamp });
  await connection.collection('users').insertOne({ _id: userId, roleType: 'seeker', status: 'verified' });
  const token = accessTokens.issue({ id: userId.toHexString(), roleType: 'seeker', status: 'verified' }, new Types.ObjectId().toHexString(), new Date());
  const mutate = (suffix, body, authorization = token) => fetch(`${origin}/api/v1/public/community/posts/${postId}${suffix}`, {
    method: 'POST', headers: { ...(authorization === null ? {} : { authorization: `Bearer ${authorization}` }), 'content-type': 'application/json' }, body: JSON.stringify(body)
  });

  assert.equal((await mutate('/reactions', { reaction: 'like' }, null)).status, 401);
  const liked = await mutate('/reactions', { reaction: 'like' });
  const likedPayload = await liked.json();
  assert.equal(liked.status, 200, JSON.stringify(likedPayload));
  assert.deepEqual(likedPayload.data, { postId, reaction: 'like', likeCount: 1, dislikeCount: 0 });
  assert.equal(await connection.collection('community_reactions').countDocuments({ postId, userId: userId.toHexString() }), 1);
  const switched = await mutate('/reactions', { reaction: 'dislike' });
  assert.deepEqual((await switched.json()).data, { postId, reaction: 'dislike', likeCount: 0, dislikeCount: 1 });
  const removed = await mutate('/reactions', { reaction: 'dislike' });
  assert.deepEqual((await removed.json()).data, { postId, reaction: null, likeCount: 0, dislikeCount: 0 });
  assert.equal(await connection.collection('community_reactions').countDocuments({ postId, userId: userId.toHexString() }), 0);
  report.checks.push({ name: 'reaction_toggle_switch_and_remove', pass: true });

  const commentText = 'Persisted isolated community comment';
  const comment = await mutate('/comments', { body: commentText });
  assert.equal(comment.status, 201);
  assert.equal((await comment.json()).data.body, commentText);
  const detail = await fetch(`${origin}/api/v1/public/community/posts/${postId}`);
  const detailData = (await detail.json()).data;
  assert.equal(detailData.post.commentCount, 1);
  assert.equal(detailData.comments[0].body, commentText);
  report.checks.push({ name: 'comment_persists_and_returns_in_public_detail', pass: true });

  await connection.collection('users').updateOne({ _id: userId }, { $set: { status: 'suspended' } });
  const before = await connection.collection('community_posts').findOne({ id: postId });
  assert.equal((await mutate('/reactions', { reaction: 'like' })).status, 403);
  assert.equal((await mutate('/comments', { body: 'Denied comment' })).status, 403);
  const after = await connection.collection('community_posts').findOne({ id: postId });
  assert.equal(after?.likeCount, before?.likeCount);
  assert.equal(await connection.collection('community_comments').countDocuments({ postId }), 1);
  report.checks.push({ name: 'current_account_state_blocks_interactions', pass: true });
  report.status = 'PASS_LOCAL';
} finally {
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^community_interactions_[a-f0-9]{32}$/u);
  for (const collection of await connection.db.listCollections().toArray()) await connection.db.collection(collection.name).drop();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/community-interactions-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`COMMUNITY_INTERACTIONS_PASS checks=${report.checks.length} cleanup=${report.cleanup}`);
