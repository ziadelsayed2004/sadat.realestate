export { ANONYMOUS_ROUTE_SESSION, guardRoute, requiredRoleForSurface } from './guards.ts';
export type { RouteGuardResult, RouteRole, RouteSession } from './guards.ts';
export { RouteErrorBoundary } from './error-boundary.tsx';
export type { RouteErrorBoundaryProps } from './error-boundary.tsx';
export { AuthenticationRequiredPage, ForbiddenPage, NotFoundPage, RouteErrorPage } from './pages.tsx';
export type { RoutePageProps } from './pages.tsx';
export {
  AdminShell,
  AdminSidebarContext,
  AuthShell,
  ProviderShell,
  PublicShell,
  RouteShellAuthContext,
  RouteShell,
  SeekerShell,
  shellKindForRoute
} from './shells.tsx';
export type { AdminSidebarController, RouteShellAuthClient, RouteShellProps, ShellKind } from './shells.tsx';
