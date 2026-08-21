import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  viewingTransitionSchema,
  type SupportedLocale,
  type ViewingData,
  type ViewingStatus,
  type ViewingTransition
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Input, Modal, Pagination, StateMessage, type BadgeTone } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { getProviderCopy } from './copy.ts';
import { ProviderNavigation } from './overview.tsx';
import {
  createProviderViewingMutationApi,
  createProviderViewingsLoader,
  type ProviderViewingMutationApi,
  type ProviderViewingsData,
  type ProviderViewingsLoader
} from './viewings-data.ts';
import { getProviderViewingsCopy, type ProviderViewingsCopy } from './viewings-copy.ts';
import './viewings.css';
import './styles.css';

export type ProviderViewingsViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';
export type ProviderViewingAction = 'confirm' | 'reschedule' | 'cancel' | 'complete';
export type ProviderViewingStatusFilter = ViewingStatus | 'all';

export interface ProviderViewingsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiOrigin?: string | undefined;
  readonly load?: ProviderViewingsLoader | undefined;
  readonly mutations?: ProviderViewingMutationApi | undefined;
}

const VIEWING_STATUSES = ['requested', 'confirmed', 'rescheduled', 'cancelled', 'completed'] as const satisfies readonly ViewingStatus[];
const ACTIONS_BY_STATUS: Readonly<Record<ViewingStatus, readonly ProviderViewingAction[]>> = {
  requested: ['confirm', 'reschedule', 'cancel'],
  confirmed: ['reschedule', 'cancel', 'complete'],
  rescheduled: ['confirm', 'reschedule', 'cancel'],
  cancelled: [],
  completed: []
};

function statusTone(status: ViewingStatus): BadgeTone {
  if (status === 'confirmed' || status === 'completed') return 'success';
  if (status === 'requested' || status === 'rescheduled') return 'warning';
  return 'neutral';
}

function stateForError(error: unknown): Exclude<ProviderViewingsViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function dateLabel(value: string, timezone: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value));
  } catch {
    return '—';
  }
}

function dateTimeInputValue(value: string): string {
  try {
    const date = new Date(value);
    const pad = (input: number) => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return '';
  }
}

function isoFromDateTimeInput(value: string): string | undefined {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function safeReference(value: string): string {
  return value.length > 6 ? `…${value.slice(-6)}` : value;
}

function errorMessage(error: unknown, copy: ProviderViewingsCopy): string {
  return error instanceof ApiClientError && error.status === 409 ? copy.errors.conflict : copy.errors.generic;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ProviderViewingsViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const providerCopy = getProviderCopy(locale);
  const message = providerCopy.states[state];
  return (
    <section className="provider-viewings__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={providerCopy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{providerCopy.retry}</Button> : null}
    </section>
  );
}

function TransitionModal({ viewing, action, copy, saving, error, onClose, onSubmit }: {
  readonly viewing: ViewingData;
  readonly action: ProviderViewingAction;
  readonly copy: ProviderViewingsCopy;
  readonly saving: boolean;
  readonly error?: string | undefined;
  readonly onClose: () => void;
  readonly onSubmit: (input: ViewingTransition) => Promise<void>;
}) {
  const [dateTime, setDateTime] = useState(() => dateTimeInputValue(viewing.requestedAt));
  const [timezone, setTimezone] = useState(viewing.timezone);
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();
  const formId = `provider-viewing-transition-${action}`;
  const title = action === 'confirm' ? copy.dialog.confirmTitle : action === 'reschedule' ? copy.dialog.rescheduleTitle : action === 'cancel' ? copy.dialog.cancelTitle : copy.dialog.completeTitle;
  const description = action === 'confirm' ? copy.dialog.confirmDescription : action === 'reschedule' ? copy.dialog.rescheduleDescription : action === 'cancel' ? copy.dialog.cancelDescription : copy.dialog.completeDescription;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setValidationError(undefined);
    const candidate: Record<string, unknown> = { action, expectedVersion: viewing.version };
    if (action === 'reschedule') {
      const requestedAt = isoFromDateTimeInput(dateTime);
      if (requestedAt === undefined) {
        setValidationError(copy.errors.validation);
        return;
      }
      candidate.requestedAt = requestedAt;
      candidate.timezone = timezone.trim();
    }
    if (action === 'cancel') candidate.reason = reason.trim();
    const parsed = viewingTransitionSchema.safeParse(candidate);
    if (!parsed.success) {
      setValidationError(copy.errors.validation);
      return;
    }
    await onSubmit(parsed.data);
  }

  return (
    <Modal open title={title} description={description} closeLabel={copy.dialog.close} onClose={onClose} footer={(
      <>
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{copy.dialog.cancel}</Button>
        <Button type="submit" form={formId} loading={saving}>{copy.dialog.confirm}</Button>
      </>
    )}>
      <form id={formId} className="provider-viewings__form" onSubmit={event => { void submit(event); }} noValidate>
        {validationError || error ? <p className="provider-viewings__form-error" role="alert">{validationError ?? error}</p> : null}
        {action === 'reschedule' ? (
          <div className="provider-viewings__form-grid">
            <Input id={`${formId}-date`} type="datetime-local" label={copy.dialog.date} value={dateTime} onChange={event => setDateTime(event.target.value)} required />
            <Input id={`${formId}-timezone`} label={copy.dialog.timezone} value={timezone} onChange={event => setTimezone(event.target.value)} required />
          </div>
        ) : null}
        {action === 'cancel' ? <Input id={`${formId}-reason`} label={copy.dialog.reason} helpText={copy.dialog.reasonHelp} value={reason} onChange={event => setReason(event.target.value)} required /> : null}
      </form>
    </Modal>
  );
}

