import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AdminOverviewData, AdminOverviewMetrics, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { StateMessage } from '../design_system/index.ts';
import { RouteShellAuthContext, type RouteSession } from '../routing/index.ts';
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

type AdminSidebarIcon = keyof typeof navigationIconSources;
type AdminSidebarItem = {
  readonly id: string;
  readonly path: string;
  readonly matchers: readonly string[];
  readonly icon: AdminSidebarIcon;
  readonly label: Readonly<Record<SupportedLocale, string>>;
};
type AdminSidebarGroup = {
  readonly id: string;
  readonly label: Readonly<Record<SupportedLocale, string>>;
  readonly items: readonly AdminSidebarItem[];
};

const sidebarItem = (id: string, path: string, icon: AdminSidebarIcon, ar: string, en: string, matchers: readonly string[] = [path]): AdminSidebarItem => ({
  id,
  path,
  matchers,
  icon,
  label: { ar, en }
});

const sidebarGroups: readonly AdminSidebarGroup[] = [
  { id: 'home', label: { ar: 'الرئيسية', en: 'Home' }, items: [sidebarItem('overview', '/admin', 'overview', 'نظرة عامة', 'Overview', ['/admin', '/admin/overview'])] },
  {
    id: 'accounts',
    label: { ar: 'المستخدمون والحسابات', en: 'Users and accounts' },
    items: [
      sidebarItem('users', '/admin/users', 'users', 'جميع المستخدمين', 'All users'),
      sidebarItem('seekers', '/admin/property-seekers', 'users', 'الباحثون عن عقار', 'Property seekers'),
      sidebarItem('providers', '/admin/providers', 'providers', 'مقدمو العقارات', 'Property providers'),
      sidebarItem('verification', '/admin/verification', 'requests', 'قائمة التوثيق', 'Verification queue'),
      sidebarItem('account-reports', '/admin/account-reports', 'requests', 'بلاغات الحسابات', 'Account reports'),
      sidebarItem('account-restrictions', '/admin/account-restrictions', 'settings', 'قيود الحسابات', 'Account restrictions')
    ]
  },
  {
    id: 'properties',
    label: { ar: 'إدارة العقارات', en: 'Property management' },
    items: [
      sidebarItem('properties', '/admin/properties', 'properties', 'العقارات', 'Properties'),
      sidebarItem('property-review', '/admin/properties/review', 'properties', 'مراجعة العقارات', 'Property review'),
      sidebarItem('property-duplicates', '/admin/properties/possible-duplicates', 'properties', 'عقارات مكررة محتملة', 'Possible duplicates'),
      sidebarItem('property-reports', '/admin/property-reports', 'requests', 'بلاغات العقارات', 'Property reports'),
      sidebarItem('projects', '/admin/projects', 'content', 'المشروعات', 'Projects', ['/admin/projects']),
      sidebarItem('project-review', '/admin/projects/review', 'content', 'مراجعة المشروعات', 'Project review'),
      sidebarItem('categories', '/admin/property-categories', 'settings', 'التصنيفات وأنواع العقارات', 'Property categories'),
      sidebarItem('locations', '/admin/locations', 'settings', 'المناطق والأحياء', 'Locations and districts'),
      sidebarItem('features', '/admin/features', 'settings', 'المميزات والخدمات', 'Features and services')
    ]
  },
  {
    id: 'requests',
    label: { ar: 'الطلبات والعمليات', en: 'Requests and operations' },
    items: [
      sidebarItem('requests', '/admin/requests', 'requests', 'كل الطلبات', 'All requests'),
      sidebarItem('customer-requests', '/admin/customer-requests', 'requests', 'طلبات العملاء', 'Customer requests'),
      sidebarItem('overdue-requests', '/admin/overdue-requests', 'requests', 'الطلبات المتأخرة', 'Overdue requests'),
      sidebarItem('contact-requests', '/admin/contact-requests', 'requests', 'طلبات التواصل', 'Contact requests'),
      sidebarItem('viewing-requests', '/admin/viewing-requests', 'requests', 'طلبات المعاينة', 'Viewing requests'),
      sidebarItem('search-requests', '/admin/search-requests', 'requests', 'طلبات البحث عن عقار', 'Property search requests'),
      sidebarItem('request-issues', '/admin/request-issues', 'requests', 'بلاغات ومشكلات الطلبات', 'Request issues')
    ]
  },
  {
    id: 'content',
    label: { ar: 'المحتوى والكوميونيتي', en: 'Content and community' },
    items: [
      sidebarItem('articles', '/admin/articles', 'content', 'المقالات', 'Articles'),
      sidebarItem('article-categories', '/admin/article-categories', 'content', 'تصنيفات المقالات', 'Article categories'),
      sidebarItem('community', '/admin/community', 'content', 'الكوميونيتي', 'Community', ['/admin/community']),
      sidebarItem('community-comments', '/admin/community/comments', 'content', 'التعليقات', 'Comments'),
      sidebarItem('community-reports', '/admin/community/moderation', 'requests', 'البلاغات', 'Reports'),
      sidebarItem('about', '/admin/content/about', 'content', 'النبذة عن المنصة', 'About the platform'),
      sidebarItem('team', '/admin/content/team', 'content', 'فريق العمل', 'Team'),
      sidebarItem('population', '/admin/content/population-counter', 'content', 'عدّاد سكان مدينة السادات', 'Sadat population counter')
    ]
  },
  {
    id: 'revenue',
    label: { ar: 'الإعلانات والمدفوعات', en: 'Advertising and payments' },
    items: [
      sidebarItem('advertising', '/admin/ads/requests', 'advertising', 'طلبات الإعلانات', 'Ad requests', ['/admin/ads/requests', '/admin/advertising']),
      sidebarItem('approved-proofs', '/admin/ads/payment-proofs/approved', 'advertising', 'إثباتات الدفع المعتمدة', 'Approved payment proofs'),
      sidebarItem('payment-review', '/admin/ads/payments/pending-review', 'advertising', 'مراجعة المدفوعات', 'Payment review'),
      sidebarItem('ad-calendar', '/admin/ads/calendar', 'advertising', 'تقويم الإعلانات', 'Ad calendar'),
      sidebarItem('payment-proofs', '/admin/ads/payment-proofs/pending', 'requests', 'إثباتات الدفع', 'Payment proofs'),
      sidebarItem('financial-review', '/admin/ads/financial-review', 'commissions', 'الملخص المالي', 'Financial summary'),
      sidebarItem('commission-policies', '/admin/commissions', 'commissions', 'سياسات العمولات', 'Commission policies'),
      sidebarItem('commission-assignments', '/admin/commissions/account', 'commissions', 'تعيين العمولات', 'Commission assignments'),
      sidebarItem('commission-exceptions', '/admin/commissions/exceptions', 'commissions', 'استثناءات العمولات', 'Commission exceptions'),
      sidebarItem('commission-confirmations', '/admin/commissions/confirmations', 'commissions', 'تأكيد السياسات', 'Policy confirmations')
    ]
  },
  {
    id: 'experience',
    label: { ar: 'تجربة المنصة', en: 'Platform experience' },
    items: [
      sidebarItem('banners', '/admin/banners', 'advertising', 'البانرات الإعلانية', 'Banners'),
      sidebarItem('tips', '/admin/content/tips', 'content', 'نصائح عقارات السادات', 'Property tips'),
      sidebarItem('homepage', '/admin/content/homepage', 'overview', 'إدارة الصفحة الرئيسية', 'Homepage management'),
      sidebarItem('contact-social', '/admin/settings/contact', 'notifications', 'بيانات التواصل والسوشيال', 'Contact and social'),
      sidebarItem('seo', '/admin/settings/seo', 'settings', 'إعدادات SEO', 'SEO settings')
    ]
  },
  {
    id: 'system',
    label: { ar: 'النظام', en: 'System' },
    items: [
      sidebarItem('admin-users', '/admin/admin-users', 'users', 'المستخدمون الإداريون', 'Admin users'),
      sidebarItem('roles', '/admin/roles', 'settings', 'الأدوار والصلاحيات', 'Roles and permissions'),
      sidebarItem('notifications', '/admin/notifications', 'notifications', 'إشعارات الإدارة', 'Admin notifications'),
      sidebarItem('audit', '/admin/audit-logs', 'requests', 'سجل الإجراءات', 'Action log'),
      sidebarItem('settings', '/admin/settings', 'settings', 'الإعدادات العامة', 'General settings', ['/admin/settings'])
    ]
  }
] as const;

