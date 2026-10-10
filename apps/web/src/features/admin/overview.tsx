import { getAdditionalMetricGroups, type OverviewGroup } from './additional-metrics.tsx';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AdminOverviewData, AdminOverviewMetrics, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { StateMessage } from '../design_system/index.ts';
import { AdminSidebarContext, RouteShellAuthContext, type RouteSession } from '../routing/index.ts';
import { getAdminCopy, type AdminMetricKey, type AdminOverviewState } from './copy.ts';
import {
  createAdminOverviewLoader,
  type AdminAuthorizationSource,
  type AdminOverviewLoader
} from './data.ts';
import './styles.css';
import { UserGuideIcon } from '../dashboard_account/menu.tsx';
import { sidebarGroups, type AdminSidebarIcon } from '../routing/admin-navigation-model.ts';
import { AdminAttentionContext, AdminAttentionBadge, adminAttentionCount } from '../routing/admin-attention.tsx';
import { AdminAccountContext } from '../routing/admin-account.tsx';

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
  return Object.values(data.metrics).some(value => (value ?? 0) > 0);
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
  ['content', '/admin/articles'],
  ['advertising', '/admin/ads/requests'],
  ['commissions', '/admin/commissions'],
  ['notifications', '/admin/notifications'],
  ['audit', '/admin/audit-logs'],
  ['settings', '/admin/settings']
] as const satisfies ReadonlyArray<readonly [keyof ReturnType<typeof getAdminCopy>['nav'], string]>;

const navigationIconSources: Readonly<Record<(typeof navigationItems)[number][0], string>> = {
  overview: '/assets/canonical/provider/navigation/overview.svg',
  users: '/assets/canonical/provider/navigation/requests.svg',
  providers: '/assets/canonical/provider/navigation/properties.svg',
  properties: '/assets/canonical/provider/navigation/properties.svg',
  requests: '/assets/canonical/provider/navigation/requests.svg',
  content: '/assets/canonical/provider/navigation/projects.svg',
  advertising: '/assets/canonical/provider/navigation/advertising.svg',
  commissions: '/assets/canonical/provider/navigation/commission.svg',
  notifications: '/assets/canonical/provider/navigation/notifications.svg',
  audit: '/assets/canonical/provider/navigation/requests.svg',
  settings: '/assets/canonical/provider/navigation/settings.svg'
};

