import { useEffect, useMemo, useState } from 'react';
import type { SupportedLocale, PropertyData } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { getProviderCopy, ProviderNavigation } from '../provider/index.ts';
import type { ProviderPropertyAuthClient, ProviderPropertyLoadAction } from './wizard.tsx';
import { loadProviderProperty } from './data.ts';
import { getProviderPropertyCopy } from './copy.ts';
import { getProviderPropertyStateCopy, type ProviderPropertyStateStatus } from './state-copy.ts';
import './styles.css';

export type ProviderPropertyStateRoute = 'submitted' | 'rejected' | 'published';

export interface ProviderPropertyStatePageProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly route: ProviderPropertyStateRoute;
  readonly propertyId: string;
  readonly authClient?: ProviderPropertyAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: PropertyData | undefined;
  readonly load?: ProviderPropertyLoadAction | undefined;
}

type ViewState = 'loading' | 'success' | 'retry' | 'error' | 'permission' | 'not_found';

const ROUTE_SCREEN_IDS: Readonly<Record<ProviderPropertyStateRoute, string>> = {
  submitted: 'PRV-12',
  rejected: 'PRV-13',
  published: 'PRV-14'
};

function errorState(error: unknown): Exclude<ViewState, 'loading' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function stateStatus(property: PropertyData, route: ProviderPropertyStateRoute): ProviderPropertyStateStatus | undefined {
  if (route === 'submitted') return property.status === 'pending_review' ? property.status : undefined;
  if (route === 'rejected') return property.status === 'rejected' ? property.status : undefined;
  if (property.status === 'approved' || property.status === 'published' || property.status === 'hidden') return property.status;
  return undefined;
}

