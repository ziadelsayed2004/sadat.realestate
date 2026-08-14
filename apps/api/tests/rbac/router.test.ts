import assert from 'node:assert/strict';
import test from 'node:test';
import type { RbacRoleData } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { RbacServiceError, type RbacService } from '../../src/modules/rbac/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const roleId = '1123456789abcdef01234567';
const timestamp = '2026-08-13T18:30:00.000Z';

function claims(
  role: 'admin' | 'seeker',
  status: AccessTokenClaims['status'] = 'verified',
  subject = adminId
):
AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-real-estate',
    sub: subject,
    sid: '2123456789abcdef01234567',
    role,
    status,
    iat: 1,
    exp: 2,
    jti: 'synthetic'
  };
}

function accessTokens(): AccessTokenService {
  return {
    issue() { return 'unused'; },
    verify(token) {
      if (token === 'admin-token') return claims('admin');
      if (token === 'seeker-token') return claims('seeker');
      if (token === 'suspended-token') return claims('admin', 'suspended');
      if (token === 'unassigned-token') {
        return claims('admin', 'verified', '3123456789abcdef01234567');
      }
      throw new Error('invalid');
    }
  };
}

function role(overrides: Partial<RbacRoleData> = {}): RbacRoleData {
  return {
    id: roleId,
    name: 'Role Managers',
    accessMode: 'custom',
    permissions: ['admin:roles.view', 'admin:roles.manage'],
    active: true,
    version: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    availableActions: ['update'],
    ...overrides
  };
}

function service(): RbacService {
  return {
    async authorizationFor() {
      return { isSuperAdmin: true, permissions: ['admin:roles.view', 'admin:roles.manage'] };
    },
    async authorize() { return true; },
    async listRoles(principal) {
      if (principal.userId !== adminId) throw new RbacServiceError('RBAC_FORBIDDEN');
      return {
        items: [role()],
        permissionCatalog: ['admin:roles.view', 'admin:roles.manage'],
        effectivePermissions: ['admin:roles.view', 'admin:roles.manage']
      };
    },
    async createRole(_principal, input) {
      if (input.name === 'Duplicate') throw new RbacServiceError('RBAC_ROLE_NAME_EXISTS');
      return role({
        name: input.name,
        accessMode: input.accessMode,
        permissions: [...input.permissions]
      });
    },
    async updateRole(_principal, id, input) {
      if (input.version !== 0) throw new RbacServiceError('RBAC_ROLE_VERSION_CONFLICT');
      return role({ id, active: input.active ?? true, version: 1 });
    },
    async assignRoles() { throw new Error('Assignment has no HTTP route in backend_017'); }
  };
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    rbac: { service: service(), accessTokens: accessTokens() }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('requires a verified Admin bearer token before role access', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/admin/roles`);
    assert.equal(missing.status, 401);
    for (const token of ['seeker-token', 'suspended-token']) {
      const response = await fetch(`${baseUrl}/api/v1/admin/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(response.status, 403);
    }
    const unassigned = await fetch(`${baseUrl}/api/v1/admin/roles`, {
      headers: { Authorization: 'Bearer unassigned-token' }
    });
    assert.equal(unassigned.status, 403);
  });
});

test('lists role capabilities and available actions in a no-store envelope', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/admin/roles`, {
      headers: { Authorization: 'Bearer admin-token', 'X-Request-Id': 'rbac-list-1' }
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json() as {
      data?: { items?: RbacRoleData[]; effectivePermissions?: unknown[] };
      meta?: { requestId?: string };
    };
    assert.equal(body.meta?.requestId, 'rbac-list-1');
    assert.deepEqual(body.data?.items?.[0]?.availableActions, ['update']);
    assert.deepEqual(body.data?.effectivePermissions, ['admin:roles.view', 'admin:roles.manage']);
  });
});

test('creates and updates roles through strict versioned payloads', async () => {
  await withServer(async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/v1/admin/roles`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'View Only',
        accessMode: 'view_only',
        permissions: ['admin:roles.view'],
        reason: 'Create a read-only administration role'
      })
    });
    assert.equal(created.status, 201);

    const updated = await fetch(`${baseUrl}/api/v1/admin/roles/${roleId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 0,
        active: false,
        reason: 'Deactivate the obsolete role'
      })
    });
    assert.equal(updated.status, 200);
    const body = await updated.json() as { data?: RbacRoleData };
    assert.equal(body.data?.version, 1);
    assert.equal(body.data?.active, false);
  });
});

test('rejects invalid, mass-assigned, conflicting, and malformed role mutations', async () => {
  await withServer(async (baseUrl) => {
    const cases: Array<[string, string, unknown, number]> = [
      ['/api/v1/admin/roles', 'POST', {
        name: 'Unsafe', accessMode: 'view_only', permissions: ['admin:roles.manage']
      }, 400],
      ['/api/v1/admin/roles', 'POST', {
        name: 'Loose', accessMode: 'custom', permissions: ['admin:roles.view'], superAdmin: true
      }, 400],
      ['/api/v1/admin/roles', 'POST', {
        name: 'Duplicate', accessMode: 'custom', permissions: ['admin:roles.view'],
        reason: 'Attempt duplicate role creation'
      }, 409],
      [`/api/v1/admin/roles/${roleId}`, 'PATCH', {
        version: 8, active: false, reason: 'Attempt stale role update'
      }, 409],
      ['/api/v1/admin/roles/not-an-id', 'PATCH', {
        version: 0, active: false, reason: 'Attempt malformed target update'
      }, 400]
    ];
    for (const [path, method, payload, expected] of cases) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(response.status, expected);
    }
  });
});
