import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  accountObjectIdSchema,
  accountReportResolveSchema,
  type AccountReportData,
  type AccountReportListData,
  type AccountReportListQuery,
  type AccountTransitionData,
  type AccountTransitionRequest,
  type AdminAccountUserData,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import {
  createAdminAccountReportResolver,
  createAdminAccountReportsLoader,
  createAdminAccountTransitionLoader,
  createAdminUserLoader,
  type AdminAccountReportResolver,
  type AdminAccountsAuthorizationSource,
  type AdminAccountReportsLoader,
  type AdminAccountTransitionLoader,
  type AdminUserLoader
} from './data.ts';
import { getAdminAccountReportsCopy } from './reports-copy.ts';
import './styles.css';

export type AdminAccountReportsView = 'reports' | 'restrictions';

export interface AdminAccountReportsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly view: AdminAccountReportsView;
  readonly reportId?: string | undefined;
  readonly accountId?: string | undefined;
  readonly authClient?: AdminAccountsAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: AccountReportListData | undefined;
  readonly initialAccountData?: AdminAccountUserData | undefined;
  readonly initialState?: 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | undefined;
  readonly loadReports?: AdminAccountReportsLoader | undefined;
  readonly loadAccount?: AdminUserLoader | undefined;
  readonly resolveReport?: AdminAccountReportResolver | undefined;
  readonly transitionAccount?: AdminAccountTransitionLoader | undefined;
}

type ReportStatusFilter = 'all' | NonNullable<AccountReportListQuery['status']>;
type ReportState = NonNullable<AdminAccountReportsProps['initialState']> | 'success';

function localePath(locale: SupportedLocale, path: string, parameters: Readonly<Record<string, string>> = {}): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function numberLabel(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}

