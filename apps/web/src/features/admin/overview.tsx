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

const navigationGroups = [
  { id: 'home', items: [navigationItems[0]] },
  { id: 'accounts', items: [navigationItems[1], navigationItems[2]] },
  { id: 'properties', items: [navigationItems[3]] },
  { id: 'requests', items: [navigationItems[4]] },
  { id: 'content', items: [navigationItems[5]] },
  { id: 'revenue', items: [navigationItems[6], navigationItems[7]] },
  { id: 'system', items: [navigationItems[8], navigationItems[9], navigationItems[10]] }
] as const;

const navigationGroupLabels: Readonly<Record<SupportedLocale, Readonly<Record<(typeof navigationGroups)[number]['id'], string>>>> = {
  ar: { home: 'الرئيسية', accounts: 'المستخدمون والحسابات', properties: 'إدارة العقارات', requests: 'إدارة الطلبات', content: 'إدارة المحتوى والمجتمع', revenue: 'الإعلانات والإيرادات', system: 'إدارة المنصة' },
  en: { home: 'Home', accounts: 'Users and accounts', properties: 'Property management', requests: 'Request management', content: 'Content and community', revenue: 'Advertising and revenue', system: 'Platform management' },};

const navigationMatchers: Readonly<Record<(typeof navigationItems)[number][0], readonly string[]>> = {
  overview: ['/admin', '/admin/overview'],
  users: ['/admin/users', '/admin/property-seekers', '/admin/account-reports', '/admin/account-restrictions', '/admin/admin-users', '/admin/roles'],
  providers: ['/admin/providers', '/admin/verification'],
  properties: ['/admin/properties', '/admin/property-categories', '/admin/locations', '/admin/features', '/admin/projects', '/admin/property-reports'],
  requests: ['/admin/requests', '/admin/customer-requests', '/admin/overdue-requests', '/admin/contact-requests', '/admin/viewing-requests', '/admin/search-requests', '/admin/request-issues'],
  content: ['/admin/content', '/admin/articles', '/admin/article-categories', '/admin/community', '/admin/banners'],
  advertising: ['/admin/advertising', '/admin/ads'],
  commissions: ['/admin/commissions'],
  notifications: ['/admin/notifications'],
  audit: ['/admin/audit-logs'],
  settings: ['/admin/settings']
};

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
      <div className="admin-dashboard__navigation-groups">
        {navigationGroups.map(group => (
          <div className="admin-dashboard__navigation-group" key={group.id}>
            <p className="admin-dashboard__navigation-kicker">{navigationGroupLabels[locale][group.id]}</p>
            <ul>
              {group.items.map(([id, path]) => {
                const active = navigationMatchers[id].some(candidate => activePath === candidate || (candidate !== '/admin' && activePath.startsWith(`${candidate}/`)));
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
          </div>
        ))}
      </div>
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

function MetricCard({ value, label, testId }: { readonly value: number; readonly label: string; readonly testId?: string }) {
  return (
    <article className="admin-dashboard__metric" {...(testId === undefined ? {} : { 'data-testid': testId })}>
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
        {metrics.map(metric => <MetricCard key={metric} value={data[metric]} label={copy.overview.metrics[metric]} testId={`admin-metric-${metric}`} />)}
      </div>
    </section>
  );
}

function UnavailableCard({ label, unavailable }: { readonly label: string; readonly unavailable: string }) {
  return (
    <article className="admin-dashboard__metric admin-dashboard__metric--unavailable" data-state="unavailable">
      <span className="admin-dashboard__metric-icon" aria-hidden="true">&mdash;</span>
      <strong aria-label={unavailable}>&mdash;</strong>
      <span>{label}</span>
      <small>{unavailable}</small>
    </article>
  );
}

function ExtendedOverview({ data, locale }: { readonly data: AdminOverviewData; readonly locale: SupportedLocale }) {
  const copy = getAdminCopy(locale);
  const sections = [
    {
      title: copy.nav.properties,
      cards: [
        { label: copy.overview.metrics.publishedProperties, value: data.metrics.publishedProperties },
        { label: copy.overview.metrics.pendingReviews, value: data.metrics.pendingReviews },
        { label: copy.nav.providers },
        { label: copy.nav.audit }
      ]
    },
    {
      title: copy.nav.content,
      cards: [
        { label: copy.nav.content },
        { label: copy.nav.notifications },
        { label: copy.nav.audit },
        { label: copy.nav.settings }
      ]
    },
    {
      title: copy.nav.advertising,
      cards: [
        { label: copy.nav.advertising },
        { label: copy.nav.commissions },
        { label: copy.nav.settings },
        { label: copy.nav.audit }
      ]
    }
  ] as const;

  const quickActions = navigationItems.slice(1, 8);

  return (
    <div className="admin-dashboard__extended" data-testid="admin-overview-extended">
      <section className="admin-dashboard__quick-actions" aria-labelledby="admin-overview-queue-title">
        <div className="admin-dashboard__section-heading">
          <h2 id="admin-overview-queue-title">{copy.overview.queueTitle}</h2>
          <span className="admin-dashboard__metadata">{copy.overview.metrics.openRequests}: {new Intl.NumberFormat(locale).format(data.metrics.openRequests)} · {copy.overview.metrics.pendingReviews}: {new Intl.NumberFormat(locale).format(data.metrics.pendingReviews)}</span>
        </div>
        <p className="admin-dashboard__unavailable-message" data-state="unavailable">{copy.overview.queueBody}</p>
      </section>
      <div className="admin-dashboard__extended-grid">
        {sections.map(section => (
          <section className="admin-dashboard__extended-section" key={section.title} aria-labelledby={`admin-extended-${section.title.replaceAll(' ', '-').toLowerCase()}`}>
            <div className="admin-dashboard__section-heading">
              <h2 id={`admin-extended-${section.title.replaceAll(' ', '-').toLowerCase()}`}>{section.title}</h2>
            </div>
            <div className="admin-dashboard__metric-grid admin-dashboard__metric-grid--compact">
              {section.cards.map((card, index) => !('value' in card) ? (
                <UnavailableCard key={`${section.title}-${index}`} label={card.label} unavailable={copy.unavailable} />
              ) : (
                <MetricCard key={`${section.title}-${index}`} value={card.value} label={card.label} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="admin-dashboard__activity-grid">
        {[copy.nav.requests, copy.nav.notifications, copy.nav.audit].map(title => (
          <section className="admin-dashboard__activity-panel" key={title} aria-labelledby={`admin-activity-${title.replaceAll(' ', '-').toLowerCase()}`}>
            <div className="admin-dashboard__section-heading">
              <h2 id={`admin-activity-${title.replaceAll(' ', '-').toLowerCase()}`}>{title}</h2>
            </div>
            <p className="admin-dashboard__unavailable-message" data-state="unavailable">{copy.unavailable}</p>
          </section>
        ))}
      </div>
      <section className="admin-dashboard__quick-actions" aria-labelledby="admin-quick-actions-title">
        <div className="admin-dashboard__section-heading">
          <h2 id="admin-quick-actions-title">{copy.overview.activityTitle}</h2>
        </div>
        <div className="admin-dashboard__quick-actions-list">
          {quickActions.map(([id, path]) => (
            <a key={id} href={localePath(locale, path)}>{copy.nav[id]}</a>
          ))}
        </div>
      </section>
    </div>
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
  const headingActions = [
    [copy.overview.actions.reviewAccounts, '/admin/users'],
    [copy.overview.actions.reviewProperties, '/admin/properties'],
    [copy.overview.actions.createArticle, '/admin/content/articles'],
    [copy.overview.actions.reviewAdvertising, '/admin/advertising']
  ] as const;
  return (
    <div className="admin-dashboard__main">
      <div className="admin-dashboard__heading-row">
        <div>
          <p className="admin-dashboard__eyebrow">{copy.overview.eyebrow}</p>
          <h1>{copy.overview.title}</h1>
          <p className="admin-dashboard__description">{copy.overview.description}</p>
          <p className="admin-dashboard__metadata"><span>{copy.overview.rangeLabel}: {dateLabel(data.range.from, locale)} — {dateLabel(data.range.to, locale)}</span><span>{copy.overview.refreshedLabel}: {dateLabel(data.generatedAt, locale)}</span></p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', flexWrap: 'wrap', gap: '.55rem', justifyContent: 'flex-end' }}>
          {headingActions.map(([label, path]) => <a key={path} href={localePath(locale, path)} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '2.35rem', padding: '.45rem .75rem', border: '1px solid #d9d4c9', borderRadius: '999px', color: '#155b4f', fontSize: '.76rem', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>{label}</a>)}
        </div>
      </div>
      <MetricSection title={copy.overview.platformTitle} metrics={platformMetrics} data={data.metrics} locale={locale} />
      <MetricSection title={copy.overview.operationsTitle} metrics={operationMetrics} data={data.metrics} locale={locale} />
      <ExtendedOverview data={data} locale={locale} />
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
