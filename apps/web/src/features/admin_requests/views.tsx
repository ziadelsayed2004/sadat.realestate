import { useEffect, useMemo, useState } from 'react';
import type { OverdueRequestListData, RequestData, RequestIssue, RequestListData, RequestListQuery, RequestStatus, RequestTransition, RequestType, SupportedLocale, ViewingListData, ViewingStatus } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_REQUESTS_ROUTE,
  createAdminRequestsSource,
  type AdminRequestsAuthorizationSource,
  type AdminRequestsLoader,
  type AdminOverdueRequestsLoader,
  type AdminRequestIssuesLoader,
  type AdminRequestLoader,
  type AdminRequestMutation,
  type AdminIssueMutation,
  type AdminViewingsLoader
} from './data.ts';
import { getAdminRequestsCopy, type AdminRequestsCopy, type AdminRequestsScreen, type AdminRequestsState } from './copy.ts';
import './styles.css';

export interface AdminRequestsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminRequestsAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialRequests?: RequestListData | undefined;
  readonly initialOverdue?: OverdueRequestListData | undefined;
  readonly initialViewings?: ViewingListData | undefined;
  readonly initialIssues?: import('@sadat-real-estate/contracts').RequestIssueListData | undefined;
  readonly loadRequests?: AdminRequestsLoader | undefined;
  readonly loadOverdue?: AdminOverdueRequestsLoader | undefined;
  readonly loadViewings?: AdminViewingsLoader | undefined;
  readonly loadIssues?: AdminRequestIssuesLoader | undefined;
  readonly loadRequest?: AdminRequestLoader | undefined;
  readonly transition?: AdminRequestMutation | undefined;
  readonly assign?: AdminRequestMutation | undefined;
  readonly note?: AdminRequestMutation | undefined;
  readonly resolveIssue?: AdminIssueMutation | undefined;
}

const requestStatuses: readonly RequestStatus[] = ['new', 'under_review', 'contacted', 'scheduled', 'needs_information', 'in_progress', 'resolved', 'cancelled', 'closed'];
const requestTypes: readonly RequestType[] = ['contact', 'viewing', 'property_search', 'provider_customer'];

interface RouteProjection {
  readonly screen: AdminRequestsScreen;
  readonly route: string;
  readonly fixedType?: RequestType;
}

function projectionForPath(pathname: string): RouteProjection {
  if (pathname === '/admin/customer-requests') return { screen: 'customer', route: '/admin/customer-requests', fixedType: 'provider_customer' };
  if (pathname === '/admin/overdue-requests') return { screen: 'overdue', route: '/admin/overdue-requests' };
  if (pathname === '/admin/contact-requests') return { screen: 'contact', route: '/admin/contact-requests', fixedType: 'contact' };
  if (pathname === '/admin/viewing-requests') return { screen: 'viewing', route: '/admin/viewing-requests' };
  if (pathname === '/admin/search-requests') return { screen: 'search', route: '/admin/search-requests', fixedType: 'property_search' };
  if (pathname === '/admin/request-issues') return { screen: 'issues', route: '/admin/request-issues' };
  return { screen: 'all', route: ADMIN_REQUESTS_ROUTE };
}

