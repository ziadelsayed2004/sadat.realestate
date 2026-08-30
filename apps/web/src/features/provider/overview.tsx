import { useEffect, useMemo, useState } from 'react';
import type { PropertyData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { Badge, StateMessage } from '../design_system/index.ts';
import { getProviderCopy, type ProviderOverviewBaseState } from './copy.ts';
import {
  createProviderOverviewLoader,
  type ProviderAuthorizationSource,
  type ProviderOverviewData,
  type ProviderOverviewLoader
} from './data.ts';
import './styles.css';

export type ProviderOverviewViewState = ProviderOverviewBaseState;

export interface ProviderOverviewProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: ProviderAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: ProviderOverviewData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: ProviderOverviewLoader | undefined;
}

function stateForError(error: unknown): Exclude<ProviderOverviewViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForData(data: ProviderOverviewData): ProviderOverviewViewState {
  return data.application.status === 'approved' && data.properties.total === 0 ? 'empty' : 'success';
}

function localeForProviderPath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function localizedValue(value: PropertyData['name'], locale: SupportedLocale): string {
  return value[locale] ?? value.ar ?? value.en ?? value['zh-CN'] ?? '—';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ProviderOverviewViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getProviderCopy(locale);
  const message = copy.states[state];
  return (
    <section className="provider-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <button type="button" className="provider-dashboard__secondary-action" onClick={onRetry}>{copy.retry}</button> : null}
    </section>
  );
}

const navigationItems = [
  ['overview', '/provider'],
  ['properties', '/provider/properties'],
  ['addProperty', '/provider/properties/new/basic'],
  ['projects', '/provider/projects'],
  ['requests', '/provider/customer-requests'],
  ['advertising', '/provider/ads'],
  ['commission', '/provider/commission'],
  ['notifications', '/provider/notifications'],
  ['settings', '/provider/settings']
] as const;

type ProviderNavigationIcon = Readonly<{ readonly default: string; readonly active: string }>;

const providerNavigationAssetRoot = '/assets/canonical/provider/navigation';
const providerNavigationIconContainerStyle = { display: 'inline-flex', flex: '0 0 19px', width: 19, height: 19, alignItems: 'center', justifyContent: 'center' } as const;
const providerNavigationIconStyle = { display: 'block', width: 19, height: 19, objectFit: 'contain', pointerEvents: 'none' } as const;
const navigationIcons: Readonly<Record<(typeof navigationItems)[number][0], ProviderNavigationIcon>> = {
  overview: { default: `${providerNavigationAssetRoot}/overview.svg`, active: `${providerNavigationAssetRoot}/overview-active.svg` },
  properties: { default: `${providerNavigationAssetRoot}/properties.svg`, active: `${providerNavigationAssetRoot}/properties-active.svg` },
  addProperty: { default: `${providerNavigationAssetRoot}/add-property.svg`, active: `${providerNavigationAssetRoot}/add-property-active.svg` },
  projects: { default: `${providerNavigationAssetRoot}/projects.svg`, active: `${providerNavigationAssetRoot}/projects-active.svg` },
  requests: { default: `${providerNavigationAssetRoot}/requests.svg`, active: `${providerNavigationAssetRoot}/requests-active.svg` },
  advertising: { default: `${providerNavigationAssetRoot}/advertising.svg`, active: `${providerNavigationAssetRoot}/advertising-active.svg` },
  commission: { default: `${providerNavigationAssetRoot}/commission.svg`, active: `${providerNavigationAssetRoot}/commission-active.svg` },
  notifications: { default: `${providerNavigationAssetRoot}/notifications.svg`, active: `${providerNavigationAssetRoot}/notifications-active.svg` },
  settings: { default: `${providerNavigationAssetRoot}/settings.svg`, active: `${providerNavigationAssetRoot}/settings-active.svg` }
};

function navigationLabel(copy: ReturnType<typeof getProviderCopy>, id: (typeof navigationItems)[number][0]): string {
  return id === 'addProperty' ? copy.overview.addProperty : copy.nav[id];
}

function navigationItemIsActive(id: (typeof navigationItems)[number][0], path: string, activePath: string): boolean {
  if (id === 'overview') return activePath === path;
  if (id === 'properties') return activePath === path || (activePath.startsWith('/provider/properties/') && !activePath.startsWith('/provider/properties/new/'));
  if (id === 'addProperty') return activePath === path;
  if (id === 'requests') return activePath.startsWith(path) || activePath === '/provider/viewings';
  return activePath.startsWith(path);
}

