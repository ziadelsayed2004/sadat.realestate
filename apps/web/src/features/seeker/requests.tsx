import { useEffect, useMemo, useState } from 'react';
import type { RequestData, RequestListData, RequestStatus, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Pagination, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  createSeekerRequestLoader,
  createSeekerRequestsLoader,
  localeForSeekerPath,
  type SeekerAuthorizationSource,
  type SeekerRequestLoader,
  type SeekerRequestsLoader
} from './data.ts';
import { getSeekerRequestsCopy } from './requests-copy.ts';
import { SeekerNavigation } from './overview.tsx';
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

function requestScreenId(request: RequestData): 'SEK-03' | 'SEK-04' | undefined {
  if (request.status === 'contacted') return 'SEK-04';
  if (request.status === 'under_review') return 'SEK-03';
  return undefined;
}

function safePayloadValue(request: RequestData, key: 'message' | 'note'): string | undefined {
  const value = request.payload[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
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
        <span className="seeker-request-row__icon" aria-hidden="true">▤</span>
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
      <div className="seeker-dashboard__section-heading">
        <h2 id="seeker-requests-list-title">{copy.list.title}</h2>
        <span className="seeker-requests__count">{data.total} {copy.list.count}</span>
      </div>
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

function RequestDetailContent({ request, locale }: { readonly request: RequestData; readonly locale: SupportedLocale }) {
  const copy = getSeekerRequestsCopy(locale);
  const message = safePayloadValue(request, 'message');
  const note = safePayloadValue(request, 'note');
  const screenId = requestScreenId(request);
  return (
    <div className="seeker-request-detail" {...(screenId === undefined ? {} : { 'data-screen-id': screenId })} data-request-status={request.status}>
      <div className="seeker-dashboard__heading-row">
        <div>
          <p className="seeker-dashboard__eyebrow">{copy.detail.eyebrow}</p>
          <h1>{copy.detail.title} <span className="seeker-request-detail__id">{shortRequestId(request.id)}</span></h1>
        </div>
        <RequestStatusBadge status={request.status} locale={locale} />
      </div>
      <div className="seeker-request-detail__grid">
        <section className="seeker-request-detail__card" aria-labelledby="seeker-request-timeline-title">
          <h2 id="seeker-request-timeline-title">{copy.detail.timeline}</h2>
          <ol className="seeker-request-detail__timeline">
            <li data-current="true"><span aria-hidden="true">✓</span><div><strong>{copy.statuses[request.status]}</strong><time dateTime={request.updatedAt}>{dateLabel(request.updatedAt, locale)}</time></div></li>
          </ol>
          <p className="seeker-request-detail__muted">{copy.detail.unavailable}</p>
        </section>
        <section className="seeker-request-detail__card" aria-labelledby="seeker-request-summary-title">
          <h2 id="seeker-request-summary-title">{copy.detail.summary}</h2>
          <dl className="seeker-request-detail__values">
            <DetailValue label={copy.detail.type} value={copy.types[request.type]} />
            <DetailValue label={copy.detail.status} value={copy.statuses[request.status]} />
            <DetailValue label={copy.detail.submitted} value={dateLabel(request.createdAt, locale)} />
            <DetailValue label={copy.detail.updated} value={dateLabel(request.updatedAt, locale)} />
            <DetailValue label={copy.detail.property} value={request.propertyId === undefined ? undefined : 'Available through the linked request'} />
            <DetailValue label={copy.detail.project} value={request.projectId === undefined ? undefined : 'Available through the linked request'} />
          </dl>
          {message === undefined && note === undefined ? <p className="seeker-request-detail__muted">{copy.detail.unavailable}</p> : null}
          {message === undefined ? null : <div className="seeker-request-detail__payload"><h3>{copy.detail.message}</h3><p>{message}</p></div>}
          {note === undefined ? null : <div className="seeker-request-detail__payload"><h3>{copy.detail.note}</h3><p>{note}</p></div>}
        </section>
      </div>
      <a className="seeker-dashboard__back-link" href={localeForSeekerPath(locale, '/seeker/requests')}>‹ {copy.detail.back}</a>
    </div>
  );
}

export function SeekerRequests({ locale, session, authClient, apiOrigin, requestId, listLoad, detailLoad }: SeekerRequestsProps) {
  const copy = getSeekerRequestsCopy(locale);
  const isDetail = requestId !== undefined;
  const [page, setPage] = useState(1);
  const [state, setState] = useState<SeekerRequestsViewState>('loading');
  const [listData, setListData] = useState<RequestListData | undefined>();
  const [detailData, setDetailData] = useState<RequestData | undefined>();
  const [attempt, setAttempt] = useState(0);
  const listSource = useMemo(() => listLoad ?? createSeekerRequestsLoader({ apiOrigin, authorization: authClient, query: { page, limit: 5 } }), [apiOrigin, authClient, listLoad, page]);
  const detailSource = useMemo(() => detailLoad ?? (requestId === undefined ? undefined : createSeekerRequestLoader(requestId, { apiOrigin, authorization: authClient })), [apiOrigin, authClient, detailLoad, requestId]);
  const activePath = isDetail ? `/seeker/requests/${requestId}` : '/seeker/requests';

  useEffect(() => {
    if (session.status !== 'authenticated') {
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
  }, [attempt, detailSource, isDetail, listSource, session.status]);

  return (
    <section className="seeker-dashboard" data-screen-id={isDetail ? undefined : 'SEK-02'} data-route={isDetail ? '/seeker/requests/:requestId' : '/seeker/requests'}>
      <SeekerNavigation locale={locale} activePath={activePath} />
      <div className="seeker-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'not_found' ? <section className="seeker-dashboard__state" data-state="not_found" data-request-state="not_found" role="alert"><StateMessage state="error" title={copy.states.notFound.title} message={copy.states.notFound.body} /><a className="seeker-dashboard__back-link" href={localeForSeekerPath(locale, '/seeker/requests')}>‹ {copy.detail.back}</a></section> : null}
        {!isDetail && (state === 'success' || state === 'empty') && listData !== undefined ? <main aria-labelledby="seeker-requests-list-title"><div className="seeker-dashboard__heading-row"><div><p className="seeker-dashboard__eyebrow">{copy.list.eyebrow}</p><h1>{copy.list.title}</h1><p>{copy.list.description}</p></div></div><section className="seeker-requests__panel"><RequestListContent data={listData} locale={locale} onPageChange={setPage} /></section></main> : null}
        {isDetail && state === 'success' && detailData !== undefined ? <main aria-label={copy.detail.title}><RequestDetailContent request={detailData} locale={locale} /></main> : null}
      </div>
    </section>
  );
}
