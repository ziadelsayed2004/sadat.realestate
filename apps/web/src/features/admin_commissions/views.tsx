import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type {
  CommissionAccountCommission,
  CommissionChangeLogListData,
  CommissionConfirmationListData,
  CommissionExceptionListData,
  CommissionExceptionListQuery,
  CommissionPolicyListData,
  CommissionPolicyListQuery,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import {
  commissionAccountOverrideCreateSchema,
  commissionExceptionCreateSchema,
  commissionPolicyCreateSchema,
  type CommissionPolicyKind,
  type CommissionPolicyStatus,
  type CommissionScope
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_COMMISSIONS_ACCOUNT_ROUTE,
  ADMIN_COMMISSIONS_CONFIRMATIONS_ROUTE,
  ADMIN_COMMISSIONS_EXCEPTIONS_NEW_ROUTE,
  ADMIN_COMMISSIONS_EXCEPTIONS_ROUTE,
  ADMIN_COMMISSIONS_HISTORY_ROUTE,
  ADMIN_COMMISSIONS_NEW_ROUTE,
  ADMIN_COMMISSIONS_ROUTE,
  createAdminCommissionsSource,
  type AdminCommissionAccountLoader,
  type AdminCommissionAccountMutation,
  type AdminCommissionAuthorizationSource,
  type AdminCommissionChangeLogLoader,
  type AdminCommissionConfirmationLoader,
  type AdminCommissionExceptionLoader,
  type AdminCommissionExceptionMutation,
  type AdminCommissionPolicyLoader,
  type AdminCommissionPolicyMutation
} from './data.ts';
import { getAdminCommissionsCopy, type AdminCommissionsCopy, type AdminCommissionsState, type AdminCommissionsView } from './copy.ts';
import './styles.css';

export interface AdminCommissionsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminCommissionAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly url?: string | undefined;
  readonly loadPolicies?: AdminCommissionPolicyLoader | undefined;
  readonly createPolicy?: AdminCommissionPolicyMutation | undefined;
  readonly loadAccount?: AdminCommissionAccountLoader | undefined;
  readonly createAccountOverride?: AdminCommissionAccountMutation | undefined;
  readonly loadExceptions?: AdminCommissionExceptionLoader | undefined;
  readonly createException?: AdminCommissionExceptionMutation | undefined;
  readonly loadConfirmations?: AdminCommissionConfirmationLoader | undefined;
  readonly loadChangeLog?: AdminCommissionChangeLogLoader | undefined;
}

interface ViewProjection {
  readonly view: AdminCommissionsView;
  readonly route: string;
  readonly screenId: 'ADM-39' | 'ADM-40' | 'ADM-41' | 'ADM-42' | 'ADM-43' | 'ADM-44' | 'ADM-45';
}

type LoadedPayload =
  | { readonly view: 'policies'; readonly data: CommissionPolicyListData }
  | { readonly view: 'account'; readonly data: CommissionAccountCommission }
  | { readonly view: 'exceptions'; readonly data: CommissionExceptionListData }
  | { readonly view: 'history'; readonly data: CommissionChangeLogListData }
  | { readonly view: 'confirmations'; readonly data: CommissionConfirmationListData };

type FormState = 'idle' | 'saving' | 'success' | 'error' | 'permission';

function pathnameFrom(url: string | undefined): string {
  if (typeof window !== 'undefined') return new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  if (url !== undefined) return new URL(url, 'http://sadat-real-estate.local').pathname.replace(/\/+$/u, '') || '/';
  return ADMIN_COMMISSIONS_ROUTE;
}

function searchParamsFrom(url: string | undefined): URLSearchParams {
  if (typeof window !== 'undefined') return new URL(window.location.href).searchParams;
  return new URL(url ?? ADMIN_COMMISSIONS_ROUTE, 'http://sadat-real-estate.local').searchParams;
}

function projectionForPath(pathname: string): ViewProjection {
  if (pathname === ADMIN_COMMISSIONS_NEW_ROUTE) return { view: 'newPolicy', route: pathname, screenId: 'ADM-40' };
  if (pathname === ADMIN_COMMISSIONS_HISTORY_ROUTE) return { view: 'history', route: pathname, screenId: 'ADM-41' };
  if (pathname === ADMIN_COMMISSIONS_ACCOUNT_ROUTE) return { view: 'account', route: pathname, screenId: 'ADM-42' };
  if (pathname === ADMIN_COMMISSIONS_EXCEPTIONS_ROUTE) return { view: 'exceptions', route: pathname, screenId: 'ADM-43' };
  if (pathname === ADMIN_COMMISSIONS_EXCEPTIONS_NEW_ROUTE) return { view: 'newException', route: pathname, screenId: 'ADM-44' };
  if (pathname === ADMIN_COMMISSIONS_CONFIRMATIONS_ROUTE) return { view: 'confirmations', route: pathname, screenId: 'ADM-45' };
  return { view: 'policies', route: ADMIN_COMMISSIONS_ROUTE, screenId: 'ADM-39' };
}

