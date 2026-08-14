import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccountTransitionData } from '@sadat-real-estate/contracts';
import { createCurrentAccountAccessGuard } from '../../src/modules/accounts/access-guard.js';
import type { AccountService } from '../../src/modules/accounts/service.js';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';

const adminId = '0123456789abcdef01234567';
const sessionId = '1123456789abcdef01234567';
const seekerId = '2123456789abcdef01234567';
const transitionId = '3123456789abcdef01234567';
const now = new Date('2026-08-14T08:00:00.000Z');

function claims(status: AccessTokenClaims['status'] = 'verified'): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-real-estate',
    sub: adminId,
    sid: sessionId,
    role: 'admin',
    status,
    iat: 1,
    exp: 2,
    jti: 'synthetic'
  };
}

function tokens(): AccessTokenService {
  return {
    issue() { return 'unused'; },
    verify(token) {
      if (token === 'admin-token') return claims();
      if (token === 'restricted-token') return claims('restricted');
      throw new Error('invalid');
    }
  };
}

function accountService(): AccountService {
  return {
    async transitionAccount(_principal, userId, input) {
      return {
        transitionId,
        userId,
        roleType: 'seeker',
        action: input.action,
        fromStatus: 'verified',
        status: 'restricted',
        reason: input.reason,
        version: 1,
        changedAt: now.toISOString(),
        availableActions: ['verify']
      } satisfies AccountTransitionData;
    },
    async reviewProvider() { throw new Error('not used'); }
  };
}

async function requestWithGuard(
  current: boolean,
  token = 'admin-token'
): Promise<{ response: Response; checked: () => number }> {
  const accessTokens = tokens();
  let checks = 0;
  const guard = createCurrentAccountAccessGuard(accessTokens, {
    async isAccessSessionCurrent(input) {
      checks += 1;
      assert.deepEqual(input, {
        userId: adminId,
        sessionId,
        roleType: 'admin',
        status: 'verified',
        now
      });
      return current;
    }
  }, () => now);
  const server = createApiServer({
    database: { isReady: async () => true },
    accounts: { service: accountService(), accessTokens, accessGuard: guard }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/admin/users/${seekerId}/transitions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'restrict', reason: 'Confirmed policy breach' })
      }
    );
    return { response, checked: () => checks };
  } finally {
    await stopApiServer(server);
  }
}

test('rejects a revoked or status-stale access session before a protected product route', async () => {
  const { response, checked } = await requestWithGuard(false);
  assert.equal(response.status, 401);
  assert.equal(checked(), 1);
  const body = await response.json() as { error?: { code?: string } };
  assert.equal(body.error?.code, 'AUTHENTICATION_REQUIRED');
});

test('allows a current account/session pair to reach normal route authorization', async () => {
  const { response, checked } = await requestWithGuard(true);
  assert.equal(response.status, 200);
  assert.equal(checked(), 1);
});

test('fails restricted bearer claims closed even if a caller presents a newly issued token', async () => {
  const { response, checked } = await requestWithGuard(true, 'restricted-token');
  assert.equal(response.status, 401);
  assert.equal(checked(), 0);
});
