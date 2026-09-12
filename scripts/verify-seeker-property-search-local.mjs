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

// This verifier only connects to a uniquely named loopback database and always drops it.
const database = `seeker_property_search_${Date.now()}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27018/${database}?replicaSet=rs0`).asPromise();
const evidence = {
  status: 'RUNNING',
  journeys: ['GUIDE-06'],
  environment: 'isolated-local-MongoDB-rs0-real-HTTP',
  database,
  mockedRoutes: false,
  testedAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  checks: [],
  httpStatuses: {},
  cleanup: false
};

let server;
try {
  const accessTokens = createHmacAccessTokenService(randomBytes(32), 3600);
  const auditModels = createAuditModels(connection);
  await auditModels.AuditLog.init();
  const audit = createMongooseAuditWriter(auditModels);
  const rbac = createRbacRuntime(connection, accessTokens, audit);
  const requests = createRequestRuntime(connection, accessTokens, rbac.service, audit);
  const seekerId = new Types.ObjectId();
  const otherSeekerId = new Types.ObjectId();
  const locationId = new Types.ObjectId();
  await connection.collection('users').insertMany([
    { _id: seekerId, roleType: 'seeker', status: 'verified' },
    { _id: otherSeekerId, roleType: 'seeker', status: 'verified' }
  ]);
  const tokens = {
    seeker: accessTokens.issue({ id: seekerId.toHexString(), roleType: 'seeker', status: 'verified' }, new Types.ObjectId().toHexString(), new Date()),
    other: accessTokens.issue({ id: otherSeekerId.toHexString(), roleType: 'seeker', status: 'verified' }, new Types.ObjectId().toHexString(), new Date())
  };
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
    locations: [locationId.toHexString()],
    propertyTypes: ['apartment'],
    minBudget: 1_500_000,
    maxBudget: 3_500_000,
    minBedrooms: 2,
    maxBedrooms: 4,
    note: 'Local GUIDE-06 property search verification',
    locale: 'ar'
  };
  const invalid = await call('seeker', '/seeker/search-requests', { ...payload, minBudget: 4_000_000, maxBudget: 3_500_000 });
  evidence.httpStatuses.invalidRange = invalid.status;
  assert.equal(invalid.status, 400);
  assert.equal(await connection.collection('requests').countDocuments(), 0);
  evidence.checks.push('invalid_budget_range_rejected_without_write');

  const created = await call('seeker', '/seeker/search-requests', payload);
  evidence.httpStatuses.create = created.status;
  assert.equal(created.status, 201);
  assert.equal(created.body.data.type, 'property_search');
  assert.equal(created.body.data.status, 'new');
  assert.deepEqual(created.body.data.payload, payload);
  const requestId = created.body.data.id;
  evidence.checks.push('property_search_created_with_exact_public_payload');

  const duplicate = await call('seeker', '/seeker/search-requests', payload);
  evidence.httpStatuses.duplicate = duplicate.status;
  assert.equal(duplicate.status, 409);
  assert.equal(await connection.collection('requests').countDocuments({ seekerId }), 1);
  evidence.checks.push('duplicate_active_property_search_rejected_without_second_record');

  const list = await call('seeker', '/seeker/requests?type=property_search&page=1&limit=20');
  evidence.httpStatuses.list = list.status;
  assert.equal(list.status, 200);
  assert.equal(list.body.data.total, 1);
  assert.equal(list.body.data.items[0].id, requestId);
  const detail = await call('seeker', `/seeker/requests/${requestId}`);
  evidence.httpStatuses.detail = detail.status;
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.body.data.payload, payload);
  assert.equal((await call('other', `/seeker/requests/${requestId}`)).status, 404);
  evidence.checks.push('owned_list_and_detail_return_persisted_search_request', 'foreign_seeker_detail_hidden');

  const cancelled = await call('seeker', `/seeker/requests/${requestId}/transitions`, {
    transition: 'cancel', reason: 'Search requirements changed', expectedVersion: 0
  });
  evidence.httpStatuses.cancel = cancelled.status;
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.status, 'cancelled');
  assert.equal(cancelled.body.data.version, 1);
  const stored = await connection.collection('requests').findOne({ _id: new Types.ObjectId(requestId) });
  assert.equal(stored.status, 'cancelled');
  assert.equal(stored.version, 1);
  const auditEntry = await auditModels.AuditLog.findOne({ targetId: requestId, action: 'request.cancel' }).lean();
  assert.equal(auditEntry.reason, 'Search requirements changed');
  assert.equal(auditEntry.actorId.toHexString(), seekerId.toHexString());
  evidence.checks.push('seeker_cancellation_persisted_with_reason_version_and_audit');
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
  await writeFile('docs/quality/guide-runs/seeker-property-search-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify(evidence, null, 2));
