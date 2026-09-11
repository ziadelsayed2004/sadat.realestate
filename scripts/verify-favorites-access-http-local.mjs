import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createFavoriteRuntime } from '../apps/api/src/modules/favorites/runtime.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';
import { readEnvironmentFile } from './environment-file.mjs';

const env = await readEnvironmentFile('.env.local');
assert.equal(new URL(env.MONGODB_URI).hostname, '127.0.0.1');
const database = `favorite_access_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(env.MONGODB_URI, { dbName: database }).asPromise();
const report = { status: 'RUNNING', environment: 'isolated-local-MongoDB-real-HTTP', mockedRoutes: false,
  journeys: ['GUIDE-08'], commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  checks: [], cleanup: false };
let server;
try {
  const accessTokens = createHmacAccessTokenService(randomBytes(32), 3600);
  server = createApiServer({ database: { isReady: async () => true }, favorites: createFavoriteRuntime(connection, accessTokens) });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}/api/v1/seeker/favorites`;
  const owner = new Types.ObjectId();
  const other = new Types.ObjectId();
  const property = new Types.ObjectId();
  await connection.collection('users').insertMany([owner, other].map(_id => ({ _id, roleType: 'seeker', status: 'verified' })));
  await connection.collection('properties').insertOne({ _id: property, slug: 'favorite-access-check', kind: 'property', name: { en: 'Local property' }, transactionType: 'sale', status: 'published', active: true });
  const tokenFor = (id, roleType = 'seeker') => accessTokens.issue({ id: id.toHexString(), roleType, status: 'verified' }, new Types.ObjectId().toHexString(), new Date());
  const ownerToken = tokenFor(owner);
  const otherToken = tokenFor(other);
  const invoke = (method, token, suffix = method === 'GET' ? '' : `/${property}`) => fetch(base + suffix, { method, headers: token ? { authorization: `Bearer ${token}` } : {} });
  const snapshot = () => connection.collection('favorites').find().sort({ _id: 1 }).toArray();
  assert.equal((await invoke('PUT', ownerToken)).status, 200);
  const repeated = await invoke('PUT', ownerToken);
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).data.alreadySaved, true);
  assert.equal(await connection.collection('favorites').countDocuments(), 1);
  const before = await snapshot();
  const foreignList = await invoke('GET', otherToken);
  assert.equal(foreignList.status, 200);
  assert.equal((await foreignList.json()).data.total, 0);
  const foreignDelete = await invoke('DELETE', otherToken);
  assert.equal(foreignDelete.status, 200);
  assert.equal((await foreignDelete.json()).data.removed, false);
  assert.deepEqual(await snapshot(), before);
  report.checks.push({ check: 'horizontal_access', listOtherTotal: 0, removeOtherResult: false, ownerRecordUnchanged: true });
  report.checks.push({ check: 'duplicate_save', alreadySaved: true, count: 1 });
  for (const role of ['provider', 'admin']) {
    for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await invoke(method, tokenFor(other, role))).status, 403);
    assert.deepEqual(await snapshot(), before);
    report.checks.push({ check: 'wrong_token_role', role, denied: 3, writes: 0 });
  }
  for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await invoke(method)).status, 401);
  report.checks.push({ check: 'anonymous', denied: 3 });
  for (const suffix of ['?page=0', '?limit=0', '?page=invalid']) {
    assert.equal((await invoke('GET', otherToken, suffix)).status, 400);
  }
  for (const method of ['PUT', 'DELETE']) assert.equal((await invoke(method, otherToken, '/invalid-id')).status, 400);
  assert.equal((await invoke('PUT', otherToken, `/${new Types.ObjectId()}`)).status, 404);
  for (const update of [{ status: 'draft' }, { status: 'published', active: false }, { active: true, expiresAt: new Date(0) }]) {
    await connection.collection('properties').updateOne({ _id: property }, { $set: update });
    assert.equal((await invoke('PUT', otherToken)).status, 404);
    const hiddenList = await invoke('GET', ownerToken);
    assert.equal(hiddenList.status, 200);
    assert.equal((await hiddenList.json()).data.total, 0);
  }
  await connection.collection('properties').updateOne({ _id: property }, { $set: { status: 'published', active: true }, $unset: { expiresAt: '' } });
  assert.deepEqual(await snapshot(), before);
  report.checks.push({ check: 'validation_and_unavailable', malformedRequests: 5, unavailableSaves: 4, hiddenLists: 3, writes: 0 });
  for (const state of ['suspended', 'rejected', 'role_changed', 'deleted']) {
    if (state === 'deleted') await connection.collection('users').deleteOne({ _id: owner });
    else await connection.collection('users').updateOne({ _id: owner }, { $set: { status: state === 'role_changed' ? 'verified' : state, roleType: state === 'role_changed' ? 'provider' : 'seeker' } });
    for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await invoke(method, ownerToken)).status, 403, `${state}/${method}`);
    assert.deepEqual(await snapshot(), before);
    report.checks.push({ check: 'current_account_old_token', state, denied: 3, writes: 0 });
  }
  report.status = 'PASS_LOCAL';
} finally {
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^favorite_access_[a-f0-9]{32}$/u);
  for (const name of ['favorites', 'properties', 'users']) await connection.collection(name).drop();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/favorites-access-http-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, checks: report.checks.length, cleanup: report.cleanup }));
