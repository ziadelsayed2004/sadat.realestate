import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  viewingCreateSchema,
  viewingPatchSchema,
  type SupportedLocale,
  type ViewingCreate,
  type ViewingData,
  type ViewingListData,
  type ViewingPatch,
  type ViewingStatus
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Input, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  createSeekerViewingActions,
  createSeekerViewingsLoader,
  isAuthenticatedSeekerSession,
  type SeekerAuthorizationSource,
  type SeekerViewingActions,
  type SeekerViewingsLoader
} from './data.ts';
import { SeekerNavigation } from './overview.tsx';
import { getSeekerViewingsCopy, type SeekerViewingTab } from './viewings-copy.ts';
import './styles.css';

export type SeekerViewingsViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';

export interface SeekerViewingsAuthClient extends SeekerAuthorizationSource {
  readonly getSnapshot: () => { readonly status: string };
}

export interface SeekerViewingsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: SeekerViewingsAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly load?: SeekerViewingsLoader | undefined;
  readonly actions?: SeekerViewingActions | undefined;
}

type MutationError = 'conflict' | 'not_found' | 'permission' | 'error';

function stateForError(error: unknown): Exclude<SeekerViewingsViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function mutationErrorFor(error: unknown): MutationError {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && error.status === 409) return 'conflict';
  return 'error';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

function timeLabel(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(value));
}

function dateTimeLocalValue(value: string | undefined): string {
  if (value === undefined) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function shortId(value: string, prefix: string): string {
  return `${prefix}-${value.slice(-4).toUpperCase()}`;
}

function matchesTab(viewing: ViewingData, tab: SeekerViewingTab): boolean {
  if (tab === 'past') return viewing.status === 'completed';
  if (tab === 'cancelled') return viewing.status === 'cancelled';
  return viewing.status === 'requested' || viewing.status === 'confirmed' || viewing.status === 'rescheduled';
}

function queryForTab(tab: SeekerViewingTab) {
  return tab === 'past'
    ? { status: 'completed' as const, page: 1, limit: 100 }
    : tab === 'cancelled'
      ? { status: 'cancelled' as const, page: 1, limit: 100 }
      : { page: 1, limit: 100 };
}

function statusTone(status: ViewingStatus): 'success' | 'warning' | 'neutral' | 'info' {
  if (status === 'confirmed') return 'success';
  if (status === 'requested' || status === 'rescheduled') return 'warning';
  if (status === 'cancelled' || status === 'completed') return 'neutral';
  return 'info';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<SeekerViewingsViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getSeekerViewingsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="seeker-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function mutationMessage(error: MutationError | undefined, locale: SupportedLocale): string | undefined {
  if (error === undefined) return undefined;
  const copy = getSeekerViewingsCopy(locale);
  return copy.mutation[error === 'conflict' ? 'conflict' : error === 'not_found' ? 'notFound' : 'error'];
}

interface ViewingFormProps {
  readonly locale: SupportedLocale;
  readonly mode: 'create' | 'reschedule';
  readonly viewing?: ViewingData | undefined;
  readonly onClose: () => void;
  readonly onSubmit: (input: ViewingCreate | ViewingPatch) => Promise<void>;
}

function ViewingForm({ locale, mode, viewing, onClose, onSubmit }: ViewingFormProps) {
  const copy = getSeekerViewingsCopy(locale);
  const [propertyId, setPropertyId] = useState(viewing?.propertyId ?? '');
  const [requestedAt, setRequestedAt] = useState(dateTimeLocalValue(viewing?.requestedAt));
  const [timezone, setTimezone] = useState(viewing?.timezone ?? 'UTC');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): ViewingCreate | ViewingPatch | undefined => {
    const nextErrors: string[] = [];
    const date = new Date(requestedAt);
    const isoRequestedAt = Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
    if (mode === 'create' && !/^[a-f0-9]{24}$/u.test(propertyId)) nextErrors.push(copy.invalidProperty);
    if (isoRequestedAt === undefined) nextErrors.push(copy.invalidDate);
    if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)*$/u.test(timezone.trim())) nextErrors.push(copy.invalidTimezone);
    if (note.length > 1_000) nextErrors.push(copy.invalidNote);
    if (nextErrors.length > 0 || isoRequestedAt === undefined) {
      setErrors(nextErrors.length > 0 ? nextErrors : [copy.required]);
      return undefined;
    }
    if (mode === 'create') {
      const parsed = viewingCreateSchema.safeParse({ propertyId, requestedAt: isoRequestedAt, timezone: timezone.trim(), ...(note.trim() === '' ? {} : { note: note.trim() }) });
      if (!parsed.success) {
        setErrors([copy.invalidDate]);
        return undefined;
      }
      return parsed.data;
    }
    const parsed = viewingPatchSchema.safeParse({ requestedAt: isoRequestedAt, timezone: timezone.trim(), expectedVersion: viewing?.version ?? 0 });
    if (!parsed.success) {
      setErrors([copy.invalidDate]);
      return undefined;
    }
    return parsed.data;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = validate();
    if (input === undefined) return;
    setErrors([]);
    setSubmitting(true);
    try {
      await onSubmit(input);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="seeker-viewing-form" onSubmit={event => { void submit(event); }} noValidate aria-label={mode === 'create' ? copy.requestViewingTitle : copy.reschedule}>
      <div className="seeker-viewing-form__heading">
        <h2>{mode === 'create' ? copy.requestViewingTitle : copy.reschedule}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>{copy.close}</Button>
      </div>
      {errors.length > 0 ? <div className="seeker-viewing-form__errors" role="alert" aria-live="assertive">{errors.map(error => <p key={error}>{error}</p>)}</div> : null}
      {mode === 'create' ? <Input id="seeker-viewing-property-id" label={copy.propertyId} value={propertyId} onChange={event => setPropertyId(event.target.value.trim().toLowerCase())} autoComplete="off" inputMode="text" /> : <Input label={copy.propertyId} value={shortId(viewing?.propertyId ?? '', 'PROP')} disabled readOnly />}
      <Input id={mode === 'create' ? 'seeker-viewing-requested-at' : `seeker-viewing-requested-at-${viewing?.id ?? 'edit'}`} label={copy.requestedAt} type="datetime-local" value={requestedAt} onChange={event => setRequestedAt(event.target.value)} />
      <Input id={mode === 'create' ? 'seeker-viewing-timezone' : `seeker-viewing-timezone-${viewing?.id ?? 'edit'}`} label={copy.formTimezone} value={timezone} onChange={event => setTimezone(event.target.value)} autoComplete="off" />
      {mode === 'create' ? <label className="seeker-viewing-form__textarea-label" htmlFor="seeker-viewing-note">{copy.formNote}<textarea id="seeker-viewing-note" className="ui-field__control" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={3} /></label> : null}
      <div className="seeker-viewing-form__actions">
        <Button type="submit" loading={submitting}>{mode === 'create' ? copy.submit : copy.save}</Button>
        <span className="seeker-viewing-form__hint" aria-live="polite">{submitting ? copy.mutation.saving : ''}</span>
      </div>
    </form>
  );
}

