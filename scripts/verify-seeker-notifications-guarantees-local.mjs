import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createIdentityModels } from '../apps/api/src/modules/identity/models.ts';
import { createNotificationRuntime } from '../apps/api/src/modules/notifications/runtime.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

const database = `notification_guarantees_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = {
  status: 'RUNNING',
  journeys: ['GUIDE-09'],
  environment: 'isolated-local-MongoDB-real-HTTP',
  mockedRoutes: false,
  checks: {},
  cleanup: false
};
let server;

try {
  const models = createIdentityModels(connection);
  const tokens = createHmacAccessTokenService(randomBytes(32), 3600);
  const now = new Date();
  const owner = await models.User.create({ normalizedEmail: 'notification-owner@example.invalid', roleType: 'seeker', status: 'verified', locale: 'en' });
  const foreign = await models.User.create({ normalizedEmail: 'notification-foreign@example.invalid', roleType: 'seeker', status: 'verified', locale: 'en' });
  const makeSession = user => models.Session.create({
    userId: user._id,
    tokenHash: randomBytes(32).toString('base64url'),
    expiresAt: new Date(Date.now() + 3_600_000),
    authenticationMethod: 'password'
  });
  const session = await makeSession(owner);
  const token = tokens.issue({ id: String(owner._id), roleType: 'seeker', status: 'verified' }, String(session._id), now);
  const notifications = connection.collection('notifications');
  const ids = {
    primary: new Types.ObjectId(),
    concurrent: new Types.ObjectId(),
    remaining: new Types.ObjectId(),
    providerAudience: new Types.ObjectId(),
    foreign: new Types.ObjectId()
  };
  await notifications.insertMany([
    { _id: ids.primary, recipientId: owner._id, audience: 'seeker', type: 'request.updated', title: { ar: 'تحديث الطلب', en: 'Request updated' }, message: { ar: 'تم التحديث', en: 'Updated' }, link: '/seeker/requests', readAt: null, createdAt: new Date(now.getTime() + 5000), internalSecret: 'must-not-leak' },
    { _id: ids.concurrent, recipientId: owner._id, audience: 'seeker', type: 'request.updated', title: { en: 'Concurrent' }, readAt: null, createdAt: new Date(now.getTime() + 4000) },
    { _id: ids.remaining, recipientId: owner._id, audience: 'seeker', type: 'system', title: { en: 'Remaining' }, readAt: null, createdAt: new Date(now.getTime() + 3000) },
    { _id: ids.providerAudience, recipientId: owner._id, audience: 'provider', type: 'provider.alert', title: { en: 'Provider only' }, readAt: null, createdAt: new Date(now.getTime() + 2000) },
    { _id: ids.foreign, recipientId: foreign._id, audience: 'seeker', type: 'system', title: { en: 'Foreign' }, readAt: null, createdAt: new Date(now.getTime() + 1000) }
  ]);

  server = createApiServer({
    database: { isReady: async () => true },
    notifications: createNotificationRuntime(connection, tokens)
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}/api/v1/seeker/notifications`;
  const call = (path = '', options = {}, accessToken = token) => fetch(`${base}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${accessToken}`, ...(options.headers ?? {}) }
  });

  assert.equal((await fetch(base)).status, 401);
  assert.equal((await call('?unknown=true')).status, 400);
  assert.equal((await call('/bad-id/read', { method: 'POST' })).status, 400);
  report.checks.validation = { anonymous: 401, unknownQuery: 400, invalidId: 400 };

  const listResponse = await call('?page=1&limit=20&unreadOnly=true');
  assert.equal(listResponse.status, 200);
  const list = (await listResponse.json()).data;
  assert.equal(list.total, 3);
  assert.equal(list.unreadCount, 3);
  assert.deepEqual(list.items.map(item => item.id), [String(ids.primary), String(ids.concurrent), String(ids.remaining)]);
  assert.deepEqual(Object.keys(list.items[0]).sort(), ['createdAt', 'id', 'link', 'message', 'readAt', 'title', 'type']);
  report.checks.safeOrderedProjection = { status: 200, seekerItems: 3, audienceBoundaryApplied: true, internalFieldsLeaked: false };

  const firstRead = await call(`/${ids.primary}/read`, { method: 'POST' });
  assert.equal(firstRead.status, 200);
  const firstReadAt = (await firstRead.json()).data.readAt;
  const replay = await call(`/${ids.primary}/read`, { method: 'POST' });
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).data.readAt, firstReadAt);
  assert.equal((await notifications.findOne({ _id: ids.primary })).readAt.toISOString(), firstReadAt);
  report.checks.idempotentRead = { firstStatus: 200, replayStatus: 200, readAtStable: true };

  const concurrent = await Promise.all([
    call(`/${ids.concurrent}/read`, { method: 'POST' }),
    call(`/${ids.concurrent}/read`, { method: 'POST' })
  ]);
  assert.deepEqual(concurrent.map(response => response.status), [200, 200]);
  const concurrentReadAt = await Promise.all(concurrent.map(async response => (await response.json()).data.readAt));
  assert.equal(concurrentReadAt[0], concurrentReadAt[1]);
  report.checks.concurrentDuplicate = { statuses: [200, 200], singleStableReadAt: true };

  const foreignBefore = await notifications.findOne({ _id: ids.foreign });
  assert.equal((await call(`/${ids.foreign}/read`, { method: 'POST' })).status, 404);
  assert.deepEqual(await notifications.findOne({ _id: ids.foreign }), foreignBefore);
  for (const roleType of ['provider', 'admin']) {
    const wrongRole = tokens.issue({ id: String(owner._id), roleType, status: 'verified' }, String(session._id), now);
    assert.equal((await call('', {}, wrongRole)).status, 403);
    assert.equal((await call(`/${ids.remaining}/read`, { method: 'POST' }, wrongRole)).status, 403);
  }
  assert.equal((await notifications.findOne({ _id: ids.remaining })).readAt, null);
  report.checks.authorization = { foreignMutation: 404, foreignUnchanged: true, providerDenied: 403, adminDenied: 403, deniedMutationUnchanged: true };

  const all = await call('/read-all', { method: 'POST' });
  assert.equal(all.status, 200);
  assert.equal((await all.json()).data.updatedCount, 1);
  const allReplay = await call('/read-all', { method: 'POST' });
  assert.equal(allReplay.status, 200);
  assert.equal((await allReplay.json()).data.updatedCount, 0);
  assert.equal((await notifications.findOne({ _id: ids.providerAudience })).readAt, null);
  assert.equal((await notifications.findOne({ _id: ids.foreign })).readAt, null);
  const empty = await call('?page=1&limit=20&unreadOnly=true');
  assert.equal(empty.status, 200);
  const emptyData = (await empty.json()).data;
  assert.deepEqual({ total: emptyData.total, unreadCount: emptyData.unreadCount, items: emptyData.items.length }, { total: 0, unreadCount: 0, items: 0 });
  report.checks.readAllAndEmpty = { firstUpdatedCount: 1, replayUpdatedCount: 0, otherAudienceUnchanged: true, otherRecipientUnchanged: true, emptyState: true };

  const ownerBeforeStateChecks = await notifications.find({ recipientId: owner._id }).toArray();
  await connection.collection('users').updateOne({ _id: owner._id }, { $set: { status: 'suspended' } });
  assert.equal((await call()).status, 403);
  await connection.collection('users').updateOne({ _id: owner._id }, { $set: { status: 'verified', roleType: 'provider' } });
  assert.equal((await call()).status, 403);
  await connection.collection('users').updateOne({ _id: owner._id }, { $set: { roleType: 'seeker' } });
  await models.Session.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });
  assert.equal((await call()).status, 403);
  await models.Session.updateOne({ _id: session._id }, { $unset: { revokedAt: 1 }, $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await call()).status, 403);
  await models.Session.deleteOne({ _id: session._id });
  assert.equal((await call()).status, 403);
  assert.deepEqual(await notifications.find({ recipientId: owner._id }).toArray(), ownerBeforeStateChecks);
  report.checks.currentState = { suspendedAccount: 403, changedRole: 403, revokedSession: 403, expiredSession: 403, deletedSession: 403, notificationsUnchanged: true };
  report.checks.auditAndVersion = { applicability: 'NOT_APPLICABLE', rationale: 'Recipient-owned read markers are idempotent state flags; they do not use approval transitions, optimistic versions, or an administrative audit contract.' };
  report.status = 'PASS_LOCAL';
} finally {
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^notification_guarantees_[a-f0-9]{32}$/);
  for (const collection of await connection.db.listCollections().toArray()) await connection.db.collection(collection.name).drop();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/seeker-notifications-guarantees-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report));