function stateForError(error: unknown, detail = false): Exclude<AdminRequestsState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (detail && error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForItems(count: number): AdminRequestsState {
  return count === 0 ? 'empty' : 'success';
}

function dateLabel(value: string | undefined, locale: SupportedLocale): string {
  if (value === undefined) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function toneForStatus(status: RequestStatus | ViewingStatus | 'open' | 'resolved' | 'dismissed'): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
  if (status === 'resolved' || status === 'completed') return 'success';
  if (status === 'under_review' || status === 'needs_information' || status === 'in_progress' || status === 'requested' || status === 'rescheduled' || status === 'open') return 'warning';
  if (status === 'new' || status === 'scheduled' || status === 'confirmed') return 'info';
  if (status === 'cancelled' || status === 'dismissed') return 'error';
  return 'neutral';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminRequestsState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminRequestsCopy(locale);
  const message = copy.states[state];
  return <section className="admin-requests__state" data-state={state} aria-label={message.title}><StateMessage state={state} title={message.title} message={message.body} retryLabel={copy.retry} onRetry={state === 'retry' ? onRetry : undefined} />{state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}</section>;
}

function NotFoundPanel({ locale }: { readonly locale: SupportedLocale }) {
  const message = getAdminRequestsCopy(locale).states.not_found;
  return <section className="admin-requests__state" data-state="not_found" aria-label={message.title}><h2>{message.title}</h2><p>{message.body}</p></section>;
}

function StatusBadge({ label, status }: { readonly label: string; readonly status: RequestStatus | ViewingStatus | 'open' | 'resolved' | 'dismissed' }) {
  return <span className="admin-requests__badge" data-tone={toneForStatus(status)}>{label}</span>;
}

function RequestTable({ copy, data, locale, onSelect, overdue = false }: { readonly copy: AdminRequestsCopy; readonly data: RequestListData | OverdueRequestListData; readonly locale: SupportedLocale; readonly onSelect: (request: RequestData) => void; readonly overdue?: boolean }) {
  const items = overdue ? (data as OverdueRequestListData).items.map(item => item.request) : (data as RequestListData).items;
  const overdueSeconds = overdue ? new Map((data as OverdueRequestListData).items.map(item => [item.request.id, item.overdueBySeconds])) : undefined;
  return <div className="admin-requests__table-wrap"><table className="admin-requests__table"><thead><tr><th scope="col">{copy.requestId}</th><th scope="col">{copy.type}</th><th scope="col">{copy.status}</th><th scope="col">{copy.source}</th><th scope="col">{copy.due}</th><th scope="col">{copy.actions}</th></tr></thead><tbody>{items.map(request => <tr key={request.id} data-testid={`admin-request-${request.id}`}><td><code>{request.id}</code></td><td>{copy.typeLabel[request.type]}</td><td><StatusBadge label={copy.statusLabel[request.status]} status={request.status} /></td><td>{request.source}</td><td>{overdueSeconds?.get(request.id) !== undefined ? copy.overdueBy(overdueSeconds.get(request.id)!) : dateLabel(request.dueAt, locale)}</td><td><Button size="sm" variant="secondary" onClick={() => onSelect(request)}>{copy.view}</Button></td></tr>)}</tbody></table></div>;
}

function ViewingTable({ copy, data, locale }: { readonly copy: AdminRequestsCopy; readonly data: ViewingListData; readonly locale: SupportedLocale }) {
  return <div className="admin-requests__table-wrap"><table className="admin-requests__table"><thead><tr><th scope="col">{copy.property}</th><th scope="col">{copy.seeker}</th><th scope="col">{copy.requestId}</th><th scope="col">{copy.status}</th><th scope="col">{copy.appointment}</th><th scope="col">{copy.timezone}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id} data-testid={`admin-viewing-${item.id}`}><td><code>{item.propertyId}</code></td><td><code>{item.seekerId}</code></td><td><code>{item.id}</code></td><td><StatusBadge label={copy.viewingStatusLabel[item.status]} status={item.status} /></td><td>{dateLabel(item.requestedAt, locale)}</td><td>{item.timezone}</td></tr>)}</tbody></table></div>;
}

function IssueTable({ copy, data, onSelect }: { readonly copy: AdminRequestsCopy; readonly data: import('@sadat-real-estate/contracts').RequestIssueListData; readonly onSelect: (issue: RequestIssue) => void }) {
  return <div className="admin-requests__table-wrap"><table className="admin-requests__table"><thead><tr><th scope="col">{copy.issueId}</th><th scope="col">{copy.requestId}</th><th scope="col">{copy.type}</th><th scope="col">{copy.status}</th><th scope="col">{copy.updated}</th><th scope="col">{copy.actions}</th></tr></thead><tbody>{data.items.map(issue => <tr key={issue.id} data-testid={`admin-issue-${issue.id}`}><td><code>{issue.id}</code></td><td><code>{issue.requestId}</code></td><td>{copy.issueCategoryLabel[issue.category]}</td><td><StatusBadge label={copy.issueStatusLabel[issue.status]} status={issue.status} /></td><td>{issue.updatedAt}</td><td><Button size="sm" variant="secondary" onClick={() => onSelect(issue)}>{copy.view}</Button></td></tr>)}</tbody></table></div>;
}

function requestPayloadEntries(request: RequestData): Array<readonly [string, string]> {
  const payload = request.payload;
  const fields = ['message', 'note', 'firstName', 'lastName', 'phone', 'email', 'propertyId', 'projectId', 'minBudget', 'maxBudget', 'minBedrooms', 'maxBedrooms'];
  return fields.flatMap(field => {
    const value = payload[field];
    if (value === undefined || value === null || typeof value === 'object') return [];
    return [[field, String(value)] as const];
  });
}