function localePath(locale: SupportedLocale, path: string): string {
  const next = new URL(path, 'http://sadat-real-estate.local');
  next.searchParams.set('lang', locale);
  return `${next.pathname}${next.search}${next.hash}`;
}

function dateLabel(value: string | undefined, locale: SupportedLocale): string {
  if (value === undefined) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function stateForError(error: unknown, detail = false): Exclude<AdminCommissionsState, 'loading' | 'empty' | 'success'> {
  if (detail && error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForList<T extends { items: readonly unknown[] }>(data: T): AdminCommissionsState {
  return data.items.length === 0 ? 'empty' : 'success';
}

function permissionFor(authClient: AdminCommissionAuthorizationSource | undefined, action: string, fallback: boolean): boolean {
  const candidate = authClient as (AdminCommissionAuthorizationSource & {
    readonly hasAvailableAction?: (name: string) => boolean;
    readonly getSnapshot?: () => { readonly availableActions?: readonly string[] };
  }) | undefined;
  if (candidate?.hasAvailableAction === undefined) return fallback;
  const availableActions = candidate.getSnapshot?.().availableActions;
  return availableActions !== undefined && availableActions.length === 0 ? fallback : candidate.hasAvailableAction(action);
}

function numberInput(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function dateInput(value: string): string | undefined {
  if (value.trim() === '') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function stateMessage(copy: AdminCommissionsCopy, state: Exclude<AdminCommissionsState, 'success'>): { title: string; body: string } {
  return copy.states[state];
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminCommissionsState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminCommissionsCopy(locale);
  const message = stateMessage(copy, state);
  return (
    <section className="admin-commissions__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state === 'permission' ? 'permission' : state === 'loading' ? 'loading' : state === 'retry' ? 'retry' : 'error'} title={message.title} message={message.body} retryLabel={copy.actions.retry} onRetry={state === 'retry' ? onRetry : undefined} />
      {state === 'error' ? <Button size="sm" variant="secondary" onClick={onRetry}>{copy.actions.retry}</Button> : null}
    </section>
  );
}

function EmptyPanel({ locale }: { readonly locale: SupportedLocale }) {
  const copy = getAdminCommissionsCopy(locale);
  return <section className="admin-commissions__state" data-state="empty"><StateMessage state="empty" title={copy.states.empty.title} message={copy.states.empty.body} /></section>;
}

function NotFoundPanel({ locale }: { readonly locale: SupportedLocale }) {
  const copy = getAdminCommissionsCopy(locale);
  return <section className="admin-commissions__state" data-state="not_found" role="alert"><StateMessage state="error" title={copy.states.not_found.title} message={copy.states.not_found.body} /></section>;
}

function Pagination({ page, limit, total, locale, onPrevious, onNext }: { readonly page: number; readonly limit: number; readonly total: number; readonly locale: SupportedLocale; readonly onPrevious: () => void; readonly onNext: () => void }) {
  const copy = getAdminCommissionsCopy(locale);
  const pages = Math.max(1, Math.ceil(total / limit));
  return <div className="admin-commissions__pagination"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={onPrevious}>{copy.actions.previous}</Button><span aria-live="polite">{copy.page(page, pages)}</span><Button size="sm" variant="secondary" disabled={page >= pages} onClick={onNext}>{copy.actions.next}</Button></div>;
}

function Header({ copy, projection }: { readonly copy: AdminCommissionsCopy; readonly projection: ViewProjection }) {
  return <header className="admin-commissions__heading"><div><p className="admin-commissions__eyebrow">{copy.eyebrow}</p><h1>{copy.titles[projection.view]}</h1><p>{copy.descriptions[projection.view]}</p></div><span className="admin-commissions__scope-note">Desktop</span></header>;
}

function Tabs({ copy, locale, route }: { readonly copy: AdminCommissionsCopy; readonly locale: SupportedLocale; readonly route: string }) {
  return <nav className="admin-commissions__tabs" aria-label={copy.eyebrow}>{copy.tabs.map(([path, label]) => <a key={path} href={localePath(locale, path)} aria-current={route === path ? 'page' : undefined} data-active={route === path || undefined}>{label}</a>)}</nav>;
}

function Badge({ children, tone = 'neutral' }: { readonly children: ReactNode; readonly tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className="admin-commissions__badge" data-tone={tone}>{children}</span>;
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'active' || status === 'acknowledged') return 'success';
  if (status === 'draft' || status === 'inactive' || status === 'superseded') return 'warning';
  if (status === 'revoked' || status === 'archived') return 'danger';
  return 'info';
}

function PolicyTable({ data, locale, onPage }: { readonly data: CommissionPolicyListData; readonly locale: SupportedLocale; readonly onPage: (page: number) => void }) {
  const copy = getAdminCommissionsCopy(locale);
  return <section className="admin-commissions__panel"><div className="admin-commissions__panel-heading"><div><h2>{copy.titles.policies}</h2><p>{copy.count(data.total)}</p></div><span>{copy.labels.value}</span></div><div className="admin-commissions__table-wrap"><table className="admin-commissions__table"><thead><tr><th scope="col">{copy.labels.key}</th><th scope="col">{copy.labels.label}</th><th scope="col">{copy.labels.scope}</th><th scope="col">{copy.labels.kind}</th><th scope="col">{copy.labels.value}</th><th scope="col">{copy.labels.status}</th><th scope="col">{copy.labels.effectiveFrom}</th><th scope="col">{copy.labels.version}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id} data-testid={`admin-commission-policy-${item.id}`}><td><code>{item.key}</code></td><td>{item.label}</td><td>{copy.scopes[item.scope.kind]}{item.scope.key === undefined ? '' : `: ${item.scope.key}`}</td><td>{copy.kinds[item.kind]}</td><td>{copy.value(item.kind, item.percentageBps, item.fixedAmountMinor, item.currency)}</td><td><Badge tone={statusTone(item.status)}>{copy.statuses[item.status]}</Badge></td><td>{dateLabel(item.effectiveFrom, locale)}</td><td>{item.version}</td></tr>)}</tbody></table></div><Pagination page={data.page} limit={data.limit} total={data.total} locale={locale} onPrevious={() => onPage(data.page - 1)} onNext={() => onPage(data.page + 1)} /></section>;
}

function ExceptionTable({ data, locale, onPage }: { readonly data: CommissionExceptionListData; readonly locale: SupportedLocale; readonly onPage: (page: number) => void }) {
  const copy = getAdminCommissionsCopy(locale);
  return <section className="admin-commissions__panel"><div className="admin-commissions__panel-heading"><div><h2>{copy.titles.exceptions}</h2><p>{copy.count(data.total)}</p></div></div><div className="admin-commissions__table-wrap"><table className="admin-commissions__table"><thead><tr><th scope="col">{copy.labels.accountId}</th><th scope="col">{copy.labels.kind}</th><th scope="col">{copy.labels.value}</th><th scope="col">{copy.labels.reason}</th><th scope="col">{copy.labels.status}</th><th scope="col">{copy.labels.effectiveFrom}</th><th scope="col">{copy.labels.version}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id} data-testid={`admin-commission-exception-${item.id}`}><td><code>{item.accountId}</code></td><td>{copy.kinds[item.kind]}</td><td>{copy.value(item.kind, item.percentageBps, item.fixedAmountMinor, item.currency)}</td><td>{item.reason}</td><td><Badge tone={statusTone(item.status)}>{copy.statuses[item.status]}</Badge></td><td>{dateLabel(item.effectiveFrom, locale)}</td><td>{item.version}</td></tr>)}</tbody></table></div><Pagination page={data.page} limit={data.limit} total={data.total} locale={locale} onPrevious={() => onPage(data.page - 1)} onNext={() => onPage(data.page + 1)} /></section>;
}

