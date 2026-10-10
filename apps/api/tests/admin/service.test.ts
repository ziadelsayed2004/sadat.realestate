import assert from 'node:assert/strict';
import test from 'node:test';
import { FIRST_SUPER_ADMIN_CONFIRMATION } from '@sadat-real-estate/contracts';
import type { PasswordHasher } from '../../src/modules/auth/crypto.js';
import type { AdminRepository } from '../../src/modules/admin/repository.js';
import {
  AdminServiceError,
  createAdminBootstrapService
} from '../../src/modules/admin/service.js';
import {
  AdminOverviewServiceError,
  createAdminOverviewService
} from '../../src/modules/admin/overview-service.js';
import {
  AdministratorServiceError,
  createAdministratorService,
  type AdministratorRepository
} from '../../src/modules/admin/administrator-service.js';
import type { AdminUserData } from '@sadat-real-estate/contracts';

const validInput = {
  email: ' First.Admin@Example.COM ',
  password: 'LongSynthetic9!Password',
  locale: 'en' as const,
  confirmation: FIRST_SUPER_ADMIN_CONFIRMATION
};

function passwordHasher(): PasswordHasher {
  return {
    async hash(value) { return `$argon2id$hashed:${value.length}`; },
    async verify() { return false; }
  };
}

function repository(
  kind: 'created' | 'already_bootstrapped' | 'administrator_exists' | 'concurrent_conflict' = 'created'
): AdminRepository {
  return {
    async createFirstSuperAdmin(input) {
      assert.equal(input.email, 'first.admin@example.com');
      assert.equal(input.passwordHash, '$argon2id$hashed:23');
      return kind === 'created'
        ? { kind, adminId: '0123456789abcdef01234567' }
        : { kind };
    }
  };
}

test('hashes the password and returns a safe first-Super-Admin projection', async () => {
  const service = createAdminBootstrapService({
    repository: repository(),
    passwordHasher: passwordHasher(),
    now: () => new Date('2026-08-13T18:00:00.000Z')
  });
  const result = await service.bootstrap(validInput);
  assert.deepEqual(result, {
    adminId: '0123456789abcdef01234567',
    email: 'first.admin@example.com',
    accessLevel: 'super_admin',
    status: 'verified',
    bootstrappedAt: '2026-08-13T18:00:00.000Z'
  });
  assert.doesNotMatch(JSON.stringify(result), /password|argon2/);
});

test('maps existing and concurrent state to stable errors without credential data', async () => {
  const expected = {
    already_bootstrapped: 'ADMIN_BOOTSTRAP_ALREADY_COMPLETED',
    administrator_exists: 'ADMINISTRATOR_ALREADY_EXISTS',
    concurrent_conflict: 'ADMIN_BOOTSTRAP_CONFLICT'
  } as const;
  for (const [kind, code] of Object.entries(expected) as Array<[keyof typeof expected, string]>) {
    const service = createAdminBootstrapService({
      repository: repository(kind),
      passwordHasher: passwordHasher()
    });
    await assert.rejects(
      service.bootstrap(validInput),
      (error: unknown) => error instanceof AdminServiceError
        && error.code === code
        && !error.message.includes(validInput.password)
    );
  }
});

test('validates confirmation and password before hashing or persistence', async () => {
  let hashed = false;
  let persisted = false;
  const service = createAdminBootstrapService({
    repository: {
      async createFirstSuperAdmin() {
        persisted = true;
        return { kind: 'administrator_exists' };
      }
    },
    passwordHasher: {
      async hash() { hashed = true; return '$argon2id$unused'; },
      async verify() { return false; }
    }
  });
  await assert.rejects(service.bootstrap({ ...validInput, password: 'short' }));
  assert.equal(hashed, false);
  assert.equal(persisted, false);
});

test('returns documented admin overview aggregations only for authorized verified administrators', async () => {
  const claims = {
    iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567',
    sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9_999_999_999, jti: 'overview'
  } as import('../../src/modules/auth/crypto.js').AccessTokenClaims;
  const range = { from: '2026-08-01T00:00:00+00:00', to: '2026-08-14T00:00:00+00:00' };
  const metrics = { users: 12, seekers: 7, providers: 5, verifiedProviders: 3, publishedProperties: 9, openRequests: 4, pendingReviews: 2 };
  let requestedPermission = '';
  const service = createAdminOverviewService({
    authorization: { async authorize(adminId, permission) { assert.equal(adminId, claims.sub); requestedPermission = permission; return true; } },
    source: { async aggregate(received) { assert.deepEqual(received, range); return metrics; } },
    now: () => new Date('2026-08-14T01:00:00.000Z')
  });
  const result = await service.getOverview(claims, range);
  assert.deepEqual(result, { range, metrics, generatedAt: '2026-08-14T01:00:00.000Z' });
  assert.equal(requestedPermission, 'admin:overview.view');
});