export function AdminNavigation({ locale, activePath }: { readonly locale: SupportedLocale; readonly activePath: string }) {
  const account = useContext(AdminAccountContext);
  const copy = getAdminCopy(locale);
  const authClient = useContext(RouteShellAuthContext);
  const sidebarController = useContext(AdminSidebarContext);
  const attention = useContext(AdminAttentionContext);
  const [signingOut, setSigningOut] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<readonly string[]>([]);
  const navigationScroll = useRef<HTMLDivElement>(null);
  const activeItemId = sidebarGroups.flatMap(group => group.items).map(item => ({
    id: item.id,
    score: Math.max(...item.matchers.map(candidate => activePath === candidate ? candidate.length + 10000 : activePath.startsWith(`${candidate}/`) ? candidate.length : -1))
  })).filter(item => item.score >= 0).sort((left, right) => right.score - left.score)[0]?.id;
  const activeGroupId = sidebarGroups.find(group => group.items.some(item => item.id === activeItemId))?.id;
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem('admin-sidebar-collapsed') ?? '[]');
      setCollapsedGroups(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && id !== activeGroupId && sidebarGroups.some(group => group.id === id)) : []);
    } catch {
      setCollapsedGroups([]);
    }
  }, [activeGroupId]);
  useEffect(() => {
    const scroll = navigationScroll.current;
    const active = scroll?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroll || !active) return;
    // The desktop sidebar scrolls vertically while the compact tablet/mobile
    // rail scrolls horizontally. Resolve both axes explicitly because the
    // compact rail has nested overflow containers and RTL scroll coordinates.
    const containers = [active.closest<HTMLElement>('ul'), scroll].filter((container, index, all): container is HTMLElement => Boolean(container) && all.indexOf(container) === index);
    const reveal = () => {
      for (const containerElement of containers) {
        const container = containerElement.getBoundingClientRect();
        const item = active.getBoundingClientRect();
        const deltaX = item.left < container.left ? item.left - container.left : item.right > container.right ? item.right - container.right : 0;
        const deltaY = item.top < container.top ? item.top - container.top : item.bottom > container.bottom ? item.bottom - container.bottom : 0;
        if (deltaX !== 0) containerElement.scrollLeft += deltaX;
        if (deltaY !== 0) containerElement.scrollTop += deltaY;
      }
    };
    const frame = requestAnimationFrame(() => {
      reveal();
      requestAnimationFrame(reveal);
    });
    const delayed = [0, 80, 240, 500].map(delay => window.setTimeout(reveal, delay));
    const fontsReady = document.fonts?.ready.then(reveal);
    return () => {
      cancelAnimationFrame(frame);
      delayed.forEach(timer => window.clearTimeout(timer));
      void fontsReady;
    };
  }, [activeItemId, collapsedGroups]);
  const toggleGroup = (id: string) => {
    if (id === activeGroupId) return;
    const next = collapsedGroups.includes(id) ? collapsedGroups.filter(value => value !== id) : [...collapsedGroups, id];
    setCollapsedGroups(next);
    try { sessionStorage.setItem('admin-sidebar-collapsed', JSON.stringify(next)); } catch { /* Navigation still works when storage is unavailable. */ }
  };
  const signOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    void (authClient?.logout?.() ?? Promise.resolve()).catch(() => undefined).finally(() => {
      if (typeof window !== 'undefined') window.location.assign(localePath(locale, '/auth/login'));
      else setSigningOut(false);
    });
  };
  return (
    <nav
      aria-label={copy.overview.eyebrow}
      className="admin-dashboard__navigation"
      data-drawer-open={sidebarController?.open || undefined}
      data-testid="admin-sidebar"
      id="admin-dashboard-navigation"
      onClick={event => {
        if ((event.target as HTMLElement).closest('a')) sidebarController?.setOpen(false);
      }}
    >
      <div className="admin-dashboard__navigation-scroll" ref={navigationScroll}>
        <div className="admin-dashboard__navigation-groups">
          {sidebarGroups.map(group => (
            <div className="admin-dashboard__navigation-group" key={group.id}>
              <button type="button" className="admin-dashboard__navigation-kicker" aria-expanded={!collapsedGroups.includes(group.id)} aria-controls={`admin-navigation-${group.id}`} onClick={() => toggleGroup(group.id)}>
                <span>{copy.sidebar.groups[group.id] ?? group.label[locale]}</span>
                {group.items.some(item => adminAttentionCount(item.id, attention.attention, attention.unread) > 0) ? <span className="admin-attention__group-dot" aria-label={locale === 'ar' ? 'يوجد ما يحتاج المراجعة' : 'Needs attention'} /> : null}
                <span aria-hidden="true">{collapsedGroups.includes(group.id) ? '+' : '−'}</span>
              </button>
              <ul id={`admin-navigation-${group.id}`} hidden={collapsedGroups.includes(group.id)}>
                {group.items.map(item => {
                  const active = item.id === activeItemId;
                  return (
                    <li key={item.id}>
                      <a href={localePath(locale, item.path)} aria-current={active ? 'page' : undefined} data-active={active || undefined}>
                        <span aria-hidden="true" className="admin-dashboard__navigation-icon">
                          {item.id === 'user-guide' ? <UserGuideIcon /> : <img src={navigationIconSources[item.icon]} alt="" width="17" height="17" />}
                        </span>
                        <span>{copy.sidebar.items[item.id] ?? item.label[locale]}</span>
                        <AdminAttentionBadge id={item.id} locale={locale} count={adminAttentionCount(item.id, attention.attention, attention.unread)} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-dashboard__navigation-footer">
        <div className="admin-dashboard__navigation-profile">
          <span className="admin-dashboard__navigation-profile-avatar" aria-hidden="true">{account?.displayName.slice(0, 1) ?? copy.sidebar.avatar}</span>
          <span><strong>{account?.displayName ?? copy.sidebar.profileTitle}</strong><small>{copy.sidebar.profileSubtitle}</small></span>
        </div>
        <a href={localePath(locale, '/')} className="admin-dashboard__navigation-footer-link">
          <span className="admin-dashboard__navigation-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" /></svg></span>
          <span>{copy.sidebar.website}</span>
        </a>
        <button type="button" className="admin-dashboard__navigation-footer-link admin-dashboard__navigation-logout" onClick={signOut} disabled={signingOut} data-testid="admin-logout-button" aria-label={signingOut ? copy.sidebar.signingOut : copy.sidebar.signOut}>
          <span className="admin-dashboard__navigation-icon" aria-hidden="true"><img src="/assets/canonical/provider/navigation/logout.svg" alt="" width="17" height="17" /></span>
          <span>{signingOut ? copy.sidebar.signingOut : copy.sidebar.signOut}</span>
        </button>
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
      <StateMessage state={state} title={message.title} message={message.body} loadingVariant="cards" onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {canRetry && state !== 'retry' ? <button type="button" className="admin-dashboard__secondary-action" onClick={onRetry}>{copy.retry}</button> : null}
    </section>
  );
}

const platformMetrics: readonly AdminMetricKey[] = ['users', 'seekers', 'providers', 'verifiedProviders'];
const operationMetrics: readonly AdminMetricKey[] = ['publishedProperties', 'openRequests', 'pendingReviews'];

function MetricCard({ value, label, href, testId, icon = 'properties', money = false, locale = 'en' }: { readonly value: number; readonly label: string; readonly href: string; readonly testId?: string; readonly icon?: AdminSidebarIcon; readonly money?: boolean; readonly locale?: SupportedLocale }) {
  return (
    <a className="admin-dashboard__metric admin-dashboard__metric-link" href={href} {...(testId === undefined ? {} : { 'data-testid': testId })}>
      <span className="admin-dashboard__metric-icon" aria-hidden="true"><img src={navigationIconSources[icon]} alt="" width="20" height="20" /></span>
      <strong>{money ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP' }).format(value / 100) : new Intl.NumberFormat().format(value)}</strong>
      <span>{label}</span>
    </a>
  );
}

function MetricSection({ title, metrics, data, locale }: { readonly title: string; readonly metrics: readonly AdminMetricKey[]; readonly data: AdminOverviewMetrics; readonly locale: SupportedLocale }) {
  const copy = getAdminCopy(locale);
  const paths: Record<AdminMetricKey, string> = { users: '/admin/users', seekers: '/admin/property-seekers', providers: '/admin/providers', verifiedProviders: '/admin/providers', publishedProperties: '/admin/properties?status=published', openRequests: '/admin/requests', pendingReviews: '/admin#admin-overview-queue-title' };
  return (
    <section className="admin-dashboard__metric-section" aria-labelledby={`admin-${title.replaceAll(' ', '-').toLowerCase()}-title`}>
      <div className="admin-dashboard__section-heading">
        <h2 id={`admin-${title.replaceAll(' ', '-').toLowerCase()}-title`}>{title}</h2>
      </div>
      <div className="admin-dashboard__metric-grid">
        {metrics.map(metric => <MetricCard key={metric} icon={metric === 'users' || metric === 'seekers' ? 'users' : metric === 'providers' || metric === 'verifiedProviders' ? 'providers' : metric === 'publishedProperties' ? 'properties' : 'requests'} value={data[metric]} label={copy.overview.metrics[metric]} href={localePath(locale, paths[metric])} testId={`admin-metric-${metric}`} />)}
      </div>
    </section>
  );
}

function ShortcutCard({ label, href, icon, locale, testId }: { readonly label: string; readonly href: string; readonly icon: AdminSidebarIcon; readonly locale: SupportedLocale; readonly testId?: string }) {
  const copy = getAdminCopy(locale);
  return <a className="admin-dashboard__metric admin-dashboard__metric-link admin-dashboard__shortcut" href={href} {...(testId === undefined ? {} : { 'data-testid': testId })}>
    <span className="admin-dashboard__metric-icon" aria-hidden="true"><img src={navigationIconSources[icon]} alt="" width="20" height="20" /></span>
    <span>{label}</span>
    <small>{copy.overview.openPage} →</small>
  </a>;
}

function ExtendedOverview({ data, locale }: { readonly data: AdminOverviewData; readonly locale: SupportedLocale }) {
  const copy = getAdminCopy(locale);
  const sections: readonly OverviewGroup[] = [
    { title: copy.nav.properties, cards: [
      { label: copy.overview.metrics.publishedProperties, value: data.metrics.publishedProperties, path: '/admin/properties?status=published', icon: 'properties' },
      { label: copy.overview.metrics.pendingReviews, value: data.metrics.pendingReviews, path: '/admin#admin-overview-queue-title', icon: 'requests' },
      { label: copy.nav.providers, value: data.metrics.providers, path: '/admin/providers', icon: 'providers' },
      { label: copy.nav.audit, path: '/admin/audit-logs', icon: 'audit' }
    ] },
    ...getAdditionalMetricGroups(data.metrics, locale),
    { title: copy.nav.requests, cards: [
      { label: copy.overview.metrics.openRequests, value: data.metrics.openRequests, path: '/admin/requests', icon: 'requests' },
      { label: copy.overview.metrics.pendingReviews, value: data.metrics.pendingReviews, path: '/admin#admin-overview-queue-title', icon: 'requests' },
      { label: copy.nav.notifications, path: '/admin/notifications', icon: 'notifications' },
      { label: copy.nav.settings, path: '/admin/settings', icon: 'settings' }
    ] }
  ];
  const reviewLinks = [
    [copy.overview.actions.reviewAccounts, '/admin/verification'],
    [copy.overview.actions.reviewProperties, '/admin/properties?status=pending_review'],
    [copy.sidebar.items.projects, '/admin/projects'],
    [copy.overview.actions.reviewAdvertising, '/admin/ads/requests']
  ] as const;

  return <div className="admin-dashboard__extended" data-testid="admin-overview-extended">
    <section className="admin-dashboard__quick-actions" aria-labelledby="admin-overview-queue-title">
      <div className="admin-dashboard__section-heading">
        <h2 id="admin-overview-queue-title">{copy.overview.queueTitle}</h2>
        <span className="admin-dashboard__metadata">{copy.overview.metrics.openRequests}: {new Intl.NumberFormat(locale).format(data.metrics.openRequests)} · {copy.overview.metrics.pendingReviews}: {new Intl.NumberFormat(locale).format(data.metrics.pendingReviews)}</span>
      </div>
      <p>{copy.overview.queueBody}</p>
      <div className="admin-dashboard__quick-actions-list">{reviewLinks.map(([label, path]) => <a key={path} href={localePath(locale, path)}>{label}</a>)}</div>
    </section>
    <div className="admin-dashboard__extended-grid">{sections.map(section => <section className="admin-dashboard__extended-section" key={section.title} aria-labelledby={`admin-extended-${section.title.replaceAll(' ', '-').toLowerCase()}`}>
      <div className="admin-dashboard__section-heading"><h2 id={`admin-extended-${section.title.replaceAll(' ', '-').toLowerCase()}`}>{section.title}</h2></div>
      <div className="admin-dashboard__metric-grid admin-dashboard__metric-grid--compact">{section.cards.map((card, index) => {
        const props = { label: card.label, href: localePath(locale, card.path), icon: card.icon, locale, ...(card.key === undefined ? {} : { testId: `admin-metric-${card.key}` }) };
        return card.value === undefined ? <ShortcutCard key={index} {...props} /> : <MetricCard key={index} {...props} value={card.value} money={card.money ?? false} />;
      })}</div>
      {section.note === undefined ? null : <p className="admin-dashboard__metadata">{section.note}</p>}
    </section>)}</div>
    <section className="admin-dashboard__quick-actions" aria-labelledby="admin-quick-actions-title">
      <div className="admin-dashboard__section-heading"><h2 id="admin-quick-actions-title">{copy.overview.activityTitle}</h2></div>
      <div className="admin-dashboard__quick-actions-list">{navigationItems.slice(1).map(([id, path]) => <a key={id} href={localePath(locale, path)}>{copy.nav[id]}</a>)}</div>
    </section>
  </div>;
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
    [copy.overview.actions.createArticle, '/admin/articles'],
    [copy.overview.actions.reviewAdvertising, '/admin/ads/requests']
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
        <div className="admin-dashboard__heading-actions">
          {headingActions.map(([label, path], index) => <a className={`ui-button ui-button--${index < 2 ? 'primary' : 'secondary'} ui-button--xs`} key={path} href={localePath(locale, path)}>{label}</a>)}
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
    <section className="admin-dashboard a1" data-screen-id="ADM-01" data-route="/admin" data-device-scope="desktop" data-admin-state={state}>
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
