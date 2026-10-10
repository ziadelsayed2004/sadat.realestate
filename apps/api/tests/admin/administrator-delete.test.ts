import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import mongoose, { Types, type ClientSession } from 'mongoose';
import { createIdentityModels } from '../../src/modules/identity/models.js';
import { createAdminModels } from '../../src/modules/admin/models.js';
import { createAuthModels } from '../../src/modules/auth/models.js';
import { createRbacModels } from '../../src/modules/rbac/models.js';
import { createMongooseAdministratorRepository } from '../../src/modules/admin/administrator-repository.js';
import { createAdministratorService, AdministratorServiceError } from '../../src/modules/admin/administrator-service.js';
import type { AuditWriter } from '../../src/modules/audit/writer.js';

const actorId = '0123456789abcdef01234567';
const id = '1123456789abcdef01234567';
const stamp = new Date('2026-10-10T00:00:00Z');
const input = { actorId, id, expectedVersion: 3, now: stamp.toISOString(), requestId: 'delete-admin', traceId: 'a'.repeat(32) };

function fixture(t: TestContext, superAdmin = false, superCount = 2) {
  const connection = mongoose.createConnection();
  const identityModels = createIdentityModels(connection);
  const adminModels = createAdminModels(connection);
  const auth = createAuthModels(connection);
  const rbac = createRbacModels(connection);
  const events: string[] = [];
  let deleted = false;
  const user = { _id: new Types.ObjectId(id), normalizedEmail: 'staff@example.com', roleType: 'admin', status: 'verified', version: 3, createdAt: stamp, updatedAt: stamp };
  const query = (value: unknown) => ({ select() { return this; }, session() { return this; }, async lean() { return value; } });
  const captures: unknown[] = [];
  // Mongo transactions share the same session across the guard, tombstone,
  // credential/assignment removal, session revocation and audit write.
  const session = {} as ClientSession;
  t.mock.method(connection, 'transaction', async (run: (session: ClientSession) => Promise<unknown>) => run(session));
  t.mock.method(adminModels.AdminBootstrap, 'updateOne', async () => { events.push('lock'); return { matchedCount: 1 }; });
  t.mock.method(identityModels.User, 'findOne', (filter: unknown) => { captures.push(filter); events.push('read'); return query(deleted ? null : user); });
  t.mock.method(identityModels.User, 'find', () => query(Array.from({ length: superCount }, (_, index) => ({ ...user, _id: new Types.ObjectId(index === 0 ? id : actorId) }))));
  t.mock.method(adminModels.AdminAccount, 'findOne', () => query({ userId: user._id, displayName: 'Staff', accessLevel: superAdmin ? 'super_admin' : 'standard_admin' }));
  t.mock.method(adminModels.AdminAccount, 'find', () => query([id, actorId].map(value => ({ userId: new Types.ObjectId(value), displayName: 'Staff', accessLevel: 'super_admin' }))));
  t.mock.method(adminModels.AdminBootstrap, 'findOne', () => query(null));
  t.mock.method(adminModels.AdminBootstrap, 'find', () => query([]));
  t.mock.method(rbac.AdminRoleAssignment, 'findOne', () => query(null));
  t.mock.method(rbac.AdminRoleAssignment, 'find', () => query([]));
  t.mock.method(identityModels.User, 'updateOne', async (...args: unknown[]) => { captures.push(args); events.push('tombstone'); deleted = true; return { modifiedCount: 1 }; });
  t.mock.method(identityModels.Session, 'updateMany', async (...args: unknown[]) => { captures.push(args); events.push('sessions'); });
  t.mock.method(auth.AdminCredential, 'deleteOne', async (...args: unknown[]) => { captures.push(args); events.push('credentials'); });
  t.mock.method(rbac.AdminRoleAssignment, 'deleteOne', async (...args: unknown[]) => { captures.push(args); events.push('roles'); });
  const auditWriter: AuditWriter = { async record(...args) { captures.push(args); events.push('audit'); return 'audit-id'; } };
  const repository = createMongooseAdministratorRepository({ connection, identityModels, adminModels, auditWriter });
  return { repository, events, captures, session };
}

test('administrator deletion tombstones identity, revokes sessions/credentials/roles and audits in one transaction', async t => {
  const f = fixture(t);
  assert.deepEqual(await f.repository.remove(input), { kind: 'deleted', data: { id, deleted: true, version: 4 } });
  assert.deepEqual(f.events, ['lock', 'read', 'tombstone', 'sessions', 'credentials', 'roles', 'audit']);
  const writes = f.captures.slice(1) as Array<[unknown, unknown, { session: ClientSession }]>;
  assert.deepEqual(writes[0]?.[1], { $set: { status: 'suspended', deletedAt: stamp, deletedBy: new Types.ObjectId(actorId), statusChangedAt: stamp, updatedAt: stamp }, $inc: { version: 1 } });
  assert.equal(writes[0]?.[2].session, f.session);
  assert.deepEqual(writes[1]?.[1], { $set: { revokedAt: stamp, lastUsedAt: stamp } });
  assert.equal(writes[1]?.[2].session, f.session);
  assert.deepEqual(writes[2]?.[0], { userId: new Types.ObjectId(id) });
  assert.deepEqual(writes[3]?.[0], { adminUserId: new Types.ObjectId(id) });
  assert.equal((writes[2]?.[1] as { session: ClientSession }).session, f.session);
  assert.equal((writes[3]?.[1] as { session: ClientSession }).session, f.session);
  assert.equal((f.captures.at(-1) as [{ action: string }])[0].action, 'admin.administrator_deleted');
  assert.equal(await f.repository.findById(id), undefined);
  assert.deepEqual(f.captures.at(-1), { _id: new Types.ObjectId(id), roleType: 'admin', deletedAt: null });
});

test('repository independently blocks self, stale versions, and the last active Super Admin before destructive writes', async t => {
  const f = fixture(t, true, 1);
  await assert.rejects(() => f.repository.remove({ ...input, actorId: id }), /ADMINISTRATOR_SELF_LOCKOUT/);
  assert.deepEqual(await f.repository.remove({ ...input, expectedVersion: 4 }), { kind: 'version_conflict' });
  await assert.rejects(() => f.repository.remove(input), /ADMINISTRATOR_LAST_SUPER_ADMIN/);
  await assert.rejects(() => f.repository.update({ ...input, patch: { expectedVersion: 3, status: 'disabled', reason: 'Disable the last root' } }), /ADMINISTRATOR_LAST_SUPER_ADMIN/);
  assert.equal(f.events.includes('tombstone'), false);
});

test('deletion enforces staff management permission before reading a target or parsing payload', async t => {
  const f = fixture(t);
  const service = createAdministratorService({ repository: f.repository, authorization: { async authorize() { return false; } } });
  await assert.rejects(() => service.remove(actorId, id, { ignored: true }), error => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_FORBIDDEN');
  assert.deepEqual(f.events, []);
});