function stateForError(error: unknown, detail: boolean): Exclude<ReportState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (detail && error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function toneFor(value: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (value === 'resolved' || value === 'verify') return 'success';
  if (value === 'open' || value === 'in_review' || value === 'needs_information') return 'warning';
  if (value === 'dismissed' || value === 'rejected' || value === 'suspended' || value === 'restricted') return 'error';
  return value === 'draft' ? 'info' : 'neutral';
}

function StatusBadge({ label, value }: { readonly label: string; readonly value: string }) {
  return <span className="admin-accounts__badge" data-tone={toneFor(value)} data-status={value}>{label}</span>;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ReportState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminAccountReportsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="admin-accounts__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function ReportFieldGrid({ fields }: { readonly fields: ReadonlyArray<readonly [string, ReactNode]> }) {
  return <dl className="admin-accounts__detail-grid">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function reportSearchValue(report: AccountReportData): string {
  return `${report.id} ${report.accountId} ${report.reason} ${report.details ?? ''} ${report.status}`.toLocaleLowerCase();
}

function ReportsTable({ data, locale, search, view }: { readonly data: AccountReportListData; readonly locale: SupportedLocale; readonly search: string; readonly view: AdminAccountReportsView }) {
  const copy = getAdminAccountReportsCopy(locale);
  const filtered = data.items.filter(report => reportSearchValue(report).includes(search.toLocaleLowerCase(locale)));
  const pageCount = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <>
      <div className="admin-accounts__table-wrap">
        <table className="admin-accounts__table">
          <caption className="a11y-visually-hidden">{view === 'reports' ? copy.list.title : copy.restrictions.title}</caption>
          {view === 'reports' ? (
            <>
              <thead><tr><th scope="col">{copy.list.columns.account}</th><th scope="col">{copy.list.columns.type}</th><th scope="col">{copy.list.columns.reason}</th><th scope="col">{copy.list.columns.related}</th><th scope="col">{copy.list.columns.status}</th><th scope="col">{copy.list.columns.created}</th><th scope="col">{copy.list.columns.updated}</th><th scope="col">{copy.list.columns.actions}</th></tr></thead>
              <tbody>{filtered.map(report => <ReportRow key={report.id} report={report} locale={locale} />)}</tbody>
            </>
          ) : (
            <>
              <thead><tr><th scope="col">{copy.restrictions.account}</th><th scope="col">{copy.list.columns.type}</th><th scope="col">{copy.list.columns.reason}</th><th scope="col">{copy.restrictions.status}</th><th scope="col">{copy.restrictions.action}</th></tr></thead>
              <tbody>{filtered.map(report => <RestrictionRow key={report.id} report={report} locale={locale} />)}</tbody>
            </>
          )}
        </table>
      </div>
      {filtered.length === 0 ? <div className="admin-accounts__empty" data-state="empty"><h2>{view === 'reports' ? copy.list.emptyTitle : copy.restrictions.emptyTitle}</h2><p>{view === 'reports' ? copy.list.emptyBody : copy.restrictions.emptyBody}</p></div> : null}
      {pageCount > 1 ? <nav className="admin-accounts__pagination" aria-label={locale === 'ar' ? 'ترقيم الصفحات' : locale === 'zh-CN' ? '分页' : 'Pagination'}><span>{data.page} / {pageCount}</span></nav> : null}
    </>
  );
}

function ReportRow({ report, locale }: { readonly report: AccountReportData; readonly locale: SupportedLocale }) {
  const copy = getAdminAccountReportsCopy(locale);
  return (
    <tr data-testid={`admin-account-report-${report.id}`}>
      <td><div className="admin-accounts__identity"><strong>{report.accountId}</strong><small>{report.id}</small></div></td>
      <td>{copy.roleLabels[report.accountRoleType ?? ''] ?? '—'}</td>
      <td><span className="admin-account-reports__reason">{report.reason}</span></td>
      <td>{numberLabel(report.relatedReports, locale)}</td>
      <td><StatusBadge label={copy.statusLabels[report.status] ?? report.status} value={report.status} /></td>
      <td><time dateTime={report.createdAt}>{dateLabel(report.createdAt, locale)}</time></td>
      <td><time dateTime={report.updatedAt}>{dateLabel(report.updatedAt, locale)}</time></td>
      <td><div className="admin-accounts__actions"><a href={localePath(locale, '/admin/account-reports', { reportId: report.id })}>{copy.detail.title}</a><a href={localePath(locale, '/admin/account-restrictions', { accountId: report.accountId })}>{copy.detail.openRestrictions}</a></div></td>
    </tr>
  );
}

function RestrictionRow({ report, locale }: { readonly report: AccountReportData; readonly locale: SupportedLocale }) {
  const copy = getAdminAccountReportsCopy(locale);
  return (
    <tr data-testid={`admin-account-restriction-${report.accountId}`}>
      <td><div className="admin-accounts__identity"><strong>{report.accountId}</strong><small>{report.id}</small></div></td>
      <td>{copy.roleLabels[report.accountRoleType ?? ''] ?? '—'}</td>
      <td><span className="admin-account-reports__reason">{report.reason}</span></td>
      <td><StatusBadge label={copy.statusLabels[report.status] ?? report.status} value={report.status} /></td>
      <td><a href={localePath(locale, '/admin/account-reports', { reportId: report.id })}>{copy.restrictions.view}</a></td>
    </tr>
  );
}

function FilterBar({ locale, status, searchInput, onStatusChange, onSearchChange, onSubmit, onClear }: { readonly locale: SupportedLocale; readonly status: ReportStatusFilter; readonly searchInput: string; readonly onStatusChange: (status: ReportStatusFilter) => void; readonly onSearchChange: (value: string) => void; readonly onSubmit: () => void; readonly onClear: () => void }) {
  const copy = getAdminAccountReportsCopy(locale);
  return (
    <form className="admin-accounts__filters" role="search" aria-label={copy.list.searchLabel} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="admin-accounts__field"><label htmlFor="admin-account-reports-search">{copy.list.searchLabel}</label><input id="admin-account-reports-search" type="search" value={searchInput} onChange={event => onSearchChange(event.target.value)} placeholder={copy.list.searchPlaceholder} /></div>
      <div className="admin-accounts__field"><label htmlFor="admin-account-reports-status">{copy.list.statusLabel}</label><select id="admin-account-reports-status" value={status} onChange={event => onStatusChange(event.target.value as ReportStatusFilter)}><option value="all">{copy.list.all}</option>{Object.entries(copy.statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="admin-accounts__filter-actions"><Button type="submit" size="sm">{copy.apply}</Button><Button type="button" variant="secondary" size="sm" onClick={onClear}>{copy.clear}</Button></div>
    </form>
  );
}

function ReportStatusStrip({ locale, status, onStatusChange }: { readonly locale: SupportedLocale; readonly status: ReportStatusFilter; readonly onStatusChange: (status: ReportStatusFilter) => void }) {
  const copy = getAdminAccountReportsCopy(locale);
  const allLabel = copy.list.all;
  return (
    <div role="group" aria-label={copy.list.statusLabel} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBlockEnd: 12, padding: 8, border: '1px solid #e3e5e7', borderRadius: 16, background: '#fff', boxShadow: '0 6px 16px #3232320d' }}>
      {[['all', allLabel] as const, ...Object.entries(copy.statusLabels)].map(([value, label]) => {
        const selected = status === value;
        return <button aria-pressed={selected} data-filter-value={value} key={value} onClick={() => onStatusChange(value as ReportStatusFilter)} style={{ minHeight: 38, padding: '8px 16px', border: 0, borderRadius: 999, background: selected ? '#155b4f' : 'transparent', color: selected ? '#fff' : '#69768b', cursor: 'pointer', fontWeight: 800 }} type="button">{label}</button>;
      })}
    </div>
  );
}

function ReportDetail({ report, account, locale, reason, mutationError, mutationSuccess, busyAction, onReasonChange, onResolve, onTransition }: { readonly report: AccountReportData; readonly account: AdminAccountUserData | undefined; readonly locale: SupportedLocale; readonly reason: string; readonly mutationError: string | undefined; readonly mutationSuccess: string | undefined; readonly busyAction: string | undefined; readonly onReasonChange: (value: string) => void; readonly onResolve: (action: 'resolve' | 'dismiss') => void; readonly onTransition: (action: AccountTransitionRequest['action']) => void }) {
  const copy = getAdminAccountReportsCopy(locale);
  const canResolve = report.status === 'open' || report.status === 'in_review';
  return (
    <main className="admin-accounts__main admin-accounts__detail" aria-labelledby="admin-account-report-detail-title">
      <a className="admin-accounts__back" href={localePath(locale, '/admin/account-reports')}>{copy.back}</a>
      <section className="admin-accounts__detail-card">
        <p className="admin-accounts__eyebrow">{copy.detail.eyebrow}</p>
        <h1 id="admin-account-report-detail-title">{copy.detail.title}</h1>
        <ReportFieldGrid fields={[
          [copy.detail.reportId, report.id], [copy.detail.accountId, report.accountId], [copy.detail.accountType, copy.roleLabels[report.accountRoleType ?? ''] ?? '—'], [copy.detail.reporter, report.reporterId ?? '—'], [copy.detail.reason, report.reason], [copy.detail.related, numberLabel(report.relatedReports, locale)], [copy.detail.created, dateLabel(report.createdAt, locale)], [copy.detail.updated, dateLabel(report.updatedAt, locale)], [copy.detail.resolution, copy.statusLabels[report.status] ?? report.status]
        ]} />
        {report.details !== undefined ? <div className="admin-account-reports__long-field"><h2>{copy.detail.details}</h2><p>{report.details}</p></div> : null}
        {report.resolutionReason !== undefined ? <div className="admin-account-reports__long-field"><h2>{copy.detail.resolutionReason}</h2><p>{report.resolutionReason}</p></div> : null}
      </section>
      {canResolve ? <section className="admin-accounts__detail-card" aria-labelledby="admin-account-report-action-title"><h2 id="admin-account-report-action-title">{copy.detail.resolution}</h2><label className="admin-account-reports__reason-label" htmlFor="admin-account-report-reason">{copy.detail.mutationReason}</label><textarea id="admin-account-report-reason" value={reason} minLength={5} maxLength={500} onChange={event => onReasonChange(event.target.value)} aria-describedby="admin-account-report-reason-hint" /><p id="admin-account-report-reason-hint" className="admin-accounts__muted">{copy.detail.mutationReasonHint}</p><div className="admin-accounts__actions"><Button type="button" disabled={busyAction !== undefined} onClick={() => onResolve('resolve')}>{busyAction === 'resolve' ? copy.detail.resolve : copy.detail.resolve}</Button><Button type="button" variant="secondary" disabled={busyAction !== undefined} onClick={() => onResolve('dismiss')}>{busyAction === 'dismiss' ? copy.detail.dismiss : copy.detail.dismiss}</Button></div>{mutationError !== undefined ? <p className="admin-accounts__document-error" role="alert">{mutationError}</p> : null}{mutationSuccess !== undefined ? <p className="admin-account-reports__success" role="status">{mutationSuccess}</p> : null}</section> : null}
      {!canResolve && mutationError !== undefined ? <p className="admin-accounts__document-error" role="alert">{mutationError}</p> : null}
      {!canResolve && mutationSuccess !== undefined ? <p className="admin-account-reports__success" role="status">{mutationSuccess}</p> : null}
      {account !== undefined && !canResolve && account.availableActions.length > 0 ? <section className="admin-accounts__detail-card" aria-labelledby="admin-account-transition-reason-title"><h2 id="admin-account-transition-reason-title">{copy.detail.transitionReason}</h2><label className="admin-account-reports__reason-label" htmlFor="admin-account-report-reason">{copy.detail.mutationReason}</label><textarea id="admin-account-report-reason" value={reason} minLength={3} maxLength={1_000} onChange={event => onReasonChange(event.target.value)} aria-describedby="admin-account-report-reason-hint" /><p id="admin-account-report-reason-hint" className="admin-accounts__muted">{copy.detail.mutationReasonHint}</p></section> : null}
      <section className="admin-accounts__detail-card" aria-labelledby="admin-account-status-title">
        <div className="admin-account-reports__section-heading"><div><p className="admin-accounts__eyebrow">{copy.detail.accountStatus}</p><h2 id="admin-account-status-title">{account?.displayName ?? account?.email ?? report.accountId}</h2></div><a className="admin-accounts__back" href={localePath(locale, '/admin/account-restrictions', { accountId: report.accountId })}>{copy.detail.openRestrictions}</a></div>
        {account === undefined ? <p className="admin-accounts__muted">{copy.detail.noAccountProjection}</p> : <><ReportFieldGrid fields={[[copy.detail.accountId, account.id], [copy.detail.accountType, copy.roleLabels[account.roleType] ?? account.roleType], [copy.detail.accountStatus, <StatusBadge key="status" label={account.status} value={account.status} />], [copy.detail.updated, dateLabel(account.updatedAt, locale)]]} />{account.availableActions.length > 0 ? <><h3>{copy.detail.availableActions}</h3><div className="admin-accounts__actions">{account.availableActions.map(action => <Button key={action} type="button" variant="secondary" disabled={busyAction !== undefined} onClick={() => onTransition(action)}>{copy.actionLabels[action] ?? action}</Button>)}</div></> : <p className="admin-accounts__muted">{copy.detail.noActions}</p>}</>}
      </section>
    </main>
  );
}

export function AdminAccountReports({ locale, session, view, reportId, accountId, authClient, apiOrigin, initialData, initialAccountData, initialState = 'loading', loadReports, loadAccount, resolveReport, transitionAccount }: AdminAccountReportsProps) {
  const copy = getAdminAccountReportsCopy(locale);
  const [state, setState] = useState<ReportState>(initialState ?? 'loading');
  const [data, setData] = useState<AccountReportListData | undefined>(initialData);
  const [selectedReport, setSelectedReport] = useState<AccountReportData>();
  const [account, setAccount] = useState<AdminAccountUserData | undefined>(initialAccountData);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [reason, setReason] = useState('');
  const [busyAction, setBusyAction] = useState<string>();
  const [mutationError, setMutationError] = useState<string>();
  const [mutationSuccess, setMutationSuccess] = useState<string>();
  const parsedReportId = reportId === undefined ? undefined : accountObjectIdSchema.safeParse(reportId);
  const parsedAccountId = accountId === undefined ? undefined : accountObjectIdSchema.safeParse(accountId);
  const validReportId = parsedReportId?.success ? parsedReportId.data : undefined;
  const validAccountId = parsedAccountId?.success ? parsedAccountId.data : undefined;
  const reportsLoader = useMemo(() => loadReports ?? createAdminAccountReportsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadReports]);
  const accountLoader = useMemo(() => loadAccount ?? createAdminUserLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadAccount]);
  const reportResolver = useMemo(() => resolveReport ?? createAdminAccountReportResolver({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, resolveReport]);
  const accountTransition = useMemo(() => transitionAccount ?? createAdminAccountTransitionLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, transitionAccount]);
  const query = useMemo<AccountReportListQuery>(() => ({ page, limit: 20, ...(statusFilter === 'all' ? {} : { status: statusFilter }), ...(validAccountId === undefined ? {} : { accountId: validAccountId }) }), [page, statusFilter, validAccountId]);
  const isDetail = validReportId !== undefined;
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'admin') {
      setState('permission');
      return undefined;
    }
    if ((reportId !== undefined && validReportId === undefined) || (accountId !== undefined && validAccountId === undefined)) {
      setState('not_found');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    const canUseInitial = initialData !== undefined && attempt === 0 && page === 1 && statusFilter === 'all' && validAccountId === undefined;
    const listPromise = canUseInitial ? Promise.resolve(initialData) : reportsLoader(query, controller.signal);
    void listPromise.then(async nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      const nextReport = validReportId === undefined ? undefined : nextData.items.find(item => item.id === validReportId);
      if (validReportId !== undefined && nextReport === undefined) {
        setState('not_found');
        return;
      }
      setSelectedReport(nextReport);
      const targetAccountId = nextReport?.accountId ?? validAccountId;
      if (targetAccountId !== undefined && initialAccountData === undefined) {
        try {
          const nextAccount = await accountLoader(targetAccountId, controller.signal);
          if (controller.signal.aborted) return;
          setAccount(nextAccount);
        } catch (error) {
          if (!controller.signal.aborted) setState(stateForError(error, true));
          return;
        }
      }
      setState(nextData.items.length === 0 ? 'empty' : 'success');
    }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error, isDetail)); });
    return () => controller.abort();
  }, [accountId, accountLoader, attempt, initialAccountData, initialData, isDetail, page, query, reportId, reportsLoader, session.status, sessionRole, statusFilter, validAccountId, validReportId]);

  async function resolve(action: 'resolve' | 'dismiss'): Promise<void> {
    if (selectedReport === undefined) return;
    const parsed = accountReportResolveSchema.safeParse({ version: selectedReport.version, action, reason });
    if (!parsed.success) {
      setMutationError(copy.detail.mutationReasonHint);
      return;
    }
    setBusyAction(action);
    setMutationError(undefined);
    setMutationSuccess(undefined);
    try {
      const nextReport = await reportResolver(selectedReport.id, parsed.data, undefined);
      setSelectedReport(nextReport);
      setData(current => current === undefined ? current : { ...current, items: current.items.map(item => item.id === nextReport.id ? nextReport : item) });
      setMutationSuccess(copy.success);
      setReason('');
    } catch (error) {
      setMutationError(error instanceof ApiClientError && error.status === 403 ? copy.states.permission.body : copy.states.error.body);
    } finally {
      setBusyAction(undefined);
    }
  }

  async function transition(action: AccountTransitionRequest['action']): Promise<void> {
    if (account === undefined) return;
    const parsed = accountObjectIdSchema.safeParse(account.id);
    if (!parsed.success || reason.trim().length < 3) {
      setMutationError(copy.detail.mutationReasonHint);
      return;
    }
    setBusyAction(action);
    setMutationError(undefined);
    setMutationSuccess(undefined);
    try {
      const result: AccountTransitionData = await accountTransition(parsed.data, { action, reason: reason.trim() }, undefined);
      setAccount(current => current === undefined ? current : { ...current, status: result.status, version: result.version, availableActions: result.availableActions, statusChangedAt: result.changedAt, updatedAt: result.changedAt });
      setMutationSuccess(copy.success);
      setReason('');
    } catch (error) {
      setMutationError(error instanceof ApiClientError && error.status === 403 ? copy.states.permission.body : copy.states.error.body);
    } finally {
      setBusyAction(undefined);
    }
  }

  const path = typeof window === 'undefined' ? (view === 'restrictions' ? '/admin/account-restrictions' : '/admin/account-reports') : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  const screenId = view === 'restrictions' ? 'ADM-08' : isDetail ? 'ADM-07' : 'ADM-06';
  const titleCopy = view === 'restrictions' ? copy.restrictions : copy.list;
  const navigationPath = view === 'restrictions' ? '/admin/account-restrictions' : '/admin/account-reports';
  return (
    <section className="admin-dashboard admin-accounts admin-account-reports" data-screen-id={screenId} data-route={path} data-device-scope="desktop" data-admin-account-reports-state={state}>
      <AdminNavigation locale={locale} activePath={navigationPath} />
      <div className="admin-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'not_found' ? <section className="admin-accounts__state" data-state="not_found" role="alert"><StateMessage state="error" title={copy.states.not_found.title} message={copy.states.not_found.body} /><a className="admin-accounts__back" href={localePath(locale, view === 'restrictions' ? '/admin/account-restrictions' : '/admin/account-reports')}>{copy.back}</a></section> : null}
        {state === 'empty' && !isDetail ? <div className="admin-accounts__empty" data-state="empty"><h1>{titleCopy.emptyTitle}</h1><p>{titleCopy.emptyBody}</p></div> : null}
        {state === 'success' && isDetail && selectedReport !== undefined ? <ReportDetail report={selectedReport} account={account} locale={locale} reason={reason} mutationError={mutationError} mutationSuccess={mutationSuccess} busyAction={busyAction} onReasonChange={setReason} onResolve={action => { void resolve(action); }} onTransition={action => { void transition(action); }} /> : null}
        {state === 'success' && !isDetail && data !== undefined ? <main className="admin-accounts__main" aria-labelledby="admin-account-reports-title"><div className="admin-accounts__heading"><div><p className="admin-accounts__eyebrow">{titleCopy.eyebrow}</p><h1 id="admin-account-reports-title">{titleCopy.title}</h1><p className="admin-accounts__description">{titleCopy.description}</p></div></div>{view === 'reports' ? <ReportStatusStrip locale={locale} status={statusFilter} onStatusChange={value => { setStatusFilter(value); setPage(1); setAttempt(attemptValue => attemptValue + 1); }} /> : null}<section className="admin-accounts__panel" aria-labelledby="admin-account-reports-list-title"><h2 id="admin-account-reports-list-title" className="a11y-visually-hidden">{titleCopy.title}</h2><FilterBar locale={locale} status={statusFilter} searchInput={searchInput} onStatusChange={value => { setStatusFilter(value); setPage(1); setAttempt(attemptValue => attemptValue + 1); }} onSearchChange={setSearchInput} onSubmit={() => { setSearch(searchInput.trim()); setPage(1); setAttempt(attemptValue => attemptValue + 1); }} onClear={() => { setSearchInput(''); setSearch(''); setStatusFilter('all'); setPage(1); setAttempt(attemptValue => attemptValue + 1); }} /><ReportsTable data={data} locale={locale} search={search} view={view} /></section></main> : null}
      </div>
    </section>
  );
}
