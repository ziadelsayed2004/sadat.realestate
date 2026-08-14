import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AccountTransitionData,
  ProviderReviewData
} from '@sadat-real-estate/contracts';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import {
  AccountServiceError,
  type AccountService
} from '../../src/modules/accounts/service.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const viewerId = '1123456789abcdef01234567';
const seekerId = '2123456789abcdef01234567';
const providerApplicationId = '3123456789abcdef01234567';
const providerUserId = '4123456789abcdef01234567';
const transitionId = '5123456789abcdef01234567';
const timestamp = '2026-08-14T08:00:00.000Z';

function claims(
  role: 'admin' | 'seeker',
  status: AccessTokenClaims['status'] = 'verified',
  subject = adminId
): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-real-estate',
    sub: subject,
    sid: '6123456789abcdef01234567',
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
      if (token === 'viewer-token') return claims('admin', 'verified', viewerId);
      if (token === 'seeker-token') return claims('seeker');
      if (token === 'suspended-token') return claims('admin', 'suspended');
      throw new Error('invalid');
    }
  };
}

function service(): AccountService {
  return {
    async transitionAccount(principal, userId, input) {
      if (principal.userId === viewerId) throw new AccountServiceError('ACCOUNT_FORBIDDEN');
      if (userId !== seekerId) throw new AccountServiceError('ACCOUNT_NOT_FOUND');
      if (input.reason === 'Invalid state transition') {
        throw new AccountServiceError('ACCOUNT_TRANSITION_INVALID');
      }
      return {
        transitionId,
        userId,
        roleType: 'seeker',
        action: input.action,
        fromStatus: 'verified',
        status: 'restricted',
        reason: input.reason,
        version: 1,
        changedAt: timestamp,
        availableActions: ['verify']
      };
    },
    async reviewProvider(principal, applicationId, input) {
      if (principal.userId === viewerId) throw new AccountServiceError('ACCOUNT_FORBIDDEN');
      if (applicationId !== providerApplicationId) {
        throw new AccountServiceError('ACCOUNT_NOT_FOUND');
      }
      return {
        transitionId,
        providerApplicationId: applicationId,
        userId: providerUserId,
        providerType: 'developer_company',
        action: input.action,
        fromAccountStatus: 'pending_review',
        accountStatus: 'verified',
        fromApplicationStatus: 'pending_review',
        applicationStatus: 'approved',
        reason: input.reason,
        accountVersion: 2,
        applicationVersion: 3,
        changedAt: timestamp,
        availableActions: ['suspend']
      };
    }
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

function mutation(baseUrl: string, path: string, token: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('requires a verified Admin token and mutation permission', async () => {
  await withServer(async (baseUrl) => {
    const path = `/api/v1/admin/users/${seekerId}/transitions`;
    const missing = await fetch(`${baseUrl}${path}`, { method: 'POST' });
    assert.equal(missing.status, 401);
    for (const token of ['seeker-token', 'suspended-token']) {
      assert.equal((await mutation(baseUrl, path, token, {
        action: 'restrict', reason: 'Confirmed policy breach'
      })).status, 403);
    }
    assert.equal((await mutation(baseUrl, path, 'viewer-token', {
      action: 'restrict', reason: 'View Only cannot mutate'
    })).status, 403);
  });
});

test('returns strict no-store transition and provider-review envelopes', async () => {
  await withServer(async (baseUrl) => {
    const account = await mutation(
      baseUrl,
      `/api/v1/admin/users/${seekerId}/transitions`,
      'admin-token',
      { action: 'restrict', reason: 'Confirmed policy breach' }
    );
    assert.equal(account.status, 200);
    assert.equal(account.headers.get('cache-control'), 'no-store');
    const accountBody = await account.json() as {
      data?: AccountTransitionData;
      meta?: { requestId?: string };
    };
    assert.equal(accountBody.data?.status, 'restricted');
    assert.ok(accountBody.meta?.requestId);

    const provider = await mutation(
      baseUrl,
      `/api/v1/admin/providers/${providerApplicationId}/review`,
      'admin-token',
      { action: 'verify', reason: 'Manual platform review completed' }
    );
    assert.equal(provider.status, 200);
    const providerBody = await provider.json() as { data?: ProviderReviewData };
    assert.equal(providerBody.data?.applicationStatus, 'approved');
    assert.equal('governmentVerified' in (providerBody.data ?? {}), false);
  });
});

test('rejects invalid IDs, short reasons, unknown fields, invalid transitions, and IDOR targets', async () => {
  await withServer(async (baseUrl) => {
    const cases: Array<[string, unknown, number]> = [
      ['/api/v1/admin/users/not-an-id/transitions', {
        action: 'restrict', reason: 'Confirmed policy breach'
      }, 400],
      [`/api/v1/admin/users/${seekerId}/transitions`, {
        action: 'restrict', reason: 'no'
      }, 400],
      [`/api/v1/admin/users/${seekerId}/transitions`, {
        action: 'restrict', reason: 'Confirmed policy breach', status: 'restricted'
      }, 400],
      [`/api/v1/admin/users/${seekerId}/transitions`, {
        action: 'suspend', reason: 'Invalid state transition'
      }, 409],
      ['/api/v1/admin/users/7123456789abcdef01234567/transitions', {
        action: 'restrict', reason: 'Unknown target'
      }, 404],
      [`/api/v1/admin/providers/${providerApplicationId}/review`, {
        action: 'restrict', reason: 'Not a provider review action'
      }, 400]
    ];
    for (const [path, body, status] of cases) {
      assert.equal((await mutation(baseUrl, path, 'admin-token', body)).status, status);
    }
  });
});