export function ProviderNavigation({ locale, activePath }: { readonly locale: SupportedLocale; readonly activePath: string }) {
  const copy = getProviderCopy(locale);
  return (
    <nav className="provider-dashboard__navigation" aria-label={copy.overview.eyebrow}>
      <span className="provider-dashboard__navigation-title">{copy.overview.eyebrow}</span>
      <ul>
        {navigationItems.map(([id, path]) => {
          const active = navigationItemIsActive(id, path, activePath);
          const icon = navigationIcons[id];
          return (
            <li key={id}>
              <a href={localeForProviderPath(locale, path)} aria-current={active ? 'page' : undefined} data-active={active ? 'true' : undefined}>
                <span aria-hidden="true" className="provider-dashboard__navigation-icon" style={providerNavigationIconContainerStyle}>
                  <img src={active ? icon.active : icon.default} alt="" width={19} height={19} style={providerNavigationIconStyle} />
                </span>
                <span>{navigationLabel(copy, id)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MetricCard({ label, value, tone, unavailable, unavailableBody }: { readonly label: string; readonly value: number | string; readonly tone: string; readonly unavailable?: boolean; readonly unavailableBody?: string }) {
  return (
    <article className={`provider-dashboard__metric provider-dashboard__metric--${tone}`} data-testid={`provider-summary-${tone}`}>
      <span className="provider-dashboard__metric-icon" aria-hidden="true">{unavailable ? '—' : '•'}</span>
      <strong>{value}</strong>
      <span>{label}</span>
      {unavailableBody ? <small>{unavailableBody}</small> : null}
    </article>
  );
}

function DashboardInsights({ locale }: { readonly locale: SupportedLocale }) {
  const copy = getProviderCopy(locale);
  const chart = copy.overview.chart ?? { title: copy.overview.summaryTitle, unavailable: copy.overview.unavailableMetricBody };
  const actions = copy.overview.quickActions ?? {
    title: copy.overview.summaryTitle,
    properties: copy.nav.properties,
    addProperty: copy.overview.addProperty,
    requests: copy.nav.requests,
    settings: copy.nav.settings
  };
  return (
    <section className="provider-dashboard__insights" aria-label={chart.title}>
      <div className="provider-dashboard__chart provider-dashboard__empty" data-state="unavailable" aria-labelledby="provider-dashboard-chart-title">
        <h2 id="provider-dashboard-chart-title">{chart.title}</h2>
        <div className="provider-dashboard__chart-placeholder provider-dashboard__empty" role="status">
          <span aria-hidden="true">—</span>
          <p>{chart.unavailable}</p>
        </div>
      </div>
      <div className="provider-dashboard__quick-actions provider-dashboard__empty" aria-labelledby="provider-dashboard-quick-actions-title">
        <h2 id="provider-dashboard-quick-actions-title">{actions.title}</h2>
        <ul>
          <li><a href={localeForProviderPath(locale, '/provider/properties')}>{actions.properties}<span aria-hidden="true">‹</span></a></li>
          <li><a href={localeForProviderPath(locale, '/provider/properties/new/basic')}>{actions.addProperty}<span aria-hidden="true">‹</span></a></li>
          <li><a href={localeForProviderPath(locale, '/provider/customer-requests')}>{actions.requests}<span aria-hidden="true">‹</span></a></li>
          <li><a href={localeForProviderPath(locale, '/provider/settings')}>{actions.settings}<span aria-hidden="true">‹</span></a></li>
        </ul>
      </div>
    </section>
  );
}

function ApplicationStatusPanel({ data, locale }: { readonly data: ProviderOverviewData; readonly locale: SupportedLocale }) {
  const copy = getProviderCopy(locale);
  const application = data.application;
  if (application.status === 'approved') return null;
  const canContinue = application.status === 'draft' || application.status === 'needs_information';
  const message = copy.application[application.status];
  return (
    <section className="provider-dashboard__application-status" data-provider-status={application.status} aria-labelledby="provider-application-status-title">
      <p className="provider-dashboard__eyebrow">{copy.overview.eyebrow}</p>
      <h1 id="provider-application-status-title">{message.title}</h1>
      <p>{message.body}</p>
      {application.reviewReason ? <p className="provider-dashboard__review-reason"><strong>{copy.reviewReason}</strong> {application.reviewReason}</p> : null}
      {canContinue ? <a className="provider-dashboard__primary-action" href={localeForProviderPath(locale, '/provider-application')}>{copy.continueApplication}</a> : null}
    </section>
  );
}

function statusDate(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function RecentProperties({ data, locale }: { readonly data: ProviderOverviewData; readonly locale: SupportedLocale }) {
  const copy = getProviderCopy(locale);
  if (data.properties.total === 0) {
    return <div className="provider-dashboard__empty" data-state="empty"><h3>{copy.overview.recentEmptyTitle}</h3><p>{copy.overview.recentEmptyBody}</p></div>;
  }
  const columns = copy.overview.recentColumns ?? {
    code: 'Code',
    property: copy.overview.recentTitle,
    status: copy.overview.summaryTitle,
    views: copy.overview.unavailableMetric,
    updated: copy.overview.recentTitle
  };
  return (
    <div className="provider-dashboard__recent-table-wrap provider-properties__table-wrap">
      <table className="provider-dashboard__recent-table provider-properties__table" aria-label={copy.overview.recentTitle}>
        <thead>
          <tr><th scope="col">{columns.code}</th><th scope="col">{columns.property}</th><th scope="col">{columns.status}</th><th scope="col">{columns.views}</th><th scope="col">{columns.updated}</th></tr>
        </thead>
        <tbody>
          {data.properties.recent.map(property => (
            <tr key={property.id}>
              <td><code>{property.slug}</code></td>
              <td><strong>{localizedValue(property.name, locale)}</strong></td>
              <td><Badge tone="success">{copy.propertyStatuses[property.status]}</Badge></td>
              <td><span className="provider-dashboard__unavailable-value">{copy.unavailable}</span></td>
              <td><time dateTime={property.updatedAt}>{statusDate(property.updatedAt, locale)}</time></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewContent({ data, locale }: { readonly data: ProviderOverviewData; readonly locale: SupportedLocale }) {
  const copy = getProviderCopy(locale);
  const numberFormat = new Intl.NumberFormat(locale);
  return (
    <>
      <div className="provider-dashboard__heading-row">
        <div>
          <p className="provider-dashboard__eyebrow">{copy.overview.eyebrow}</p>
          <h1>{copy.overview.title}</h1>
          <p>{copy.overview.description}</p>
        </div>
        <a className="provider-dashboard__primary-action" href={localeForProviderPath(locale, '/provider/properties/new/basic')}>{copy.overview.addProperty}</a>
      </div>
      <section className="provider-dashboard__summary" aria-labelledby="provider-summary-title">
        <div className="provider-dashboard__section-heading"><h2 id="provider-summary-title">{copy.overview.summaryTitle}</h2></div>
        <div className="provider-dashboard__metric-grid">
          <MetricCard label={copy.overview.cards.total} value={numberFormat.format(data.properties.total)} tone="total" />
          <MetricCard label={copy.overview.cards.published} value={numberFormat.format(data.properties.published)} tone="published" />
          <MetricCard label={copy.overview.cards.pending} value={numberFormat.format(data.properties.pendingReview)} tone="pending" />
          <MetricCard label={copy.overview.additionalCards?.needsChanges ?? copy.overview.unavailableMetric} value={numberFormat.format(data.properties.needsChanges)} tone="needs-changes" />
          <MetricCard label={copy.overview.additionalCards?.customerRequests ?? copy.overview.unavailableMetric} value={copy.unavailable} tone="customer-requests" unavailable unavailableBody={copy.overview.unavailableMetricBody} />
          <MetricCard label={copy.overview.additionalCards?.views ?? copy.overview.unavailableMetric} value={copy.unavailable} tone="views" unavailable unavailableBody={copy.overview.unavailableMetricBody} />
          <MetricCard label={copy.overview.cards.drafts} value={numberFormat.format(data.properties.drafts)} tone="drafts" />
          <MetricCard label={copy.overview.additionalCards?.booked ?? copy.overview.unavailableMetric} value={copy.unavailable} tone="booked" unavailable unavailableBody={copy.overview.unavailableMetricBody} />
        </div>
      </section>
      <DashboardInsights locale={locale} />
      <section className="provider-dashboard__recent" aria-labelledby="provider-recent-title">
        <div className="provider-dashboard__section-heading"><h2 id="provider-recent-title">{copy.overview.recentTitle}</h2></div>
        <RecentProperties data={data} locale={locale} />
      </section>
    </>
  );
}

export function ProviderOverview({ locale, session, authClient, apiOrigin, initialData, initialState = 'loading', load }: ProviderOverviewProps) {
  const source = useMemo(() => load ?? createProviderOverviewLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const [state, setState] = useState<ProviderOverviewViewState>(() => initialData === undefined ? initialState : stateForData(initialData));
  const [data, setData] = useState<ProviderOverviewData | undefined>(initialData);
  const [attempt, setAttempt] = useState(0);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const path = typeof window === 'undefined' ? '/provider' : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'provider') {
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
    <section className="provider-dashboard" data-screen-id="PRV-01" data-route="/provider" data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath={path} />
      <div className="provider-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? (
          data.application.status === 'approved' ? <OverviewContent data={data} locale={locale} /> : <ApplicationStatusPanel data={data} locale={locale} />
        ) : null}
      </div>
    </section>
  );
}