function HistoryTable({ data, locale, onPage }: { readonly data: CommissionChangeLogListData; readonly locale: SupportedLocale; readonly onPage: (page: number) => void }) {
  const copy = getAdminCommissionsCopy(locale);
  return <section className="admin-commissions__panel"><div className="admin-commissions__panel-heading"><div><h2>{copy.titles.history}</h2><p>{copy.count(data.total)}</p></div><span>{copy.labels.reason}</span></div><div className="admin-commissions__table-wrap"><table className="admin-commissions__table"><thead><tr><th scope="col">{copy.labels.targetType}</th><th scope="col">{copy.labels.targetId}</th><th scope="col">{copy.labels.action}</th><th scope="col">{copy.labels.reason}</th><th scope="col">{copy.labels.effectiveFrom}</th><th scope="col">{copy.labels.createdAt}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id} data-testid={`admin-commission-change-${item.id}`}><td>{copy.targetTypes[item.targetType]}</td><td><code>{item.targetId}</code></td><td><Badge tone="info">{item.action}</Badge></td><td>{item.reason}</td><td>{dateLabel(item.effectiveFrom, locale)}</td><td>{dateLabel(item.createdAt, locale)}</td></tr>)}</tbody></table></div><Pagination page={data.page} limit={data.limit} total={data.total} locale={locale} onPrevious={() => onPage(data.page - 1)} onNext={() => onPage(data.page + 1)} /></section>;
}