function DetailRows({ copy, request, locale }: { readonly copy: AdminRequestsCopy; readonly request: RequestData; readonly locale: SupportedLocale }) {
  return <dl className="admin-requests__details"><div><dt>{copy.requestId}</dt><dd><code>{request.id}</code></dd></div><div><dt>{copy.requestType}</dt><dd>{copy.typeLabel[request.type]}</dd></div><div><dt>{copy.source}</dt><dd>{request.source}</dd></div><div><dt>{copy.state}</dt><dd><StatusBadge label={copy.statusLabel[request.status]} status={request.status} /></dd></div><div><dt>{copy.version}</dt><dd>{request.version}</dd></div><div><dt>{copy.created}</dt><dd>{dateLabel(request.createdAt, locale)}</dd></div><div><dt>{copy.updated}</dt><dd>{dateLabel(request.updatedAt, locale)}</dd></div>{request.dueAt !== undefined ? <div><dt>{copy.due}</dt><dd>{dateLabel(request.dueAt, locale)}</dd></div> : null}{request.appointmentAt !== undefined ? <div><dt>{copy.appointment}</dt><dd>{dateLabel(request.appointmentAt, locale)}</dd></div> : null}{request.appointmentTimezone !== undefined ? <div><dt>{copy.timezone}</dt><dd>{request.appointmentTimezone}</dd></div> : null}{request.propertyId !== undefined ? <div><dt>{copy.property}</dt><dd><code>{request.propertyId}</code></dd></div> : null}{request.seekerId !== undefined ? <div><dt>{copy.seeker}</dt><dd><code>{request.seekerId}</code></dd></div> : null}{request.providerId !== undefined ? <div><dt>{copy.provider}</dt><dd><code>{request.providerId}</code></dd></div> : null}</dl>;
}