function ViewingRow({ viewing, locale, copy, onAction }: { readonly viewing: ViewingData; readonly locale: SupportedLocale; readonly copy: ProviderViewingsCopy; readonly onAction: (viewing: ViewingData, action: ProviderViewingAction) => void }) {
  const actions = ACTIONS_BY_STATUS[viewing.status];
  return (
    <tr data-testid="provider-viewing-row" data-viewing-status={viewing.status}>
      <td><span className="provider-viewings__reference">{copy.customerReference} {safeReference(viewing.seekerId)}</span></td>
      <td>
        <span className="provider-viewings__reference">{copy.propertyReference} {safeReference(viewing.propertyId)}</span>
        {viewing.note ? <span className="provider-viewings__note">{copy.note}: {viewing.note}</span> : null}
      </td>
      <td><time dateTime={viewing.requestedAt}>{dateLabel(viewing.requestedAt, viewing.timezone, locale)}</time></td>
      <td><code>{viewing.timezone}</code></td>
      <td><Badge tone={statusTone(viewing.status)} data-viewing-status-badge={viewing.status}>{copy.statuses[viewing.status]}</Badge></td>
      <td>
        <div className="provider-viewings__actions">
          {actions.map(action => <Button key={action} size="xs" variant={action === 'cancel' ? 'ghost' : 'secondary'} onClick={() => onAction(viewing, action)} aria-label={`${copy.actions[action]}: ${copy.propertyReference} ${safeReference(viewing.propertyId)}`}>{copy.actions[action]}</Button>)}
          {actions.length === 0 ? <span className="provider-viewings__unavailable">{copy.actions.none}</span> : null}
        </div>
      </td>
    </tr>
  );
}