function ConfirmationTable({ data, locale, onPage }: { readonly data: CommissionConfirmationListData; readonly locale: SupportedLocale; readonly onPage: (page: number) => void }) {
  const copy = getAdminCommissionsCopy(locale);
  return <section className="admin-commissions__panel"><div className="admin-commissions__panel-heading"><div><h2>{copy.titles.confirmations}</h2><p>{copy.count(data.total)}</p></div></div><div className="admin-commissions__table-wrap"><table className="admin-commissions__table"><thead><tr><th scope="col">{copy.labels.accountId}</th><th scope="col">{copy.labels.source}</th><th scope="col">{copy.labels.policyVersion}</th><th scope="col">{copy.labels.status}</th><th scope="col">{copy.labels.effectiveAt}</th><th scope="col">{copy.labels.acknowledgedAt}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id} data-testid={`admin-commission-confirmation-${item.id}`}><td><code>{item.accountId}</code></td><td>{copy.sources[item.source]}</td><td>{item.policyVersion}</td><td><Badge tone={statusTone(item.status)}>{item.status}</Badge></td><td>{dateLabel(item.effectiveAt, locale)}</td><td>{dateLabel(item.acknowledgedAt, locale)}</td></tr>)}</tbody></table></div><Pagination page={data.page} limit={data.limit} total={data.total} locale={locale} onPrevious={() => onPage(data.page - 1)} onNext={() => onPage(data.page + 1)} /></section>;
}

function FormField({ id, label, children }: { readonly id: string; readonly label: ReactNode; readonly children: ReactNode }) {
  return <label className="admin-commissions__field" htmlFor={id}><span>{label}</span>{children}</label>;
}

function MutationFeedback({ state, locale, error }: { readonly state: FormState; readonly locale: SupportedLocale; readonly error?: string | undefined }) {
  const copy = getAdminCommissionsCopy(locale);
  if (state === 'success') return <p className="admin-commissions__feedback" data-tone="success" role="status">{copy.saved}</p>;
  if (state === 'permission') return <p className="admin-commissions__feedback" data-tone="error" role="alert">{copy.states.permission.body}</p>;
  if (state === 'error') return <p className="admin-commissions__feedback" data-tone="error" role="alert">{error ?? copy.states.error.body}</p>;
  return null;
}

function PolicyForm({ locale, canManage, create }: { readonly locale: SupportedLocale; readonly canManage: boolean; readonly create: AdminCommissionPolicyMutation }) {
  const copy = getAdminCommissionsCopy(locale);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<CommissionPolicyKind>('percentage');
  const [scopeKind, setScopeKind] = useState<CommissionScope['kind']>('default');
  const [scopeKey, setScopeKey] = useState('');
  const [percentageBps, setPercentageBps] = useState('');
  const [fixedAmountMinor, setFixedAmountMinor] = useState('');
  const [currency, setCurrency] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | undefined>();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(undefined);
    const payload: Record<string, unknown> = { key, label, kind, scope: { kind: scopeKind, ...(scopeKind === 'default' ? {} : { key: scopeKey }) }, effectiveFrom: dateInput(effectiveFrom), ...(dateInput(effectiveTo) === undefined ? {} : { effectiveTo: dateInput(effectiveTo) }) };
    if (kind === 'percentage') payload.percentageBps = numberInput(percentageBps);
    if (kind === 'fixed') { payload.fixedAmountMinor = numberInput(fixedAmountMinor); payload.currency = currency.trim().toUpperCase(); }
    const parsed = commissionPolicyCreateSchema.safeParse(payload);
    if (!parsed.success) { setState('error'); setError(parsed.error.issues[0]?.message ?? copy.validation); return; }
    if (!canManage) { setState('permission'); return; }
    setState('saving');
    try { await create(parsed.data); setState('success'); } catch (cause) { setState(cause instanceof ApiClientError && (cause.status === 401 || cause.status === 403) ? 'permission' : 'error'); setError(cause instanceof Error ? cause.message : copy.states.error.body); }
  }

  return <form className="admin-commissions__form" onSubmit={event => { void submit(event); }} aria-describedby="admin-commission-policy-help"><p id="admin-commission-policy-help" className="admin-commissions__form-note">{copy.descriptions.newPolicy}</p><div className="admin-commissions__form-grid"><FormField id="admin-commission-policy-key" label={copy.labels.key}><input id="admin-commission-policy-key" value={key} onChange={event => setKey(event.target.value)} required pattern="[a-z][a-z0-9_.-]*" /></FormField><FormField id="admin-commission-policy-label" label={copy.labels.label}><input id="admin-commission-policy-label" value={label} onChange={event => setLabel(event.target.value)} required /></FormField><FormField id="admin-commission-policy-kind" label={copy.labels.kind}><select id="admin-commission-policy-kind" value={kind} onChange={event => setKind(event.target.value as CommissionPolicyKind)}>{(['percentage', 'fixed', 'exempt'] as const).map(value => <option key={value} value={value}>{copy.kinds[value]}</option>)}</select></FormField><FormField id="admin-commission-policy-scope" label={copy.labels.scope}><select id="admin-commission-policy-scope" value={scopeKind} onChange={event => setScopeKind(event.target.value as CommissionScope['kind'])}>{(['default', 'provider_type', 'transaction_type', 'property_kind', 'organization', 'account'] as const).map(value => <option key={value} value={value}>{copy.scopes[value]}</option>)}</select></FormField>{scopeKind !== 'default' ? <FormField id="admin-commission-policy-scope-key" label={copy.labels.scopeKey}><input id="admin-commission-policy-scope-key" value={scopeKey} onChange={event => setScopeKey(event.target.value)} required /></FormField> : null}{kind === 'percentage' ? <FormField id="admin-commission-policy-percentage" label={copy.labels.percentageBps}><input id="admin-commission-policy-percentage" type="number" min="0" max="10000" step="1" value={percentageBps} onChange={event => setPercentageBps(event.target.value)} required /></FormField> : null}{kind === 'fixed' ? <><FormField id="admin-commission-policy-amount" label={copy.labels.amountMinor}><input id="admin-commission-policy-amount" type="number" min="0" step="1" value={fixedAmountMinor} onChange={event => setFixedAmountMinor(event.target.value)} required /></FormField><FormField id="admin-commission-policy-currency" label={copy.labels.currency}><input id="admin-commission-policy-currency" value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} minLength={3} maxLength={3} required /></FormField></> : null}<FormField id="admin-commission-policy-effective-from" label={copy.labels.effectiveFrom}><input id="admin-commission-policy-effective-from" type="datetime-local" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} required /></FormField><FormField id="admin-commission-policy-effective-to" label={copy.labels.effectiveTo}><input id="admin-commission-policy-effective-to" type="datetime-local" value={effectiveTo} onChange={event => setEffectiveTo(event.target.value)} /></FormField></div><MutationFeedback state={state} locale={locale} error={error} /><Button type="submit" loading={state === 'saving'} disabled={!canManage}>{copy.actions.save}</Button></form>;
}

