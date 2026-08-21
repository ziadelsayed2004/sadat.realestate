import { useEffect, useMemo, useState } from 'react';
import type { AdminOverviewData, AdminOverviewMetrics, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { getAdminCopy, type AdminMetricKey, type AdminOverviewState } from './copy.ts';
import {
  createAdminOverviewLoader,
  type AdminAuthorizationSource,
  type AdminOverviewLoader
} from './data.ts';
import './styles.css';

export interface AdminOverviewProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: AdminOverviewData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: AdminOverviewLoader | undefined;
}

function stateForError(error: unknown): Exclude<AdminOverviewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function hasMetrics(data: AdminOverviewData): boolean {
  return Object.values(data.metrics).some(value => value > 0);
}

function stateForData(data: AdminOverviewData): AdminOverviewState {
  return hasMetrics(data) ? 'success' : 'empty';
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

const navigationItems = [
  ['overview', '/admin'],
  ['users', '/admin/users'],
  ['providers', '/admin/providers'],
  ['properties', '/admin/properties'],
  ['requests', '/admin/requests'],
  ['content', '/admin/content'],
  ['advertising', '/admin/advertising'],
  ['commissions', '/admin/commissions'],
  ['notifications', '/admin/notifications'],
  ['audit', '/admin/audit-logs'],
  ['settings', '/admin/settings']
] as const satisfies ReadonlyArray<readonly [keyof ReturnType<typeof getAdminCopy>['nav'], string]>;

const navigationIcons: Readonly<Record<(typeof navigationItems)[number][0], string>> = {
  overview: '⌂',
  users: '♙',
  providers: '▤',
  properties: '⌂',
  requests: '◇',
  content: '▱',
  advertising: '◈',
  commissions: '₿',
  notifications: '♧',
  audit: '≡',
  settings: '⚙'
};

export function AdminNavigation({ locale, activePath }: { readonly locale: SupportedLocale; readonly activePath: string }) {
  const copy = getAdminCopy(locale);
  return (
    <nav className="admin-dashboard__navigation" aria-label={copy.overview.eyebrow}>
      <div className="admin-dashboard__navigation-heading">
        <span className="admin-dashboard__navigation-kicker">{copy.overview.eyebrow}</span>
        <strong>{copy.nav.overview}</strong>
      </div>
      <ul>
        {navigationItems.map(([id, path]) => {
          const active = id === 'overview' ? activePath === '/admin' || activePath === '/admin/overview' : activePath.startsWith(path);
          return (
            <li key={id}>
              <a href={localePath(locale, path)} aria-current={active ? 'page' : undefined} data-active={active || undefined}>
                <span aria-hidden="true" className="admin-dashboard__navigation-icon">{navigationIcons[id]}</span>
                <span>{copy.nav[id]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminOverviewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminCopy(locale);
  const message = copy.states[state];
  const canRetry = state === 'retry' || state === 'error';
  return (
    <section className="admin-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {canRetry && state !== 'retry' ? <button type="button" className="admin-dashboard__secondary-action" onClick={onRetry}>{copy.retry}</button> : null}
    </section>
  );
}

const platformMetrics: readonly AdminMetricKey[] = ['users', 'seekers', 'providers', 'verifiedProviders'];
const operationMetrics: readonly AdminMetricKey[] = ['publishedProperties', 'openRequests', 'pendingReviews'];

function MetricCard({ metric, value, label }: { readonly metric: AdminMetricKey; readonly value: number; readonly label: string }) {
  return (
    <article className="admin-dashboard__metric" data-testid={`admin-metric-${metric}`}>
      <span className="admin-dashboard__metric-icon" aria-hidden="true">•</span>
      <strong>{new Intl.NumberFormat().format(value)}</strong>
      <span>{label}</span>
    </article>
  );
}

function MetricSection({ title, metrics, data, locale }: { readonly title: string; readonly metrics: readonly AdminMetricKey[]; readonly data: AdminOverviewMetrics; readonly locale: SupportedLocale }) {
  const copy = getAdminCopy(locale);
  return (
    <section className="admin-dashboard__metric-section" aria-labelledby={`admin-${title.replaceAll(' ', '-').toLowerCase()}-title`}>
      <div className="admin-dashboard__section-heading">
        <h2 id={`admin-${title.replaceAll(' ', '-').toLowerCase()}-title`}>{title}</h2>
      </div>
      <div className="admin-dashboard__metric-grid">
        {metrics.map(metric => <MetricCard key={metric} metric={metric} value={data[metric]} label={copy.overview.metrics[metric]} />)}
      </div>
    </section>
  );
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function OverviewContent({ data, locale }: { readonly data: AdminOverviewData; readonly locale: SupportedLocale }) {
  const copy = getAdminCopy(locale);
  return (
    <div className="admin-dashboard__main">
      <div className="admin-dashboard__heading-row">
        <div>
          <p className="admin-dashboard__eyebrow">{copy.overview.eyebrow}</p>
          <h1>{copy.overview.title}</h1>
          <p className="admin-dashboard__description">{copy.overview.description}</p>
          <p className="admin-dashboard__metadata"><span>{copy.overview.rangeLabel}: {dateLabel(data.range.from, locale)} — {dateLabel(data.range.to, locale)}</span><span>{copy.overview.refreshedLabel}: {dateLabel(data.generatedAt, locale)}</span></p>
        </div>
      </div>
      <MetricSection title={copy.overview.platformTitle} metrics={platformMetrics} data={data.metrics} locale={locale} />
      <MetricSection title={copy.overview.operationsTitle} metrics={operationMetrics} data={data.metrics} locale={locale} />
    </div>
  );
}

export function AdminOverview({ locale, session, authClient, apiOrigin, initialData, initialState = 'loading', load }: AdminOverviewProps) {
  const source = useMemo(() => load ?? createAdminOverviewLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const [state, setState] = useState<AdminOverviewState>(() => initialData === undefined ? initialState : stateForData(initialData));
  const [data, setData] = useState<AdminOverviewData | undefined>(initialData);
  const [attempt, setAttempt] = useState(0);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const path = typeof window === 'undefined' ? '/admin' : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'admin') {
      setState('permission');
      return undefined;
    }
    if (initialData !== undefined && attempt === 0) return undefined;
    const controller = new AbortController();
    setState('loading');
    void source(controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(stateForData(nextData));
    }).catch(error => {
      if (controller.signal.aborted) return;
      setState(stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, initialData, session.status, sessionRole, source]);

  return (
    <section className="admin-dashboard" data-screen-id="ADM-01" data-route="/admin" data-device-scope="desktop" data-admin-state={state}>
      <AdminNavigation locale={locale} activePath={path} />
      <div className="admin-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'empty' && data !== undefined ? (
          <div className="admin-dashboard__empty" data-state="empty">
            <h1>{getAdminCopy(locale).overview.emptyTitle}</h1>
            <p>{getAdminCopy(locale).overview.emptyBody}</p>
          </div>
        ) : null}
        {state === 'success' && data !== undefined ? <OverviewContent data={data} locale={locale} /> : null}
      </div>
    </section>
  );
}
