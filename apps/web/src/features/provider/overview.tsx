import { useEffect, useMemo, useState } from 'react';
import type { PropertyData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { StateMessage } from '../design_system/index.ts';
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
  ['projects', '/provider/projects'],
  ['requests', '/provider/customer-requests'],
  ['viewings', '/provider/viewings'],
  ['advertising', '/provider/ads'],
  ['commission', '/provider/commission'],
  ['notifications', '/provider/notifications'],
  ['settings', '/provider/settings']
] as const;

const navigationIcons: Readonly<Record<(typeof navigationItems)[number][0], string>> = {
  commission: '%',
  overview: '⌂',
  properties: '▣',
  projects: '◆',
  requests: '◫',
  viewings: '◷',
  advertising: '◇',
  notifications: '♧',
  settings: '⚙'
};

export function ProviderNavigation({ locale, activePath }: { readonly locale: SupportedLocale; readonly activePath: string }) {
  const copy = getProviderCopy(locale);
  return (
    <nav className="provider-dashboard__navigation" aria-label={copy.overview.eyebrow}>
      <span className="provider-dashboard__navigation-title">{copy.overview.eyebrow}</span>
      <ul>
        {navigationItems.map(([id, path]) => {
          const active = activePath === path || (id !== 'overview' && activePath.startsWith(path));
          return (
            <li key={id}>
              <a href={localeForProviderPath(locale, path)} aria-current={active ? 'page' : undefined} data-active={active || undefined}>
                <span aria-hidden="true" className="provider-dashboard__navigation-icon">{navigationIcons[id]}</span>
                <span>{copy.nav[id]}</span>
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
  return (
    <ul className="provider-dashboard__property-list" aria-label={copy.overview.recentTitle}>
      {data.properties.recent.map(property => (
        <li key={property.id} className="provider-dashboard__property-row">
          <div>
            <h3>{localizedValue(property.name, locale)}</h3>
            <p>{copy.propertyStatuses[property.status]} · {statusDate(property.updatedAt, locale)}</p>
          </div>
          <a href={localeForProviderPath(locale, `/provider/properties/${property.id}`)}>{copy.overview.openProperty}</a>
        </li>
      ))}
    </ul>
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
          <MetricCard label={copy.overview.cards.drafts} value={numberFormat.format(data.properties.drafts)} tone="drafts" />
          <MetricCard label={copy.overview.unavailableMetric} value={copy.unavailable} tone="unavailable" unavailable unavailableBody={copy.overview.unavailableMetricBody} />
        </div>
      </section>
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
