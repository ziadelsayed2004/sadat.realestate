import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose, { Types } from 'mongoose';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';
import { createHmacAccessTokenService } from '../apps/api/src/modules/auth/crypto.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
import { createRbacRuntime } from '../apps/api/src/modules/rbac/runtime.ts';
import { createRequestRuntime } from '../apps/api/src/modules/requests/runtime.ts';

// This verifier accepts no external URI and always drops its uniquely named loopback database.
const database = `provider_customer_request_${Date.now()}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const evidence = {
  status: 'RUNNING', journeys: ['GUIDE-16'], environment: 'isolated-local-MongoDB-rs0-real-HTTP',
  database, mockedRoutes: false, testedAt: new Date().toISOString(),
  scope: 'Request runtime with locally signed tokens and real account-state checks; no browser, login, stored-session revocation, provider subtype lifecycle, projects, viewings or Production coverage.',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  checks: [], httpStatuses: {}, cleanup: false
};

let server;
try {
  const accessTokens = createHmacAccessTokenService(randomBytes(32), 3600);
  const auditModels = createAuditModels(connection);
  await auditModels.AuditLog.init();
  const audit = createMongooseAuditWriter(auditModels);
  const rbac = createRbacRuntime(connection, accessTokens, audit);
  const requests = createRequestRuntime(connection, accessTokens, rbac.service, audit);
  const ids = { provider: new Types.ObjectId(), foreignProvider: new Types.ObjectId(), seeker: new Types.ObjectId() };
  await connection.collection('users').insertMany([
    { _id: ids.provider, roleType: 'provider', status: 'verified' },
    { _id: ids.foreignProvider, roleType: 'provider', status: 'verified' },
    { _id: ids.seeker, roleType: 'seeker', status: 'verified' }
  ]);
  const tokens = Object.fromEntries(Object.entries(ids).map(([name, id]) => [name, accessTokens.issue({
    id: id.toHexString(), roleType: name === 'seeker' ? 'seeker' : 'provider', status: 'verified'
  }, new Types.ObjectId().toHexString(), new Date())]));
  server = createApiServer({ database: { isReady: async () => true }, requests });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const call = async (actor, path, body) => {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { authorization: `Bearer ${tokens[actor]}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, body: await response.json() };
  };

  const payload = {
    firstName: 'Mona', lastName: 'Hassan', phone: '+201001234567',
    email: 'mona.customer@example.test', message: 'Interested in a suitable property',
    sourceNote: 'Local GUIDE-16 verification'
  };
  const invalid = await call('provider', '/provider/customer-requests', { ...payload, lastName: '' });
  evidence.httpStatuses.invalid = invalid.status;
  assert.equal(invalid.status, 400);
  assert.equal(await connection.collection('requests').countDocuments(), 0);
  evidence.checks.push('invalid_customer_request_rejected_without_write');

  const wrongRole = await call('seeker', '/provider/customer-requests', payload);
  evidence.httpStatuses.wrongRole = wrongRole.status;
  assert.equal(wrongRole.status, 403);
  assert.equal(await connection.collection('requests').countDocuments(), 0);
  evidence.checks.push('seeker_token_denied_provider_customer_creation');

  const created = await call('provider', '/provider/customer-requests', payload);
  evidence.httpStatuses.create = created.status;
  assert.equal(created.status, 201);
  assert.equal(created.body.data.type, 'provider_customer');
  assert.equal(created.body.data.source, 'provider');
  assert.equal(created.body.data.providerId, ids.provider.toHexString());
  assert.deepEqual(created.body.data.payload, payload);
  const requestId = created.body.data.id;
  evidence.checks.push('provider_customer_request_created_with_exact_payload');

  const duplicate = await call('provider', '/provider/customer-requests', payload);
  evidence.httpStatuses.duplicate = duplicate.status;
  assert.equal(duplicate.status, 409);
  assert.equal(await connection.collection('requests').countDocuments({ providerId: ids.provider }), 1);
  evidence.checks.push('duplicate_active_customer_request_rejected_without_second_record');

  const list = await call('provider', '/provider/customer-requests?type=provider_customer&page=1&limit=20');
  evidence.httpStatuses.list = list.status;
  assert.equal(list.status, 200);
  assert.equal(list.body.data.total, 1);
  assert.equal(list.body.data.items[0].id, requestId);
  assert.equal((await call('foreignProvider', `/provider/customer-requests/${requestId}`)).status, 404);
  assert.equal((await call('foreignProvider', '/provider/customer-requests?type=provider_customer&page=1&limit=20')).body.data.total, 0);
  evidence.checks.push('owner_list_and_foreign_provider_isolation');

  await connection.collection('users').updateOne({ _id: ids.provider }, { $set: { status: 'suspended' } });
  const suspended = await call('provider', '/provider/customer-requests?type=provider_customer&page=1&limit=20');
  evidence.httpStatuses.suspended = suspended.status;
  assert.equal(suspended.status, 403);
  await connection.collection('users').updateOne({ _id: ids.provider }, { $set: { status: 'verified' } });
  evidence.checks.push('current_provider_account_state_overrides_issued_token');

  const auditBefore = await auditModels.AuditLog.countDocuments({ targetId: requestId });
  for (const [key, body, status] of [
    ['invalidReason', { transition: 'contact', reason: ' ', expectedVersion: 0 }, 400],
    ['staleVersion', { transition: 'contact', reason: 'Customer contacted successfully', expectedVersion: 7 }, 409]
  ]) {
    const rejected = await call('provider', `/provider/customer-requests/${requestId}/transitions`, body);
    evidence.httpStatuses[key] = rejected.status;
    assert.equal(rejected.status, status);
    const unchanged = await connection.collection('requests').findOne({ _id: new Types.ObjectId(requestId) });
    assert.equal(unchanged.status, 'new');
    assert.equal(unchanged.version, 0);
    assert.equal(await auditModels.AuditLog.countDocuments({ targetId: requestId }), auditBefore);
  }
  evidence.checks.push('invalid_reason_and_stale_version_leave_request_and_audit_unchanged');

  const transitioned = await call('provider', `/provider/customer-requests/${requestId}/transitions`, {
    transition: 'contact', reason: 'Customer contacted successfully', expectedVersion: 0
  });
  evidence.httpStatuses.transition = transitioned.status;
  assert.equal(transitioned.status, 200);
  assert.equal(transitioned.body.data.status, 'contacted');
  assert.equal(transitioned.body.data.version, 1);
  const stored = await connection.collection('requests').findOne({ _id: new Types.ObjectId(requestId) });
  assert.equal(stored.status, 'contacted');
  assert.equal(stored.version, 1);
  const auditEntry = await auditModels.AuditLog.findOne({ targetId: requestId, action: 'request.contact' }).lean();
  assert.equal(auditEntry.reason, 'Customer contacted successfully');
  assert.equal(auditEntry.actorId.toHexString(), ids.provider.toHexString());
  evidence.checks.push('provider_contact_transition_persists_version_reason_and_audit');
  evidence.status = 'PASS_LOCAL';
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  evidence.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  if (server) await stopApiServer(server);
  await connection.dropDatabase();
  evidence.cleanup = (await connection.db.listCollections().toArray()).length === 0;
  await connection.close();
  evidence.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/provider-customer-request-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify(evidence, null, 2));
