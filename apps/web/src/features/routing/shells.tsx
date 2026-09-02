import type { SupportedLocale } from '@sadat-real-estate/contracts';
import type { ReactNode } from 'react';
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
  readonly onLocaleChange?: ((locale: SupportedLocale) => void) | undefined;
  readonly children: ReactNode;
}

interface LanguageSwitchProps {
  readonly locale: SupportedLocale;
  readonly copy: FoundationCopy;
  readonly onLocaleChange?: ((locale: SupportedLocale) => void) | undefined;
}

function LanguageSwitch({ locale, copy, onLocaleChange }: LanguageSwitchProps) {
  return <LocaleSwitcher locale={locale} label={copy.localeLabel} onLocaleChange={onLocaleChange} />;
}

function ShellFrame({ kind, route, locale, copy, assets, onLocaleChange, children }: RouteShellProps & { readonly kind: ShellKind }) {
  const dashboard = kind === 'seeker' || kind === 'provider' || kind === 'admin';
  const surfaceLabel = copy.surfaceLabels[route.surface];
  const accessibilityCopy = getAccessibilityCopy(locale);
  const adminHeader = kind === 'admin' ? {
    search: locale === 'ar' ? 'ابحث عن مستخدم، عقار، مشروع، مقال أو طلب' : 'Search for a user, property, project, article or request',
    searchLabel: locale === 'ar' ? 'بحث الإدارة' : 'Admin search',
    role: locale === 'ar' ? 'مدير النظام' : 'System administrator',
    menu: locale === 'ar' ? 'قائمة الإدارة' : 'Admin menu'
  } : undefined;
  const body = (
    <main id="main-content" className="app-main" tabIndex={-1}>
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
      <SkipLink label={accessibilityCopy.skipToContent} />
      <header className="app-header route-shell__header">
        <BrandMark label={copy.brand} assets={assets} />
        {adminHeader === undefined ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {kind === 'auth' ? (
              <a href="/" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>
                {locale === 'ar' ? 'الرئيسية' : 'Home'}
              </a>
            ) : (
              <span className="surface-label" data-shell-surface="true">{surfaceLabel}</span>
            )}
            <LanguageSwitch locale={locale} copy={copy} onLocaleChange={onLocaleChange} />
          </div>
        ) : (
          <div data-admin-header="true" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', order: 0 }}>
              <span aria-hidden="true" style={{ display: 'grid', width: '2.25rem', height: '2.25rem', placeItems: 'center', borderRadius: '50%', background: '#e4eee9', color: '#155b4f', fontWeight: 800 }}>م</span>
              <span style={{ display: 'grid', gap: '.1rem', color: '#1b2942', fontSize: '.78rem' }}><strong>{adminHeader.role}</strong><small style={{ color: '#8a94a5' }}>{surfaceLabel}</small></span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', minWidth: 'min(34rem, 48vw)', border: '1px solid #e5d9bd', borderRadius: '999px', background: '#f8efd9', color: '#69768b', padding: '.55rem 1rem' }}>
              <span className="a11y-visually-hidden">{adminHeader.searchLabel}</span>
              <input aria-label={adminHeader.searchLabel} placeholder={adminHeader.search} type="search" style={{ width: '100%', border: 0, outline: 0, background: 'transparent', color: 'inherit' }} />
            </label>
            <span aria-label={adminHeader.menu} role="img" style={{ color: '#1b2942', fontSize: '1.25rem', lineHeight: 1 }}>☰</span>
            <LanguageSwitch locale={locale} copy={copy} onLocaleChange={onLocaleChange} />
          </div>
        )}
      </header>
      {dashboard ? (
        <div className="route-shell__body">
          <nav className="route-shell__navigation" aria-label={surfaceLabel} data-shell-navigation="true">
            <span className="route-shell__navigation-label">{surfaceLabel}</span>
          </nav>
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