test('rejects unauthorized roles, invalid ranges, unknown fields, and malformed aggregation output', async () => {
  const adminClaims = {
    iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567',
    sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9_999_999_999, jti: 'overview'
  } as import('../../src/modules/auth/crypto.js').AccessTokenClaims;
  const seekerClaims = { ...adminClaims, role: 'seeker' } as import('../../src/modules/auth/crypto.js').AccessTokenClaims;
  const dependencies = {
    authorization: { async authorize() { return false; } },
    source: { async aggregate() { return { users: 1, seekers: 1, providers: 0, verifiedProviders: 0, publishedProperties: 0, openRequests: 0, pendingReviews: 0 }; } }
  };
  const denied = createAdminOverviewService(dependencies);
  await assert.rejects(() => denied.get(seekerClaims, { from: '2026-08-01T00:00:00+00:00', to: '2026-08-02T00:00:00+00:00' }), (error) => error instanceof AdminOverviewServiceError && error.code === 'ADMIN_OVERVIEW_FORBIDDEN');
  await assert.rejects(() => denied.get(adminClaims, { from: '2026-08-02T00:00:00+00:00', to: '2026-08-01T00:00:00+00:00' }), /to must be after from/);
  await assert.rejects(() => denied.get(adminClaims, { from: '2026-08-01T00:00:00+00:00', to: '2027-09-01T00:00:00+00:00' }), /366 days/);
  await assert.rejects(() => denied.get(adminClaims, { from: '2026-08-01T00:00:00+00:00', to: '2026-08-02T00:00:00+00:00', unknown: true }), /Unrecognized key/);
  const malformed = createAdminOverviewService({ authorization: { async authorize() { return true; } }, source: { async aggregate() { return { users: -1 }; } } });
  await assert.rejects(() => malformed.get(adminClaims, { from: '2026-08-01T00:00:00+00:00', to: '2026-08-02T00:00:00+00:00' }), (error) => error instanceof AdminOverviewServiceError && error.code === 'ADMIN_OVERVIEW_SOURCE_INVALID');
});

function adminRecord(overrides: Partial<AdminUserData> = {}): AdminUserData {
  return {
    id: '0123456789abcdef01234567', email: 'root@example.com', displayName: 'Root Admin', accessLevel: 'super_admin', status: 'active', version: 0,
    createdAt: '2026-08-14T00:00:00.000Z', updatedAt: '2026-08-14T00:00:00.000Z', availableActions: ['update', 'disable'], ...overrides
  };
}