export function AdminNavigation({ locale, activePath }: { readonly locale: SupportedLocale; readonly activePath: string }) {
  const copy = getAdminCopy(locale);
  const authClient = useContext(RouteShellAuthContext);
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
    <nav className="admin-dashboard__navigation" aria-label={copy.overview.eyebrow} data-testid="admin-sidebar">
      <div className="admin-dashboard__navigation-brand">
        <a href={localePath(locale, '/')} aria-label={locale === 'ar' ? 'عرض الموقع' : 'View website'}>
          <img src="/assets/sadat-real-estate-logo.png" alt={locale === 'ar' ? 'عقارات السادات' : 'Sadat Real Estate'} />
        </a>
      </div>
      <div className="admin-dashboard__navigation-scroll" ref={navigationScroll}>
        <div className="admin-dashboard__navigation-groups">
          {sidebarGroups.map(group => (
            <div className="admin-dashboard__navigation-group" key={group.id}>
              <button type="button" className="admin-dashboard__navigation-kicker" aria-expanded={!collapsedGroups.includes(group.id)} aria-controls={`admin-navigation-${group.id}`} onClick={() => toggleGroup(group.id)}>
                <span>{group.label[locale]}</span>
                <span aria-hidden="true">{collapsedGroups.includes(group.id) ? '+' : '−'}</span>
              </button>
              <ul id={`admin-navigation-${group.id}`} hidden={collapsedGroups.includes(group.id)}>
                {group.items.map(item => {
                  const active = item.id === activeItemId;
                  return (
                    <li key={item.id}>
                      <a href={localePath(locale, item.path)} aria-current={active ? 'page' : undefined} data-active={active || undefined}>
                        <span aria-hidden="true" className="admin-dashboard__navigation-icon">
                          <img src={navigationIconSources[item.icon]} alt="" width="17" height="17" />
                        </span>
                        <span>{item.label[locale]}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="admin-dashboard__navigation-mobile-actions">
          <button type="button" className="admin-dashboard__navigation-footer-link admin-dashboard__navigation-logout" onClick={signOut} disabled={signingOut} data-testid="admin-logout-button" aria-label={signingOut ? (locale === 'ar' ? 'جارٍ تسجيل الخروج…' : 'Signing out…') : (locale === 'ar' ? 'تسجيل الخروج' : 'Sign out')}>
            <img src="/assets/canonical/provider/navigation/logout.svg" alt="" width="17" height="17" />
            <span>{signingOut ? (locale === 'ar' ? 'جارٍ تسجيل الخروج…' : 'Signing out…') : (locale === 'ar' ? 'تسجيل الخروج' : 'Sign out')}</span>
          </button>
        </div>
      </div>
      <div className="admin-dashboard__navigation-footer">
        <div className="admin-dashboard__navigation-profile">
          <span className="admin-dashboard__navigation-profile-avatar" aria-hidden="true">{locale === 'ar' ? 'م' : 'A'}</span>
          <span><strong>{locale === 'ar' ? 'مدير النظام' : 'System administrator'}</strong><small>{locale === 'ar' ? 'حساب إداري' : 'Administrator account'}</small></span>
        </div>
        <a href={localePath(locale, '/')} className="admin-dashboard__navigation-footer-link">{locale === 'ar' ? 'عرض الموقع' : 'View website'}</a>
        <button type="button" className="admin-dashboard__navigation-footer-link admin-dashboard__navigation-logout" onClick={signOut} disabled={signingOut} data-testid="admin-logout-button" aria-label={signingOut ? (locale === 'ar' ? 'جارٍ تسجيل الخروج…' : 'Signing out…') : (locale === 'ar' ? 'تسجيل الخروج' : 'Sign out')}>
          <img src="/assets/canonical/provider/navigation/logout.svg" alt="" width="17" height="17" />
          {signingOut ? (locale === 'ar' ? 'جارٍ تسجيل الخروج…' : 'Signing out…') : (locale === 'ar' ? 'تسجيل الخروج' : 'Sign out')}
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

function MetricCard({ value, label, testId, icon = 'properties' }: { readonly value: number; readonly label: string; readonly testId?: string; readonly icon?: AdminSidebarIcon }) {
  return (
    <article className="admin-dashboard__metric" {...(testId === undefined ? {} : { 'data-testid': testId })}>
      <span className="admin-dashboard__metric-icon" aria-hidden="true"><img src={navigationIconSources[icon]} alt="" width="20" height="20" /></span>
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
        {metrics.map(metric => <MetricCard key={metric} icon={metric === 'users' || metric === 'seekers' ? 'users' : metric === 'providers' || metric === 'verifiedProviders' ? 'providers' : metric === 'publishedProperties' ? 'properties' : 'requests'} value={data[metric]} label={copy.overview.metrics[metric]} testId={`admin-metric-${metric}`} />)}
      </div>
    </section>
  );
}

function PlaceholderMetricSection({ title, labels, unavailable }: { readonly title: string; readonly labels: readonly string[]; readonly unavailable: string }) {
  return (
    <section className="admin-dashboard__metric-section" aria-labelledby={`admin-${title.replaceAll(' ', '-').toLowerCase()}-title`}>
      <div className="admin-dashboard__section-heading">
        <h2 id={`admin-${title.replaceAll(' ', '-').toLowerCase()}-title`}>{title}</h2>
      </div>
      <div className="admin-dashboard__metric-grid">
        {labels.map(label => <UnavailableCard key={label} label={label} unavailable={unavailable} />)}
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
    },
    {
      title: copy.nav.requests,
      cards: [
        { label: copy.overview.metrics.openRequests, value: data.metrics.openRequests },
        { label: copy.overview.metrics.pendingReviews, value: data.metrics.pendingReviews },
        { label: copy.nav.notifications },
        { label: copy.nav.audit }
      ]
    }
  ] as const;

  const quickActions = navigationItems.slice(1, 9);

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
        {[copy.nav.notifications, copy.nav.audit].map(title => (
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
  const extraMetricSections = locale === 'ar' ? [
    { title: 'المحتوى والمجتمع', labels: ['المقالات المنشورة', 'المنشورات المجتمعية', 'التعليقات', 'بلاغات المحتوى'] },
    { title: 'الإعلانات والإيرادات', labels: ['طلبات الإعلانات', 'إثباتات الدفع', 'الإعلانات النشطة', 'إجمالي الإيرادات'] }
  ] : [
    { title: 'Content and community', labels: ['Published articles', 'Community posts', 'Comments', 'Content reports'] },
    { title: 'Advertising and revenue', labels: ['Ad requests', 'Payment proofs', 'Active ads', 'Total revenue'] }
  ];
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
        <div className="admin-dashboard__heading-actions">
          {headingActions.map(([label, path], index) => <a className={`ui-button ui-button--${index < 2 ? 'primary' : 'secondary'} ui-button--xs`} key={path} href={localePath(locale, path)}>{label}</a>)}
        </div>
      </div>
      <MetricSection title={copy.overview.platformTitle} metrics={platformMetrics} data={data.metrics} locale={locale} />
      <MetricSection title={copy.overview.operationsTitle} metrics={operationMetrics} data={data.metrics} locale={locale} />
      {extraMetricSections.map(section => <PlaceholderMetricSection key={section.title} title={section.title} labels={section.labels} unavailable={copy.unavailable} />)}
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