function dateLabel(value: string | undefined, locale: SupportedLocale): string {
  if (value === undefined) return getProviderPropertyStateCopy(locale).labels.unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getProviderPropertyStateCopy(locale).labels.unavailable;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ViewState, 'loading' | 'success'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getProviderPropertyCopy(locale);
  const message = state === 'not_found' ? copy.states.not_found : copy.states[state];
  return (
    <section className="provider-property-state__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state === 'not_found' ? 'error' : state} title={message.title} message={message.body} retryLabel={copy.retry} onRetry={state === 'retry' ? onRetry : undefined} />
      {state === 'error' || state === 'not_found' ? <Button type="button" variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function StatusContent({ locale, property, route }: { readonly locale: SupportedLocale; readonly property: PropertyData; readonly route: ProviderPropertyStateRoute }) {
  const propertyCopy = getProviderPropertyCopy(locale);
  const providerCopy = getProviderCopy(locale);
  const copy = getProviderPropertyStateCopy(locale);
  const status = stateStatus(property, route);
  if (status === undefined) return null;
  const statusCopy = copy.statuses[status];
  const propertyName = property.name[locale] ?? property.name.en ?? property.name.ar ?? property.slug;
  const reviewDate = property.reviewedAt ?? property.publishedAt;
  const editAvailable = property.availableActions.includes('update');
  const viewPropertyHref = localePath(locale, `/provider/properties/${encodeURIComponent(property.id)}/review`);
  const editHref = localePath(locale, `/provider/properties/${encodeURIComponent(property.id)}/location`);
  const publicHref = localePath(locale, `/properties/${encodeURIComponent(property.slug)}`);

  return (
    <main className="provider-property-state__main" aria-labelledby="provider-property-state-title">
      <div className="provider-property-state__intro">
        <p className="provider-dashboard__eyebrow">{propertyCopy.navLabel}</p>
        <h1 id="provider-property-state-title">{statusCopy.title}</h1>
        <p>{statusCopy.body}</p>
      </div>
      <section className="provider-property-state__card" aria-labelledby="provider-property-state-summary">
        <h2 id="provider-property-state-summary">{propertyName}</h2>
        <dl className="provider-property-state__summary">
          <div><dt>{copy.labels.reference}</dt><dd>{property.id}</dd></div>
          <div><dt>{copy.labels.status}</dt><dd data-property-status={property.status}>{propertyCopy.wizard.statusLabels[property.status]}</dd></div>
          <div><dt>{copy.labels.submittedAt}</dt><dd>{dateLabel(property.submittedAt, locale)}</dd></div>
          <div><dt>{copy.labels.reviewedAt}</dt><dd>{dateLabel(reviewDate, locale)}</dd></div>
          {status === 'published' ? <div><dt>{copy.labels.views}</dt><dd data-value="unavailable">{copy.labels.unavailable}</dd></div> : null}
        </dl>
      </section>
      <section className={`provider-property-state__notice provider-property-state__notice--${status}`} aria-labelledby="provider-property-state-reason">
        <h2 id="provider-property-state-reason">{statusCopy.reasonLabel}</h2>
        <p>{property.reviewReason ?? statusCopy.reasonUnavailable}</p>
      </section>
      <section className="provider-property-state__safe" aria-labelledby="provider-property-state-safe-title">
        <h2 id="provider-property-state-safe-title">{copy.labels.safeTitle}</h2>
        <p>{copy.labels.safeBody}</p>
      </section>
      <div className="provider-property-state__actions">
        <a className="provider-dashboard__secondary-action" href={localePath(locale, '/provider/properties')}>{copy.actions.back}</a>
        {status === 'published' ? <a className="provider-dashboard__primary-action" href={publicHref}>{copy.actions.viewPublic}</a> : null}
        {status === 'pending_review' ? <a className="provider-dashboard__primary-action" href={viewPropertyHref}>{copy.actions.viewProperty}</a> : null}
        {status === 'rejected' && editAvailable ? <a className="provider-dashboard__primary-action" href={editHref}>{providerCopy.properties.edit}</a> : null}
      </div>
      {status === 'rejected' && !editAvailable ? <p className="provider-property-state__unavailable" role="status">{copy.actions.supportUnavailable}</p> : null}
    </main>
  );
}

export function ProviderPropertyStatePage({ locale, session, route, propertyId, authClient, apiOrigin, initialData, load }: ProviderPropertyStatePageProps) {
  const initialStatus = initialData === undefined ? undefined : stateStatus(initialData, route);
  const [state, setState] = useState<ViewState>(initialData === undefined ? 'loading' : initialStatus === undefined ? 'error' : 'success');
  const [property, setProperty] = useState<PropertyData | undefined>(initialStatus === undefined ? undefined : initialData);
  const [attempt, setAttempt] = useState(0);
  const loadAction = useMemo(() => load ?? ((id: string) => loadProviderProperty({ propertyId: id, apiOrigin, authorization: authClient })), [apiOrigin, authClient, load]);
  const screenId = ROUTE_SCREEN_IDS[route];
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (session.status !== 'authenticated' || session.role !== 'provider') {
      setState('permission');
      setProperty(undefined);
      return undefined;
    }
    if (initialData !== undefined && attempt === 0) {
      if (stateStatus(initialData, route) === undefined) {
        setProperty(undefined);
        setState('error');
        return undefined;
      }
      setProperty(initialData);
      setState('success');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    setProperty(undefined);
    void loadAction(propertyId).then(next => {
      if (controller.signal.aborted) return;
      if (stateStatus(next, route) === undefined) {
        setProperty(undefined);
        setState('error');
        return;
      }
      setProperty(next);
      setState('success');
    }).catch(error => {
      if (!controller.signal.aborted) setState(errorState(error));
    });
    return () => controller.abort();
  }, [attempt, initialData, loadAction, propertyId, route, sessionRole, session.status]);

  return (
    <section className="provider-dashboard provider-property-state" data-screen-id={screenId} data-route={`/provider/properties/${encodeURIComponent(propertyId)}/${route}`} data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath="/provider/properties" authClient={authClient} />
      <div className="provider-dashboard__content provider-property-state__content">
        {state === 'loading' ? <StateMessage state="loading" title={getProviderPropertyCopy(locale).states.loading.title} message={getProviderPropertyCopy(locale).states.loading.body} /> : null}
        {state === 'retry' || state === 'error' || state === 'permission' || state === 'not_found' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'success' && property !== undefined ? <StatusContent locale={locale} property={property} route={route} /> : null}
      </div>
    </section>
  );
}
