import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AccessTokenClaims,
  AccessTokenService
} from '../../src/modules/auth/crypto.js';
import type { AdminUserData } from '@sadat-real-estate/contracts';
import {
  createAdministratorService,
  type AdministratorRepository
} from '../../src/modules/admin/administrator-service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const staffId = '1123456789abcdef01234567';
const timestamp = '2026-08-14T00:00:00.000Z';

function claims(role: 'admin' | 'seeker', subject = adminId): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-real-estate',
    sub: subject,
    sid: '2123456789abcdef01234567',
    role,
    status: 'verified',
    iat: 1,
    exp: 9_999_999_999,
    jti: 'administrator-router-test'
  };
}

function accessTokens(): AccessTokenService {
  return {
    issue() { return 'unused'; },
    verify(token) {
      if (token === 'admin-token') return claims('admin');
      if (token === 'view-token') return claims('admin', staffId);
      if (token === 'seeker-token') return claims('seeker');
      throw new Error('invalid');
    }
  };
}

function record(overrides: Partial<AdminUserData> = {}): AdminUserData {
  return {
    id: staffId,
    email: 'staff@example.com',
    displayName: 'Staff Admin',
    accessLevel: 'standard_admin',
    status: 'active',
    version: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    availableActions: ['update', 'disable'],
    ...overrides
  };
}

function service(): ReturnType<typeof createAdministratorService> {
  const records = new Map<string, AdminUserData>([
    [adminId, record({ id: adminId, email: 'root@example.com', displayName: 'Root Admin', accessLevel: 'super_admin' })],
    [staffId, record()]
  ]);
  const repository: AdministratorRepository = {
    async list() { return [...records.values()]; },
    async findById(id) { return records.get(id); },
    async countActiveSuperAdmins() {
      return [...records.values()].filter((value) => value.status === 'active' && value.accessLevel === 'super_admin').length;
    },
    async create(input) {
      if ([...records.values()].some((value) => value.email === input.data.email)) return { kind: 'email_conflict' };
      const created = record({
        id: '3123456789abcdef01234567',
        email: input.data.email,
        displayName: input.data.displayName,
        accessLevel: input.data.accessLevel,
        createdAt: input.now,
        updatedAt: input.now
      });
      records.set(created.id, created);
      return { kind: 'created', administrator: created };
    },
    async update(input) {
      const current = records.get(input.id);
      if (!current) return { kind: 'not_found' };
      if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
      const next = record({
        ...current,
        ...(input.patch.email ? { email: input.patch.email } : {}),
        ...(input.patch.displayName ? { displayName: input.patch.displayName } : {}),
        ...(input.patch.accessLevel ? { accessLevel: input.patch.accessLevel } : {}),
        ...(input.patch.status ? { status: input.patch.status, ...(input.patch.status === 'disabled' ? { disabledAt: input.now } : { disabledAt: undefined }) } : {}),
        version: current.version + 1,
        updatedAt: input.now
      });
      records.set(next.id, next);
      return { kind: 'updated', administrator: next };
    }
  };
  return createAdministratorService({
    authorization: {
      async authorize(subject, permission) {
        return subject === adminId && (permission === 'admin:staff.view' || permission === 'admin:staff.manage');
      }
    },
    repository,
    now: () => new Date(timestamp)
  });
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    administrators: { service: service(), accessTokens: accessTokens() }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('administrator routes require a verified Admin bearer token and permission', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/admin-users`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/admin-users`, { headers: { Authorization: 'Bearer seeker-token' } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/admin-users`, { headers: { Authorization: 'Bearer view-token' } })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/admin-users`, { headers: { Authorization: 'Bearer admin-token' } })).status, 200);
  });
});

test('lists, reads, creates, and updates safe administrator projections', async () => {
  await withServer(async (baseUrl) => {
    const headers = { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json', 'X-Request-Id': 'administrator-route-1' };
    const listed = await fetch(`${baseUrl}/api/v1/admin/admin-users?page=1&limit=1`, { headers });
    assert.equal(listed.status, 200);
    assert.equal(listed.headers.get('cache-control'), 'no-store');
    const listBody = await listed.json() as { data?: { items?: AdminUserData[]; total?: number }; meta?: { requestId?: string } };
    assert.equal(listBody.data?.items?.length, 1);
    assert.equal(listBody.data?.total, 2);
    assert.equal(listBody.meta?.requestId, 'administrator-route-1');
    assert.equal('password' in (listBody.data?.items?.[0] ?? {}), false);

    const detail = await fetch(`${baseUrl}/api/v1/admin/admin-users/${staffId}`, { headers });
    assert.equal(detail.status, 200);

    const created = await fetch(`${baseUrl}/api/v1/admin/admin-users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: 'new@example.com', displayName: 'New Admin', accessLevel: 'standard_admin' })
    });
    assert.equal(created.status, 201);

    const updated = await fetch(`${baseUrl}/api/v1/admin/admin-users/${staffId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ expectedVersion: 0, status: 'disabled', reason: 'Disable an unused administrator' })
    });
    assert.equal(updated.status, 200);
    const updateBody = await updated.json() as { data?: AdminUserData };
    assert.equal(updateBody.data?.status, 'disabled');
    assert.deepEqual(updateBody.data?.availableActions, ['update', 'enable']);
  });
});

test('rejects malformed targets, unknown fields, and stale mutations', async () => {
  await withServer(async (baseUrl) => {
    const headers = { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' };
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/admin-users/not-an-id`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/admin-users`, {
      method: 'POST', headers, body: JSON.stringify({ email: 'invalid@example.com', displayName: 'Invalid', accessLevel: 'standard_admin', password: 'secret' })
    })).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/admin-users/${staffId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ expectedVersion: 9, status: 'disabled', reason: 'Stale administrator update' })
    })).status, 409);
  });
});
