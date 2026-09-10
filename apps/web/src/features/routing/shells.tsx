import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { createContext, type ReactNode, useEffect, useState } from 'react';
import { BrandMark, type DesignAssetCatalog } from '../design_system/index.ts';
import { getAccessibilityCopy, SkipLink } from '../accessibility/index.ts';
import type { FoundationCopy } from '../frontend_foundation/locale.js';
import { directionForLocale } from '../frontend_foundation/locale.js';
import type { RouteMatch } from '../../routes/route-table.js';

import { LocaleSwitcher } from '../localization/index.ts';

export type ShellKind = 'public' | 'auth' | 'seeker' | 'provider' | 'admin';

export interface RouteShellProps {
  readonly route: RouteMatch;
  readonly locale: SupportedLocale;
  readonly copy: FoundationCopy;
  readonly assets?: DesignAssetCatalog | undefined;
  readonly authClient?: RouteShellAuthClient | undefined;
  readonly onLocaleChange?: ((locale: SupportedLocale) => void) | undefined;
  readonly children: ReactNode;
}

export interface RouteShellAuthClient {
  readonly getSnapshot?: (() => unknown) | undefined;
  readonly logout?: (() => Promise<unknown>) | undefined;
}

export const RouteShellAuthContext = createContext<RouteShellAuthClient | undefined>(undefined);

export interface AdminSidebarController {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}

export const AdminSidebarContext = createContext<AdminSidebarController | undefined>(undefined);

interface LanguageSwitchProps {
  readonly locale: SupportedLocale;
  readonly copy: FoundationCopy;
  readonly onLocaleChange?: ((locale: SupportedLocale) => void) | undefined;
}

function LanguageSwitch({ locale, copy, onLocaleChange }: LanguageSwitchProps) {
  return <LocaleSwitcher locale={locale} label={copy.localeLabel} onLocaleChange={onLocaleChange} />;
}

function ShellFrame({ kind, route, locale, copy, assets, authClient, onLocaleChange, children }: RouteShellProps & { readonly kind: ShellKind }) {
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const dashboard = kind === 'seeker' || kind === 'provider' || kind === 'admin';
  const surfaceLabel = copy.surfaceLabels[route.surface];
  const accessibilityCopy = getAccessibilityCopy(locale);
  const adminHeader = kind === 'admin' ? {
    search: locale === 'ar' ? 'ابحث عن مستخدم، عقار، مشروع، مقال أو طلب' : 'Search for a user, property, project, article or request',
    searchLabel: locale === 'ar' ? 'بحث الإدارة' : 'Admin search',
    role: locale === 'ar' ? 'مدير النظام' : 'System administrator',
    menu: locale === 'ar' ? 'فتح قائمة الإدارة' : 'Open admin menu',
    closeMenu: locale === 'ar' ? 'إغلاق قائمة الإدارة' : 'Close admin menu'
  } : undefined;
  useEffect(() => {
    if (kind !== 'admin') return;
    const compactQuery = window.matchMedia('(max-width: 1100px)');
    const closeForDesktop = (event: MediaQueryListEvent) => { if (!event.matches) setAdminSidebarOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setAdminSidebarOpen(false); };
    compactQuery.addEventListener('change', closeForDesktop);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      compactQuery.removeEventListener('change', closeForDesktop);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [kind]);
  useEffect(() => {
    if (kind !== 'admin' || !adminSidebarOpen || !window.matchMedia('(max-width: 1100px)').matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [adminSidebarOpen, kind]);
  const body = (
    <main id="main-content" className="app-main" tabIndex={-1}>
      {children}
    </main>
  );

  return (
    <RouteShellAuthContext.Provider value={authClient}>
      <div
        className={`app-shell route-shell route-shell--${kind} surface-${route.surface}`}
        data-auth-required={route.requiresAuthentication}
        data-device-scope={route.deviceScope}
        data-locale={locale}
        data-route-id={route.id}
        data-shell={kind}
        data-admin-sidebar-open={kind === 'admin' ? adminSidebarOpen : undefined}
        data-surface={route.surface}
        dir={directionForLocale(locale)}
      >
        <SkipLink label={accessibilityCopy.skipToContent} />
        <header className="app-header route-shell__header">
        <BrandMark label={copy.brand} assets={assets} />
        {adminHeader === undefined ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {kind === 'auth' ? null : <>
              <span className="surface-label" data-shell-surface="true">{surfaceLabel}</span>
              <LanguageSwitch locale={locale} copy={copy} onLocaleChange={onLocaleChange} />
            </>}
          </div>
        ) : (
          <div className="admin-shell-header" data-admin-header="true">
            <div className="admin-shell-header__identity">
              <span aria-hidden="true" className="admin-shell-header__avatar">م</span>
              <span className="admin-shell-header__identity-copy"><strong>{adminHeader.role}</strong><small>{surfaceLabel}</small></span>
            </div>
            <label className="admin-shell-header__search">
              <span className="a11y-visually-hidden">{adminHeader.searchLabel}</span>
              <input aria-label={adminHeader.searchLabel} placeholder={adminHeader.search} type="search" />
            </label>
            <button
              aria-controls="admin-dashboard-navigation"
              aria-expanded={adminSidebarOpen}
              aria-label={adminSidebarOpen ? adminHeader.closeMenu : adminHeader.menu}
              className="admin-shell-header__menu"
              data-testid="admin-sidebar-toggle"
              onClick={() => setAdminSidebarOpen(open => !open)}
              type="button"
            >
              <span aria-hidden="true" className="admin-shell-header__menu-glyph"><i /><i /><i /></span>
            </button>
            <LanguageSwitch locale={locale} copy={copy} onLocaleChange={onLocaleChange} />
          </div>
        )}
        </header>
        {kind === 'admin' ? <button aria-label={adminHeader?.closeMenu} className="admin-dashboard__navigation-backdrop" data-testid="admin-sidebar-backdrop" onClick={() => setAdminSidebarOpen(false)} type="button" /> : null}
        {dashboard ? (
          <div className="route-shell__body">
            <nav className="route-shell__navigation" aria-label={surfaceLabel} data-shell-navigation="true">
              <span className="route-shell__navigation-label">{surfaceLabel}</span>
            </nav>
            <AdminSidebarContext.Provider value={{ open: adminSidebarOpen, setOpen: setAdminSidebarOpen }}>{body}</AdminSidebarContext.Provider>
          </div>
        ) : body}
      </div>
    </RouteShellAuthContext.Provider>
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
