import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  SeekerOverviewData,
  SeekerOverviewNotification,
  SeekerOverviewRequest,
  SeekerOverviewViewing,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import { localizedText } from '../public/model.ts';
import type { RouteSession } from '../routing/index.ts';
import { getSeekerCopy } from './copy.ts';
import { createSeekerOverviewLoader, createSeekerProfileLoader, isAuthenticatedSeekerSession, localeForSeekerPath, type SeekerAuthorizationSource, type SeekerOverviewLoader } from './data.ts';
import './styles.css';

export type SeekerOverviewViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';

export interface SeekerOverviewAuthClient extends SeekerAuthorizationSource {
  readonly getSnapshot: () => { readonly status: string };
}

export interface SeekerOverviewProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: SeekerOverviewAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: SeekerOverviewData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: SeekerOverviewLoader | undefined;
}

export type SeekerIconName = 'overview' | 'requests' | 'viewings' | 'saved' | 'notifications' | 'profile' | 'settings' | 'search';

const seekerIconAssets: Readonly<Record<SeekerIconName, string>> = {
  overview: '/assets/canonical/provider/navigation/overview.svg',
  requests: '/assets/canonical/seeker/navigation/requests.svg',
  viewings: '/assets/canonical/seeker/navigation/viewings.svg',
  saved: '/assets/canonical/seeker/navigation/saved.svg',
  notifications: '/assets/canonical/provider/navigation/notifications.svg',
  profile: '/assets/canonical/seeker/navigation/profile.svg',
  settings: '/assets/canonical/provider/navigation/settings.svg',
  search: '/assets/canonical/seeker/navigation/search.svg'
};

export function SeekerIcon({ name, className = '' }: { readonly name: SeekerIconName; readonly className?: string }) {
  return <img className={`seeker-dashboard__icon ${className}`.trim()} src={seekerIconAssets[name]} alt="" width={19} height={19} aria-hidden="true" />;
}

function isEmpty(data: SeekerOverviewData): boolean {
  return data.requests === 0 && data.viewings === 0 && data.savedProperties === 0 && data.notifications === 0 && data.unreadNotifications === 0;
}

