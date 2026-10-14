import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose, { Types } from 'mongoose';
import { createIdentityModels } from '../../src/modules/identity/models.js';
import { createAdminModels } from '../../src/modules/admin/models.js';
import { createMongooseAdministratorRepository } from '../../src/modules/admin/administrator-repository.js';

test('presence persistence binds the heartbeat to its owned live session and projects no session credentials', async t => {
  const connection = mongoose.createConnection();
  const identityModels = createIdentityModels(connection);
  const adminModels = createAdminModels(connection);
  const repository = createMongooseAdministratorRepository({ connection, identityModels, adminModels });
  const userId = '0123456789abcdef01234567';
  const sessionId = '1123456789abcdef01234567';
  const now = new Date('2026-10-10T12:00:00Z');
  const deadline = new Date(now.getTime() + 120_000);
  let query: unknown;
  let write: unknown;
  let matched = true;
  const saved = new Date('2026-10-09T12:00:00Z');
  let accountWrite: unknown;
  let accountWrites = 0;
  t.mock.method(identityModels.User, 'updateOne', (filter: unknown, update: unknown, options: unknown) => {
    accountWrites++; accountWrite = { filter, update, options };
    return { async exec() { return { matchedCount: 1 }; } };
  });
  t.mock.method(identityModels.User, 'find', () => ({ select() { return { async lean() { return [{ _id: new Types.ObjectId(userId), lastAdminActivityAt: saved }]; } }; } }));
  t.mock.method(identityModels.Session, 'updateOne', (filter: unknown, update: unknown) => {
    query = filter; write = update;
    return { async exec() { return { matchedCount: matched ? 1 : 0 }; } };
  });
  assert.equal(await repository.heartbeat(userId, sessionId, now, deadline), true);
  assert.deepEqual(query, { _id: new Types.ObjectId(sessionId), userId: new Types.ObjectId(userId), revokedAt: { $exists: false }, expiresAt: { $gt: now } });
  assert.deepEqual(write, { $set: { adminPresenceAt: now, adminPresenceExpiresAt: deadline } });
  assert.deepEqual(accountWrite, { filter: { _id: new Types.ObjectId(userId), roleType: 'admin', status: 'verified', deletedAt: null }, update: { $max: { lastAdminActivityAt: now } }, options: { timestamps: false } });
  matched = false;
  assert.equal(await repository.heartbeat(userId, sessionId, now, deadline), false);
  assert.equal(accountWrites, 1);
  let pipeline: unknown[] = [];
  t.mock.method(identityModels.Session, 'aggregate', (stages: unknown[]) => {
    pipeline = stages;
    return { async exec() { return [{ _id: new Types.ObjectId(userId), lastActiveAt: now, online: 0 }]; } };
  });
  assert.deepEqual(await repository.presence([userId], now), { [userId]: { online: false, lastActiveAt: now.toISOString() } });
  assert.deepEqual(pipeline[0], { $match: { userId: { $in: [new Types.ObjectId(userId)] }, createdAt: { $lte: now } } });
  const group = (pipeline[1] as { $group: { online: { $max: { $cond: [{ $and: unknown[] }, number, number] } } } }).$group;
  assert.deepEqual(group.online.$max.$cond[0].$and, [
    { $eq: [{ $ifNull: ['$revokedAt', null] }, null] },
    { $gt: ['$expiresAt', now] }, { $gt: ['$adminPresenceExpiresAt', now] },
    { $gt: ['$adminPresenceAt', new Date(now.getTime() - 120_000)] }
  ]);
  assert.deepEqual(await repository.presence([], now), {});
  t.mock.method(identityModels.Session, 'aggregate', () => ({ async exec() { return []; } }));
  assert.deepEqual(await repository.presence([userId], now), { [userId]: { online: false, lastActiveAt: saved.toISOString() } });
});