function ViewingCard({
  viewing,
  locale,
  expanded,
  editing,
  confirmingCancel,
  onToggleDetails,
  onReschedule,
  onCancel,
  onConfirmCancel,
  onCloseForm
}: {
  readonly viewing: ViewingData;
  readonly locale: SupportedLocale;
  readonly expanded: boolean;
  readonly editing: boolean;
  readonly confirmingCancel: boolean;
  readonly onToggleDetails: () => void;
  readonly onReschedule: (input: ViewingPatch) => Promise<void>;
  readonly onCancel: () => void;
  readonly onConfirmCancel: () => void;
  readonly onCloseForm: () => void;
}) {
  const copy = getSeekerViewingsCopy(locale);
  const canReschedule = viewing.status === 'requested' || viewing.status === 'rescheduled';
  const canCancel = viewing.status !== 'cancelled' && viewing.status !== 'completed';
  return (
    <article className="seeker-viewing-card" data-testid={`seeker-viewing-${viewing.id}`} data-viewing-status={viewing.status}>
      <div className="seeker-viewing-card__image" aria-hidden="true">⌂</div>
      <div className="seeker-viewing-card__body">
        <div className="seeker-viewing-card__topline">
          <div>
            <p className="seeker-dashboard__eyebrow">{copy.property}</p>
            <h2>{shortId(viewing.propertyId, 'PROP')}</h2>
          </div>
          <Badge tone={statusTone(viewing.status)}>{copy.statuses[viewing.status]}</Badge>
        </div>
        <dl className="seeker-viewing-card__summary">
          <div><dt>{copy.date}</dt><dd>{dateLabel(viewing.requestedAt, locale)}</dd></div>
          <div><dt>{copy.time}</dt><dd>{timeLabel(viewing.requestedAt, locale)}</dd></div>
          <div><dt>{copy.timezone}</dt><dd>{viewing.timezone}</dd></div>
        </dl>
        {expanded ? <div className="seeker-viewing-card__details"><p><strong>{copy.property}:</strong> {shortId(viewing.propertyId, 'PROP')}</p>{viewing.note ? <p><strong>{copy.note}:</strong> {viewing.note}</p> : null}</div> : null}
        {editing ? <ViewingForm locale={locale} mode="reschedule" viewing={viewing} onClose={onCloseForm} onSubmit={input => onReschedule(input as ViewingPatch)} /> : (
          <div className="seeker-viewing-card__actions">
            <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={onToggleDetails}>{expanded ? copy.hideDetails : copy.details}</Button>
            {canReschedule ? <Button variant="secondary" size="sm" onClick={onCloseForm}>{copy.reschedule}</Button> : null}
            {canCancel ? <Button variant="danger" size="sm" onClick={onCancel}>{copy.cancel}</Button> : null}
          </div>
        )}
        {confirmingCancel ? <div className="seeker-viewing-card__confirm" role="group" aria-label={copy.cancelConfirm}><p>{copy.cancelConfirm}</p><div><Button variant="danger" size="sm" onClick={onConfirmCancel}>{copy.cancel}</Button><Button variant="ghost" size="sm" onClick={onCancel}>{copy.close}</Button></div></div> : null}
      </div>
    </article>
  );
}

