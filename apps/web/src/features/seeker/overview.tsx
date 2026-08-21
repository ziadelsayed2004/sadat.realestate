import { useEffect, useMemo, useState } from 'react';
import type { SeekerOverviewData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { getSeekerCopy } from './copy.ts';
import { createSeekerOverviewLoader, localeForSeekerPath, type SeekerAuthorizationSource, type SeekerOverviewLoader } from './data.ts';
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

export function SeekerNavigation({ locale, activePath }: { readonly locale: SupportedLocale; readonly activePath: string }) {
  const copy = getSeekerCopy(locale);
  const items = [
    ['overview', '/seeker'],
    ['requests', '/seeker/requests'],
    ['viewings', '/seeker/viewings'],
    ['saved', '/seeker/saved'],
    ['notifications', '/seeker/notifications'],
    ['profile', '/seeker/profile?tab=preferences'],
    ['settings', '/seeker/settings']
  ] as const;
  return (
    <nav className="seeker-dashboard__nav" aria-label={copy.overview.eyebrow}>
      <span className="seeker-dashboard__nav-title">{copy.overview.eyebrow}</span>
      <ul>
        {items.map(([id, path]) => {
          const active = activePath === path || (id === 'profile' && activePath.startsWith('/seeker/profile'));
          return (
            <li key={id}>
              <a href={localeForSeekerPath(locale, path)} aria-current={active ? 'page' : undefined} data-active={active || undefined}>
                <span aria-hidden="true" className="seeker-dashboard__nav-icon">{id === 'overview' ? '⌂' : id === 'requests' ? '▤' : id === 'viewings' ? '◷' : id === 'saved' ? '♡' : id === 'notifications' ? '♧' : id === 'profile' ? '♙' : '⚙'}</span>
                <span>{copy.nav[id]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SummaryCard({ label, value, tone, testId }: { readonly label: string; readonly value: number; readonly tone: string; readonly testId: string }) {
  return (
    <article className={`seeker-dashboard__summary-card seeker-dashboard__summary-card--${tone}`} data-testid={testId}>
      <span className="seeker-dashboard__summary-icon" aria-hidden="true">{tone === 'requests' ? '▤' : tone === 'viewings' ? '◷' : tone === 'saved' ? '♡' : '♧'}</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function OverviewContent({ data, locale }: { readonly data: SeekerOverviewData; readonly locale: SupportedLocale }) {
  const copy = getSeekerCopy(locale);
  const empty = isEmpty(data);
  return (
    <>
      <div className="seeker-dashboard__heading-row">
        <div>
          <p className="seeker-dashboard__eyebrow">{copy.overview.eyebrow}</p>
          <h1>{copy.overview.title}</h1>
          <p>{copy.overview.description}</p>
        </div>
        <a className="seeker-dashboard__primary-link" href={localeForSeekerPath(locale, '/properties')}>
          <span aria-hidden="true">⌕</span>
          {copy.overview.searchProperties}
        </a>
      </div>
      <section className="seeker-dashboard__summary" aria-labelledby="seeker-summary-title">
        <div className="seeker-dashboard__section-heading"><h2 id="seeker-summary-title">{copy.overview.summaryTitle}</h2><Badge tone="brand">{copy.active}</Badge></div>
        <div className="seeker-dashboard__summary-grid">
          <SummaryCard label={copy.overview.cards.requests} value={data.requests} tone="requests" testId="seeker-summary-requests" />
          <SummaryCard label={copy.overview.cards.viewings} value={data.viewings} tone="viewings" testId="seeker-summary-viewings" />
          <SummaryCard label={copy.overview.cards.savedProperties} value={data.savedProperties} tone="saved" testId="seeker-summary-saved" />
          <SummaryCard label={copy.overview.cards.notifications} value={data.unreadNotifications} tone="notifications" testId="seeker-summary-notifications" />
        </div>
      </section>
      <section className="seeker-dashboard__activity" aria-labelledby="seeker-activity-title">
        <div className="seeker-dashboard__section-heading"><h2 id="seeker-activity-title">{copy.overview.activityTitle}</h2></div>
        {empty ? (
          <div className="seeker-dashboard__empty" data-state="empty"><h3>{copy.overview.emptyTitle}</h3><p>{copy.overview.emptyBody}</p></div>
        ) : (
          <div className="seeker-dashboard__unavailable" data-state="success">
            <h3>{copy.overview.unavailableTitle}</h3>
            <p>{copy.overview.unavailableBody}</p>
            <p className="seeker-dashboard__activity-note">{copy.overview.activityBody}</p>
          </div>
        )}
      </section>
    </>
  );
}

export function SeekerOverview({ locale, session, authClient, apiOrigin, initialData, initialState = 'loading', load }: SeekerOverviewProps) {
  const source = useMemo(() => load ?? createSeekerOverviewLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const [state, setState] = useState<SeekerOverviewViewState>(() => initialData === undefined ? initialState : isEmpty(initialData) ? 'empty' : 'success');
  const [data, setData] = useState<SeekerOverviewData | undefined>(initialData);
  const [attempt, setAttempt] = useState(0);
  const path = typeof window === 'undefined' ? '/seeker' : new URL(window.location.href).pathname;

  useEffect(() => {
    if (session.status !== 'authenticated') {
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
  }, [attempt, initialData, session.status, source]);

  return (
    <section className="seeker-dashboard" data-screen-id="SEK-01" data-route="/seeker">
      <SeekerNavigation locale={locale} activePath={path} />
      <div className="seeker-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? <OverviewContent data={data} locale={locale} /> : null}
      </div>
    </section>
  );
}
