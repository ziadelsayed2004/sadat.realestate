import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import {
  AUTHORIZATION_ACCESS_MODES,
  AUTHORIZATION_ROUTE_POLICIES,
  ADMINISTRATIVE_ROLE_MODES,
  getAuthorizationRoutePolicy,
  type AuthorizationRoutePolicy
} from '../../src/modules/security/authorization-matrix.js';
import { IMPLEMENTED_ROUTE_DEFINITIONS } from '../../src/modules/docs/api-artifacts.js';
import type { AccessTokenClaims, AccessTokenService } from '../../src/modules/auth/crypto.js';
import { createAdminRbacAuthMiddleware } from '../../src/modules/rbac/auth.js';
import { createProviderAuthMiddleware } from '../../src/modules/provider/auth.js';
import { createSeekerAuthMiddleware } from '../../src/modules/seeker/auth.js';

const subject = '0123456789abcdef01234567';
const session = '1123456789abcdef01234567';

function claims(role: AccessTokenClaims['role'], status: AccessTokenClaims['status'] = 'verified'): AccessTokenClaims {
  return {
    iss: 'sadat-real-estate-api',
    aud: 'sadat-realestate',
    sub: subject,
    sid: session,
    role,
    status,
    iat: 1,
    exp: 9_999_999_999,
    jti: 'authorization-matrix'
  };
}

function tokenService(tokens: Record<string, AccessTokenClaims>): AccessTokenService {
  return {
    issue: () => 'unused',
    verify(token) {
      const value = tokens[token];
      if (!value) throw new Error('invalid token');
      return value;
    }
  };
}

function invoke(
  middleware: (request: Request, response: Response, next: () => void) => void,
  token?: string
): { next: boolean; status: number; body: Record<string, unknown> | undefined; locals: Record<string, unknown> } {
  let next = false;
  let status = 200;
  let body: Record<string, unknown> | undefined;
  const request = {
    get(name: string) {
      return name.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : undefined;
    }
  } as unknown as Request;
  const response = {
    locals: {},
    status(code: number) {
      status = code;
      return this;
    },
    json(value: Record<string, unknown>) {
      body = value;
      return this;
    }
  } as unknown as Response;
  middleware(request, response, () => { next = true; });
  return { next, status, body, locals: response.locals };
}

function routeKey(policy: Pick<AuthorizationRoutePolicy, 'method' | 'path'>): string {
  return `${policy.method} ${policy.path}`;
}

test('derives a complete negative-authorization matrix from every implemented route', () => {
  const expected = IMPLEMENTED_ROUTE_DEFINITIONS.map(routeKey).sort();
  const actual = AUTHORIZATION_ROUTE_POLICIES.map(routeKey).sort();
  assert.equal(AUTHORIZATION_ROUTE_POLICIES.length, IMPLEMENTED_ROUTE_DEFINITIONS.length);
  assert.deepEqual(actual, expected);
  assert.equal(new Set(actual).size, actual.length);

  const rolePolicies = AUTHORIZATION_ROUTE_POLICIES.filter((policy) => policy.access === 'role');
  assert.ok(rolePolicies.length > 0);
  for (const policy of rolePolicies) {
    assert.ok(policy.requiredRole);
    assert.ok(policy.negativeCases.includes('unauthenticated'));
    assert.ok(policy.negativeCases.includes('wrong-role'));
    if (policy.requiredRole === 'admin') {
      assert.equal(policy.scope, 'permission');
      assert.ok(policy.negativeCases.includes('unverified-admin'));
      assert.ok(policy.negativeCases.includes('permission-boundary'));
      assert.ok(policy.adminRoleModes);
      assert.ok(policy.adminRoleModes.every((mode) => ADMINISTRATIVE_ROLE_MODES.includes(mode)));
      if (policy.method === 'GET') assert.deepEqual(policy.adminRoleModes, ADMINISTRATIVE_ROLE_MODES);
      else assert.deepEqual(policy.adminRoleModes, ['custom']);
    } else {
      assert.ok(policy.negativeCases.includes('ownership-boundary'));
    }
  }

  const signedGrant = AUTHORIZATION_ROUTE_POLICIES.filter((policy) => policy.access === 'signed_grant');
  assert.deepEqual(signedGrant.map(routeKey), ['GET /api/v1/private/provider-documents/:documentId']);
  assert.deepEqual(signedGrant[0]?.negativeCases, ['invalid-grant']);
  assert.equal(AUTHORIZATION_ACCESS_MODES.includes('session'), true);
  assert.equal(getAuthorizationRoutePolicy('get', '/api/v1/admin/settings/:namespace')?.requiredRole, 'admin');
});

test('seeker and provider middleware reject missing, invalid, and cross-role tokens', () => {
  const tokens = tokenService({
    seeker: claims('seeker'),
    provider: claims('provider'),
    admin: claims('admin')
  });
  const seekerMiddleware = createSeekerAuthMiddleware(tokens);
  const providerMiddleware = createProviderAuthMiddleware(tokens);

  for (const middleware of [seekerMiddleware, providerMiddleware]) {
    const missing = invoke(middleware);
    assert.equal(missing.next, false);
    assert.equal(missing.status, 401);
    assert.equal((missing.body?.error as { code?: string } | undefined)?.code, 'AUTHENTICATION_REQUIRED');

    const invalid = invoke(middleware, 'invalid');
    assert.equal(invalid.next, false);
    assert.equal(invalid.status, 401);
    assert.equal((invalid.body?.error as { code?: string } | undefined)?.code, 'AUTHENTICATION_REQUIRED');
  }

  const seekerWithProviderToken = invoke(seekerMiddleware, 'provider');
  assert.equal(seekerWithProviderToken.status, 403);
  assert.equal((seekerWithProviderToken.body?.error as { code?: string } | undefined)?.code, 'FORBIDDEN');
  const providerWithSeekerToken = invoke(providerMiddleware, 'seeker');
  assert.equal(providerWithSeekerToken.status, 403);
  assert.equal((providerWithSeekerToken.body?.error as { code?: string } | undefined)?.code, 'FORBIDDEN');

  assert.equal(invoke(seekerMiddleware, 'seeker').next, true);
  assert.equal(invoke(providerMiddleware, 'provider').next, true);
});

test('admin RBAC middleware exercises every administrative authentication state', () => {
  const tokens = tokenService({
    seeker: claims('seeker'),
    provider: claims('provider'),
    unverifiedAdmin: claims('admin', 'pending_review'),
    admin: claims('admin')
  });
  const middleware = createAdminRbacAuthMiddleware(tokens);

  assert.equal(invoke(middleware).status, 401);
  assert.equal(invoke(middleware, 'seeker').status, 403);
  assert.equal(invoke(middleware, 'provider').status, 403);
  assert.equal(invoke(middleware, 'unverifiedAdmin').status, 403);
  const verified = invoke(middleware, 'admin');
  assert.equal(verified.next, true);
  assert.equal((verified.locals.adminRbacClaims as AccessTokenClaims).role, 'admin');
});