function ExceptionForm({ locale, canManage, create }: { readonly locale: SupportedLocale; readonly canManage: boolean; readonly create: AdminCommissionExceptionMutation }) {
  const copy = getAdminCommissionsCopy(locale);
  const [accountId, setAccountId] = useState('');
  const [kind, setKind] = useState<CommissionPolicyKind>('percentage');
  const [percentageBps, setPercentageBps] = useState('');
  const [fixedAmountMinor, setFixedAmountMinor] = useState('');
  const [currency, setCurrency] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | undefined>();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(undefined);
    const payload: Record<string, unknown> = { accountId, kind, reason, effectiveFrom: dateInput(effectiveFrom), ...(dateInput(effectiveTo) === undefined ? {} : { effectiveTo: dateInput(effectiveTo) }) };
    if (kind === 'percentage') payload.percentageBps = numberInput(percentageBps);
    if (kind === 'fixed') { payload.fixedAmountMinor = numberInput(fixedAmountMinor); payload.currency = currency.trim().toUpperCase(); }
    const parsed = commissionExceptionCreateSchema.safeParse(payload);
    if (!parsed.success) { setState('error'); setError(parsed.error.issues[0]?.message ?? copy.validation); return; }
    if (!canManage) { setState('permission'); return; }
    setState('saving');
    try { await create(parsed.data); setState('success'); } catch (cause) { setState(cause instanceof ApiClientError && (cause.status === 401 || cause.status === 403) ? 'permission' : 'error'); setError(cause instanceof Error ? cause.message : copy.states.error.body); }
  }

  return <form className="admin-commissions__form" onSubmit={event => { void submit(event); }} aria-describedby="admin-commission-exception-help"><p id="admin-commission-exception-help" className="admin-commissions__form-note">{copy.descriptions.newException}</p><div className="admin-commissions__form-grid"><FormField id="admin-commission-exception-account" label={copy.labels.accountId}><input id="admin-commission-exception-account" value={accountId} onChange={event => setAccountId(event.target.value)} pattern="[a-f0-9]{24}" required /></FormField><FormField id="admin-commission-exception-kind" label={copy.labels.kind}><select id="admin-commission-exception-kind" value={kind} onChange={event => setKind(event.target.value as CommissionPolicyKind)}>{(['percentage', 'fixed', 'exempt'] as const).map(value => <option key={value} value={value}>{copy.kinds[value]}</option>)}</select></FormField>{kind === 'percentage' ? <FormField id="admin-commission-exception-percentage" label={copy.labels.percentageBps}><input id="admin-commission-exception-percentage" type="number" min="0" max="10000" step="1" value={percentageBps} onChange={event => setPercentageBps(event.target.value)} required /></FormField> : null}{kind === 'fixed' ? <><FormField id="admin-commission-exception-amount" label={copy.labels.amountMinor}><input id="admin-commission-exception-amount" type="number" min="0" step="1" value={fixedAmountMinor} onChange={event => setFixedAmountMinor(event.target.value)} required /></FormField><FormField id="admin-commission-exception-currency" label={copy.labels.currency}><input id="admin-commission-exception-currency" value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} minLength={3} maxLength={3} required /></FormField></> : null}<FormField id="admin-commission-exception-reason" label={copy.labels.reason}><textarea id="admin-commission-exception-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={2} maxLength={500} required /></FormField><FormField id="admin-commission-exception-effective-from" label={copy.labels.effectiveFrom}><input id="admin-commission-exception-effective-from" type="datetime-local" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} required /></FormField><FormField id="admin-commission-exception-effective-to" label={copy.labels.effectiveTo}><input id="admin-commission-exception-effective-to" type="datetime-local" value={effectiveTo} onChange={event => setEffectiveTo(event.target.value)} /></FormField></div><MutationFeedback state={state} locale={locale} error={error} /><Button type="submit" loading={state === 'saving'} disabled={!canManage}>{copy.actions.save}</Button></form>;
}

