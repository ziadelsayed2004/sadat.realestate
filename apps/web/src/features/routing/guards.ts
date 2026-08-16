import type { RouteMatch, Surface } from '../../routes/route-table.js';

export type RouteRole = 'seeker' | 'provider' | 'admin';

export type RouteSession =
  | { readonly status: 'anonymous' }
  | { readonly status: 'authenticated'; readonly role: RouteRole };

export const ANONYMOUS_ROUTE_SESSION: RouteSession = Object.freeze({ status: 'anonymous' });

export type RouteGuardResult =
  | { readonly allowed: true; readonly route: Extract<RouteMatch, { kind: 'matched' }> }
  | {
      readonly allowed: false;
      readonly reason: 'not_found' | 'authentication_required' | 'forbidden';
      readonly route: RouteMatch;
    };

const ROLE_BY_SURFACE: Readonly<Partial<Record<Surface, RouteRole>>> = Object.freeze({
  seeker: 'seeker',
  provider: 'provider',
  admin: 'admin'
});

export function requiredRoleForSurface(surface: Surface): RouteRole | undefined {
  return ROLE_BY_SURFACE[surface];
}

export function guardRoute(route: RouteMatch, session: RouteSession = ANONYMOUS_ROUTE_SESSION): RouteGuardResult {
  if (route.kind === 'not_found') {
    return { allowed: false, reason: 'not_found', route };
  }

  if (route.requiresAuthentication && session.status !== 'authenticated') {
    return { allowed: false, reason: 'authentication_required', route };
  }

  const requiredRole = requiredRoleForSurface(route.surface);
  if (requiredRole !== undefined && (session.status !== 'authenticated' || session.role !== requiredRole)) {
    return { allowed: false, reason: 'forbidden', route };
  }

  return { allowed: true, route };
}
