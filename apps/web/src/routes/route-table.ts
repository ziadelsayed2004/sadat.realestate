export type Surface = 'public' | 'auth' | 'seeker' | 'provider' | 'admin';
export type DeviceScope = 'desktop' | 'desktop/tablet/mobile';

export interface RouteDefinition {
  readonly id: string;
  readonly pattern: string;
  readonly surface: Surface;
  readonly requiresAuthentication: boolean;
  readonly deviceScope: DeviceScope;
}

export type MatchedRoute = RouteDefinition & { readonly kind: 'matched' };
export type NotFoundRoute = {
  readonly kind: 'not_found';
  readonly id: 'not-found';
  readonly pattern: null;
  readonly surface: 'public';
  readonly requiresAuthentication: false;
  readonly deviceScope: 'desktop/tablet/mobile';
};
export type RouteMatch = MatchedRoute | NotFoundRoute;

const routeDefinitions = [
  { id: 'public-home', pattern: '/', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-properties', pattern: '/properties', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-property-details', pattern: '/properties/:slug', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-compare', pattern: '/compare', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-developers', pattern: '/developers', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-developer-profile', pattern: '/developers/:slug', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-articles', pattern: '/articles', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-article-details', pattern: '/articles/:slug', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-community', pattern: '/community', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-about', pattern: '/about', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'public-team', pattern: '/team', surface: 'public', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'auth', pattern: '/auth/*', surface: 'auth', requiresAuthentication: false, deviceScope: 'desktop/tablet/mobile' },
  { id: 'provider-application', pattern: '/provider-application/*', surface: 'auth', requiresAuthentication: true, deviceScope: 'desktop/tablet/mobile' },
  { id: 'seeker-dashboard', pattern: '/seeker/*', surface: 'seeker', requiresAuthentication: true, deviceScope: 'desktop' },
  { id: 'provider-dashboard', pattern: '/provider/*', surface: 'provider', requiresAuthentication: true, deviceScope: 'desktop' },
  { id: 'admin-dashboard', pattern: '/admin/*', surface: 'admin', requiresAuthentication: true, deviceScope: 'desktop' }
] as const satisfies readonly RouteDefinition[];

export const ROUTE_DEFINITIONS: readonly RouteDefinition[] = routeDefinitions;

const notFoundRoute: NotFoundRoute = {
  kind: 'not_found',
  id: 'not-found',
  pattern: null,
  surface: 'public',
  requiresAuthentication: false,
  deviceScope: 'desktop/tablet/mobile'
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesPattern(pattern: string, pathname: string): boolean {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  if (pattern.includes('/:')) {
    const expression = pattern
      .split('/')
      .map(segment => segment.startsWith(':') ? '[^/]+' : escapeRegExp(segment))
      .join('/');
    return new RegExp(`^${expression}$`).test(pathname);
  }
  return pattern === pathname;
}

function normalizePath(pathname: string): string {
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '') || '/';
}

export function resolveRoute(url: string): RouteMatch {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url, 'http://sadat.local');
  } catch {
    return notFoundRoute;
  }
  const pathname = normalizePath(parsedUrl.pathname);
  const definition = ROUTE_DEFINITIONS.find(route => matchesPattern(route.pattern, pathname));
  return definition === undefined ? notFoundRoute : { ...definition, kind: 'matched' };
}
