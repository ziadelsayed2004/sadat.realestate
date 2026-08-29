import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  REQUEST_STATUSES,
  requestCreateSchema,
  requestTransitionRequestSchema,
  type RequestData,
  type RequestStatus,
  type RequestTransition,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Input, Modal, Pagination, StateMessage, type BadgeTone } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { getProviderCopy } from './copy.ts';
import { ProviderNavigation } from './overview.tsx';
import {
  createProviderCustomerRequestMutationApi,
  createProviderCustomerRequestsLoader,
  type ProviderCustomerRequestMutationApi,
  type ProviderCustomerRequestPayload,
  type ProviderCustomerRequestsData,
  type ProviderCustomerRequestsLoader,
  type ProviderCustomerRequestsQuery
} from './customer-requests-data.ts';
import { getProviderCustomerRequestsCopy, type ProviderCustomerRequestsCopy } from './customer-requests-copy.ts';
import './customer-requests.css';
import './styles.css';

export type ProviderCustomerRequestsViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';
export type ProviderCustomerRequestStatusFilter = RequestStatus | 'all';

export interface ProviderCustomerRequestsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiOrigin?: string | undefined;
  readonly load?: ProviderCustomerRequestsLoader | undefined;
  readonly mutations?: ProviderCustomerRequestMutationApi | undefined;
}

const EMPTY_FORM: ProviderCustomerRequestPayload = { firstName: '', lastName: '', phone: '' };

function statusTone(status: RequestStatus): BadgeTone {
  if (status === 'resolved') return 'success';
  if (status === 'needs_information' || status === 'under_review' || status === 'scheduled') return 'warning';
  if (status === 'cancelled' || status === 'closed') return 'neutral';
  if (status === 'contacted' || status === 'in_progress') return 'info';
  return 'brand';
}