function RequestDetail({ copy, locale, request, onClose, onTransition, onAssign, onNote }: { readonly copy: AdminRequestsCopy; readonly locale: SupportedLocale; readonly request: RequestData; readonly onClose: () => void; readonly onTransition: AdminRequestMutation; readonly onAssign: AdminRequestMutation; readonly onNote: AdminRequestMutation }) {
  const [transitionValue, setTransitionValue] = useState<RequestTransition | ''>(request.availableActions[0] ?? '');
  const [transitionReason, setTransitionReason] = useState('');
  const [assigneeId, setAssigneeId] = useState(request.assignedTo ?? '');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [saving, setSaving] = useState<'transition' | 'assign' | 'note' | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();
  const payload = requestPayloadEntries(request);

  async function saveTransition(): Promise<void> {
    if (transitionValue === '' || (['needs_information', 'cancel', 'close'].includes(transitionValue) && transitionReason.trim().length === 0)) { setFeedback(copy.transitionRequired); return; }
    setSaving('transition'); setFeedback(undefined);
    try { await onTransition(request.id, { transition: transitionValue, expectedVersion: request.version, ...(transitionReason.trim() === '' ? {} : { reason: transitionReason.trim() }) }); setFeedback(copy.transitionSaved); } catch { setFeedback(copy.states.error.body); } finally { setSaving(undefined); }
  }

  async function saveAssignment(): Promise<void> {
    if (!/^[a-f0-9]{24}$/u.test(assigneeId) || assignmentReason.trim().length === 0) { setFeedback(copy.transitionRequired); return; }
    setSaving('assign'); setFeedback(undefined);
    try { await onAssign(request.id, { assigneeId, expectedVersion: request.version, reason: assignmentReason.trim() }); setFeedback(copy.transitionSaved); } catch { setFeedback(copy.states.error.body); } finally { setSaving(undefined); }
  }

  async function saveNote(): Promise<void> {
    if (noteBody.trim().length === 0) { setFeedback(copy.transitionRequired); return; }
    setSaving('note'); setFeedback(undefined);
    try { await onNote(request.id, { body: noteBody.trim(), expectedVersion: request.version }); setNoteBody(''); setFeedback(copy.noteSaved); } catch { setFeedback(copy.states.error.body); } finally { setSaving(undefined); }
  }

  return <aside className="admin-requests__detail" aria-label={copy.details} data-testid="admin-request-detail"><div className="admin-requests__detail-heading"><div><p className="admin-requests__eyebrow">{copy.details}</p><h2>{copy.typeLabel[request.type]}</h2></div><Button variant="secondary" size="sm" onClick={onClose}>{copy.closeDetails}</Button></div><DetailRows copy={copy} request={request} locale={locale} /><section className="admin-requests__payload"><h3>{copy.payload}</h3>{payload.length === 0 ? <p className="admin-requests__muted">{copy.noPayload}</p> : <dl>{payload.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}</section><section className="admin-requests__actions"><h3>{copy.actions}</h3>{request.availableActions.length === 0 ? <p className="admin-requests__muted">{copy.noActions}</p> : <form onSubmit={event => { event.preventDefault(); void saveTransition(); }}><label htmlFor="admin-request-transition">{copy.transition}</label><select id="admin-request-transition" value={transitionValue} onChange={event => setTransitionValue(event.target.value as RequestTransition)} disabled={saving !== undefined}>{request.availableActions.map(action => <option key={action} value={action}>{copy.transitionLabel[action]}</option>)}</select><label htmlFor="admin-request-transition-reason">{copy.transitionReason}</label><textarea id="admin-request-transition-reason" value={transitionReason} onChange={event => setTransitionReason(event.target.value)} placeholder={copy.transitionReasonPlaceholder} maxLength={500} disabled={saving !== undefined} /><Button type="submit" loading={saving === 'transition'}>{saving === 'transition' ? copy.saving : copy.saveTransition}</Button></form>}</section><section className="admin-requests__actions"><h3>{copy.assignment}</h3><form onSubmit={event => { event.preventDefault(); void saveAssignment(); }}><label htmlFor="admin-request-assignee">{copy.assigneeId}</label><input id="admin-request-assignee" value={assigneeId} onChange={event => setAssigneeId(event.target.value)} placeholder={copy.assigneePlaceholder} maxLength={24} disabled={saving !== undefined} /><label htmlFor="admin-request-assignment-reason">{copy.assignmentReason}</label><textarea id="admin-request-assignment-reason" value={assignmentReason} onChange={event => setAssignmentReason(event.target.value)} maxLength={500} disabled={saving !== undefined} /><Button type="submit" variant="secondary" loading={saving === 'assign'}>{copy.saveAssignment}</Button></form></section><section className="admin-requests__actions"><h3>{copy.note}</h3><form onSubmit={event => { event.preventDefault(); void saveNote(); }}><label htmlFor="admin-request-note">{copy.note}</label><textarea id="admin-request-note" value={noteBody} onChange={event => setNoteBody(event.target.value)} placeholder={copy.notePlaceholder} maxLength={2_000} disabled={saving !== undefined} /><Button type="submit" variant="secondary" loading={saving === 'note'}>{copy.addNote}</Button></form></section>{feedback !== undefined ? <p className="admin-requests__feedback" role="status">{feedback}</p> : null}</aside>;
}

function IssueDetail({ copy, issue, onClose, resolve }: { readonly copy: AdminRequestsCopy; readonly issue: RequestIssue; readonly onClose: () => void; readonly resolve: AdminIssueMutation }) {
  const [action, setAction] = useState<'resolve' | 'dismiss'>('resolve');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  async function submit(): Promise<void> {
    if (reason.trim().length === 0) { setFeedback(copy.transitionRequired); return; }
    setSaving(true); setFeedback(undefined);
    try { await resolve(issue.id, { action, reason: reason.trim(), expectedVersion: issue.version }); setFeedback(copy.issueSaved); } catch { setFeedback(copy.states.error.body); } finally { setSaving(false); }
  }
  return <aside className="admin-requests__detail" aria-label={copy.issueDetails} data-testid="admin-issue-detail"><div className="admin-requests__detail-heading"><div><p className="admin-requests__eyebrow">{copy.issueDetails}</p><h2>{copy.issueCategoryLabel[issue.category]}</h2></div><Button variant="secondary" size="sm" onClick={onClose}>{copy.closeDetails}</Button></div><dl className="admin-requests__details"><div><dt>{copy.issueId}</dt><dd><code>{issue.id}</code></dd></div><div><dt>{copy.requestId}</dt><dd><code>{issue.requestId}</code></dd></div><div><dt>{copy.state}</dt><dd><StatusBadge label={copy.issueStatusLabel[issue.status]} status={issue.status} /></dd></div><div><dt>{copy.version}</dt><dd>{issue.version}</dd></div><div><dt>{copy.issueDetails}</dt><dd>{issue.details}</dd></div></dl><form className="admin-requests__actions" onSubmit={event => { event.preventDefault(); void submit(); }}><h3>{copy.issueAction}</h3><label htmlFor="admin-issue-action">{copy.issueAction}</label><select id="admin-issue-action" value={action} onChange={event => setAction(event.target.value as 'resolve' | 'dismiss')} disabled={saving}><option value="resolve">{copy.resolve}</option><option value="dismiss">{copy.dismiss}</option></select><label htmlFor="admin-issue-reason">{copy.resolutionReason}</label><textarea id="admin-issue-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500} disabled={saving} /><Button type="submit" loading={saving}>{copy.resolveIssue}</Button>{feedback !== undefined ? <p className="admin-requests__feedback" role="status">{feedback}</p> : null}</form></aside>;
}

function Filters({ copy, screen, query, onApply, onClear }: { readonly copy: AdminRequestsCopy; readonly screen: AdminRequestsScreen; readonly query: Partial<RequestListQuery>; readonly onApply: (query: Partial<RequestListQuery>) => void; readonly onClear: () => void }) {
  const [search, setSearch] = useState(query.search ?? '');
  const [status, setStatus] = useState<RequestStatus | ''>(query.status ?? '');
  const [type, setType] = useState<RequestType | ''>(query.type ?? '');
  return <form className="admin-requests__filters" role="search" aria-label={copy.filters} onSubmit={event => { event.preventDefault(); onApply({ page: 1, ...(search.trim() === '' ? {} : { search: search.trim() }), ...(status === '' ? {} : { status }), ...(type === '' ? {} : { type }) }); }}><div><label htmlFor="admin-requests-search">{copy.search}</label><input id="admin-requests-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} /></div><div><label htmlFor="admin-requests-status">{copy.status}</label><select id="admin-requests-status" value={status} onChange={event => setStatus(event.target.value as RequestStatus | '')}><option value="">{copy.allStatuses}</option>{requestStatuses.map(item => <option key={item} value={item}>{copy.statusLabel[item]}</option>)}</select></div>{screen === 'all' ? <div><label htmlFor="admin-requests-type">{copy.type}</label><select id="admin-requests-type" value={type} onChange={event => setType(event.target.value as RequestType | '')}><option value="">{copy.allTypes}</option>{requestTypes.map(item => <option key={item} value={item}>{copy.typeLabel[item]}</option>)}</select></div> : null}<div className="admin-requests__filter-actions"><Button type="submit">{copy.apply}</Button><Button type="button" variant="secondary" onClick={() => { setSearch(''); setStatus(''); setType(''); onClear(); }}>{copy.clear}</Button></div></form>;
}

export function AdminRequests({ locale, session, authClient, apiOrigin, initialRequests, initialOverdue, initialViewings, initialIssues, loadRequests, loadOverdue, loadViewings, loadIssues, loadRequest, transition, assign, note, resolveIssue }: AdminRequestsProps) {
  const copy = getAdminRequestsCopy(locale);
  const pathname = typeof window === 'undefined' ? ADMIN_REQUESTS_ROUTE : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  const projection = projectionForPath(pathname);
  const initialCount = projection.screen === 'overdue' ? initialOverdue?.items.length : projection.screen === 'viewing' ? initialViewings?.items.length : projection.screen === 'issues' ? initialIssues?.items.length : initialRequests?.items.length;
  const [state, setState] = useState<AdminRequestsState>(() => initialCount === undefined ? 'loading' : stateForItems(initialCount));
  const [requests, setRequests] = useState<RequestListData | undefined>(initialRequests);
  const [overdue, setOverdue] = useState<OverdueRequestListData | undefined>(initialOverdue);
  const [viewings, setViewings] = useState<ViewingListData | undefined>(initialViewings);
  const [issues, setIssues] = useState<import('@sadat-real-estate/contracts').RequestIssueListData | undefined>(initialIssues);
  const [query, setQuery] = useState<Partial<RequestListQuery>>({ page: 1, limit: 20, ...(projection.fixedType === undefined ? {} : { type: projection.fixedType }) });
  const [attempt, setAttempt] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<RequestData | undefined>();
  const [selectedIssue, setSelectedIssue] = useState<RequestIssue | undefined>();
  const source = useMemo(() => createAdminRequestsSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient]);
  const requestLoader = loadRequests ?? source.load;
  const overdueLoader = loadOverdue ?? source.overdue;
  const viewingLoader = loadViewings ?? source.viewings;
  const issueLoader = loadIssues ?? source.issues;
  const detailLoader = loadRequest ?? source.loadOne;
  const transitionMutation = transition ?? source.transition;
  const assignmentMutation = assign ?? source.assign;
  const noteMutation = note ?? source.note;
  const issueMutation = resolveIssue ?? source.resolveIssue;
  const sessionAllowed = session.status === 'authenticated' && session.role === 'admin';

  useEffect(() => {
    if (!sessionAllowed) { setState('permission'); return undefined; }
    if (attempt === 0 && (projection.screen === 'all' || projection.fixedType !== undefined) && initialRequests !== undefined) return undefined;
    if (attempt === 0 && projection.screen === 'overdue' && initialOverdue !== undefined) return undefined;
    if (attempt === 0 && projection.screen === 'viewing' && initialViewings !== undefined) return undefined;
    if (attempt === 0 && projection.screen === 'issues' && initialIssues !== undefined) return undefined;
    const controller = new AbortController();
    setState('loading');
    const requestQuery: RequestListQuery = { page: query.page ?? 1, limit: query.limit ?? 20, ...(query.search === undefined ? {} : { search: query.search }), ...(query.status === undefined ? {} : { status: query.status }), ...(projection.fixedType === undefined ? (query.type === undefined ? {} : { type: query.type }) : { type: projection.fixedType }) };
    const requestPromise = projection.screen === 'overdue' ? overdueLoader(requestQuery, controller.signal).then(data => { setOverdue(data); setState(stateForItems(data.items.length)); }) : projection.screen === 'viewing' ? viewingLoader({ page: requestQuery.page, limit: requestQuery.limit }, controller.signal).then(data => { setViewings(data); setState(stateForItems(data.items.length)); }) : projection.screen === 'issues' ? issueLoader(requestQuery.page, requestQuery.limit, controller.signal).then(data => { setIssues(data); setState(stateForItems(data.items.length)); }) : requestLoader(requestQuery, controller.signal).then(data => { setRequests(data); setState(stateForItems(data.items.length)); });
    void requestPromise.catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, initialIssues, initialOverdue, initialRequests, initialViewings, issueLoader, overdueLoader, projection.fixedType, projection.screen, query, requestLoader, sessionAllowed, viewingLoader]);

  useEffect(() => {
    const requestId = typeof window === 'undefined' ? undefined : new URL(window.location.href).searchParams.get('requestId');
    if (!sessionAllowed || requestId === null || requestId === undefined || projection.screen === 'issues' || projection.screen === 'viewing') return undefined;
    const fromList = requests?.items.find(item => item.id === requestId);
    if (fromList !== undefined) { setSelectedRequest(fromList); return undefined; }
    const controller = new AbortController();
    void detailLoader(requestId, controller.signal).then(setSelectedRequest).catch(error => { if (!controller.signal.aborted) setState(stateForError(error, true)); });
    return () => controller.abort();
  }, [detailLoader, projection.screen, requests, sessionAllowed]);

  function replaceRequest(next: RequestData): void {
    setSelectedRequest(next);
    setRequests(current => current === undefined ? current : { ...current, items: current.items.map(item => item.id === next.id ? next : item) });
    setOverdue(current => current === undefined ? current : { ...current, items: current.items.map(item => item.request.id === next.id ? { ...item, request: next } : item) });
  }

  function applyFilters(next: Partial<RequestListQuery>): void { setQuery(current => ({ ...current, ...next, ...(projection.fixedType === undefined ? {} : { type: projection.fixedType }) })); setAttempt(value => value + 1); setSelectedRequest(undefined); }
  function retry(): void { setAttempt(value => value + 1); }
  const data = projection.screen === 'overdue' ? overdue : projection.screen === 'viewing' ? viewings : projection.screen === 'issues' ? issues : requests;
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const page = data?.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const screenDataState = state === 'success' && data !== undefined && data.items.length === 0 ? 'empty' : state;
  const screenTitle = copy.titles[projection.screen];

  return <section className="admin-requests" data-screen-id={`ADM-${18 + ['all', 'customer', 'overdue', 'contact', 'viewing', 'search', 'issues'].indexOf(projection.screen)}`} data-route={projection.route} data-device-scope="desktop" data-admin-requests-state={screenDataState}><AdminNavigation locale={locale} activePath={pathname} /><div className="admin-requests__content"><header className="admin-requests__heading"><div><p className="admin-requests__eyebrow">{copy.eyebrow}</p><h1>{screenTitle}</h1><p>{copy.descriptions[projection.screen]}</p></div><span className="admin-requests__direction-note">{copy.directionNote}</span></header>{projection.screen !== 'viewing' && projection.screen !== 'issues' ? <Filters copy={copy} screen={projection.screen} query={query} onApply={applyFilters} onClear={() => { setQuery({ page: 1, limit: 20, ...(projection.fixedType === undefined ? {} : { type: projection.fixedType }) }); setAttempt(value => value + 1); }} /> : null}{state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={retry} /> : null}{state === 'not_found' ? <NotFoundPanel locale={locale} /> : null}{screenDataState === 'empty' ? <section className="admin-requests__empty" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p></section> : null}{screenDataState === 'success' && projection.screen !== 'viewing' && projection.screen !== 'issues' && (requests !== undefined || overdue !== undefined) ? <section className="admin-requests__panel"><div className="admin-requests__panel-heading"><div><h2>{screenTitle}</h2><p>{copy.count(total)}</p></div></div><RequestTable copy={copy} data={projection.screen === 'overdue' ? overdue! : requests!} locale={locale} overdue={projection.screen === 'overdue'} onSelect={request => { setSelectedRequest(request); const url = new URL(window.location.href); url.searchParams.set('requestId', request.id); window.history.replaceState({}, '', url); }} /><Pagination copy={copy} page={page} totalPages={totalPages} onPage={nextPage => { setQuery(current => ({ ...current, page: nextPage })); setAttempt(value => value + 1); }} /></section> : null}{screenDataState === 'success' && projection.screen === 'viewing' && viewings !== undefined ? <section className="admin-requests__panel"><div className="admin-requests__panel-heading"><div><h2>{screenTitle}</h2><p>{copy.count(total)}</p></div></div><ViewingTable copy={copy} data={viewings} locale={locale} /><Pagination copy={copy} page={page} totalPages={totalPages} onPage={nextPage => { setQuery(current => ({ ...current, page: nextPage })); setAttempt(value => value + 1); }} /></section> : null}{screenDataState === 'success' && projection.screen === 'issues' && issues !== undefined ? <section className="admin-requests__panel"><div className="admin-requests__panel-heading"><div><h2>{screenTitle}</h2><p>{copy.count(total)}</p></div></div><IssueTable copy={copy} data={issues} onSelect={setSelectedIssue} /><Pagination copy={copy} page={page} totalPages={totalPages} onPage={nextPage => { setQuery(current => ({ ...current, page: nextPage })); setAttempt(value => value + 1); }} /></section> : null}{selectedRequest !== undefined ? <RequestDetail copy={copy} locale={locale} request={selectedRequest} onClose={() => { setSelectedRequest(undefined); const url = new URL(window.location.href); url.searchParams.delete('requestId'); window.history.replaceState({}, '', url); }} onTransition={async (id, input, signal) => { const next = await transitionMutation(id, input, signal); replaceRequest(next); return next; }} onAssign={async (id, input, signal) => { const next = await assignmentMutation(id, input, signal); replaceRequest(next); return next; }} onNote={async (id, input, signal) => { const next = await noteMutation(id, input, signal); replaceRequest(next); return next; }} /> : null}{selectedIssue !== undefined ? <IssueDetail copy={copy} issue={selectedIssue} resolve={async (id, input, signal) => { const next = await issueMutation(id, input, signal); setSelectedIssue(next); setIssues(current => current === undefined ? current : { ...current, items: current.items.map(item => item.id === next.id ? next : item) }); return next; }} onClose={() => setSelectedIssue(undefined)} /> : null}</div></section>;
}

function Pagination({ copy, page, totalPages, onPage }: { readonly copy: AdminRequestsCopy; readonly page: number; readonly totalPages: number; readonly onPage: (page: number) => void }) {
  return <div className="admin-requests__pagination"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>{copy.previous}</Button><span>{copy.page(page, totalPages)}</span><Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{copy.next}</Button></div>;
}
