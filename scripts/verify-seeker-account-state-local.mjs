import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createIdentityModels } from '../apps/api/src/modules/identity/models.ts';
import { createMongooseSeekerRepository } from '../apps/api/src/modules/seeker/repository.ts';
import { createSeekerRuntime } from '../apps/api/src/modules/seeker/runtime.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

const database = `seeker_state_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = { status: 'RUNNING', journeys: ['GUIDE-10'], mockedRoutes: false, environment: 'isolated-local-MongoDB-real-HTTP', checks: [], roleAuthorization: [], emptyPreferences: undefined, cleanup: false };
let server;
try {
  const tokens = createHmacAccessTokenService(randomBytes(32), 3600);
  const auth = { async issueAccount() { throw new Error('Not used'); }, async setAccountPassword() { throw new Error('Not used'); } };
  const seeker = createSeekerRuntime(connection, auth, tokens, { name: 'sadat_refresh', path: '/api/v1/auth', httpOnly: true, sameSite: 'Strict', secure: false, maxAgeSeconds: 3600 });
  const repo = createMongooseSeekerRepository(createIdentityModels(connection));
  const account = await repo.create({ email: 'local-seeker-state@example.invalid', firstName: 'Local', lastName: 'Fixture', locale: 'en' });
  const userId = new Types.ObjectId(account.id);
  const token = tokens.issue({ id: account.id, roleType: 'seeker', status: 'verified' }, new Types.ObjectId().toHexString(), new Date());
  server = createApiServer({ database: { isReady: async () => true }, seeker });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const calls = [['GET', '/me'], ['PATCH', '/me', { firstName: 'Changed' }], ['GET', '/me/preferences'], ['PATCH', '/me/preferences', { minPrice: 100 }]];
  const invokeWith = (accessToken, [method, path, body]) => fetch(`${base}${path}`, { method, headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const invoke = call => invokeWith(token, call);

  const profileBeforeEmptyRead = await connection.collection('seeker_profiles').findOne({ userId });
  assert.deepEqual(profileBeforeEmptyRead?.preferences ?? {}, {});
  const emptyResponse = await invoke(['GET', '/me/preferences']);
  assert.equal(emptyResponse.status, 200);
  const emptyData = (await emptyResponse.json()).data;
  assert.deepEqual(emptyData.preferences, {});
  const initialProfile = await connection.collection('seeker_profiles').findOne({ userId });
  assert.deepEqual(initialProfile, profileBeforeEmptyRead);
  report.emptyPreferences = { status: 200, preferencesDeepEmpty: true, readDidNotWrite: true };

  for (const roleType of ['provider', 'admin']) {
    const wrongRoleToken = tokens.issue({ id: account.id, roleType, status: 'verified' }, new Types.ObjectId().toHexString(), new Date());
    for (const call of calls) assert.equal((await invokeWith(wrongRoleToken, call)).status, 403, `${roleType} ${call[0]} ${call[1]}`);
    assert.deepEqual(await connection.collection('seeker_profiles').findOne({ userId }), initialProfile);
    report.roleAuthorization.push({ roleType, status: 403, operationsDenied: 4, profileUnchanged: true });
  }

  for (const call of calls) assert.equal((await invoke(call)).status, 200);
  const before = await connection.collection('seeker_profiles').findOne({ userId });
  for (const state of ['suspended', 'rejected', 'role_changed', 'deleted']) {
    if (state === 'deleted') await connection.collection('users').deleteOne({ _id: userId });
    else await connection.collection('users').updateOne({ _id: userId }, { $set: state === 'role_changed' ? { status: 'verified', roleType: 'provider' } : { status: state } });
    const expected = ['suspended', 'rejected'].includes(state) ? 403 : 404;
    for (const call of calls) assert.equal((await invoke(call)).status, expected, `${state} ${call[0]} ${call[1]}`);
    assert.deepEqual(await connection.collection('seeker_profiles').findOne({ userId }), before);
    report.checks.push({ state, status: expected, operationsDenied: 4, profileUnchanged: true });
  }
  report.status = 'PASS_LOCAL';
} finally {
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^seeker_state_[a-f0-9]{32}$/);
  for (const collection of await connection.db.listCollections().toArray()) await connection.db.collection(collection.name).drop();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/seeker-account-state-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report));