function AccountForm({ locale, accountId, canManage, create }: { readonly locale: SupportedLocale; readonly accountId: string; readonly canManage: boolean; readonly create: AdminCommissionAccountMutation }) {
  const copy = getAdminCommissionsCopy(locale);
  const [kind, setKind] = useState<CommissionPolicyKind>('percentage');
  const [percentageBps, setPercentageBps] = useState('');
  const [fixedAmountMinor, setFixedAmountMinor] = useState('');
  const [currency, setCurrency] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | undefined>();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(undefined);
    const payload: Record<string, unknown> = { kind, effectiveFrom: dateInput(effectiveFrom), ...(dateInput(effectiveTo) === undefined ? {} : { effectiveTo: dateInput(effectiveTo) }) };
    if (kind === 'percentage') payload.percentageBps = numberInput(percentageBps);
    if (kind === 'fixed') { payload.fixedAmountMinor = numberInput(fixedAmountMinor); payload.currency = currency.trim().toUpperCase(); }
    const parsed = commissionAccountOverrideCreateSchema.safeParse(payload);
    if (!parsed.success) { setState('error'); setError(parsed.error.issues[0]?.message ?? copy.validation); return; }
    if (!canManage) { setState('permission'); return; }
    setState('saving');
    try { await create(accountId, parsed.data); setState('success'); } catch (cause) { setState(cause instanceof ApiClientError && (cause.status === 401 || cause.status === 403) ? 'permission' : 'error'); setError(cause instanceof Error ? cause.message : copy.states.error.body); }
  }

  return <section className="admin-commissions__subpanel"><h2>{copy.actions.create}</h2><form className="admin-commissions__form" onSubmit={event => { void submit(event); }}><div className="admin-commissions__form-grid"><FormField id="admin-commission-account-kind" label={copy.labels.kind}><select id="admin-commission-account-kind" value={kind} onChange={event => setKind(event.target.value as CommissionPolicyKind)}>{(['percentage', 'fixed', 'exempt'] as const).map(value => <option key={value} value={value}>{copy.kinds[value]}</option>)}</select></FormField>{kind === 'percentage' ? <FormField id="admin-commission-account-percentage" label={copy.labels.percentageBps}><input id="admin-commission-account-percentage" type="number" min="0" max="10000" step="1" value={percentageBps} onChange={event => setPercentageBps(event.target.value)} required /></FormField> : null}{kind === 'fixed' ? <><FormField id="admin-commission-account-amount" label={copy.labels.amountMinor}><input id="admin-commission-account-amount" type="number" min="0" step="1" value={fixedAmountMinor} onChange={event => setFixedAmountMinor(event.target.value)} required /></FormField><FormField id="admin-commission-account-currency" label={copy.labels.currency}><input id="admin-commission-account-currency" value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} minLength={3} maxLength={3} required /></FormField></> : null}<FormField id="admin-commission-account-effective-from" label={copy.labels.effectiveFrom}><input id="admin-commission-account-effective-from" type="datetime-local" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} required /></FormField><FormField id="admin-commission-account-effective-to" label={copy.labels.effectiveTo}><input id="admin-commission-account-effective-to" type="datetime-local" value={effectiveTo} onChange={event => setEffectiveTo(event.target.value)} /></FormField></div><MutationFeedback state={state} locale={locale} error={error} /><Button type="submit" loading={state === 'saving'} disabled={!canManage}>{copy.actions.save}</Button></form></section>;
}

function AccountSummary({ data, locale }: { readonly data: CommissionAccountCommission; readonly locale: SupportedLocale }) {
  const copy = getAdminCommissionsCopy(locale);
  return <section className="admin-commissions__panel"><div className="admin-commissions__panel-heading"><div><h2>{copy.titles.account}</h2><p><code>{data.accountId}</code></p></div><Badge tone={data.source === 'none' ? 'warning' : 'success'}>{copy.sources[data.source]}</Badge></div><dl className="admin-commissions__details"><div><dt>{copy.labels.source}</dt><dd>{copy.sources[data.source]}</dd></div><div><dt>{copy.labels.effectiveAt}</dt><dd>{dateLabel(data.effectiveAt, locale)}</dd></div><div><dt>{copy.labels.kind}</dt><dd>{data.kind === undefined ? '—' : copy.kinds[data.kind]}</dd></div><div><dt>{copy.labels.value}</dt><dd>{data.kind === undefined ? '—' : copy.value(data.kind, data.percentageBps, data.fixedAmountMinor, data.currency)}</dd></div><div><dt>{copy.labels.policyVersion}</dt><dd>{data.policyVersion ?? '—'}</dd></div></dl></section>;
}

