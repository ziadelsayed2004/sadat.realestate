import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AccountService,
  AccountPrincipal
} from '../../src/modules/accounts/service.js';
import { AccountServiceError } from '../../src/modules/accounts/service.js';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const viewerId = '1123456789abcdef01234567';
const seekerId = '2123456789abcdef01234567';
const providerId = '3123456789abcdef01234567';
const providerUserId = '4123456789abcdef01234567';
const documentId = '5123456789abcdef01234567';
const timestamp = '2026-08-14T08:00:00.000Z';

function claims(subject: string, role: 'admin' | 'seeker' = 'admin'): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-real-estate',
    sub: subject,
    sid: '6123456789abcdef01234567',
    role,
    status: 'verified',
    iat: 1,
    exp: 2,
    jti: 'read-router'
  };
}

function accessTokens(): AccessTokenService {
  return {
    issue() { return 'unused'; },
    verify(token) {
      if (token === 'admin-token') return claims(adminId);
      if (token === 'viewer-token') return claims(viewerId);
      if (token === 'seeker-token') return claims(seekerId, 'seeker');
      throw new Error('invalid');
    }
  };
}

function service(): AccountService {
  const user = {
    id: seekerId,
    roleType: 'seeker' as const,
    status: 'verified' as const,
    email: 'seeker@example.com',
    phone: '+201000000001',
    locale: 'ar' as const,
    displayName: 'Seeker Example',
    version: 2,
    statusChangedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    availableActions: ['suspend', 'restrict'] as const
  };
  const provider = {
    id: providerId,
    userId: providerUserId,
    providerType: 'brokerage_office' as const,
    applicationStatus: 'pending_review' as const,
    accountStatus: 'pending_review' as const,
    accountVersion: 1,
    applicationVersion: 3,
    phone: '+201000000002',
    email: 'provider@example.com',
    accountOwnerFullName: 'Provider Example',
    displayName: 'Example Brokerage',
    submittedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    documents: [{
      id: documentId,
      applicationId: providerId,
      category: 'broker_license' as const,
      originalFilename: 'license.pdf',
      detectedMime: 'application/pdf' as const,
      byteSize: 128,
      version: 1,
      securityState: 'clean' as const,
      reviewState: 'pending_review' as const,
      uploadedAt: timestamp,
      active: true
    }],
    availableActions: ['verify', 'reject', 'needs_information'] as const
  };

  function requireAdmin(principal: AccountPrincipal): void {
    if (principal.userId !== adminId) throw new AccountServiceError('ACCOUNT_FORBIDDEN');
  }

  return {
    async listUsers(principal, input) {
      requireAdmin(principal);
      return { items: [user], page: Number(input.page ?? 1), limit: Number(input.limit ?? 20), total: 1 };
    },
    async getUser(principal, userId) {
      requireAdmin(principal);
      if (userId !== seekerId) throw new AccountServiceError('ACCOUNT_NOT_FOUND');
      return user;
    },
    async listProviders(principal, input) {
      requireAdmin(principal);
      return { items: [provider], page: Number(input.page ?? 1), limit: Number(input.limit ?? 20), total: 1 };
    },
    async getProvider(principal, providerIdValue) {
      requireAdmin(principal);
      if (providerIdValue !== providerId) throw new AccountServiceError('ACCOUNT_NOT_FOUND');
      return provider;
    },
    async transitionAccount() { throw new AccountServiceError('ACCOUNT_NOT_FOUND'); },
    async reviewProvider() { throw new AccountServiceError('ACCOUNT_NOT_FOUND'); }
  };
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApiServer({
    database: { isReady: async () => true },
    accounts: { service: service(), accessTokens: accessTokens() }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('protects account/provider reads and returns safe paginated projections', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/users`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { Authorization: 'Bearer seeker-token' }
    })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/users?unknown=true`, {
      headers: { Authorization: 'Bearer admin-token' }
    })).status, 400);

    const users = await fetch(`${baseUrl}/api/v1/admin/users?page=1&limit=20`, {
      headers: { Authorization: 'Bearer admin-token' }
    });
    assert.equal(users.status, 200);
    assert.equal(users.headers.get('cache-control'), 'no-store');
    const userBody = await users.json() as { data: { items: Array<Record<string, unknown>> } };
    assert.equal(userBody.data.items[0]?.id, seekerId);
    assert.equal('internalNotes' in (userBody.data.items[0] ?? {}), false);
    assert.equal('assignments' in (userBody.data.items[0] ?? {}), false);

    const provider = await fetch(`${baseUrl}/api/v1/admin/providers/${providerId}`, {
      headers: { Authorization: 'Bearer admin-token' }
    });
    assert.equal(provider.status, 200);
    const providerBody = await provider.json() as { data: { documents: Array<Record<string, unknown>> } };
    assert.equal(providerBody.data.documents[0]?.id, documentId);
    assert.equal('storageKey' in (providerBody.data.documents[0] ?? {}), false);
    assert.equal('url' in (providerBody.data.documents[0] ?? {}), false);
  });
});

test('does not disclose another account or provider through detail paths', async () => {
  await withServer(async (baseUrl) => {
    const headers = { Authorization: 'Bearer admin-token' };
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/users/${providerUserId}`, { headers })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/providers/${seekerId}`, { headers })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/v1/admin/providers/not-an-id`, { headers })).status, 400);
  });
});