function stateForError(error: unknown): Exclude<SeekerOverviewViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<SeekerOverviewViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getSeekerCopy(locale);
  const message = copy.states[state];
  return (
    <section className="seeker-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

export function SeekerNavigation({ locale, activePath, authClient, apiOrigin }: { readonly locale: SupportedLocale; readonly activePath: string; readonly authClient?: SeekerAuthorizationSource | undefined; readonly apiOrigin?: string | undefined }) {
  const copy = getSeekerCopy(locale);
  const canonicalAvatar = '/assets/canonical/seeker/avatar.png';
  const [displayName, setDisplayName] = useState<string>();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (authClient?.getAuthorizationHeader() === undefined) return undefined;
    const controller = new AbortController();
    const loadProfile = createSeekerProfileLoader({ authorization: authClient, apiOrigin });
    void loadProfile(controller.signal).then(profile => {
      if (!controller.signal.aborted) setDisplayName(`${profile.firstName} ${profile.lastName}`.trim());
    }).catch(() => undefined);
    return () => controller.abort();
  }, [apiOrigin, authClient]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const isMobile = typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(max-width: 900px)').matches;
    if (!isMobile) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);
  useEffect(() => {
    setMenuOpen(false);
  }, [activePath]);
  const searchLabel = locale === 'ar' ? 'ابحث عن عقار في السادات...' :'Search properties in Sadat City…';
  const menuLabel = locale === 'ar' ? 'قائمة لوحة الباحث' :'Seeker dashboard menu';
  const closeMenuLabel = locale === 'ar' ? 'إغلاق قائمة لوحة الباحث' :'Close seeker dashboard menu';
  const websiteLabel = locale === 'ar' ? 'عرض الموقع' :'View website';
  const toggleMenu = () => {
    const isMobile = typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(max-width: 900px)').matches;
    if (isMobile) setMenuOpen(current => !current);
  };
  const items = [
    ['overview', '/seeker'],
    ['requests', '/seeker/requests'],
    ['viewings', '/seeker/viewings'],
    ['saved', '/seeker/saved'],
    ['notifications', '/seeker/notifications'],
    ['profile', '/seeker/profile?tab=personal'],
    ['settings', '/seeker/settings']
  ] as const;
  return (
    <>
      <header className="seeker-dashboard__topbar">
        <button className="seeker-dashboard__menu-button" type="button" aria-label={menuOpen ? closeMenuLabel : menuLabel} aria-expanded={menuOpen} aria-controls="seeker-dashboard-navigation" onClick={toggleMenu}>
          <span aria-hidden="true" className="seeker-dashboard__menu-glyph"><i /><i /><i /></span>
        </button>
        <label className="seeker-dashboard__search">
          <span className="a11y-visually-hidden">{searchLabel}</span>
          <SeekerIcon name="search" className="seeker-dashboard__search-icon" />
          <input type="search" placeholder={searchLabel} aria-label={searchLabel} />
        </label>
        <a className="seeker-dashboard__topbar-profile" href={localeForSeekerPath(locale, '/seeker/profile?tab=personal')}>
          <span className="seeker-dashboard__avatar" aria-hidden="true"><img src={canonicalAvatar} alt="" /></span>
          <span><strong>{displayName ?? copy.overview.eyebrow}</strong><small>{copy.nav.profile}</small></span>
        </a>
      </header>
      <button className={`seeker-dashboard__backdrop${menuOpen ? ' is-open' : ''}`} type="button" aria-label={closeMenuLabel} aria-hidden={!menuOpen} tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} />
      <nav id="seeker-dashboard-navigation" className={`seeker-dashboard__nav${menuOpen ? ' is-open' : ''}`} aria-label={copy.overview.eyebrow}>
        <a className="seeker-dashboard__brand" href={localeForSeekerPath(locale, '/')} aria-label={websiteLabel} onClick={() => setMenuOpen(false)}>
          <img src="/assets/sadat-real-estate-logo.png" alt="" />
        </a>
        <ul>
          {items.map(([id, path]) => {
            const active = activePath === path || (id === 'profile' && activePath.startsWith('/seeker/profile'));
            return (
              <li key={id}>
                <a href={localeForSeekerPath(locale, path)} aria-current={active ? 'page' : undefined} data-active={active || undefined} onClick={() => setMenuOpen(false)}>
                  <span aria-hidden="true" className="seeker-dashboard__nav-icon"><SeekerIcon name={id} /></span>
                  <span>{copy.nav[id]}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="seeker-dashboard__nav-footer">
          <span className="seeker-dashboard__avatar" aria-hidden="true"><img src={canonicalAvatar} alt="" /></span>
          <span><strong>{displayName ?? copy.overview.eyebrow}</strong><small>{copy.nav.profile}</small></span>
          <a href={localeForSeekerPath(locale, '/')} onClick={() => setMenuOpen(false)}>{websiteLabel}<span aria-hidden="true">↗</span></a>
        </div>
      </nav>
    </>
  );
}

function SummaryCard({ label, value, tone, testId }: { readonly label: string; readonly value: number; readonly tone: string; readonly testId: string }) {
  const iconName: SeekerIconName = tone === 'requests' ? 'requests' : tone === 'viewings' ? 'viewings' : tone === 'saved' ? 'saved' : 'notifications';
  return (
    <article className={`seeker-dashboard__summary-card seeker-dashboard__summary-card--${tone}`} data-testid={testId}>
      <span className="seeker-dashboard__summary-icon" aria-hidden="true"><SeekerIcon name={iconName} /></span>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function shortActivityId(value: string, prefix: string): string {
  return `${prefix}-${value.slice(-4).toUpperCase()}`;
}

function activityDate(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function payloadText(request: SeekerOverviewRequest, key: string): string | undefined {
  const value = request.payload[key];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (Array.isArray(value)) {
    const values = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
    return values.length > 0 ? values.join(' · ') : undefined;
  }
  return undefined;
}

function requestTypeLabel(request: SeekerOverviewRequest, locale: SupportedLocale): string {
  const labels = locale === 'ar'
    ? { contact: 'طلب تواصل', viewing: 'طلب معاينة', property_search: 'بحث عن عقار', provider_customer: 'طلب عميل' }
    : { contact: 'Contact request', viewing: 'Viewing request', property_search: 'Property search', provider_customer: 'Customer request' };
  return labels[request.type];
}

function requestStatusLabel(status: SeekerOverviewRequest['status'], locale: SupportedLocale): string {
  const labels = locale === 'ar'
    ? { new: 'جديد', under_review: 'قيد المراجعة', contacted: 'تم التواصل', scheduled: 'مجدول', needs_information: 'يحتاج معلومات', in_progress: 'قيد التنفيذ', resolved: 'تم الحل', cancelled: 'ملغي', closed: 'مغلق' }
    : { new: 'New', under_review: 'Under review', contacted: 'Contacted', scheduled: 'Scheduled', needs_information: 'Needs information', in_progress: 'In progress', resolved: 'Resolved', cancelled: 'Cancelled', closed: 'Closed' };
  return labels[status];
}

function viewingStatusLabel(status: SeekerOverviewViewing['status'], locale: SupportedLocale): string {
  const labels = locale === 'ar'
    ? { requested: 'قيد الطلب', confirmed: 'مؤكد', rescheduled: 'أعيدت جدولته', cancelled: 'ملغي', completed: 'مكتمل' }
    : { requested: 'Requested', confirmed: 'Confirmed', rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed' };
  return labels[status];
}

function ActivityPanel({ title, href, children, className = '' }: { readonly title: string; readonly href: string; readonly children: ReactNode; readonly className?: string }) {
  return (
    <section className={`seeker-overview__activity-panel ${className}`.trim()}>
      <header className="seeker-overview__activity-panel-heading"><a href={href}>{title}</a><span aria-hidden="true">‹</span></header>
      {children}
    </section>
  );
}

function ActivityEmpty({ label }: { readonly label: string }) {
  return <p className="seeker-overview__activity-empty">{label}</p>;
}

function RequestsActivity({ data, locale }: { readonly data: readonly SeekerOverviewRequest[]; readonly locale: SupportedLocale }) {
  const copy = getSeekerCopy(locale);
  return (
    <ActivityPanel title={copy.overview.recent.requests} href={localeForSeekerPath(locale, '/seeker/requests')} className="seeker-overview__activity-panel--requests">
      {data.length === 0 ? <ActivityEmpty label={copy.overview.recent.empty} /> : (
        <div className="seeker-overview__activity-list" role="list">
          {data.map(request => {
            const propertyId = request.propertyId === undefined ? payloadText(request, 'propertyId') : shortActivityId(request.propertyId, 'PROP');
            const location = payloadText(request, 'locations');
            return (
              <a className="seeker-overview__activity-row" role="listitem" key={request.id} href={localeForSeekerPath(locale, `/seeker/requests/${request.id}`)}>
                <span className={`seeker-overview__status seeker-overview__status--${request.status}`}>{requestStatusLabel(request.status, locale)}</span>
                <span className="seeker-overview__activity-row-main"><strong>{requestTypeLabel(request, locale)}</strong><small>{propertyId ?? location ?? shortActivityId(request.id, 'REQ')}</small></span>
                <span className="seeker-overview__activity-row-meta"><b>{shortActivityId(request.id, 'REQ')}</b><time dateTime={request.updatedAt}>{activityDate(request.updatedAt, locale)}</time></span>
              </a>
            );
          })}
        </div>
      )}
    </ActivityPanel>
  );
}

function ViewingsActivity({ data, locale }: { readonly data: readonly SeekerOverviewViewing[]; readonly locale: SupportedLocale }) {
  const copy = getSeekerCopy(locale);
  return (
    <ActivityPanel title={copy.overview.recent.viewings} href={localeForSeekerPath(locale, '/seeker/viewings')} className="seeker-overview__activity-panel--viewings">
      {data.length === 0 ? <ActivityEmpty label={copy.overview.recent.empty} /> : (
        <div className="seeker-overview__activity-list" role="list">
          {data.map(viewing => (
            <a className="seeker-overview__activity-row" role="listitem" key={viewing.id} href={localeForSeekerPath(locale, '/seeker/viewings')}>
              <span className={`seeker-overview__status seeker-overview__status--${viewing.status}`}>{viewingStatusLabel(viewing.status, locale)}</span>
              <span className="seeker-overview__activity-row-main"><strong>{shortActivityId(viewing.propertyId, 'PROP')}</strong><small>{copy.overview.recent.appointment}: {viewing.timezone}</small></span>
              <span className="seeker-overview__activity-row-meta"><time dateTime={viewing.requestedAt}>{activityDate(viewing.requestedAt, locale)}</time></span>
            </a>
          ))}
        </div>
      )}
    </ActivityPanel>
  );
}

function NotificationsActivity({ data, locale }: { readonly data: readonly SeekerOverviewNotification[]; readonly locale: SupportedLocale }) {
  const copy = getSeekerCopy(locale);
  return (
    <ActivityPanel title={copy.overview.recent.notifications} href={localeForSeekerPath(locale, '/seeker/notifications')} className="seeker-overview__activity-panel--notifications">
      {data.length === 0 ? <ActivityEmpty label={copy.overview.recent.empty} /> : (
        <div className="seeker-overview__activity-list" role="list">
          {data.map(item => {
            const title = localizedText(item.title, locale) ?? item.type;
            const href = item.link === undefined ? localeForSeekerPath(locale, '/seeker/notifications') : localeForSeekerPath(locale, item.link);
            return (
              <a className="seeker-overview__activity-row" role="listitem" key={item.id} href={href}>
                <span className={`seeker-overview__notification-dot${item.readAt === null ? ' is-unread' : ''}`} aria-hidden="true">●</span>
                <span className="seeker-overview__activity-row-main"><strong>{title}</strong><small>{item.message === undefined ? item.type : localizedText(item.message, locale) ?? item.type}</small></span>
                <span className="seeker-overview__activity-row-meta"><time dateTime={item.createdAt}>{activityDate(item.createdAt, locale)}</time></span>
              </a>
            );
          })}
        </div>
      )}
    </ActivityPanel>
  );
}

function OverviewActivity({ data, locale }: { readonly data: SeekerOverviewData; readonly locale: SupportedLocale }) {
  const copy = getSeekerCopy(locale);
  const hasProjection = data.recentRequests !== undefined || data.upcomingViewings !== undefined || data.recentNotifications !== undefined;
  if (!hasProjection) {
    const empty = isEmpty(data);
    return (
      <section className="seeker-dashboard__activity" aria-labelledby="seeker-activity-title">
        <div className="seeker-dashboard__section-heading"><h2 id="seeker-activity-title">{copy.overview.activityTitle}</h2></div>
        {empty ? <div className="seeker-dashboard__empty" data-state="empty"><h3>{copy.overview.emptyTitle}</h3><p>{copy.overview.emptyBody}</p></div> : (
          <div className="seeker-dashboard__overview-grid" data-state="summary-only">
            <a href={localeForSeekerPath(locale, '/seeker/requests')} className="seeker-dashboard__overview-panel seeker-dashboard__overview-panel--requests"><span aria-hidden="true"><SeekerIcon name="requests" /></span><div><strong>{copy.nav.requests}</strong><small>{data.requests} {copy.overview.cards.requests}</small></div><b>{data.requests}</b></a>
            <a href={localeForSeekerPath(locale, '/seeker/viewings')} className="seeker-dashboard__overview-panel seeker-dashboard__overview-panel--viewings"><span aria-hidden="true"><SeekerIcon name="viewings" /></span><div><strong>{copy.nav.viewings}</strong><small>{data.viewings} {copy.overview.cards.viewings}</small></div><b>{data.viewings}</b></a>
            <a href={localeForSeekerPath(locale, '/seeker/notifications')} className="seeker-dashboard__overview-panel seeker-dashboard__overview-panel--notifications"><span aria-hidden="true"><SeekerIcon name="notifications" /></span><div><strong>{copy.nav.notifications}</strong><small>{data.unreadNotifications} {copy.overview.cards.notifications}</small></div><b>{data.unreadNotifications}</b></a>
            <a href={localeForSeekerPath(locale, '/seeker/saved')} className="seeker-dashboard__overview-panel seeker-dashboard__overview-panel--wide"><span aria-hidden="true"><SeekerIcon name="saved" /></span><div><strong>{copy.nav.saved}</strong><small>{copy.overview.activityBody}</small></div><b>{data.savedProperties}</b></a>
          </div>
        )}
      </section>
    );
  }
  return (
    <section className="seeker-overview__activity" aria-labelledby="seeker-activity-title" data-activity-state="projected">
      <div className="seeker-dashboard__section-heading"><h2 id="seeker-activity-title">{copy.overview.activityTitle}</h2></div>
      <div className="seeker-overview__activity-grid">
        <RequestsActivity data={data.recentRequests ?? []} locale={locale} />
        <div className="seeker-overview__activity-side"><ViewingsActivity data={data.upcomingViewings ?? []} locale={locale} /><NotificationsActivity data={data.recentNotifications ?? []} locale={locale} /></div>
      </div>
      <div className="seeker-overview__search-cta"><div><strong>{copy.overview.searchProperties}</strong><span>{locale === 'ar' ? 'تصفح مئات العقارات المتاحة في مدينة السادات' : 'Browse hundreds of available properties in Sadat City'}</span></div><a href={localeForSeekerPath(locale, '/properties')}>{locale === 'ar' ? 'تصفح العقارات' : 'Browse properties'}<span aria-hidden="true">⌕</span></a></div>
    </section>
  );
}

function OverviewContent({ data, locale }: { readonly data: SeekerOverviewData; readonly locale: SupportedLocale }) {
  const copy = getSeekerCopy(locale);
  return (
    <>
      <div className="seeker-dashboard__heading-row"><div><p className="seeker-dashboard__eyebrow">{copy.overview.eyebrow}</p><h1>{copy.overview.title}</h1><p>{copy.overview.description}</p></div><a className="seeker-dashboard__primary-link" href={localeForSeekerPath(locale, '/properties')}><SeekerIcon name="search" />{copy.overview.searchProperties}</a></div>
      <section className="seeker-dashboard__summary" aria-labelledby="seeker-summary-title"><div className="seeker-dashboard__section-heading"><h2 id="seeker-summary-title">{copy.overview.summaryTitle}</h2></div><div className="seeker-dashboard__summary-grid"><SummaryCard label={copy.overview.cards.requests} value={data.requests} tone="requests" testId="seeker-summary-requests" /><SummaryCard label={copy.overview.cards.viewings} value={data.viewings} tone="viewings" testId="seeker-summary-viewings" /><SummaryCard label={copy.overview.cards.savedProperties} value={data.savedProperties} tone="saved" testId="seeker-summary-saved" /><SummaryCard label={copy.overview.cards.notifications} value={data.unreadNotifications} tone="notifications" testId="seeker-summary-notifications" /></div></section>
      <OverviewActivity data={data} locale={locale} />
    </>
  );
}

export function SeekerOverview({ locale, session, authClient, apiOrigin, initialData, initialState = 'loading', load }: SeekerOverviewProps) {
  const source = useMemo(() => load ?? createSeekerOverviewLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const [state, setState] = useState<SeekerOverviewViewState>(() => !isAuthenticatedSeekerSession(session)
    ? 'permission'
    : initialData === undefined
      ? initialState
      : isEmpty(initialData)
        ? 'empty'
        : 'success');
  const [data, setData] = useState<SeekerOverviewData | undefined>(initialData);
  const [attempt, setAttempt] = useState(0);
  const path = typeof window === 'undefined' ? '/seeker' : new URL(window.location.href).pathname;

  useEffect(() => {
    if (!isAuthenticatedSeekerSession(session)) {
      setState('permission');
      return undefined;
    }
    if (initialData !== undefined && attempt === 0) return undefined;
    const controller = new AbortController();
    setState('loading');
    void source(controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(isEmpty(nextData) ? 'empty' : 'success');
    }).catch(error => {
      if (controller.signal.aborted) return;
      setState(stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, initialData, sessionRole, source]);

  return (
    <section className="seeker-dashboard seeker-overview" data-screen-id="SEK-01" data-route="/seeker">
      <SeekerNavigation locale={locale} activePath={path} authClient={authClient} apiOrigin={apiOrigin} />
      <div className="seeker-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? <OverviewContent data={data} locale={locale} /> : null}
      </div>
    </section>
  );
}