function FilterBar({ view, locale, status, scopeKind, onStatus, onScopeKind, onApply }: { readonly view: 'policies' | 'exceptions'; readonly locale: SupportedLocale; readonly status: string; readonly scopeKind?: string; readonly onStatus: (value: string) => void; readonly onScopeKind?: (value: string) => void; readonly onApply: () => void }) {
  const copy = getAdminCommissionsCopy(locale);
  return <form className="admin-commissions__filters" role="search" aria-label={copy.eyebrow} onSubmit={event => { event.preventDefault(); onApply(); }}><FormField id={`admin-commission-${view}-status`} label={copy.labels.status}><select id={`admin-commission-${view}-status`} value={status} onChange={event => onStatus(event.target.value)}><option value="">—</option>{(['draft', 'active', 'inactive', 'archived'] as const).map(value => <option key={value} value={value}>{copy.statuses[value]}</option>)}</select></FormField>{view === 'policies' && onScopeKind !== undefined ? <FormField id="admin-commission-policy-scope-filter" label={copy.labels.scope}><select id="admin-commission-policy-scope-filter" value={scopeKind ?? ''} onChange={event => onScopeKind(event.target.value)}><option value="">—</option>{(['default', 'provider_type', 'transaction_type', 'property_kind', 'organization', 'account'] as const).map(value => <option key={value} value={value}>{copy.scopes[value]}</option>)}</select></FormField> : null}<Button type="submit" size="sm">{copy.actions.apply}</Button></form>;
}

