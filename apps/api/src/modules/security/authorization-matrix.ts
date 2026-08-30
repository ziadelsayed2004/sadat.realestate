import { IMPLEMENTED_ROUTE_DEFINITIONS } from '../docs/api-artifacts.js';

export const ADMINISTRATIVE_ROLE_MODES = ['custom', 'view_only'] as const;
export type AdministrativeRoleMode = (typeof ADMINISTRATIVE_ROLE_MODES)[number];

export const AUTHORIZATION_ACCESS_MODES = ['anonymous', 'session', 'role', 'signed_grant', 'otp_grant'] as const;
export type AuthorizationAccessMode = (typeof AUTHORIZATION_ACCESS_MODES)[number];

export const AUTHORIZATION_SCOPES = ['none', 'self', 'owner', 'assigned', 'permission', 'signed_grant'] as const;
export type AuthorizationScope = (typeof AUTHORIZATION_SCOPES)[number];

export const AUTHORIZATION_NEGATIVE_CASES = [
  'unauthenticated',
  'wrong-role',
  'unverified-admin',
  'permission-boundary',
  'ownership-boundary',
  'invalid-session',
  'invalid-grant'
] as const;
export type AuthorizationNegativeCase = (typeof AUTHORIZATION_NEGATIVE_CASES)[number];

export interface AuthorizationRoutePolicy {
  method: string;
  path: string;
  operationId: string;
  access: AuthorizationAccessMode;
  requiredRole?: 'seeker' | 'provider' | 'admin';
  requiredRoles?: readonly ('seeker' | 'provider' | 'admin')[];
  scope: AuthorizationScope;
  negativeCases: readonly AuthorizationNegativeCase[];
  adminRoleModes?: readonly AdministrativeRoleMode[];
}

function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

function isMutation(method: string): boolean {
  return method.toUpperCase() !== 'GET';
}

function hasObjectIdentifier(path: string): boolean {
  return path.includes('/:');
}

function roleScope(role: 'seeker' | 'provider', path: string): AuthorizationScope {
  if (role === 'provider' && (path.includes('/customer-requests') || path.includes('/viewings'))) {
    return 'assigned';
  }
  if (hasObjectIdentifier(path)) return 'owner';
  return 'self';
}

function classifyRoute(route: (typeof IMPLEMENTED_ROUTE_DEFINITIONS)[number]): AuthorizationRoutePolicy {
  const key = routeKey(route.method, route.path);

  if (route.path === '/api/v1/private/provider-documents/:documentId') {
    return {
      ...route,
      access: 'signed_grant',
      scope: 'signed_grant',
      negativeCases: ['invalid-grant']
    };
  }

  if (route.path === '/api/v1/auth/refresh' || route.path === '/api/v1/auth/logout') {
    return {
      ...route,
      access: 'session',
      scope: 'none',
      negativeCases: ['invalid-session']
    };
  }

  if (route.method === 'POST' && route.path === '/api/v1/provider/application') {
    return {
      ...route,
      access: 'otp_grant',
      requiredRole: 'provider',
      scope: 'self',
      negativeCases: ['invalid-grant']
    };
  }

  if (
    route.method === 'POST'
    && (
      route.path === '/api/v1/public/community/posts'
      || route.path === '/api/v1/public/community/posts/:postId/comments'
      || route.path === '/api/v1/public/community/posts/:postId/reports'
    )
  ) {
    return {
      ...route,
      access: 'role',
      requiredRoles: ['seeker', 'provider', 'admin'],
      scope: 'self',
      negativeCases: ['unauthenticated', 'ownership-boundary']
    };
  }

  if (
    route.path === '/health'
    || route.path === '/ready'
    || route.path.startsWith('/api/v1/auth/')
    || route.path === '/api/v1/auth/register/seeker'
    || route.path.startsWith('/api/v1/public/')
  ) {
    return {
      ...route,
      access: 'anonymous',
      scope: 'none',
      negativeCases: []
    };
  }

  if (route.path.startsWith('/api/v1/admin/')) {
    return {
      ...route,
      access: 'role',
      requiredRole: 'admin',
      scope: 'permission',
      negativeCases: ['unauthenticated', 'wrong-role', 'unverified-admin', 'permission-boundary'],
      adminRoleModes: isMutation(route.method) ? ['custom'] : ADMINISTRATIVE_ROLE_MODES
    };
  }

  if (route.path.startsWith('/api/v1/provider/')) {
    return {
      ...route,
      access: 'role',
      requiredRole: 'provider',
      scope: roleScope('provider', route.path),
      negativeCases: ['unauthenticated', 'wrong-role', 'ownership-boundary']
    };
  }

  if (route.path.startsWith('/api/v1/seeker/') || route.path === '/api/v1/me' || route.path.startsWith('/api/v1/me/')) {
    return {
      ...route,
      access: 'role',
      requiredRole: 'seeker',
      scope: roleScope('seeker', route.path),
      negativeCases: ['unauthenticated', 'wrong-role', 'ownership-boundary']
    };
  }

  if (
    route.path.startsWith('/api/v1/search/')
    || route.path.startsWith('/api/v1/compare/')
    || route.path.startsWith('/api/v1/public/developers')
  ) {
    return {
      ...route,
      access: 'anonymous',
      scope: 'none',
      negativeCases: []
    };
  }

  throw new Error(`Authorization matrix has no policy for ${key}`);
}

/**
 * Runtime-derived authorization policy coverage.  Keeping this projection
 * derived from the canonical route definitions makes an unclassified route a
 * test/build failure instead of silently creating an unauthenticated route.
 */
export const AUTHORIZATION_ROUTE_POLICIES: readonly AuthorizationRoutePolicy[] = Object.freeze(
  IMPLEMENTED_ROUTE_DEFINITIONS.map(classifyRoute)
);

export function getAuthorizationRoutePolicy(method: string, path: string): AuthorizationRoutePolicy | undefined {
  const key = routeKey(method, path);
  return AUTHORIZATION_ROUTE_POLICIES.find((policy) => routeKey(policy.method, policy.path) === key);
}