function ViewingsContent({ data, locale, copy, status, onStatusChange, onApply, onClear, onPageChange, onAction }: {
  readonly data: ProviderViewingsData;
  readonly locale: SupportedLocale;
  readonly copy: ProviderViewingsCopy;
  readonly status: ProviderViewingStatusFilter;
  readonly onStatusChange: (status: ProviderViewingStatusFilter) => void;
  readonly onApply: () => void;
  readonly onClear: () => void;
  readonly onPageChange: (page: number) => void;
  readonly onAction: (viewing: ViewingData, action: ProviderViewingAction) => void;
}) {
  const pageCount = Math.ceil(data.total / data.limit);
  const numberFormat = new Intl.NumberFormat(locale);
  return (
    <main aria-labelledby="provider-viewings-title">
      <div className="provider-viewings__heading provider-dashboard__heading-row">
        <div>
          <p className="provider-dashboard__eyebrow">{copy.eyebrow}</p>
          <h1 id="provider-viewings-title">{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </div>
      <section className="provider-viewings__panel" aria-labelledby="provider-viewings-list-title">
        <div className="provider-dashboard__section-heading">
          <h2 id="provider-viewings-list-title">{copy.title}</h2>
          <span className="provider-viewings__count" data-testid="provider-viewings-count">{numberFormat.format(data.total)} {copy.countSuffix}</span>
        </div>
        <form className="provider-viewings__filters" role="search" aria-label={copy.filtersLabel} onSubmit={event => { event.preventDefault(); onApply(); }}>
          <div className="provider-viewings__field">
            <label htmlFor="provider-viewings-status">{copy.statusLabel}</label>
            <select id="provider-viewings-status" value={status} onChange={event => onStatusChange(event.target.value as ProviderViewingStatusFilter)}>
              <option value="all">{copy.allStatuses}</option>
              {VIEWING_STATUSES.map(value => <option key={value} value={value}>{copy.statuses[value]}</option>)}
            </select>
          </div>
          <div className="provider-viewings__filter-actions">
            <Button type="submit" size="sm">{copy.apply}</Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClear} disabled={status === 'all'}>{copy.clear}</Button>
          </div>
        </form>
        {data.items.length === 0 ? (
          <div className="provider-viewings__empty" data-state="empty">
            <h3>{copy.emptyTitle}</h3>
            <p>{copy.emptyBody}</p>
          </div>
        ) : (
          <div className="provider-viewings__table-wrap">
            <table className="provider-viewings__table">
              <caption className="a11y-visually-hidden">{copy.title}</caption>
              <thead><tr><th scope="col">{copy.columns.customer}</th><th scope="col">{copy.columns.property}</th><th scope="col">{copy.columns.date}</th><th scope="col">{copy.columns.timezone}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.actions}</th></tr></thead>
              <tbody>{data.items.map(viewing => <ViewingRow key={viewing.id} viewing={viewing} locale={locale} copy={copy} onAction={onAction} />)}</tbody>
            </table>
          </div>
        )}
        <Pagination page={data.page} pageCount={pageCount} onPageChange={onPageChange} previousLabel={copy.previous} nextLabel={copy.next} ariaLabel={copy.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
      </section>
    </main>
  );
}

export function ProviderViewings({ locale, session, authClient, apiOrigin, load, mutations }: ProviderViewingsProps) {
  const copy = getProviderViewingsCopy(locale);
  const [status, setStatus] = useState<ProviderViewingStatusFilter>('all');
  const [appliedStatus, setAppliedStatus] = useState<ProviderViewingStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ProviderViewingsViewState>('loading');
  const [data, setData] = useState<ProviderViewingsData | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [selectedAction, setSelectedAction] = useState<{ readonly viewing: ViewingData; readonly action: ProviderViewingAction } | undefined>();
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();
  const query = useMemo(() => ({ page, limit: 5, ...(appliedStatus === 'all' ? {} : { status: appliedStatus }) }), [appliedStatus, page]);
  const source = useMemo(() => load ?? createProviderViewingsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const mutationApi = useMemo(() => mutations ?? createProviderViewingMutationApi({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, mutations]);
  const path = typeof window === 'undefined' ? '/provider/viewings' : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
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

  async function transition(input: ViewingTransition): Promise<void> {
    if (selectedAction === undefined) return;
    setSaving(true);
    setMutationError(undefined);
    try {
      await mutationApi.transition(selectedAction.viewing.id, input);
      setFeedback(copy.feedback[input.action === 'confirm' ? 'confirmed' : input.action === 'reschedule' ? 'rescheduled' : input.action === 'cancel' ? 'cancelled' : 'completed']);
      setSelectedAction(undefined);
      setAttempt(value => value + 1);
    } catch (error) {
      setMutationError(errorMessage(error, copy));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="provider-dashboard provider-viewings" data-screen-id="PRV-18" data-route="/provider/viewings" data-device-scope="desktop" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <ProviderNavigation locale={locale} activePath={path} />
      <div className="provider-dashboard__content">
        {feedback ? <p className="provider-viewings__feedback" role="status" aria-live="polite">{feedback}</p> : null}
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => { setFeedback(undefined); setAttempt(value => value + 1); }} /> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? <ViewingsContent data={data} locale={locale} copy={copy} status={status} onStatusChange={nextStatus => setStatus(nextStatus)} onApply={() => { setAppliedStatus(status); setPage(1); }} onClear={() => { setStatus('all'); setAppliedStatus('all'); setPage(1); }} onPageChange={setPage} onAction={(viewing, action) => { setMutationError(undefined); setFeedback(undefined); setSelectedAction({ viewing, action }); }} /> : null}
      </div>
      {selectedAction ? <TransitionModal viewing={selectedAction.viewing} action={selectedAction.action} copy={copy} saving={saving} error={mutationError} onClose={() => { if (!saving) setSelectedAction(undefined); }} onSubmit={transition} /> : null}
    </section>
  );
}