function administratorFixture(initial: AdminUserData[] = [adminRecord(), adminRecord({ id: '1123456789abcdef01234567', email: 'staff@example.com', displayName: 'Staff Admin', accessLevel: 'standard_admin' })]) {
  const records = new Map(initial.map((record) => [record.id, record]));
  const repository: AdministratorRepository = {
    async heartbeat() { return true; },
    async presence() { return {}; },
    async remove(input) {
      const current = records.get(input.id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      records.delete(input.id);
      return { kind: 'deleted', data: { id: input.id, deleted: true, version: current.version + 1 } };
    },
    async list() { return [...records.values()]; },
    async findById(id) { return records.get(id); },
    async countActiveSuperAdmins() { return [...records.values()].filter((record) => record.status === 'active' && record.accessLevel === 'super_admin').length; },
    async create(input) {
      if ([...records.values()].some((record) => record.email === input.data.email)) return { kind: 'email_conflict' };
      const id = '2123456789abcdef01234567';
      const record = adminRecord({ id, email: input.data.email, displayName: input.data.displayName, accessLevel: input.data.accessLevel, version: 0, createdAt: input.now, updatedAt: input.now });
      records.set(id, record);
      return { kind: 'created', administrator: record };
    },
    async update(input) {
      const current = records.get(input.id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      if (input.patch.email && [...records.values()].some((record) => record.id !== input.id && record.email === input.patch.email)) return { kind: 'email_conflict' };
      const { expectedVersion: _expectedVersion, reason: _reason, ...changes } = input.patch;
      void _expectedVersion; void _reason;
      const next: AdminUserData = { ...current, ...changes, version: current.version + 1, updatedAt: input.now, ...(input.patch.status === 'disabled' ? { disabledAt: input.now } : {}), ...(input.patch.status === 'active' ? { disabledAt: undefined } : {}) };
      records.set(input.id, next);
      return { kind: 'updated', administrator: next };
    }
  };
  const authorization = { async authorize(adminId: string, permission: 'admin:staff.view' | 'admin:staff.manage') { return adminId === '0123456789abcdef01234567' && permission === 'admin:staff.view' || permission === 'admin:staff.manage'; } };
  return { repository, service: createAdministratorService({ authorization, repository, now: () => new Date('2026-08-14T01:00:00.000Z') }) };
}

test('administrator heartbeat is self scoped, requires a live session and bounds presence by access expiry', async () => {
  const { repository } = administratorFixture();
  const now = new Date('2026-10-10T12:00:00Z');
  const actor = adminRecord().id;
  const session = '2123456789abcdef01234567';
  const writes: unknown[][] = [];
  let active = true;
  repository.heartbeat = async (...args) => { writes.push(args); return active; };
  const service = createAdministratorService({ repository, authorization: { async authorize() { return false; } }, now: () => now });
  assert.deepEqual(await service.heartbeat(actor, session, now.getTime() + 60_000), { id: actor, displayName: 'Root Admin' });
  assert.deepEqual(writes[0], [actor, session, now, new Date(now.getTime() + 60_000)]);
  await service.heartbeat(actor, session, now.getTime() + 600_000);
  assert.equal((writes[1]?.[3] as Date).getTime(), now.getTime() + 120_000);
  for (const input of [[actor, session, now.getTime()], [actor, session, NaN], [actor, 'invalid', now.getTime() + 1000], ['ffffffffffffffffffffffff', session, now.getTime() + 1000]] as const) {
    await assert.rejects(() => service.heartbeat(...input), error => error instanceof AdministratorServiceError && error.code === 'AUTHENTICATION_REQUIRED');
  }
  assert.equal(writes.length, 2);
  active = false;
  await assert.rejects(() => service.heartbeat(actor, session, now.getTime() + 1000), /AUTHENTICATION_REQUIRED/);
  const disabled = createAdministratorService({ repository: { ...repository, async findById() { return adminRecord({ status: 'disabled', disabledAt: now.toISOString() }); } }, authorization: { async authorize() { return true; } }, now: () => now });
  await assert.rejects(() => disabled.heartbeat(actor, session, now.getTime() + 1000), /AUTHENTICATION_REQUIRED/);
});

test('staff presence reads only the authorized page and disabled accounts cannot appear online', async () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const actor = adminRecord().id;
  const { repository } = administratorFixture([adminRecord(), adminRecord({ id: '1123456789abcdef01234567', email: 'z@example.com', status: 'disabled', disabledAt: now.toISOString() })]);
  const pages: readonly string[][] = [];
  repository.presence = async ids => { (pages as string[][]).push([...ids]); return Object.fromEntries(ids.map(id => [id, { online: true, lastActiveAt: now.toISOString() }])); };
  const service = createAdministratorService({ repository, authorization: { async authorize() { return true; } }, now: () => now });
  const page = await service.list(actor, { page: 2, limit: 1 });
  assert.deepEqual(pages[0], [page.items[0]?.id]);
  assert.deepEqual(page.items[0]?.presence, { online: false, lastActiveAt: now.toISOString() });
  const denied = createAdministratorService({ repository, authorization: { async authorize() { return false; } } });
  await assert.rejects(() => denied.list(actor, {}), /ADMINISTRATOR_FORBIDDEN/);
  assert.equal(pages.length, 1);
});

test('lists, creates, updates, and disables administrators with safe projections and permission boundaries', async () => {
  const { service } = administratorFixture();
  const adminId = '0123456789abcdef01234567';
  const list = await service.list(adminId, { page: 1, limit: 10 });
  assert.equal(list.total, 2);
  assert.equal('password' in list.items[0]!, false);
  const created = await service.create(adminId, { email: 'new@example.com', displayName: 'New Admin', accessLevel: 'standard_admin' });
  assert.equal(created.email, 'new@example.com');
  const updated = await service.update(adminId, created.id, { expectedVersion: 0, reason: 'Disable unused administrator', status: 'disabled' });
  assert.equal(updated.status, 'disabled');
  assert.deepEqual(updated.availableActions, ['update', 'enable']);
  await assert.rejects(() => service.create(adminId, { email: 'new@example.com', displayName: 'Duplicate', accessLevel: 'standard_admin' }), (error) => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_EMAIL_CONFLICT');
});

test('prevents self-lockout, last Super Admin removal, stale updates, and mass assignment', async () => {
  const adminId = '0123456789abcdef01234567';
  const only = administratorFixture([adminRecord()]).service;
  await assert.rejects(() => only.update(adminId, adminId, { expectedVersion: 0, reason: 'Disable myself', status: 'disabled' }), (error) => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_SELF_LOCKOUT');
  const two = administratorFixture();
  await assert.rejects(() => two.service.update(adminId, adminId, { expectedVersion: 0, reason: 'Demote myself', accessLevel: 'standard_admin' }), (error) => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_SELF_LOCKOUT');
  const last = administratorFixture([adminRecord(), adminRecord({ id: '1123456789abcdef01234567', email: 'other-root@example.com', displayName: 'Other Root', accessLevel: 'super_admin' })]);
  await last.service.update('2123456789abcdef01234567', '1123456789abcdef01234567', { expectedVersion: 0, reason: 'Disable one Super Admin', status: 'disabled' });
  await assert.rejects(() => last.service.update('2123456789abcdef01234567', adminId, { expectedVersion: 0, reason: 'Disable last Super Admin', status: 'disabled' }), (error) => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_LAST_SUPER_ADMIN');
  await assert.rejects(() => two.service.update(adminId, '1123456789abcdef01234567', { expectedVersion: 9, reason: 'Stale', status: 'disabled' }), (error) => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_VERSION_CONFLICT');
  await assert.rejects(() => two.service.update(adminId, '1123456789abcdef01234567', { expectedVersion: 0, reason: 'Unknown', passwordHash: 'secret' }), /Unrecognized key/);
  await assert.rejects(() => two.service.list('2123456789abcdef01234567', { page: 1, limit: 10 }), (error) => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_FORBIDDEN');
});

test('hashes employee passwords without passing plaintext to persistence and protects role assignment', async () => {
  const { repository } = administratorFixture();
  let saved: Parameters<AdministratorRepository['create']>[0] | undefined;
  const create = repository.create;
  repository.create = async input => { saved = input; return create(input); };
  const service = createAdministratorService({ repository, authorization: { async authorize() { return true; } }, passwordHasher: { async hash() { return '$argon2id$synthetic'; }, async verify() { return true; } } });
  const input = { email: 'employee@example.com', displayName: 'Employee', accessLevel: 'standard_admin', password: 'SyntheticAdmin123!', roleIds: ['3123456789abcdef01234567'] };
  const result = await service.create('0123456789abcdef01234567', input);
  assert.equal(saved?.passwordHash, '$argon2id$synthetic');
  assert.equal('password' in (saved?.data ?? {}), false);
  assert.equal('password' in result, false);
  assert.equal('passwordHash' in result, false);
  const staffOnly = createAdministratorService({ repository, authorization: { async authorize(_id, permission) { return permission !== 'admin:roles.manage'; } } });
  await assert.rejects(() => staffOnly.create('0123456789abcdef01234567', input), error => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_FORBIDDEN');
  await assert.rejects(() => staffOnly.update('0123456789abcdef01234567', result.id, { expectedVersion: 0, reason: 'Assign role', roleIds: input.roleIds }), error => error instanceof AdministratorServiceError && error.code === 'ADMINISTRATOR_FORBIDDEN');
  assert.equal((await service.list('0123456789abcdef01234567', { search: 'EMPLOYEE@', page: 1, limit: 20 })).total, 1);
});


test('delete actions exclude self and the last active Super Admin, and deletion never bypasses the guard', async () => {
  const actor = '0123456789abcdef01234567';
  const target = '1123456789abcdef01234567';
  const f = administratorFixture();
  const rows = await f.service.list(actor, {});
  assert.equal(rows.items.find(row => row.id === actor)?.availableActions.includes('delete'), false);
  assert.equal(rows.items.find(row => row.id === target)?.availableActions.includes('delete'), true);
  await assert.rejects(() => f.service.remove(actor, actor, { expectedVersion: 0 }), /ADMINISTRATOR_SELF_LOCKOUT/);
  await assert.rejects(() => f.service.remove(actor, target, { expectedVersion: 99 }), /ADMINISTRATOR_VERSION_CONFLICT/);
  assert.equal((await f.service.remove(actor, target, { expectedVersion: 0 })).deleted, true);
  assert.equal((await f.service.list(actor, {})).total, 1);
  const last = administratorFixture([adminRecord({ accessLevel: 'standard_admin' }), adminRecord({ id: target, email: 'last-root@example.com' })]);
  assert.equal((await last.service.list(actor, {})).items.find(row => row.id === target)?.availableActions.includes('delete'), false);
  await assert.rejects(() => last.service.remove(actor, target, { expectedVersion: 0 }), /ADMINISTRATOR_LAST_SUPER_ADMIN/);
});
