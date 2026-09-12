import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createIdentityModels } from '../apps/api/src/modules/identity/models.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createAccountRuntime } from '../apps/api/src/modules/accounts/runtime.ts';
import { createSeekerRuntime } from '../apps/api/src/modules/seeker/runtime.ts';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

const database = `overview_access_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = { status: 'RUNNING', journeys: ['GUIDE-05'], mockedRoutes: false, environment: 'isolated-local-MongoDB-real-HTTP', runs: [], cleanup: false };
let server;
try {
  const models = createIdentityModels(connection);
  const auditModels = createAuditModels(connection);
  const audit = createMongooseAuditWriter(auditModels);
  const tokens = createHmacAccessTokenService(randomBytes(32), 3600);
  server = createApiServer({ database: { isReady: async () => true },
    accounts: createAccountRuntime(connection, tokens, audit, { async authorize() { return false; } }),
    seeker: createSeekerRuntime(connection, { async issueAccount() { throw new Error('Unused registration'); }, async setAccountPassword() { throw new Error('Unused registration'); } }, tokens, { name: 'local_refresh', path: '/api/v1/auth', httpOnly: true, sameSite: 'Strict', secure: false, maxAgeSeconds: 3600 }) });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}/api/v1/seeker/overview`;
  const makeSession = user => models.Session.create({ userId: user._id, tokenHash: randomBytes(32).toString('base64url'), expiresAt: new Date(Date.now() + 3600000), authenticationMethod: 'password' });
  const issue = (user, session) => tokens.issue({ id: String(user._id), roleType: user.roleType, status: 'verified' }, String(session._id), new Date());
  const call = (token, method = 'GET', suffix = '') => fetch(base + suffix, { method, headers: { authorization: `Bearer ${token}` } });
  const user = await models.User.create({ normalizedEmail: 'overview-owner@example.invalid', roleType: 'seeker', status: 'verified', locale: 'en' });
  const session = await makeSession(user);
  const token = issue(user, session);
  assert.equal((await call(token)).status, 200);
  for (const state of ['suspended','rejected','restricted','role_changed','deleted']) {
    if (state === 'deleted') await models.User.deleteOne({ _id: user._id });
    else await connection.collection('users').updateOne({ _id: user._id }, { $set: { status: state === 'role_changed' ? 'verified' : state, roleType: state === 'role_changed' ? 'provider' : 'seeker' } });
    if (state === 'role_changed') assert.equal((await connection.collection('users').findOne({ _id: user._id })).roleType, 'provider');
    const response = await call(token);
    assert.equal(response.status, 401, state);
    assert.equal('data' in await response.json(), false);
    report.runs.push({ state, httpStatus: 401, summaryExposed: false });
  }
  for (const roleType of ['provider','admin']) {
    const other = await models.User.create({ normalizedEmail: `${roleType}@example.invalid`, roleType, status: 'verified', locale: 'en' });
    const current = await makeSession(other);
    assert.equal((await call(issue(other,current))).status,403);
    report.runs.push({ roleType, httpStatus: 403 });
  }
  const fresh = await models.User.create({ normalizedEmail: 'fresh@example.invalid', roleType: 'seeker', status: 'verified', locale: 'en' });
  const current = await makeSession(fresh);
  const currentToken = issue(fresh,current);
  assert.equal((await call(currentToken)).status,200);
  await models.Session.updateOne({ _id: current._id }, { $set: { expiresAt: new Date(0) } });
  assert.equal((await call(currentToken)).status,401);
  report.runs.push({ state: 'expired_session', httpStatus: 401 });
  assert.equal((await fetch(base)).status,401);
  report.runs.push({ state: 'anonymous', httpStatus: 401 });
  report.status = 'PASS_LOCAL';
} finally {
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^overview_access_[a-f0-9]{32}$/);
  for (const collection of await connection.db.listCollections().toArray()) await connection.db.collection(collection.name).drop();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/seeker-overview-access-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report));
