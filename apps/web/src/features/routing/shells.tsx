import type { SupportedLocale } from '@sadat-real-estate/contracts';
import type { ReactNode } from 'react';
import { BrandMark, type DesignAssetCatalog } from '../design_system/index.ts';
import type { FoundationCopy } from '../frontend_foundation/locale.js';
import { directionForLocale } from '../frontend_foundation/locale.js';
import type { RouteMatch } from '../../routes/route-table.js';

export type ShellKind = 'public' | 'auth' | 'seeker' | 'provider' | 'admin';

export interface RouteShellProps {
  readonly route: RouteMatch;
  readonly locale: SupportedLocale;
  readonly copy: FoundationCopy;
  readonly assets?: DesignAssetCatalog | undefined;
  readonly children: ReactNode;
}

function ShellFrame({ kind, route, locale, copy, assets, children }: RouteShellProps & { readonly kind: ShellKind }) {
  const dashboard = kind === 'seeker' || kind === 'provider' || kind === 'admin';
  const surfaceLabel = copy.surfaceLabels[route.surface];
  const body = (
    <main className="app-main">
      {children}
    </main>
  );

  return (
    <div
      className={`app-shell route-shell route-shell--${kind} surface-${route.surface}`}
      data-auth-required={route.requiresAuthentication}
      data-device-scope={route.deviceScope}
      data-locale={locale}
      data-route-id={route.id}
      data-shell={kind}
      data-surface={route.surface}
      dir={directionForLocale(locale)}
    >
      <header className="app-header route-shell__header">
        <BrandMark label={copy.brand} assets={assets} />
        <span className="surface-label" data-shell-surface="true">{surfaceLabel}</span>
        <span className="locale" data-locale-indicator="true">{copy.localeLabel}: {locale}</span>
      </header>
      {dashboard ? (
        <div className="route-shell__body">
          <aside className="route-shell__navigation" aria-label={surfaceLabel} data-shell-navigation="true">
            <span className="route-shell__navigation-label">{surfaceLabel}</span>
          </aside>
          {body}
        </div>
      ) : body}
    </div>
  );
}

export function PublicShell(props: RouteShellProps) {
  return <ShellFrame {...props} kind="public" />;
}

export function AuthShell(props: RouteShellProps) {
  return <ShellFrame {...props} kind="auth" />;
}

export function SeekerShell(props: RouteShellProps) {
  return <ShellFrame {...props} kind="seeker" />;
}

export function ProviderShell(props: RouteShellProps) {
  return <ShellFrame {...props} kind="provider" />;
}

export function AdminShell(props: RouteShellProps) {
  return <ShellFrame {...props} kind="admin" />;
}

export function shellKindForRoute(route: RouteMatch): ShellKind {
  if (route.kind === 'not_found') return 'public';
  return route.surface;
}

export function RouteShell(props: RouteShellProps) {
  switch (shellKindForRoute(props.route)) {
    case 'auth':
      return <AuthShell {...props} />;
    case 'seeker':
      return <SeekerShell {...props} />;
    case 'provider':
      return <ProviderShell {...props} />;
    case 'admin':
      return <AdminShell {...props} />;
    case 'public':
      return <PublicShell {...props} />;
  }
}
