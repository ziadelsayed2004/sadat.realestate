import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createIdentityModels } from '../apps/api/src/modules/identity/models.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createAccountRuntime } from '../apps/api/src/modules/accounts/runtime.ts';
import { createSessionManagementRuntime } from '../apps/api/src/modules/auth/session-runtime.ts';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

const database = `session_check_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const report = { status: 'RUNNING', journeys: ['GUIDE-10'], mockedRoutes: false, environment: 'isolated-local-MongoDB-real-HTTP', runs: [], atomicAuditRollback: undefined, cleanup: false };
let server;
try {
  const models = createIdentityModels(connection);
  const auditModels = createAuditModels(connection);
  const audit = createMongooseAuditWriter(auditModels);
  let forceAuditFailure = false;
  const controlledAudit = {
    async record(entry, session) {
      await audit.record(entry, session);
      if (forceAuditFailure) throw new Error('FORCED_SESSION_AUDIT_FAILURE');
    }
  };
  const tokens = createHmacAccessTokenService(randomBytes(32), 3600);
  server = createApiServer({ database: { isReady: async () => true },
    accounts: createAccountRuntime(connection, tokens, audit, { async authorize() { return false; } }),
    sessionManagement: createSessionManagementRuntime(connection, tokens, controlledAudit) });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}/api/v1/me/sessions`;
  const makeSession = user => models.Session.create({ userId: user._id, tokenHash: randomBytes(32).toString('base64url'), expiresAt: new Date(Date.now() + 3600000), authenticationMethod: 'password' });
  const issue = (user, session) => tokens.issue({ id: String(user._id), roleType: user.roleType, status: 'verified' }, String(session._id), new Date());
  const call = (token, method = 'GET', suffix = '') => fetch(base + suffix, { method, headers: { authorization: `Bearer ${token}` } });
  for (const roleType of ['seeker', 'provider', 'admin']) {
    const user = await models.User.create({ normalizedEmail: `${roleType}@example.invalid`, roleType, status: 'verified', locale: 'en' });
    const foreign = await models.User.create({ normalizedEmail: `foreign-${roleType}@example.invalid`, roleType, status: 'verified', locale: 'en' });
    const current = await makeSession(user);
    const target = await makeSession(user);
    const foreignSession = await makeSession(foreign);
    const token = issue(user, current);
    const targetToken = issue(user, target);
    assert.equal((await call(targetToken)).status, 200);
    const beforeAudit = await auditModels.AuditLog.countDocuments();
    assert.equal((await call(token, 'DELETE', `/${foreignSession._id}`)).status, 404);
    assert.equal((await call(token, 'DELETE', `/${current._id}`)).status, 409);
    assert.equal(await auditModels.AuditLog.countDocuments(), beforeAudit);
    assert.equal((await models.Session.findById(foreignSession._id).lean()).revokedAt, undefined);
    assert.equal((await call(token, 'DELETE', `/${target._id}`)).status, 200);
    assert.equal((await call(targetToken)).status, 401);
    assert.equal((await call(targetToken, 'DELETE', `/${current._id}`)).status, 401);
    assert.equal((await call(token, 'DELETE', `/${target._id}`)).status, 404);
    const inventory = await call(token);
    assert.equal(inventory.status, 200);
    const items = (await inventory.json()).data.items;
    assert.equal(items.length, 1);
    assert.equal(items[0].id, String(current._id));
    assert.equal(items[0].current, true);
    assert.equal(await auditModels.AuditLog.countDocuments(), beforeAudit + 1);
    assert.ok((await models.Session.findById(target._id).lean()).revokedAt instanceof Date);
    report.runs.push({ roleType, foreignRevocation: 404, currentRevocation: 409, ownOtherRevocation: 200, revokedTokenRead: 401, revokedTokenWrite: 401, repeatRevocation: 404, remainingOwnSessions: 1, auditDelta: 1 });
  }
  const rollbackUser = await models.User.create({ normalizedEmail: 'rollback-seeker@example.invalid', roleType: 'seeker', status: 'verified', locale: 'en' });
  const rollbackCurrent = await makeSession(rollbackUser);
  const rollbackTarget = await makeSession(rollbackUser);
  const rollbackToken = issue(rollbackUser, rollbackCurrent);
  const auditBeforeFailure = await auditModels.AuditLog.countDocuments();
  forceAuditFailure = true;
  const failedRevocation = await call(rollbackToken, 'DELETE', `/${rollbackTarget._id}`);
  forceAuditFailure = false;
  assert.equal(failedRevocation.status, 500);
  assert.equal((await models.Session.findById(rollbackTarget._id).lean()).revokedAt, undefined);
  assert.equal(await auditModels.AuditLog.countDocuments(), auditBeforeFailure);
  assert.equal((await call(issue(rollbackUser, rollbackTarget))).status, 200);
  report.atomicAuditRollback = { status: 500, sessionStillActive: true, auditDelta: 0 };
  report.status = 'PASS_LOCAL';
} finally {
  if (server) await stopApiServer(server);
  assert.equal(connection.name, database);
  assert.match(database, /^session_check_[a-f0-9]{32}$/);
  for (const collection of await connection.db.listCollections().toArray()) await connection.db.collection(collection.name).drop();
  report.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/session-revocation-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report));
