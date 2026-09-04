import { useEffect, useMemo, useState } from 'react';
import type { RequestData, RequestListData, RequestStatus, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Input, Pagination, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  createSeekerRequestLoader,
  createSeekerRequestTransition,
  createSeekerRequestsLoader,
  isAuthenticatedSeekerSession,
  localeForSeekerPath,
  type SeekerAuthorizationSource,
  type SeekerRequestLoader,
  type SeekerRequestsLoader
  ,type SeekerRequestTransition
} from './data.ts';
import { getSeekerRequestsCopy } from './requests-copy.ts';
import { SeekerIcon, SeekerNavigation } from './overview.tsx';
import './styles.css';

export type SeekerRequestsViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission' | 'not_found';

export interface SeekerRequestsAuthClient extends SeekerAuthorizationSource {
  readonly getSnapshot: () => { readonly status: string };
}

export interface SeekerRequestsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: SeekerRequestsAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly requestId?: string | undefined;
  readonly listLoad?: SeekerRequestsLoader | undefined;
  readonly detailLoad?: SeekerRequestLoader | undefined;
  readonly transition?: SeekerRequestTransition | undefined;
}

function stateForError(error: unknown): Exclude<SeekerRequestsViewState, 'loading' | 'empty' | 'success' | 'not_found'> | 'not_found' {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function shortRequestId(value: string): string {
  return `REQ-${value.slice(-4).toUpperCase()}`;
}

const requestFilterStatuses: readonly RequestStatus[] = ['new', 'under_review', 'contacted', 'scheduled', 'needs_information', 'in_progress', 'resolved', 'cancelled', 'closed'];

function requestSearchLabel(locale: SupportedLocale): string {
  return locale === 'ar' ? 'البحث في الطلبات' : 'Search requests';
}

function requestFilterLabel(locale: SupportedLocale): string {
  return locale === 'ar' ? 'تصفية الطلبات حسب الحالة' : 'Filter requests by status';
}

function requestAllLabel(locale: SupportedLocale): string {
  return locale === 'ar' ? 'الكل' : 'All';
}

function requestScreenId(request: RequestData): 'SEK-03' | 'SEK-04' | undefined {
  if (request.status === 'contacted') return 'SEK-04';
  if (request.status === 'under_review') return 'SEK-03';
  return undefined;
}

function safePayloadValue(request: RequestData, key: 'message' | 'note'): string | undefined {
  const value = request.payload[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function safePayloadNumber(request: RequestData, key: 'minBudget' | 'maxBudget' | 'minBedrooms' | 'maxBedrooms'): number | undefined {
  const value = request.payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function safePayloadStrings(request: RequestData, key: 'propertyTypes'): readonly string[] {
  const value = request.payload[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
}

function rangeLabel(minimum: number | undefined, maximum: number | undefined, locale: SupportedLocale, currency = false): string | undefined {
  if (minimum === undefined && maximum === undefined) return undefined;
  const format = (value: number) => currency
    ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat(locale).format(value);
  if (minimum !== undefined && maximum !== undefined) return `${format(minimum)} – ${format(maximum)}`;
  return format(minimum ?? maximum ?? 0);
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<SeekerRequestsViewState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getSeekerRequestsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="seeker-dashboard__state" data-state={state} data-request-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function RequestStatusBadge({ status, locale }: { readonly status: RequestStatus; readonly locale: SupportedLocale }) {
  const copy = getSeekerRequestsCopy(locale);
  const tone = status === 'contacted' || status === 'resolved' ? 'success' : status === 'under_review' || status === 'scheduled' ? 'warning' : status === 'cancelled' || status === 'closed' ? 'neutral' : 'info';
  return <Badge tone={tone}>{copy.statuses[status]}</Badge>;
}

function RequestRow({ request, locale }: { readonly request: RequestData; readonly locale: SupportedLocale }) {
  const copy = getSeekerRequestsCopy(locale);
  return (
    <article className="seeker-request-row" data-testid={`seeker-request-${request.id}`}>
      <div className="seeker-request-row__identity">
        <span className="seeker-request-row__icon" aria-hidden="true"><SeekerIcon name="requests" /></span>
        <div>
          <strong>{shortRequestId(request.id)}</strong>
          <span>{copy.types[request.type]}</span>
        </div>
      </div>
      <div className="seeker-request-row__status"><RequestStatusBadge status={request.status} locale={locale} /></div>
      <time dateTime={request.createdAt}>{dateLabel(request.createdAt, locale)}</time>
      <a className="seeker-request-row__details" href={localeForSeekerPath(locale, `/seeker/requests/${request.id}`)}>{copy.list.details}<span aria-hidden="true">‹</span></a>
    </article>
  );
}

function RequestListContent({ data, locale, onPageChange }: { readonly data: RequestListData; readonly locale: SupportedLocale; readonly onPageChange: (page: number) => void }) {
  const copy = getSeekerRequestsCopy(locale);
  const pageCount = Math.ceil(data.total / data.limit);
  return (
    <>
      {data.items.length === 0 ? (
        <div className="seeker-dashboard__empty" data-state="empty"><h3>{copy.list.emptyTitle}</h3><p>{copy.list.emptyBody}</p></div>
      ) : (
        <div className="seeker-requests__list" role="list" aria-label={copy.list.title}>
          <div className="seeker-requests__columns" aria-hidden="true"><span>{copy.list.requestId}</span><span>{copy.list.status}</span><span>{copy.list.submitted}</span><span>{copy.list.details}</span></div>
          {data.items.map(request => <RequestRow key={request.id} request={request} locale={locale} />)}
        </div>
      )}
      <Pagination page={data.page} pageCount={pageCount} onPageChange={onPageChange} previousLabel={copy.list.previous} nextLabel={copy.list.next} ariaLabel={copy.list.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
    </>
  );
}

function DetailValue({ label, value }: { readonly label: string; readonly value: string | undefined }) {
  if (value === undefined) return null;
  return <div className="seeker-request-detail__value"><dt>{label}</dt><dd>{value}</dd></div>;
}

function RequestDetailContent({ request, locale, onCancel }: { readonly request: RequestData; readonly locale: SupportedLocale; readonly onCancel?: (reason: string) => Promise<void> }) {
  const copy = getSeekerRequestsCopy(locale);
  const message = safePayloadValue(request, 'message');
  const note = safePayloadValue(request, 'note');
  const budget = rangeLabel(safePayloadNumber(request, 'minBudget'), safePayloadNumber(request, 'maxBudget'), locale, true);
  const bedrooms = rangeLabel(safePayloadNumber(request, 'minBedrooms'), safePayloadNumber(request, 'maxBedrooms'), locale);
  const propertyTypes = safePayloadStrings(request, 'propertyTypes');
  const hasAdvanced = budget !== undefined || bedrooms !== undefined || propertyTypes.length > 0 || note !== undefined;
  const screenId = requestScreenId(request);
  const lifecycle: readonly RequestStatus[] = ['new', 'under_review', 'contacted', 'scheduled', 'resolved'];
  const currentIndex = lifecycle.indexOf(request.status);
  return (
    <div className="seeker-request-detail" {...(screenId === undefined ? {} : { 'data-screen-id': screenId })} data-request-status={request.status}>
      <div className="seeker-dashboard__heading-row">
        <div>
          <p className="seeker-dashboard__eyebrow">{copy.detail.eyebrow}</p>
          <h1>{copy.detail.title} <span className="seeker-request-detail__id">{shortRequestId(request.id)}</span></h1>
        </div>
        <RequestStatusBadge status={request.status} locale={locale} />
      </div>
      {request.availableActions.includes('cancel') && onCancel !== undefined ? <CancelRequestAction locale={locale} onCancel={onCancel} /> : null}
      <div className="seeker-request-detail__grid">
        <section className="seeker-request-detail__card seeker-request-detail__card--timeline" aria-labelledby="seeker-request-timeline-title">
          <h2 id="seeker-request-timeline-title">{copy.detail.timeline}</h2>
          <ol className="seeker-request-detail__timeline">
            {lifecycle.map((status, index) => {
              const stepState = currentIndex < 0 ? 'pending' : index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'pending';
              const timestamp = index === 0 ? request.createdAt : stepState === 'current' ? request.updatedAt : undefined;
              return <li key={status} data-state={stepState} data-current={stepState === 'current' || undefined}><span aria-hidden="true">{stepState === 'complete' ? '✓' : stepState === 'current' ? '•' : ''}</span><div><strong>{copy.statuses[status]}</strong>{timestamp === undefined ? null : <time dateTime={timestamp}>{dateLabel(timestamp, locale)}</time>}</div></li>;
            })}
          </ol>
        </section>
        <section className="seeker-request-detail__card seeker-request-detail__card--summary" aria-labelledby="seeker-request-summary-title">
          <h2 id="seeker-request-summary-title">{copy.detail.summary}</h2>
          <dl className="seeker-request-detail__values">
            <DetailValue label={copy.detail.type} value={copy.types[request.type]} />
            <DetailValue label={copy.detail.status} value={copy.statuses[request.status]} />
            <DetailValue label={copy.detail.submitted} value={dateLabel(request.createdAt, locale)} />
          </dl>
          {message === undefined ? null : <div className="seeker-request-detail__payload"><h3>{copy.detail.message}</h3><p>{message}</p></div>}
        </section>
        {hasAdvanced ? <section className="seeker-request-detail__card seeker-request-detail__card--advanced" aria-labelledby="seeker-request-advanced-title">
          <h2 id="seeker-request-advanced-title">{copy.detail.advanced}</h2>
          <dl className="seeker-request-detail__values">
            <DetailValue label={copy.detail.budget} value={budget} />
            <DetailValue label={copy.detail.bedrooms} value={bedrooms} />
            <DetailValue label={copy.detail.propertyTypes} value={propertyTypes.length === 0 ? undefined : propertyTypes.join(' · ')} />
          </dl>
          {note === undefined ? null : <div className="seeker-request-detail__payload"><h3>{copy.detail.note}</h3><p>{note}</p></div>}
        </section> : null}
      </div>
      <a className="seeker-dashboard__back-link" href={localeForSeekerPath(locale, '/seeker/requests')}>‹ {copy.detail.back}</a>
    </div>
  );
}

function CancelRequestAction({ locale, onCancel }: { readonly locale: SupportedLocale; readonly onCancel: (reason: string) => Promise<void> }) {
  const copy = getSeekerRequestsCopy(locale);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  return <div className="seeker-request-detail__cancel">
    <Button variant="secondary" size="sm" onClick={() => setOpen(value => !value)}>{copy.detail.cancel}</Button>
    {open ? <form onSubmit={event => { event.preventDefault(); if (reason.trim().length < 2) { setError(true); return; } setSaving(true); setError(false); void onCancel(reason.trim()).then(() => setOpen(false)).catch(() => setError(true)).finally(() => setSaving(false)); }}>
      <label htmlFor="seeker-request-cancel-reason">{copy.detail.cancelReason}</label>
      <textarea id="seeker-request-cancel-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500} disabled={saving} />
      {error ? <p role="alert">{copy.detail.cancelError}</p> : null}
      <Button type="submit" size="sm" loading={saving}>{copy.detail.cancelConfirm}</Button>
    </form> : null}
  </div>;
}

export function SeekerRequests({ locale, session, authClient, apiOrigin, requestId, listLoad, detailLoad, transition }: SeekerRequestsProps) {
  const copy = getSeekerRequestsCopy(locale);
  const isDetail = requestId !== undefined;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | undefined>();
  const [search, setSearch] = useState('');
  const [state, setState] = useState<SeekerRequestsViewState>('loading');
  const [listData, setListData] = useState<RequestListData | undefined>();
  const [detailData, setDetailData] = useState<RequestData | undefined>();
  const [attempt, setAttempt] = useState(0);
  const listQuery = useMemo(() => ({
    page,
    limit: 20,
    ...(statusFilter === undefined ? {} : { status: statusFilter }),
    ...(search.trim() === '' ? {} : { search: search.trim() })
  }), [page, search, statusFilter]);
  const listSource = useMemo(() => listLoad ?? createSeekerRequestsLoader({ apiOrigin, authorization: authClient, query: listQuery }), [apiOrigin, authClient, listLoad, listQuery]);
  const detailSource = useMemo(() => detailLoad ?? (requestId === undefined ? undefined : createSeekerRequestLoader(requestId, { apiOrigin, authorization: authClient })), [apiOrigin, authClient, detailLoad, requestId]);
  const transitionSource = useMemo(() => transition ?? createSeekerRequestTransition({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, transition]);
  const activePath = isDetail ? `/seeker/requests/${requestId}` : '/seeker/requests';
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (!isAuthenticatedSeekerSession(session)) {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    if (isDetail && detailSource !== undefined) {
      void detailSource(controller.signal).then(data => {
        if (controller.signal.aborted) return;
        setDetailData(data);
        setState('success');
      }).catch(error => {
        if (!controller.signal.aborted) setState(stateForError(error));
      });
    } else if (!isDetail) {
      void listSource(controller.signal).then(data => {
        if (controller.signal.aborted) return;
        setListData(data);
        setState(data.items.length === 0 ? 'empty' : 'success');
      }).catch(error => {
        if (!controller.signal.aborted) setState(stateForError(error));
      });
    }
    return () => controller.abort();
  }, [attempt, detailSource, isDetail, listSource, search, sessionRole, statusFilter]);

  return (
    <section className="seeker-dashboard" data-screen-id={isDetail ? undefined : 'SEK-02'} data-route={isDetail ? '/seeker/requests/:requestId' : '/seeker/requests'}>
      <SeekerNavigation locale={locale} activePath={activePath} authClient={authClient} apiOrigin={apiOrigin} />
      <div className="seeker-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'not_found' ? <section className="seeker-dashboard__state" data-state="not_found" data-request-state="not_found" role="alert"><StateMessage state="error" title={copy.states.notFound.title} message={copy.states.notFound.body} /><a className="seeker-dashboard__back-link" href={localeForSeekerPath(locale, '/seeker/requests')}>‹ {copy.detail.back}</a></section> : null}
        {!isDetail && (state === 'success' || state === 'empty') && listData !== undefined ? <main aria-labelledby="seeker-requests-list-title"><div className="seeker-dashboard__heading-row"><div><p className="seeker-dashboard__eyebrow">{copy.list.eyebrow}</p><h1 id="seeker-requests-list-title">{copy.list.title}</h1><p>{copy.list.description}</p></div></div><section className="seeker-requests__panel">
          <div className="seeker-requests__toolbar">
            <Input id="seeker-requests-search" type="search" label={requestSearchLabel(locale)} value={search} placeholder={requestSearchLabel(locale)} onChange={event => { setSearch(event.target.value); setPage(1); }} />
            <span className="seeker-requests__count">{listData.total} {copy.list.count}</span>
          </div>
          <div className="seeker-requests__filters" role="group" aria-label={requestFilterLabel(locale)}>
            <button type="button" className="seeker-requests__filter" data-active={statusFilter === undefined || undefined} aria-pressed={statusFilter === undefined} onClick={() => { setStatusFilter(undefined); setPage(1); }}>{requestAllLabel(locale)}</button>
            {requestFilterStatuses.map(status => <button key={status} type="button" className="seeker-requests__filter" data-active={statusFilter === status || undefined} aria-pressed={statusFilter === status} onClick={() => { setStatusFilter(current => current === status ? undefined : status); setPage(1); }}>{copy.statuses[status]}</button>)}
          </div>
          <RequestListContent data={listData} locale={locale} onPageChange={setPage} />
        </section></main> : null}
        {isDetail && state === 'success' && detailData !== undefined ? <main aria-label={copy.detail.title}><RequestDetailContent request={detailData} locale={locale} onCancel={async reason => { const updated = await transitionSource(detailData.id, { transition: 'cancel', reason, expectedVersion: detailData.version }); setDetailData(updated); }} /></main> : null}
      </div>
    </section>
  );
}