function stateForError(error: unknown): Exclude<ProviderCustomerRequestsViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function payloadText(request: RequestData, key: 'firstName' | 'lastName' | 'phone' | 'email' | 'message' | 'propertyId' | 'projectId'): string | undefined {
  const value = request.payload[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function maskPhone(value: string): string {
  const normalized = value.trim();
  return normalized.length > 6 ? `${normalized.slice(0, 3)}••••${normalized.slice(-3)}` : '••••';
}

function maskEmail(value: string): string {
  const normalized = value.trim();
  const separator = normalized.indexOf('@');
  if (separator <= 0 || separator === normalized.length - 1) return '••••';
  return `${normalized.slice(0, 1)}•••${normalized.slice(separator)}`;
}

function customerName(request: RequestData, unavailable: string): string {
  const name = [payloadText(request, 'firstName'), payloadText(request, 'lastName')].filter((value): value is string => value !== undefined).join(' ').trim();
  return name === '' ? unavailable : name;
}

function relatedLabel(request: RequestData, copy: ProviderCustomerRequestsCopy): string {
  if (payloadText(request, 'propertyId') !== undefined || request.propertyId !== undefined) return copy.form.propertyId;
  if (payloadText(request, 'projectId') !== undefined || request.projectId !== undefined) return copy.form.projectId;
  return copy.unavailable;
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ProviderCustomerRequestsViewState, 'empty' | 'success'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const providerCopy = getProviderCopy(locale);
  const message = providerCopy.states[state];
  return (
    <section className="provider-customer-requests__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={providerCopy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{providerCopy.retry}</Button> : null}
    </section>
  );
}

function RequestStatusBadge({ status, copy }: { readonly status: RequestStatus; readonly copy: ProviderCustomerRequestsCopy }) {
  return <Badge tone={statusTone(status)} data-request-status={status}>{copy.statuses[status]}</Badge>;
}

function RequestFormModal({ copy, saving, error, onClose, onSave }: {
  readonly copy: ProviderCustomerRequestsCopy;
  readonly saving: boolean;
  readonly error?: string | undefined;
  readonly onClose: () => void;
  readonly onSave: (input: ProviderCustomerRequestPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<ProviderCustomerRequestPayload>(EMPTY_FORM);
  const [validationError, setValidationError] = useState<string | undefined>();
  const formId = 'provider-customer-request-form';

  function update(key: keyof ProviderCustomerRequestPayload, value: string): void {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setValidationError(undefined);
    const candidate: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      ...(form.email?.trim() === '' || form.email === undefined ? {} : { email: form.email.trim() }),
      ...(form.message?.trim() === '' || form.message === undefined ? {} : { message: form.message.trim() }),
      ...(form.propertyId?.trim() === '' || form.propertyId === undefined ? {} : { propertyId: form.propertyId.trim() }),
      ...(form.projectId?.trim() === '' || form.projectId === undefined ? {} : { projectId: form.projectId.trim() }),
      ...(form.sourceNote?.trim() === '' || form.sourceNote === undefined ? {} : { sourceNote: form.sourceNote.trim() })
    };
    const parsed = requestCreateSchema.safeParse({ type: 'provider_customer', payload: candidate });
    if (!parsed.success) {
      setValidationError(copy.form.validation);
      return;
    }
    if (parsed.data.type !== 'provider_customer') {
      setValidationError(copy.form.validation);
      return;
    }
    await onSave(parsed.data.payload);
  }

  return (
    <Modal open title={copy.form.title} description={copy.form.description} closeLabel={copy.form.close} onClose={onClose} footer={(
      <>
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{copy.form.cancel}</Button>
        <Button type="submit" form={formId} loading={saving}>{copy.form.save}</Button>
      </>
    )}>
      <form id={formId} className="provider-customer-requests__form" onSubmit={event => { void submit(event); }} noValidate>
        {validationError || error ? <p className="provider-customer-requests__form-error" role="alert">{validationError ?? error}</p> : null}
        <fieldset disabled={saving}>
          <legend>{copy.form.customerDetails}</legend>
          <div className="provider-customer-requests__form-grid">
            <Input id="provider-customer-first-name" label={copy.form.firstName} value={form.firstName} onChange={event => update('firstName', event.target.value)} required />
            <Input id="provider-customer-last-name" label={copy.form.lastName} value={form.lastName} onChange={event => update('lastName', event.target.value)} required />
            <Input id="provider-customer-phone" label={copy.form.phone} type="tel" value={form.phone} onChange={event => update('phone', event.target.value)} required />
            <Input id="provider-customer-email" label={`${copy.form.email} (${copy.form.optional})`} type="email" value={form.email ?? ''} onChange={event => update('email', event.target.value)} />
          </div>
        </fieldset>
        <fieldset disabled={saving}>
          <legend>{copy.form.requestDetails}</legend>
          <label className="provider-customer-requests__textarea-label" htmlFor="provider-customer-message">{copy.form.message} ({copy.form.optional})</label>
          <textarea id="provider-customer-message" value={form.message ?? ''} onChange={event => update('message', event.target.value)} rows={4} />
          <div className="provider-customer-requests__form-grid">
            <Input id="provider-customer-property-id" label={`${copy.form.propertyId} (${copy.form.optional})`} value={form.propertyId ?? ''} onChange={event => update('propertyId', event.target.value)} />
            <Input id="provider-customer-project-id" label={`${copy.form.projectId} (${copy.form.optional})`} value={form.projectId ?? ''} onChange={event => update('projectId', event.target.value)} />
          </div>
          <label className="provider-customer-requests__textarea-label" htmlFor="provider-customer-source-note">{copy.form.sourceNote} ({copy.form.optional})</label>
          <textarea id="provider-customer-source-note" value={form.sourceNote ?? ''} onChange={event => update('sourceNote', event.target.value)} rows={3} />
        </fieldset>
      </form>
    </Modal>
  );
}

function TransitionModal({ request, action, copy, saving, error, onClose, onConfirm }: {
  readonly request: RequestData;
  readonly action: RequestTransition;
  readonly copy: ProviderCustomerRequestsCopy;
  readonly saving: boolean;
  readonly error?: string | undefined;
  readonly onClose: () => void;
  readonly onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();
  const formId = `provider-request-transition-${request.id}`;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setValidationError(undefined);
    const parsed = requestTransitionRequestSchema.safeParse({ transition: action, expectedVersion: request.version, ...(reason.trim() === '' ? {} : { reason: reason.trim() }) });
    if (!parsed.success) {
      setValidationError(copy.transition.validation);
      return;
    }
    await onConfirm(parsed.data.reason ?? '');
  }

  return (
    <Modal open title={copy.transition.title} description={`${copy.transition.description} ${copy.transitions[action]}`} closeLabel={copy.form.close} onClose={onClose} footer={(
      <>
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{copy.transition.cancel}</Button>
        <Button type="submit" form={formId} loading={saving}>{copy.transition.confirm}</Button>
      </>
    )}>
      <form id={formId} className="provider-customer-requests__form" onSubmit={event => { void submit(event); }} noValidate>
        {validationError || error ? <p className="provider-customer-requests__form-error" role="alert">{validationError ?? error}</p> : null}
        <p className="provider-customer-requests__transition-summary"><strong>{customerName(request, copy.unavailable)}</strong><span>{copy.statuses[request.status]} → {copy.transitions[action]}</span></p>
        <label className="provider-customer-requests__textarea-label" htmlFor={`${formId}-reason`}>{copy.transition.reason}</label>
        <textarea id={`${formId}-reason`} value={reason} onChange={event => setReason(event.target.value)} rows={4} aria-describedby={`${formId}-reason-help`} />
        <p id={`${formId}-reason-help`} className="provider-customer-requests__help">{copy.transition.reasonHelp}</p>
      </form>
    </Modal>
  );
}

function RequestRow({ request, locale, copy, onTransition }: { readonly request: RequestData; readonly locale: SupportedLocale; readonly copy: ProviderCustomerRequestsCopy; readonly onTransition: (request: RequestData, action: RequestTransition) => void }) {
  const name = customerName(request, copy.unavailable);
  const phone = payloadText(request, 'phone');
  const email = payloadText(request, 'email');
  return (
    <tr data-testid={`provider-customer-request-${request.id}`} data-request-status={request.status}>
      <td>
        <div className="provider-customer-requests__identity">
          <strong>{name}</strong>
          {phone ? <span>{maskPhone(phone)}</span> : null}
          {email ? <span>{maskEmail(email)}</span> : null}
        </div>
      </td>
      <td><span>{copy.requestType}</span><small>{copy.source}: {copy.providerSource}</small></td>
      <td><RequestStatusBadge status={request.status} copy={copy} /></td>
      <td>{relatedLabel(request, copy)}</td>
      <td><time dateTime={request.createdAt}>{dateLabel(request.createdAt, locale)}</time></td>
      <td><time dateTime={request.updatedAt}>{dateLabel(request.updatedAt, locale)}</time></td>
      <td>
        <div className="provider-customer-requests__actions">
          {request.availableActions.map(action => <Button key={action} size="xs" variant={action === 'cancel' || action === 'close' ? 'secondary' : 'primary'} onClick={() => onTransition(request, action)} aria-label={`${copy.transitions[action]}: ${name}`}>{copy.transitions[action]}</Button>)}
          {request.availableActions.length === 0 ? <span className="provider-customer-requests__unavailable">{copy.noActions}</span> : null}
        </div>
      </td>
    </tr>
  );
}

function RequestsContent({ data, locale, copy, status, searchInput, query, onStatusChange, onSearchInputChange, onApply, onClear, onPageChange, onAdd, onTransition }: {
  readonly data: ProviderCustomerRequestsData;
  readonly locale: SupportedLocale;
  readonly copy: ProviderCustomerRequestsCopy;
  readonly status: ProviderCustomerRequestStatusFilter;
  readonly searchInput: string;
  readonly query: ProviderCustomerRequestsQuery;
  readonly onStatusChange: (status: ProviderCustomerRequestStatusFilter) => void;
  readonly onSearchInputChange: (value: string) => void;
  readonly onApply: () => void;
  readonly onClear: () => void;
  readonly onPageChange: (page: number) => void;
  readonly onAdd: () => void;
  readonly onTransition: (request: RequestData, action: RequestTransition) => void;
}) {
  const pageCount = Math.ceil(data.total / data.limit);
  const numberFormat = new Intl.NumberFormat(locale);
  const hasFilters = query.status !== undefined || query.search !== undefined;
  const hasPendingFilters = status !== 'all' || searchInput.trim() !== '';
  return (
    <main aria-labelledby="provider-customer-requests-title">
      <div className="provider-customer-requests__heading provider-dashboard__heading-row">
        <div>
          <p className="provider-dashboard__eyebrow">{copy.eyebrow}</p>
          <h1 id="provider-customer-requests-title">{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <Button onClick={onAdd} startIcon="+">{copy.add}</Button>
      </div>
      <section className="provider-customer-requests__panel" aria-labelledby="provider-customer-requests-list-title">
        <div className="provider-dashboard__section-heading">
          <h2 id="provider-customer-requests-list-title">{copy.title}</h2>
          <span className="provider-customer-requests__count" data-testid="provider-customer-requests-count">{numberFormat.format(data.total)} {copy.countSuffix}</span>
        </div>
        <form className="provider-customer-requests__filters" role="search" aria-label={copy.filtersLabel} onSubmit={event => { event.preventDefault(); onApply(); }}>
          <div className="provider-customer-requests__field">
            <label htmlFor="provider-customer-requests-search">{copy.searchLabel}</label>
            <input id="provider-customer-requests-search" type="search" value={searchInput} onChange={event => onSearchInputChange(event.target.value)} placeholder={copy.searchPlaceholder} />
          </div>
          <div className="provider-customer-requests__field">
            <label htmlFor="provider-customer-requests-status">{copy.statusLabel}</label>
            <select id="provider-customer-requests-status" value={status} onChange={event => onStatusChange(event.target.value as ProviderCustomerRequestStatusFilter)}>
              <option value="all">{copy.allStatuses}</option>
              {REQUEST_STATUSES.map(value => <option key={value} value={value}>{copy.statuses[value]}</option>)}
            </select>
          </div>
          <div className="provider-customer-requests__filter-actions">
            <Button type="submit" size="sm">{copy.apply}</Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClear} disabled={!hasFilters && !hasPendingFilters}>{copy.clear}</Button>
          </div>
        </form>
        {data.items.length === 0 ? (
          <div className="provider-customer-requests__empty" data-state="empty">
            <h3>{hasFilters ? copy.noResultsTitle : copy.emptyTitle}</h3>
            <p>{hasFilters ? copy.noResultsBody : copy.emptyBody}</p>
            {!hasFilters ? <Button onClick={onAdd}>{copy.add}</Button> : null}
          </div>
        ) : (
          <div className="provider-customer-requests__table-wrap">
            <table className="provider-customer-requests__table">
              <caption className="a11y-visually-hidden">{copy.title}</caption>
              <thead><tr><th scope="col">{copy.columns.customer}</th><th scope="col">{copy.columns.request}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.related}</th><th scope="col">{copy.columns.created}</th><th scope="col">{copy.columns.updated}</th><th scope="col">{copy.columns.actions}</th></tr></thead>
              <tbody>{data.items.map(request => <RequestRow key={request.id} request={request} locale={locale} copy={copy} onTransition={onTransition} />)}</tbody>
            </table>
          </div>
        )}
        <Pagination page={data.page} pageCount={pageCount} onPageChange={onPageChange} previousLabel={copy.previous} nextLabel={copy.next} ariaLabel={copy.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
      </section>
    </main>
  );
}

export function ProviderCustomerRequests({ locale, session, authClient, apiOrigin, load, mutations }: ProviderCustomerRequestsProps) {
  const copy = getProviderCustomerRequestsCopy(locale);
  const providerCopy = getProviderCopy(locale);
  const [status, setStatus] = useState<ProviderCustomerRequestStatusFilter>('all');
  const [appliedStatus, setAppliedStatus] = useState<ProviderCustomerRequestStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ProviderCustomerRequestsViewState>('loading');
  const [data, setData] = useState<ProviderCustomerRequestsData | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [requestFormOpen, setRequestFormOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    return url.pathname.replace(/\/+$/u, '') === '/provider/customer-requests' && url.searchParams.get('create') === '1';
  });
  const [transitionTarget, setTransitionTarget] = useState<{ request: RequestData; action: RequestTransition } | undefined>();
  const [mutationError, setMutationError] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const query = useMemo<ProviderCustomerRequestsQuery>(() => ({ page, limit: 5, ...(appliedStatus === 'all' ? {} : { status: appliedStatus }), ...(search === '' ? {} : { search }) }), [appliedStatus, page, search]);
  const source = useMemo(() => load ?? createProviderCustomerRequestsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const mutationApi = useMemo(() => mutations ?? createProviderCustomerRequestMutationApi({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, mutations]);
  const path = typeof window === 'undefined' ? '/provider/customer-requests' : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
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

  function openCreate(): void {
    setMutationError(undefined);
    setFeedback(undefined);
    setRequestFormOpen(true);
  }

  function closeDialogs(): void {
    if (saving) return;
    setRequestFormOpen(false);
    setTransitionTarget(undefined);
    setMutationError(undefined);
  }

  async function saveRequest(input: ProviderCustomerRequestPayload): Promise<void> {
    setSaving(true);
    setMutationError(undefined);
    try {
      await mutationApi.create(input);
      setRequestFormOpen(false);
      setFeedback(copy.feedback.created);
      setAttempt(value => value + 1);
    } catch (error) {
      setMutationError(error instanceof ApiClientError && error.status === 409 ? copy.errors.conflict : copy.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  async function transitionRequest(reason: string): Promise<void> {
    if (transitionTarget === undefined) return;
    setSaving(true);
    setMutationError(undefined);
    try {
      await mutationApi.transition(transitionTarget.request.id, { transition: transitionTarget.action, expectedVersion: transitionTarget.request.version, ...(reason === '' ? {} : { reason }) });
      setTransitionTarget(undefined);
      setFeedback(copy.feedback.transitioned);
      setAttempt(value => value + 1);
    } catch (error) {
      setMutationError(error instanceof ApiClientError && error.status === 409 ? copy.errors.conflict : copy.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="provider-dashboard provider-customer-requests" data-screen-id="PRV-16" data-route="/provider/customer-requests" data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath={path} />
      <div className="provider-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? <RequestsContent data={data} locale={locale} copy={copy} status={status} searchInput={searchInput} query={query} onStatusChange={setStatus} onSearchInputChange={setSearchInput} onApply={() => { setAppliedStatus(status); setSearch(searchInput.trim()); setPage(1); }} onClear={() => { setStatus('all'); setAppliedStatus('all'); setSearchInput(''); setSearch(''); setPage(1); }} onPageChange={setPage} onAdd={openCreate} onTransition={(request, action) => { setMutationError(undefined); setFeedback(undefined); setTransitionTarget({ request, action }); }} /> : null}
        {feedback ? <p className="provider-customer-requests__feedback" role="status">{feedback}</p> : null}
      </div>
      {requestFormOpen && session.status === 'authenticated' && sessionRole === 'provider' ? <div data-screen-id="PRV-17"><RequestFormModal copy={copy} saving={saving} error={mutationError} onClose={closeDialogs} onSave={saveRequest} /></div> : null}
      {transitionTarget !== undefined ? <TransitionModal request={transitionTarget.request} action={transitionTarget.action} copy={copy} saving={saving} error={mutationError} onClose={closeDialogs} onConfirm={transitionRequest} /> : null}
      {state === 'permission' ? <span className="a11y-visually-hidden">{providerCopy.states.permission.title}</span> : null}
    </section>
  );
}
