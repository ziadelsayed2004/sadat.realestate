import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { createAccountRuntime } from '../apps/api/src/modules/accounts/runtime.ts';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

// Isolated loopback QA database only; never reads production environment or data.
const dbName = `account_counts_qa_${Date.now()}_${randomBytes(4).toString('hex')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${dbName}?replicaSet=rs0`, { serverSelectionTimeoutMS: 5000 }).asPromise();
let server;
async function clean() {
  if (connection.name !== dbName || !/^account_counts_qa_\d+_[a-f0-9]{8}$/u.test(dbName)) throw new Error('Unexpected QA database');
  await connection.dropDatabase(); await connection.close();
}
try {
  const stamp = new Date();
  const users = Array.from({ length: 45 }, (_, index) => ({
    _id: new mongoose.Types.ObjectId(), normalizedEmail: `account${index}@example.test`,
    roleType: index < 30 ? 'seeker' : 'provider',
    status: index < 40 ? 'verified' : index < 43 ? 'pending_review' : 'restricted',
    locale: 'ar', version: 0, statusChangedAt: stamp, createdAt: stamp, updatedAt: stamp
  }));
  const adminId = new mongoose.Types.ObjectId(); const sessionId = new mongoose.Types.ObjectId();
  await connection.collection('users').insertMany([...users,
    { ...users[0], _id: adminId, normalizedEmail: 'admin@example.test', roleType: 'admin' },
    { ...users[0], _id: new mongoose.Types.ObjectId(), normalizedEmail: 'deleted@example.test', deletedAt: stamp }
  ]);
  await connection.collection('sessions').insertOne({ _id: sessionId, userId: adminId, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 600_000), createdAt: stamp });
  const tokens = createHmacAccessTokenService(randomBytes(32), 900);
  const runtime = createAccountRuntime(connection, tokens, { write: async () => { throw new Error('Read-only test must not write'); } }, { authorize: async id => id === String(adminId) });
  server = createApiServer({ database: { isReady: async () => true }, accounts: runtime, observability: { logger: { log() {} } } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const origin = `http://127.0.0.1:${address.port}/api/v1/admin/users`;
  const token = tokens.issue({ id: String(adminId), roleType: 'admin', status: 'verified' }, String(sessionId), stamp);
  const headers = { authorization: `Bearer ${token}` };
  async function list(query = '') {
    const response = await fetch(`${origin}${query}`, { headers });
    assert.equal(response.status, 200);
    return (await response.json()).data;
  }
  const expected = { total: 45, seekers: 30, providers: 15, verified: 40, pending: 3, restricted: 2 };
  const first = await list(); assert.equal(first.total, 45); assert.equal(first.items.length, 20); assert.deepEqual(first.summary, expected);
  const second = await list('?page=2'); assert.equal(second.items.length, 20); assert.deepEqual(second.summary, expected);
  assert.equal(first.items.some(a => second.items.some(b => b.id === a.id)), false);
  const verified = await list('?status=verified'); assert.equal(verified.total, 40); assert.deepEqual(verified.summary, expected);
  const pending = await list('?status=pending_review'); assert.equal(pending.total, 3); assert.equal(pending.items.length, 3); assert.deepEqual(pending.summary, expected);
  const empty = await list('?status=suspended'); assert.equal(empty.total, 0); assert.deepEqual(empty.items, []); assert.deepEqual(empty.summary, expected);
  const role = await list('?roleType=provider&status=pending_review'); assert.equal(role.total, 3); assert.deepEqual(role.summary, { total: 15, seekers: 0, providers: 15, verified: 10, pending: 3, restricted: 2 });
  const pastEnd = await list('?page=100'); assert.equal(pastEnd.total, 45); assert.deepEqual(pastEnd.items, []); assert.deepEqual(pastEnd.summary, expected);
  await connection.collection('users').updateOne({ _id: users[0]._id }, { $set: { deletedAt: stamp } });
  const refreshed = await list(); assert.equal(refreshed.total, 44); assert.deepEqual(refreshed.summary, { ...expected, total: 44, seekers: 29, verified: 39 });
  assert.equal((await fetch(origin)).status, 401);
  console.log('PASS_LOCAL: 9 MongoDB + HTTP checks: all-page totals, pagination, verified/pending/empty status, role scope, out-of-range page, deleted/admin exclusion, refreshed counts, authentication.');
} finally {
  if (server) await stopApiServer(server);
  await clean();
}
