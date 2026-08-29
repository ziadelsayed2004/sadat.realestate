import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  type AdRequestCreate,
  adRequestCreateSchema,
  type ProviderAdRequestProjection,
  type ProviderCommissionProjection,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge, Button, Input, Modal, StateMessage, type BadgeTone } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { ProviderNavigation } from './overview.tsx';
import {
  createProviderAdvertisingDetailLoader,
  createProviderAdvertisingLoader,
  createProviderAdvertisingMutationApi,
  createProviderCommissionLoader,
  type ProviderAdvertisingDetailLoader,
  type ProviderAdvertisingLoader,
  type ProviderAdvertisingMutationApi,
  type ProviderAdvertisingQuery,
  type ProviderAdvertisingStatus,
  type ProviderCommissionLoader,
  PROVIDER_ADVERTISING_PAGE_LIMIT
} from './advertising-data.ts';
import { getProviderAdvertisingCopy, type ProviderAdvertisingCopy, type ProviderAdvertisingState } from './advertising-copy.ts';
import './advertising.css';
import './styles.css';

export type { ProviderAdvertisingState } from './advertising-copy.ts';

const STATUS_OPTIONS: readonly ProviderAdvertisingStatus[] = [
  'draft',
  'review',
  'waiting_pricing',
  'quote_sent',
  'waiting_payment',
  'scheduled',
  'active',
  'ended',
  'rejected',
  'cancelled',
  'expired'
];

export interface ProviderAdvertisingProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiOrigin?: string | undefined;
  readonly requestId?: string | undefined;
  readonly initialData?: import('@sadat-real-estate/contracts').ProviderAdRequestListData | undefined;
  readonly initialDetail?: ProviderAdRequestProjection | undefined;
  readonly load?: ProviderAdvertisingLoader | undefined;
  readonly loadDetail?: ProviderAdvertisingDetailLoader | undefined;
  readonly mutations?: ProviderAdvertisingMutationApi | undefined;
}

export interface ProviderCommissionProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: ProviderCommissionProjection | undefined;
  readonly load?: ProviderCommissionLoader | undefined;
}

function stateForError(error: unknown, detail = false): Exclude<ProviderAdvertisingState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (detail && error instanceof ApiClientError && error.status === 404) return 'notFound';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForList(data: { readonly items: readonly unknown[] }): ProviderAdvertisingState {
  return data.items.length === 0 ? 'empty' : 'success';
}

function localizedPath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function moneyLabel(valueMinor: number, currency: string, locale: SupportedLocale): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(valueMinor / 100);
  } catch {
    return `${valueMinor / 100} ${currency}`;
  }
}

