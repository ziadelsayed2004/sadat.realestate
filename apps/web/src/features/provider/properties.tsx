import { useEffect, useMemo, useState } from 'react';
import { PROPERTY_STATUSES, type PropertyData, type PropertyStatus, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Pagination, StateMessage, type BadgeTone } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { getProviderCopy, type ProviderOverviewBaseState } from './copy.ts';
import {
  createProviderPropertiesLoader,
  type ProviderAuthorizationSource,
  type ProviderPropertiesData,
  type ProviderPropertiesLoader,
  type ProviderPropertiesQuery
} from './data.ts';
import { ProviderNavigation } from './overview.tsx';
import './styles.css';

export type ProviderPropertiesViewState = ProviderOverviewBaseState;
export type ProviderPropertyStatusFilter = PropertyStatus | 'all';

export interface ProviderPropertiesProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: ProviderAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly load?: ProviderPropertiesLoader | undefined;
}

function stateForError(error: unknown): Exclude<ProviderPropertiesViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function localeForProviderPath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function localizedValue(value: PropertyData['name'], locale: SupportedLocale): string {
  return value[locale] ?? value.ar ?? value.en ?? '—';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function priceLabel(property: PropertyData, locale: SupportedLocale, unavailable: string): string {
  if (property.price === undefined) return unavailable;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(property.price.amount)} ${property.price.currency}`;
}

function statusTone(status: PropertyStatus): BadgeTone {
  if (status === 'published' || status === 'approved') return 'success';
  if (status === 'pending_review' || status === 'needs_changes') return 'warning';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'info';
  return 'neutral';
}

function statusPath(property: PropertyData): string {
  const propertyId = encodeURIComponent(property.id);
  if (property.status === 'rejected') return `/provider/properties/${propertyId}/rejected`;
  if (property.status === 'pending_review') return `/provider/properties/${propertyId}/submitted`;
  if (property.status === 'approved' || property.status === 'published' || property.status === 'hidden') return `/provider/properties/${propertyId}/published`;
  return `/provider/properties/${propertyId}/review`;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ProviderPropertiesViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getProviderCopy(locale);
  const message = copy.states[state];
  return (
    <section className="provider-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function PropertyStatusBadge({ status, locale }: { readonly status: PropertyStatus; readonly locale: SupportedLocale }) {
  const copy = getProviderCopy(locale);
  return <Badge tone={statusTone(status)} data-property-status={status}>{copy.propertyStatuses[status]}</Badge>;
}

function PropertyActions({ property, locale }: { readonly property: PropertyData; readonly locale: SupportedLocale }) {
  const copy = getProviderCopy(locale);
  const name = localizedValue(property.name, locale);
  const editHref = localeForProviderPath(locale, `/provider/properties/${encodeURIComponent(property.id)}/location`);
  const viewHref = localeForProviderPath(locale, statusPath(property));
  return (
    <div className="provider-properties__actions">
      <a href={viewHref} aria-label={`${copy.properties.view}: ${name}`}>{copy.properties.view}</a>
      {property.availableActions.includes('update') ? <a href={editHref} aria-label={`${copy.properties.edit}: ${name}`}>{copy.properties.edit}</a> : null}
      {property.availableActions.includes('submit') ? <a href={localeForProviderPath(locale, `/provider/properties/${encodeURIComponent(property.id)}/review`)} aria-label={`${copy.properties.submit}: ${name}`}>{copy.properties.submit}</a> : null}
    </div>
  );
}

function PropertyRow({ property, locale }: { readonly property: PropertyData; readonly locale: SupportedLocale }) {
  const copy = getProviderCopy(locale);
  const name = localizedValue(property.name, locale);
  const hasReviewReason = property.reviewReason !== undefined && (property.status === 'needs_changes' || property.status === 'rejected');
  return (
    <tr data-testid={`provider-property-${property.id}`} data-property-status={property.status}>
      <td>
        <div className="provider-properties__identity">
          <strong>{name}</strong>
          <span>{property.slug}</span>
          {hasReviewReason ? <small className="provider-properties__reason"><strong>{copy.properties.reason}</strong> {property.reviewReason}</small> : null}
        </div>
      </td>
      <td><PropertyStatusBadge status={property.status} locale={locale} /></td>
      <td>{copy.properties.kindLabels[property.kind]} / {copy.properties.transactionLabels[property.transactionType]}</td>
      <td>{priceLabel(property, locale, copy.unavailable)}</td>
      <td><time dateTime={property.updatedAt}>{dateLabel(property.updatedAt, locale)}</time></td>
      <td><PropertyActions property={property} locale={locale} /></td>
    </tr>
  );
}

function FilterBar({ locale, status, searchInput, onStatusChange, onSearchInputChange, onSubmit, onClear }: {
  readonly locale: SupportedLocale;
  readonly status: ProviderPropertyStatusFilter;
  readonly searchInput: string;
  readonly onStatusChange: (status: ProviderPropertyStatusFilter) => void;
  readonly onSearchInputChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
}) {
  const copy = getProviderCopy(locale);
  return (
    <form className="provider-properties__filters" role="search" aria-label={copy.properties.filtersLabel} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="provider-properties__field">
        <label htmlFor="provider-properties-search">{copy.properties.searchLabel}</label>
        <input id="provider-properties-search" type="search" value={searchInput} onChange={event => onSearchInputChange(event.target.value)} placeholder={copy.properties.searchPlaceholder} />
      </div>
      <div className="provider-properties__field">
        <label htmlFor="provider-properties-status">{copy.properties.statusLabel}</label>
        <select id="provider-properties-status" value={status} onChange={event => onStatusChange(event.target.value as ProviderPropertyStatusFilter)}>
          <option value="all">{copy.properties.allStatuses}</option>
          {PROPERTY_STATUSES.map(value => <option key={value} value={value}>{copy.propertyStatuses[value]}</option>)}
        </select>
      </div>
      <div className="provider-properties__filter-actions">
        <Button type="submit" size="sm">{copy.properties.applyFilters}</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClear} disabled={status === 'all' && searchInput.trim() === ''}>{copy.properties.clearFilters}</Button>
      </div>
    </form>
  );
}

function PropertiesContent({ data, locale, query, onPageChange, onStatusChange, onSearchInputChange, onSubmit, onClear, searchInput, status }: {
  readonly data: ProviderPropertiesData;
  readonly locale: SupportedLocale;
  readonly query: ProviderPropertiesQuery;
  readonly onPageChange: (page: number) => void;
  readonly onStatusChange: (status: ProviderPropertyStatusFilter) => void;
  readonly onSearchInputChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
  readonly searchInput: string;
  readonly status: ProviderPropertyStatusFilter;
}) {
  const copy = getProviderCopy(locale);
  const pageCount = Math.max(1, Math.ceil(data.total / data.limit));
  const numberFormat = new Intl.NumberFormat(locale);
  const hasFilters = status !== 'all' || query.search !== undefined;
  return (
    <main aria-labelledby="provider-properties-title">
      <div className="provider-dashboard__heading-row">
        <div>
          <p className="provider-dashboard__eyebrow">{copy.properties.eyebrow}</p>
          <h1 id="provider-properties-title">{copy.properties.title}</h1>
          <p>{copy.properties.description}</p>
        </div>
        <a className="provider-dashboard__primary-action" href={localeForProviderPath(locale, '/provider/properties/new/basic')}>{copy.properties.addProperty}</a>
      </div>
      <section className="provider-properties__panel" aria-labelledby="provider-properties-list-title">
        <div className="provider-dashboard__section-heading">
          <h2 id="provider-properties-list-title">{copy.properties.title}</h2>
          <span className="provider-properties__count" data-testid="provider-properties-count">{numberFormat.format(data.total)} {copy.properties.countSuffix}</span>
        </div>
        <FilterBar locale={locale} status={status} searchInput={searchInput} onStatusChange={onStatusChange} onSearchInputChange={onSearchInputChange} onSubmit={onSubmit} onClear={onClear} />
        {data.items.length === 0 ? (
          <div className="provider-dashboard__empty" data-state="empty">
            <h3>{hasFilters ? copy.properties.noResultsTitle : copy.properties.emptyTitle}</h3>
            <p>{hasFilters ? copy.properties.noResultsBody : copy.properties.emptyBody}</p>
          </div>
        ) : (
          <div className="provider-properties__table-wrap">
            <table className="provider-properties__table">
              <caption className="a11y-visually-hidden">{copy.properties.title}</caption>
              <thead>
                <tr>
                  <th scope="col">{copy.properties.columns.property}</th>
                  <th scope="col">{copy.properties.columns.status}</th>
                  <th scope="col">{copy.properties.columns.type}</th>
                  <th scope="col">{copy.properties.columns.price}</th>
                  <th scope="col">{copy.properties.columns.updated}</th>
                  <th scope="col">{copy.properties.columns.actions}</th>
                </tr>
              </thead>
              <tbody>{data.items.map(property => <PropertyRow key={property.id} property={property} locale={locale} />)}</tbody>
            </table>
          </div>
        )}
        <Pagination page={data.page} pageCount={pageCount} onPageChange={onPageChange} previousLabel={copy.properties.previous} nextLabel={copy.properties.next} ariaLabel={copy.properties.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
      </section>
    </main>
  );
}

export function ProviderProperties({ locale, session, authClient, apiOrigin, load }: ProviderPropertiesProps) {
  const [status, setStatus] = useState<ProviderPropertyStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ProviderPropertiesViewState>('loading');
  const [data, setData] = useState<ProviderPropertiesData | undefined>();
  const [attempt, setAttempt] = useState(0);
  const query = useMemo<ProviderPropertiesQuery>(() => ({
    page,
    limit: 5,
    ...(status === 'all' ? {} : { status }),
    ...(search === '' ? {} : { search })
  }), [page, search, status]);
  const source = useMemo(() => load ?? createProviderPropertiesLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const path = typeof window === 'undefined' ? '/provider/properties' : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'provider') {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    setData(undefined);
    void source(query, controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(nextData.items.length === 0 ? 'empty' : 'success');
    }).catch(error => {
      if (!controller.signal.aborted) setState(stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, query, session.status, sessionRole, source]);

  return (
    <section className="provider-dashboard provider-properties" data-screen-id="PRV-02" data-route="/provider/properties" data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath={path} authClient={authClient} />
      <div className="provider-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? <PropertiesContent data={data} locale={locale} query={query} onPageChange={setPage} onStatusChange={nextStatus => { setStatus(nextStatus); setPage(1); }} onSearchInputChange={setSearchInput} onSubmit={() => { setSearch(searchInput.trim()); setPage(1); }} onClear={() => { setStatus('all'); setSearchInput(''); setSearch(''); setPage(1); }} searchInput={searchInput} status={status} /> : null}
      </div>
    </section>
  );
}