export function AdminCommissions({ locale, session, authClient, apiOrigin, url, loadPolicies: providedPolicies, createPolicy: providedCreatePolicy, loadAccount: providedAccount, createAccountOverride: providedCreateAccountOverride, loadExceptions: providedExceptions, createException: providedCreateException, loadConfirmations: providedConfirmations, loadChangeLog: providedChangeLog }: AdminCommissionsProps) {
  const copy = getAdminCommissionsCopy(locale);
  const pathname = pathnameFrom(url);
  const projection = projectionForPath(pathname);
  const search = searchParamsFrom(url);
  const initialAccountId = search.get('accountId') ?? '';
  const source = useMemo(() => createAdminCommissionsSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient]);
  const loadPolicies = providedPolicies ?? source.loadPolicies;
  const createPolicy = providedCreatePolicy ?? source.createPolicy;
  const loadAccount = providedAccount ?? source.loadAccount;
  const createAccountOverride = providedCreateAccountOverride ?? source.createAccountOverride;
  const loadExceptions = providedExceptions ?? source.loadExceptions;
  const createException = providedCreateException ?? source.createException;
  const loadConfirmations = providedConfirmations ?? source.loadConfirmations;
  const loadChangeLog = providedChangeLog ?? source.loadChangeLog;
  const [state, setState] = useState<AdminCommissionsState>('loading');
  const [payload, setPayload] = useState<LoadedPayload | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [accountId, setAccountId] = useState(initialAccountId);
  const [accountInput, setAccountInput] = useState(initialAccountId);
  const [policyStatus, setPolicyStatus] = useState<CommissionPolicyStatus | ''>('');
  const [policyScope, setPolicyScope] = useState<NonNullable<CommissionPolicyListQuery['scopeKind']> | ''>('');
  const [exceptionStatus, setExceptionStatus] = useState<NonNullable<CommissionExceptionListQuery['status']> | ''>('');
  const canView = session.status === 'authenticated' && session.role === 'admin' && permissionFor(authClient, 'admin:commissions.view', true);
  const canManage = session.status === 'authenticated' && session.role === 'admin' && permissionFor(authClient, 'admin:commissions.manage', true);

  useEffect(() => {
    const controller = new AbortController();
    if (!canView) { setPayload(undefined); setState('permission'); return () => controller.abort(); }
    if (projection.view === 'newPolicy' || projection.view === 'newException') { setPayload(undefined); setState('success'); return () => controller.abort(); }
    if (projection.view === 'account' && !/^[a-f0-9]{24}$/u.test(accountId)) { setPayload(undefined); setState('not_found'); return () => controller.abort(); }
    setState('loading');
    const run = async (): Promise<void> => {
      try {
        if (projection.view === 'policies') {
          const data = await loadPolicies({ page, limit: 20, ...(policyStatus === '' ? {} : { status: policyStatus }), ...(policyScope === '' ? {} : { scopeKind: policyScope }) }, controller.signal);
          setPayload({ view: 'policies', data }); setState(stateForList(data));
        } else if (projection.view === 'account') {
          const data = await loadAccount(accountId, undefined, controller.signal);
          setPayload({ view: 'account', data }); setState('success');
        } else if (projection.view === 'exceptions') {
          const data = await loadExceptions({ page, limit: 20, ...(exceptionStatus === '' ? {} : { status: exceptionStatus }) }, controller.signal);
          setPayload({ view: 'exceptions', data }); setState(stateForList(data));
        } else if (projection.view === 'history') {
          const data = await loadChangeLog({ page, limit: 25 }, controller.signal);
          setPayload({ view: 'history', data }); setState(stateForList(data));
        } else {
          const data = await loadConfirmations({ page, limit: 20 }, controller.signal);
          setPayload({ view: 'confirmations', data }); setState(stateForList(data));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPayload(undefined); setState(stateForError(error, projection.view === 'account'));
      }
    };
    void run();
    return () => controller.abort();
  }, [accountId, attempt, canView, exceptionStatus, loadAccount, loadChangeLog, loadConfirmations, loadExceptions, loadPolicies, page, policyScope, policyStatus, projection.view]);

  useEffect(() => {
    setPage(1);
  }, [exceptionStatus, policyScope, policyStatus, projection.view]);

  function applyAccount(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = accountInput.trim();
    setAccountId(value);
    const next = new URL(typeof window === 'undefined' ? url ?? ADMIN_COMMISSIONS_ACCOUNT_ROUTE : window.location.href, 'http://sadat-real-estate.local');
    if (value) next.searchParams.set('accountId', value); else next.searchParams.delete('accountId');
    if (typeof window !== 'undefined') window.history.replaceState({}, '', `${next.pathname}${next.search}`);
    setAttempt(current => current + 1);
  }

  const retry = () => setAttempt(value => value + 1);
  const body = state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={retry} /> : state === 'not_found' ? <NotFoundPanel locale={locale} /> : state === 'empty' ? <EmptyPanel locale={locale} /> : null;
  const listBody = state === 'success' && payload?.view === 'policies' ? <PolicyTable data={payload.data} locale={locale} onPage={setPage} /> : state === 'success' && payload?.view === 'exceptions' ? <ExceptionTable data={payload.data} locale={locale} onPage={setPage} /> : state === 'success' && payload?.view === 'history' ? <HistoryTable data={payload.data} locale={locale} onPage={setPage} /> : state === 'success' && payload?.view === 'confirmations' ? <ConfirmationTable data={payload.data} locale={locale} onPage={setPage} /> : state === 'success' && payload?.view === 'account' ? <><AccountSummary data={payload.data} locale={locale} />{accountId !== '' ? <AccountForm locale={locale} accountId={accountId} canManage={canManage} create={createAccountOverride} /> : null}</> : null;

  return <section className="admin-commissions" data-screen-id={projection.screenId} data-route={projection.route} data-device-scope="desktop"><AdminNavigation locale={locale} activePath={projection.route} /><div className="admin-commissions__content"><Header copy={copy} projection={projection} /><Tabs copy={copy} locale={locale} route={projection.route} />{projection.view === 'policies' ? <FilterBar view="policies" locale={locale} status={policyStatus} scopeKind={policyScope} onStatus={value => setPolicyStatus(value as CommissionPolicyStatus | '')} onScopeKind={value => setPolicyScope(value as NonNullable<CommissionPolicyListQuery['scopeKind']> | '')} onApply={retry} /> : null}{projection.view === 'exceptions' ? <FilterBar view="exceptions" locale={locale} status={exceptionStatus} onStatus={value => setExceptionStatus(value as NonNullable<CommissionExceptionListQuery['status']> | '')} onApply={retry} /> : null}{projection.view === 'account' ? <form className="admin-commissions__account-search" role="search" aria-label={copy.labels.accountId} onSubmit={applyAccount}><FormField id="admin-commission-account-search" label={copy.labels.accountId}><input id="admin-commission-account-search" value={accountInput} onChange={event => setAccountInput(event.target.value)} pattern="[a-f0-9]{24}" /></FormField><Button type="submit" size="sm">{copy.actions.apply}</Button></form> : null}{projection.view !== 'newPolicy' && projection.view !== 'newException' ? body : null}{projection.view !== 'newPolicy' && projection.view !== 'newException' ? listBody : null}{projection.view === 'newPolicy' ? <section className="admin-commissions__panel" data-state="success"><PolicyForm locale={locale} canManage={canManage} create={createPolicy} /></section> : null}{projection.view === 'newException' ? <section className="admin-commissions__panel" data-state="success"><ExceptionForm locale={locale} canManage={canManage} create={createException} /></section> : null}</div></section>;
}
