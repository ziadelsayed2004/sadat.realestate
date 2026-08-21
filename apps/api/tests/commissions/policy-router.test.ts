import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { createCommissionPolicyService } from '../../src/modules/commissions/policy-service.js';

const adminId = '0123456789abcdef01234567';
const adminToken = 'admin-token';
const seekerToken = 'seeker-token';

function claims(role: AccessTokenClaims['role']): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-real-estate',
    sub: adminId,
    sid: '1123456789abcdef01234567',
    role,
    status: 'verified',
    iat: 1,
    exp: 9_999_999_999,
    jti: 'commission-policy-router'
  };
}

const accessTokens: AccessTokenService = {
  issue: () => 'unused',
  verify(token) {
    if (token === adminToken) return claims('admin');
    if (token === seekerToken) return claims('seeker');
    throw new Error('invalid token');
  }
};

async function withServer(
  permissions: readonly ('admin:commissions.view' | 'admin:commissions.manage')[],
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const service = createCommissionPolicyService({
    now: () => new Date('2026-08-20T00:00:00.000Z')
  });
  const server = createApiServer({
    database: { isReady: async () => true },
    commissionPolicies: {
      service,
      accessTokens,
      authorization: {
        authorize: async (_adminId, permission) => permissions.includes(permission)
      }
    }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

const policyInput = {
  key: 'default-policy',
  label: 'Default policy',
  kind: 'percentage',
  scope: { kind: 'default' },
  percentageBps: 250,
  effectiveFrom: '2026-09-01T00:00:00.000Z'
};

test('protects policy routes with admin authentication and commission permissions', async () => {
  await withServer(['admin:commissions.view', 'admin:commissions.manage'], async baseUrl => {
    const path = `${baseUrl}/api/v1/admin/commission-policies?page=1&limit=20`;
    assert.equal((await fetch(path)).status, 401);
    assert.equal((await fetch(path, { headers: { authorization: `Bearer ${seekerToken}` } })).status, 403);
    assert.equal((await fetch(`${path}&unknown=true`, { headers: { authorization: `Bearer ${adminToken}` } })).status, 400);

    const list = await fetch(path, { headers: { authorization: `Bearer ${adminToken}`, 'x-request-id': 'commission-list-1' } });
    assert.equal(list.status, 200);
    assert.equal(list.headers.get('cache-control'), 'no-store');
    const listBody = await list.json() as { data: { items: unknown[]; total: number }; meta: { requestId: string } };
    assert.deepEqual(listBody.data, { items: [], page: 1, limit: 20, total: 0 });
    assert.equal(listBody.meta.requestId, 'commission-list-1');

    const create = await fetch(`${baseUrl}/api/v1/admin/commission-policies`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(policyInput)
    });
    assert.equal(create.status, 201);
    const created = await create.json() as { data: Record<string, unknown> };
    assert.equal(created.data.key, policyInput.key);
    assert.equal(created.data.status, 'draft');
    assert.equal('secret' in created.data, false);
  });
});

test('separates view and manage permissions and rejects invalid policy payloads', async () => {
  await withServer(['admin:commissions.view'], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/commission-policies`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(policyInput)
    });
    assert.equal(response.status, 403);
  });

  await withServer(['admin:commissions.manage'], async baseUrl => {
    const response = await fetch(`${baseUrl}/api/v1/admin/commission-policies`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ...policyInput, unsupported: true })
    });
    assert.equal(response.status, 400);
  });
});