function statusTone(status: ProviderAdvertisingStatus): BadgeTone {
  if (status === 'active' || status === 'scheduled') return 'success';
  if (status === 'rejected' || status === 'cancelled' || status === 'expired' || status === 'ended') return 'neutral';
  if (status === 'waiting_payment' || status === 'quote_sent' || status === 'waiting_pricing') return 'warning';
  return 'info';
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function StatePanel({ state, locale, copy, onRetry }: { readonly state: Exclude<ProviderAdvertisingState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly copy: ProviderAdvertisingCopy; readonly onRetry: () => void }) {
  const message = copy.states[state];
  const componentState = state === 'notFound' ? 'error' : state;
  return (
    <section className="provider-advertising__state" data-state={state} aria-label={message.title}>
      <StateMessage state={componentState} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' || state === 'notFound' ? <Button variant="secondary" size="sm" onClick={onRetry}>{state === 'notFound' ? copy.backToList : copy.retry}</Button> : null}
      <span className="provider-advertising__state-locale" data-locale={locale} aria-hidden="true" />
    </section>
  );
}

function toIsoDate(value: string): string {
  if (value.trim() === '') return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function CreateRequestModal({ copy, busy, error, onClose, onSave }: { readonly copy: ProviderAdvertisingCopy; readonly busy: boolean; readonly error?: string | undefined; readonly onClose: () => void; readonly onSave: (input: AdRequestCreate) => Promise<void> }) {
  const [form, setForm] = useState({ placementKey: '', purpose: '', intervalStart: '', intervalEnd: '' });
  const [validationError, setValidationError] = useState(false);
  const formId = 'provider-advertising-create-form';

  function update(key: keyof typeof form, value: string): void {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = adRequestCreateSchema.safeParse({
      placementKey: form.placementKey.trim(),
      purpose: form.purpose.trim(),
      intervalStart: toIsoDate(form.intervalStart),
      intervalEnd: toIsoDate(form.intervalEnd)
    });
    if (!parsed.success) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    void onSave(parsed.data);
  }

  return (
    <Modal open title={copy.createForm.title} description={copy.createForm.description} closeLabel={copy.createForm.close} onClose={onClose} footer={(
      <>
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>{copy.createForm.cancel}</Button>
        <Button type="submit" form={formId} loading={busy}>{copy.createForm.save}</Button>
      </>
    )}>
      <form id={formId} className="provider-advertising__form" onSubmit={submit} noValidate>
        {validationError || error ? <p className="provider-advertising__form-error" role="alert">{validationError ? copy.createForm.validation : error}</p> : null}
        <Input id="provider-advertising-placement-key" label={copy.createForm.placementKey} value={form.placementKey} onChange={event => update('placementKey', event.target.value)} required />
        <p className="provider-advertising__help">{copy.createForm.placementKeyHelp}</p>
        <label className="provider-advertising__field" htmlFor="provider-advertising-purpose">
          <span>{copy.createForm.purpose}</span>
          <textarea id="provider-advertising-purpose" value={form.purpose} onChange={event => update('purpose', event.target.value)} rows={3} required />
        </label>
        <div className="provider-advertising__form-grid">
          <label className="provider-advertising__field" htmlFor="provider-advertising-start"><span>{copy.createForm.start}</span><input id="provider-advertising-start" type="datetime-local" value={form.intervalStart} onChange={event => update('intervalStart', event.target.value)} required /></label>
          <label className="provider-advertising__field" htmlFor="provider-advertising-end"><span>{copy.createForm.end}</span><input id="provider-advertising-end" type="datetime-local" value={form.intervalEnd} onChange={event => update('intervalEnd', event.target.value)} required /></label>
        </div>
      </form>
    </Modal>
  );
}

function RequestTable({ data, locale, copy }: { readonly data: import('@sadat-real-estate/contracts').ProviderAdRequestListData; readonly locale: SupportedLocale; readonly copy: ProviderAdvertisingCopy }) {
  return (
    <div className="provider-advertising__table-wrap">
      <table className="provider-advertising__table">
        <caption className="sr-only">{copy.title}</caption>
        <thead><tr>{Object.values(copy.columns).map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>
          {data.items.map(item => {
            const payment = item.paymentProofs.find(proof => proof.active) ?? item.paymentProofs.at(-1);
            return (
              <tr key={item.id} data-testid="provider-advertising-row" data-ad-request-status={item.status}>
                <td><a className="provider-advertising__request-link" href={localizedPath(locale, `/provider/ads/${item.id}`)}>{shortId(item.id)}</a><span>{dateLabel(item.createdAt, locale)}</span></td>
                <td><strong>{item.placementKey}</strong><span>{item.purpose}</span></td>
                <td><span>{dateLabel(item.intervalStart, locale)}</span><span>{dateLabel(item.intervalEnd, locale)}</span></td>
                <td><Badge tone={statusTone(item.status)}>{copy.statuses[item.status]}</Badge></td>
                <td>{item.quote ? <><strong>{moneyLabel(item.quote.totalMinor, item.quote.currency, locale)}</strong><span>{copy.quoteStatuses[item.quote.status]}</span></> : <span className="provider-advertising__unavailable">{copy.noQuote}</span>}</td>
                <td>{payment ? <Badge tone={payment.status === 'approved' ? 'success' : payment.status === 'rejected' ? 'neutral' : 'warning'}>{copy.paymentStatuses[payment.status]}</Badge> : <span className="provider-advertising__unavailable">{copy.noPaymentProof}</span>}</td>
                <td><a className="provider-advertising__action-link" href={localizedPath(locale, `/provider/ads/${item.id}`)}>{copy.open}</a></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilterBar({ copy, draftStatus, onDraftStatus, onApply, onClear }: { readonly copy: ProviderAdvertisingCopy; readonly draftStatus: ProviderAdvertisingStatus | 'all'; readonly onDraftStatus: (value: ProviderAdvertisingStatus | 'all') => void; readonly onApply: () => void; readonly onClear: () => void }) {
  return (
    <form className="provider-advertising__filters" aria-label={copy.filtersLabel} onSubmit={event => { event.preventDefault(); onApply(); }}>
      <label className="provider-advertising__field" htmlFor="provider-advertising-status"><span>{copy.statusLabel}</span><select id="provider-advertising-status" value={draftStatus} onChange={event => onDraftStatus(event.target.value as ProviderAdvertisingStatus | 'all')}><option value="all">{copy.allStatuses}</option>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{copy.statuses[status]}</option>)}</select></label>
      <div className="provider-advertising__filter-actions"><Button type="submit" size="sm">{copy.apply}</Button><Button type="button" variant="secondary" size="sm" onClick={onClear}>{copy.clear}</Button></div>
    </form>
  );
}

function DetailContent({ detail, locale, copy, busy, onAccept, onUpload }: { readonly detail: ProviderAdRequestProjection; readonly locale: SupportedLocale; readonly copy: ProviderAdvertisingCopy; readonly busy: boolean; readonly onAccept: () => void; readonly onUpload: (file: File) => void }) {
  const payment = detail.paymentProofs.find(proof => proof.active) ?? detail.paymentProofs.at(-1);
  const canAccept = detail.quote?.status === 'issued';
  const canUpload = detail.status === 'waiting_payment' && detail.quote?.status === 'accepted';
  return (
    <div className="provider-advertising__detail-grid">
      <section className="provider-advertising__detail-card" aria-labelledby="provider-advertising-detail-heading">
        <div className="provider-advertising__detail-heading"><div><p className="provider-dashboard__eyebrow">{copy.eyebrow}</p><h1 id="provider-advertising-detail-heading">{copy.requestDetails}</h1></div><Badge tone={statusTone(detail.status)}>{copy.statuses[detail.status]}</Badge></div>
        <dl className="provider-advertising__definition-list"><div><dt>{copy.columns.request}</dt><dd>{shortId(detail.id)}</dd></div><div><dt>{copy.columns.placement}</dt><dd>{detail.placementKey}</dd></div><div><dt>{copy.purpose}</dt><dd>{detail.purpose}</dd></div><div><dt>{copy.interval}</dt><dd>{dateLabel(detail.intervalStart, locale)} — {dateLabel(detail.intervalEnd, locale)}</dd></div></dl>
        {detail.quote ? <section className="provider-advertising__nested-card"><h2>{copy.quote}</h2><div className="provider-advertising__quote-total"><span>{copy.quoteTotal}</span><strong>{moneyLabel(detail.quote.totalMinor, detail.quote.currency, locale)}</strong></div><dl className="provider-advertising__definition-list"><div><dt>{copy.columns.status}</dt><dd>{copy.quoteStatuses[detail.quote.status]}</dd></div><div><dt>{copy.quoteValidUntil}</dt><dd>{dateLabel(detail.quote.validUntil, locale)}</dd></div><div><dt>{copy.quoteTerms}</dt><dd>{detail.quote.terms}</dd></div></dl>{canAccept ? <Button onClick={onAccept} loading={busy}>{copy.acceptQuote}</Button> : null}</section> : <p className="provider-advertising__muted">{copy.noQuote}</p>}
      </section>
      <section className="provider-advertising__detail-card" aria-labelledby="provider-advertising-payment-heading">
        <h2 id="provider-advertising-payment-heading">{copy.paymentProof}</h2><p className="provider-advertising__muted">{copy.paymentProofHelp}</p>
        {payment ? <div className="provider-advertising__proof-summary"><Badge tone={payment.status === 'approved' ? 'success' : payment.status === 'rejected' ? 'neutral' : 'warning'}>{copy.paymentStatuses[payment.status]}</Badge><span>{dateLabel(payment.uploadedAt, locale)}</span><span>{payment.active ? copy.paymentProofUploaded : copy.unavailable}</span></div> : <p className="provider-advertising__muted">{copy.noPaymentProof}</p>}
        {canUpload ? <label className="provider-advertising__upload"><span>{copy.uploadPaymentProof}</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ''; }} disabled={busy} /></label> : null}
        <section className="provider-advertising__nested-card"><h2>{copy.schedule}</h2>{detail.schedule ? <dl className="provider-advertising__definition-list"><div><dt>{copy.columns.status}</dt><dd>{detail.schedule.status}</dd></div><div><dt>{copy.interval}</dt><dd>{detail.schedule.localStart} — {detail.schedule.localEnd} ({detail.schedule.timezone})</dd></div></dl> : <p className="provider-advertising__muted">{copy.noSchedule}</p>}</section>
      </section>
      <section className="provider-advertising__detail-card provider-advertising__detail-card--wide" aria-labelledby="provider-advertising-history-heading"><h2 id="provider-advertising-history-heading">{copy.history}</h2>{detail.history.length === 0 ? <p className="provider-advertising__muted">{copy.noHistory}</p> : <ol className="provider-advertising__history">{detail.history.map((entry, index) => <li key={`${entry.changedAt}-${entry.version}-${index}`}><Badge tone={statusTone(entry.status)}>{copy.statuses[entry.status]}</Badge><time dateTime={entry.changedAt}>{dateLabel(entry.changedAt, locale)}</time>{entry.reason ? <span>{entry.reason}</span> : null}</li>)}</ol>}</section>
    </div>
  );
}

export function ProviderAdvertising({ locale, session, authClient, apiOrigin, requestId: selectedRequestId, initialData, initialDetail, load, loadDetail, mutations }: ProviderAdvertisingProps) {
  const copy = getProviderAdvertisingCopy(locale);
  const listLoader = useMemo(() => load ?? createProviderAdvertisingLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const detailLoader = useMemo(() => loadDetail ?? createProviderAdvertisingDetailLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadDetail]);
  const mutationApi = useMemo(() => mutations ?? createProviderAdvertisingMutationApi({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, mutations]);
  const isProvider = session.status === 'authenticated' && session.role === 'provider';
  const [state, setState] = useState<ProviderAdvertisingState>(!isProvider ? 'permission' : initialData === undefined ? 'loading' : (initialData.items.length === 0 ? 'empty' : 'success'));
  const [data, setData] = useState(initialData);
  const [detailState, setDetailState] = useState<ProviderAdvertisingState>(!isProvider ? 'permission' : selectedRequestId === undefined ? 'success' : initialDetail === undefined ? 'loading' : 'success');
  const [detail, setDetail] = useState<ProviderAdRequestProjection | undefined>(initialDetail);
  const [draftStatus, setDraftStatus] = useState<ProviderAdvertisingStatus | 'all'>('all');
  const [appliedStatus, setAppliedStatus] = useState<ProviderAdvertisingStatus | undefined>();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();

  useEffect(() => {
    if (!isProvider) {
      setState('permission');
      return undefined;
    }
    if (selectedRequestId !== undefined) return undefined;
    if (initialData !== undefined && attempt === 0 && page === 1 && appliedStatus === undefined) {
      setData(initialData);
      setState(stateForList(initialData));
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    const query: ProviderAdvertisingQuery = { page, limit: PROVIDER_ADVERTISING_PAGE_LIMIT, ...(appliedStatus === undefined ? {} : { status: appliedStatus }) };
    void listLoader(query, controller.signal).then(nextData => { if (!controller.signal.aborted) { setData(nextData); setState(stateForList(nextData)); } }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [appliedStatus, attempt, initialData, isProvider, listLoader, page, selectedRequestId]);

  useEffect(() => {
    if (!isProvider || selectedRequestId === undefined) {
      setDetailState(selectedRequestId === undefined ? 'success' : 'permission');
      return undefined;
    }
    if (initialDetail !== undefined && attempt === 0) {
      setDetail(initialDetail);
      setDetailState('success');
      return undefined;
    }
    const controller = new AbortController();
    setDetailState('loading');
    void detailLoader(selectedRequestId, controller.signal).then(nextDetail => { if (!controller.signal.aborted) { setDetail(nextDetail); setDetailState('success'); } }).catch(error => { if (!controller.signal.aborted) setDetailState(stateForError(error, true)); });
    return () => controller.abort();
  }, [attempt, detailLoader, initialDetail, isProvider, selectedRequestId]);

  async function saveRequest(input: AdRequestCreate): Promise<void> {
    setMutationBusy(true);
    setMutationError(undefined);
    try {
      await mutationApi.createRequest(input);
      setCreateOpen(false);
      setFeedback(copy.success);
      setAttempt(value => value + 1);
    } catch {
      setMutationError(copy.mutationFailed);
    } finally {
      setMutationBusy(false);
    }
  }

  async function acceptQuote(): Promise<void> {
    if (detail?.quote === undefined) return;
    setMutationBusy(true);
    setMutationError(undefined);
    try {
      await mutationApi.acceptQuote(detail.id, { action: 'accept', expectedVersion: detail.quote.version });
      setFeedback(copy.success);
      setAttempt(value => value + 1);
    } catch {
      setMutationError(copy.mutationFailed);
    } finally {
      setMutationBusy(false);
    }
  }

  async function uploadPaymentProof(file: File): Promise<void> {
    if (detail === undefined) return;
    setMutationBusy(true);
    setMutationError(undefined);
    try {
      await mutationApi.uploadPaymentProof(detail.id, file, file.name);
      setFeedback(copy.paymentProofUploaded);
      setAttempt(value => value + 1);
    } catch {
      setMutationError(copy.mutationFailed);
    } finally {
      setMutationBusy(false);
    }
  }

  const currentState = selectedRequestId === undefined ? state : detailState;
  return (
    <section className="provider-dashboard provider-advertising" data-screen-id="PRV-19" data-route="/provider/ads" data-device-scope="desktop" data-advertising-state={currentState}>
      <ProviderNavigation locale={locale} activePath={selectedRequestId === undefined ? '/provider/ads' : `/provider/ads/${selectedRequestId}`} />
      <div className="provider-dashboard__content">
        {!isProvider ? <StatePanel state="permission" locale={locale} copy={copy} onRetry={() => setAttempt(value => value + 1)} /> : selectedRequestId === undefined ? <>
          <div className="provider-dashboard__heading-row provider-advertising__heading"><div><p className="provider-dashboard__eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></div><Button onClick={() => { setMutationError(undefined); setCreateOpen(true); }}>{copy.create}</Button></div>
          <FilterBar copy={copy} draftStatus={draftStatus} onDraftStatus={setDraftStatus} onApply={() => { setAppliedStatus(draftStatus === 'all' ? undefined : draftStatus); setPage(1); }} onClear={() => { setDraftStatus('all'); setAppliedStatus(undefined); setPage(1); }} />
          {feedback ? <p className="provider-advertising__feedback" role="status">{feedback}</p> : null}
          {state === 'loading' || state === 'error' || state === 'retry' || state === 'permission' ? <StatePanel state={state} locale={locale} copy={copy} onRetry={() => setAttempt(value => value + 1)} /> : null}
          {(state === 'empty' || state === 'success') && data !== undefined ? <section className="provider-advertising__panel" aria-labelledby="provider-advertising-list-heading"><div className="provider-advertising__panel-heading"><div><h2 id="provider-advertising-list-heading">{data.total} {copy.count}</h2><p>{copy.states.success.body}</p></div><Button variant="secondary" size="sm" onClick={() => setAttempt(value => value + 1)}>{copy.refresh}</Button></div>{state === 'empty' ? <div className="provider-advertising__empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p></div> : <RequestTable data={data} locale={locale} copy={copy} />}</section> : null}
        </> : <>
          <div className="provider-advertising__detail-toolbar"><a href={localizedPath(locale, '/provider/ads')}>{copy.backToList}</a></div>
          {feedback ? <p className="provider-advertising__feedback" role="status">{feedback}</p> : null}
          {mutationError ? <p className="provider-advertising__form-error" role="alert">{mutationError}</p> : null}
          {detailState === 'loading' || detailState === 'error' || detailState === 'retry' || detailState === 'permission' || detailState === 'notFound' ? <StatePanel state={detailState} locale={locale} copy={copy} onRetry={() => setAttempt(value => value + 1)} /> : null}
          {detailState === 'success' && detail !== undefined ? <DetailContent detail={detail} locale={locale} copy={copy} busy={mutationBusy} onAccept={() => { void acceptQuote(); }} onUpload={file => { void uploadPaymentProof(file); }} /> : null}
        </>}
      </div>
      {createOpen ? <CreateRequestModal copy={copy} busy={mutationBusy} error={mutationError} onClose={() => setCreateOpen(false)} onSave={saveRequest} /> : null}
    </section>
  );
}

function commissionStateForError(error: unknown): Exclude<ProviderAdvertisingState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function commissionValue(data: ProviderCommissionProjection, locale: SupportedLocale, copy: ProviderAdvertisingCopy): string {
  if (data.source === 'none' || data.kind === undefined) return copy.commission.unavailable;
  if (data.kind === 'percentage' && data.percentageBps !== undefined) return `${(data.percentageBps / 100).toLocaleString(locale)}%`;
  if (data.kind === 'fixed' && data.fixedAmountMinor !== undefined && data.currency !== undefined) return moneyLabel(data.fixedAmountMinor, data.currency, locale);
  return copy.commission.unavailable;
}

function CommissionContent({ data, locale, copy }: { readonly data: ProviderCommissionProjection; readonly locale: SupportedLocale; readonly copy: ProviderAdvertisingCopy }) {
  const sourceLabel = locale === 'ar'
    ? data.source === 'account_override' ? 'تخصيص الحساب' : data.source === 'exception' ? 'استثناء معتمد' : data.source === 'policy' ? 'سياسة إدارية' : copy.commission.unavailable
    : data.source === 'account_override' ? 'Account override' : data.source === 'exception' ? 'Approved exception' : data.source === 'policy' ? 'Administrative policy' : copy.commission.unavailable;
  const kindLabel = data.kind === 'percentage' ? copy.commission.percentage : data.kind === 'fixed' ? copy.commission.fixed : data.kind === 'exempt' ? (locale === 'ar' ? 'معفاة' : 'Exempt') : copy.commission.unavailable;
  return (
    <section className="provider-commission__card" aria-labelledby="provider-commission-card-heading">
      <div className="provider-commission__card-heading"><h2 id="provider-commission-card-heading">{copy.commission.appliedPolicy}</h2><Badge tone={data.source === 'none' ? 'neutral' : 'success'}>{data.source === 'none' ? copy.commission.unavailable : locale === 'ar' ? 'نشطة' : 'Active'}</Badge></div>
      {data.source === 'none' ? <div className="provider-commission__none"><h3>{copy.commission.noneTitle}</h3><p>{copy.commission.noneBody}</p></div> : <><div className="provider-commission__hero"><span>{copy.commission.kind}</span><strong>{commissionValue(data, locale, copy)}</strong><small>{kindLabel}</small></div><dl className="provider-advertising__definition-list"><div><dt>{copy.commission.source}</dt><dd>{sourceLabel}</dd></div><div><dt>{copy.commission.effectiveAt}</dt><dd>{dateLabel(data.effectiveAt, locale)}</dd></div><div><dt>{copy.commission.version}</dt><dd>{data.policyVersion ?? copy.commission.unavailable}</dd></div></dl></>}
      <p className="provider-commission__readonly">{copy.commission.readOnly}</p>
    </section>
  );
}

export function ProviderCommission({ locale, session, authClient, apiOrigin, initialData, load }: ProviderCommissionProps) {
  const copy = getProviderAdvertisingCopy(locale);
  const source = useMemo(() => load ?? createProviderCommissionLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const isProvider = session.status === 'authenticated' && session.role === 'provider';
  const [state, setState] = useState<ProviderAdvertisingState>(!isProvider ? 'permission' : initialData === undefined ? 'loading' : 'success');
  const [data, setData] = useState(initialData);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isProvider) {
      setState('permission');
      return undefined;
    }
    if (initialData !== undefined && attempt === 0) {
      setData(initialData);
      setState('success');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void source(controller.signal).then(nextData => { if (!controller.signal.aborted) { setData(nextData); setState('success'); } }).catch(error => { if (!controller.signal.aborted) setState(commissionStateForError(error)); });
    return () => controller.abort();
  }, [attempt, initialData, isProvider, source]);

  return (
    <section className="provider-dashboard provider-commission" data-screen-id="PRV-20" data-route="/provider/commission" data-device-scope="desktop" data-commission-state={state}>
      <ProviderNavigation locale={locale} activePath="/provider/commission" />
      <div className="provider-dashboard__content">{!isProvider ? <StatePanel state="permission" locale={locale} copy={copy} onRetry={() => setAttempt(value => value + 1)} /> : <><div className="provider-dashboard__heading-row provider-commission__heading"><div><p className="provider-dashboard__eyebrow">{copy.commission.eyebrow}</p><h1>{copy.commission.title}</h1><p>{copy.commission.description}</p></div></div>{state === 'loading' || state === 'error' || state === 'retry' ? <StatePanel state={state} locale={locale} copy={copy} onRetry={() => setAttempt(value => value + 1)} /> : null}{state === 'success' && data !== undefined ? <CommissionContent data={data} locale={locale} copy={copy} /> : null}</>}</div>
    </section>
  );
}