export function SeekerViewings({ locale, session, authClient, apiOrigin, load, actions }: SeekerViewingsProps) {
  const copy = getSeekerViewingsCopy(locale);
  const [tab, setTab] = useState<SeekerViewingTab>('upcoming');
  const [state, setState] = useState<SeekerViewingsViewState>('loading');
  const [data, setData] = useState<ViewingListData | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [expandedId, setExpandedId] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [mutationError, setMutationError] = useState<MutationError | undefined>();
  const [mutationSuccess, setMutationSuccess] = useState<string | undefined>();
  const loadSource = useMemo(() => load ?? createSeekerViewingsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const actionSource = useMemo(() => actions ?? createSeekerViewingActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);
  const query = useMemo(() => queryForTab(tab), [tab]);
  const visibleItems = useMemo(() => (data?.items ?? []).filter(item => matchesTab(item, tab)).sort((left, right) => new Date(left.requestedAt).getTime() - new Date(right.requestedAt).getTime()), [data, tab]);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (!isAuthenticatedSeekerSession(session)) {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void loadSource(query, controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(nextData.items.some(item => matchesTab(item, tab)) ? 'success' : 'empty');
    }).catch(error => {
      if (!controller.signal.aborted) setState(stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, loadSource, query, sessionRole, tab]);

  const runMutation = async (operation: () => Promise<ViewingData>, success: string) => {
    setMutationError(undefined);
    setMutationSuccess(undefined);
    try {
      await operation();
      setMutationSuccess(success);
      setEditingId(undefined);
      setConfirmingCancelId(undefined);
      setCreateOpen(false);
      setAttempt(value => value + 1);
    } catch (error) {
      setMutationError(mutationErrorFor(error));
    }
  };

  return (
    <section className="seeker-dashboard seeker-viewings" data-screen-id="SEK-05" data-route="/seeker/viewings">
      <SeekerNavigation locale={locale} activePath="/seeker/viewings" authClient={authClient} apiOrigin={apiOrigin} />
      <div className="seeker-dashboard__content">
        <div className="seeker-dashboard__heading-row">
          <div>
            <p className="seeker-dashboard__eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <div className="seeker-viewings__heading-actions">
            <Button onClick={() => { setCreateOpen(value => !value); setMutationError(undefined); setMutationSuccess(undefined); }}>{copy.requestViewing}</Button>
          </div>
        </div>
        {mutationSuccess ? <p className="seeker-viewings__feedback" data-state="success" role="status">{mutationSuccess}</p> : null}
        {mutationError ? <p className="seeker-viewings__feedback" data-state="error" role="alert">{mutationMessage(mutationError, locale)}</p> : null}
        {createOpen ? <ViewingForm locale={locale} mode="create" onClose={() => setCreateOpen(false)} onSubmit={input => runMutation(() => actionSource.create(input as ViewingCreate), copy.mutation.created)} /> : null}
        <section className="seeker-viewings__panel" aria-labelledby="seeker-viewings-title">
          <div className="seeker-viewings__toolbar">
            <div>
              <h2 id="seeker-viewings-title">{copy.title}</h2>
              <span className="seeker-viewings__count">{visibleItems.length} {copy.count}</span>
            </div>
            <div className="seeker-viewings__tabs" role="tablist" aria-label={copy.title} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              {(Object.keys(copy.tabs) as SeekerViewingTab[]).map(item => <button key={item} type="button" role="tab" aria-selected={tab === item} className="seeker-viewings__tab" data-active={tab === item || undefined} onClick={() => { setTab(item); setMutationError(undefined); setMutationSuccess(undefined); }}>{copy.tabs[item]}</button>)}
            </div>
          </div>
          {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
          {(state === 'success' || state === 'empty') ? (visibleItems.length === 0 ? <div className="seeker-dashboard__empty" data-state="empty"><h3>{copy.empty[tab].title}</h3><p>{copy.empty[tab].body}</p></div> : <div className="seeker-viewings__grid" role="list" aria-label={copy.tabs[tab]}>{visibleItems.map(viewing => <ViewingCard key={viewing.id} viewing={viewing} locale={locale} expanded={expandedId === viewing.id} editing={editingId === viewing.id} confirmingCancel={confirmingCancelId === viewing.id} onToggleDetails={() => setExpandedId(current => current === viewing.id ? undefined : viewing.id)} onReschedule={input => runMutation(() => actionSource.reschedule(viewing.id, input), copy.mutation.updated)} onCancel={() => { setConfirmingCancelId(current => current === viewing.id ? undefined : viewing.id); setEditingId(undefined); }} onConfirmCancel={() => { void runMutation(() => actionSource.cancel(viewing.id, viewing.version), copy.mutation.cancelled); }} onCloseForm={() => setEditingId(current => current === viewing.id ? undefined : viewing.id)} />)}</div>) : null}
        </section>
      </div>
    </section>
  );
}
