import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  auditLogListQuerySchema,
  type AuditLogData,
  type AuditLogListQuery,
  type NotificationData,
  type NotificationListData,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Pagination, StateMessage } from '../design_system/index.ts';
import { localizedText } from '../public/model.ts';
import type { RouteSession } from '../routing/index.ts';
import { AdminNavigation } from './overview.tsx';
import {
  ADMIN_AUDIT_LOGS_PAGE_LIMIT,
  ADMIN_AUDIT_LOGS_ROUTE,
  ADMIN_NOTIFICATIONS_PAGE_LIMIT,
  ADMIN_NOTIFICATIONS_ROUTE,
  createAdminAuditLogLoader,
  createAdminAuditLogsLoader,
  createAdminNotificationActions,
  createAdminNotificationsLoader,
  type AdminAuditLogLoader,
  type AdminAuditLogPage,
  type AdminAuditLogsLoader,
  type AdminNotificationActions,
  type AdminNotificationsLoader
} from './notifications-audit-data.ts';
import { getAdminNotificationsAuditCopy, type AdminNotificationsAuditState, type AdminNotificationFilter } from './notifications-audit-copy.ts';
import './notifications-audit.css';

export interface AdminNotificationsAuditProps {
  readonly url?: string | undefined;
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiOrigin?: string | undefined;
  readonly loadNotifications?: AdminNotificationsLoader | undefined;
  readonly notificationActions?: AdminNotificationActions | undefined;
  readonly loadAuditLogs?: AdminAuditLogsLoader | undefined;
  readonly loadAuditLog?: AdminAuditLogLoader | undefined;
  readonly initialNotifications?: NotificationListData | undefined;
  readonly initialAuditLogs?: AdminAuditLogPage | undefined;
  readonly initialAuditLog?: AuditLogData | undefined;
}

type AdminView =
  | { readonly kind: 'notifications'; readonly path: string }
  | { readonly kind: 'audit'; readonly path: string }
  | { readonly kind: 'audit-detail'; readonly path: string; readonly id: string }
  | { readonly kind: 'not-found'; readonly path: string };

type AuditFilters = {
  readonly actorId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly action: string;
  readonly traceId: string;
  readonly from: string;
  readonly to: string;
};

const EMPTY_FILTERS: AuditFilters = { actorId: '', targetType: '', targetId: '', action: '', traceId: '', from: '', to: '' };

function pathnameFrom(url: string | undefined): string {
  if (url !== undefined) return new URL(url, 'http://sadat-real-estate.local').pathname.replace(/\/+$/u, '') || '/';
  if (typeof window !== 'undefined') return new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  return ADMIN_NOTIFICATIONS_ROUTE;
}

function viewForPath(path: string): AdminView {
  if (path === ADMIN_NOTIFICATIONS_ROUTE) return { kind: 'notifications', path };
  if (path === ADMIN_AUDIT_LOGS_ROUTE) return { kind: 'audit', path };
  const detail = path.match(/^\/admin\/audit-logs\/([a-f0-9]{24})$/u);
  if (detail !== null) return { kind: 'audit-detail', path, id: detail[1]! };
  return { kind: 'not-found', path };
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function stateForError(error: unknown, detail = false): Exclude<AdminNotificationsAuditState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (detail && error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value; }
}

function iconForType(type: string): string {
  if (type.startsWith('security.')) return '🔒';
  if (type.startsWith('request.')) return '◆';
  if (type.startsWith('property.')) return '◇';
  return '•';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminNotificationsAuditState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminNotificationsAuditCopy(locale);
  const message = copy.states[state];
  const componentState = state === 'not_found' ? 'error' : state;
  return (
    <section className="admin-notifications-audit__state" data-state={state} aria-label={message.title}>
      <StateMessage state={componentState} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' || state === 'not_found' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function Shell({ locale, path, screenId, state, children }: { readonly locale: SupportedLocale; readonly path: string; readonly screenId: string; readonly state: AdminNotificationsAuditState; readonly children: ReactNode }) {
  return (
    <section className="admin-notifications-audit" data-screen-id={screenId} data-route={path} data-device-scope="desktop" data-state={state} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <AdminNavigation locale={locale} activePath={path === ADMIN_NOTIFICATIONS_ROUTE ? ADMIN_NOTIFICATIONS_ROUTE : ADMIN_AUDIT_LOGS_ROUTE} />
      <div className="admin-notifications-audit__content"><div className="admin-notifications-audit__main">{children}</div></div>
    </section>
  );
}

function Heading({ title, eyebrow, description, action }: { readonly title: string; readonly eyebrow: string; readonly description: string; readonly action?: ReactNode }) {
  return <header className="admin-notifications-audit__heading"><div><p className="admin-notifications-audit__eyebrow">{eyebrow}</p><h1>{title}</h1><p className="admin-notifications-audit__description">{description}</p></div>{action}</header>;
}

function NotificationRow({ item, locale, copy, marking, onMarkRead }: { readonly item: NotificationData; readonly locale: SupportedLocale; readonly copy: ReturnType<typeof getAdminNotificationsAuditCopy>; readonly marking: boolean; readonly onMarkRead: () => void }) {
  const title = localizedText(item.title, locale) ?? item.type;
  const message = localizedText(item.message, locale);
  const href = item.link === undefined ? undefined : localePath(locale, item.link);
  const read = item.readAt !== null;
  return (
    <article className="admin-notifications-audit__notification" data-testid={`admin-notification-${item.id}`} data-state={read ? 'read' : 'unread'}>
      <span className="admin-notifications-audit__notification-icon" aria-hidden="true">{iconForType(item.type)}</span>
      <div>
        <div className="admin-notifications-audit__meta"><span className="admin-notifications-audit__type">{item.type}</span>{!read ? <span className="admin-notifications-audit__unread">{copy.notifications.tabs.unread}</span> : null}<time dateTime={item.createdAt}>{dateLabel(item.createdAt, locale)}</time></div>
        <h3>{title}</h3>
        {message !== undefined ? <p>{message}</p> : null}
        <div className="admin-notifications-audit__actions">
          {href !== undefined ? <a href={href}>{copy.notifications.openLink}</a> : null}
          {!read ? <Button variant="ghost" size="xs" loading={marking} onClick={onMarkRead}>{copy.notifications.markRead}</Button> : null}
        </div>
      </div>
    </article>
  );
}

function NotificationsView({ locale, session, authClient, apiOrigin, load, actions, initialData }: { readonly locale: SupportedLocale; readonly session: RouteSession; readonly authClient?: AdminNotificationsAuditProps['authClient']; readonly apiOrigin?: string | undefined; readonly load?: AdminNotificationsLoader | undefined; readonly actions?: AdminNotificationActions | undefined; readonly initialData?: NotificationListData | undefined }) {
  const copy = getAdminNotificationsAuditCopy(locale);
  const [filter, setFilter] = useState<AdminNotificationFilter>('all');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AdminNotificationsAuditState>(initialData === undefined ? 'loading' : initialData.items.length === 0 ? 'empty' : 'success');
  const [data, setData] = useState<NotificationListData | undefined>(initialData);
  const [markingId, setMarkingId] = useState<string | undefined>();
  const [markingAll, setMarkingAll] = useState(false);
  const [feedback, setFeedback] = useState<{ readonly kind: 'success' | 'permission' | 'not_found' | 'error'; readonly text: string } | undefined>();
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const source = useMemo(() => load ?? createAdminNotificationsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const actionSource = useMemo(() => actions ?? createAdminNotificationActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);

  useEffect(() => {
    if (sessionRole !== 'admin') { setState('permission'); return undefined; }
    if (initialData !== undefined && page === 1 && filter === 'all' && attempt === 0) return undefined;
    const controller = new AbortController();
    setState('loading');
    void source({ page, limit: ADMIN_NOTIFICATIONS_PAGE_LIMIT, unreadOnly: filter === 'unread' }, controller.signal).then(next => {
      if (controller.signal.aborted) return;
      setData(next); setState(next.items.length === 0 ? 'empty' : 'success');
    }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, filter, initialData, page, sessionRole, source]);

  async function markRead(id: string): Promise<void> {
    setFeedback(undefined); setMarkingId(id);
    try {
      const result = await actionSource.markRead(id);
      setData(current => current === undefined ? current : { ...current, items: filter === 'unread' ? current.items.filter(item => item.id !== id) : current.items.map(item => item.id === id ? { ...item, readAt: result.readAt } : item), total: filter === 'unread' ? Math.max(0, current.total - 1) : current.total, unreadCount: Math.max(0, current.unreadCount - 1) });
      setState(current => current === 'empty' ? 'success' : current); setFeedback({ kind: 'success', text: copy.notifications.mutation.markedRead });
    } catch (error) {
      const kind = error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : error instanceof ApiClientError && error.status === 404 ? 'not_found' : 'error';
      setFeedback({ kind, text: copy.notifications.mutation[kind === 'not_found' ? 'notFound' : kind] });
    } finally { setMarkingId(undefined); }
  }

  async function markAllRead(): Promise<void> {
    setFeedback(undefined); setMarkingAll(true);
    try { await actionSource.markAllRead(); setFeedback({ kind: 'success', text: copy.notifications.mutation.markedAll }); setAttempt(value => value + 1); }
    catch (error) { const kind = error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error'; setFeedback({ kind, text: copy.notifications.mutation[kind] }); }
    finally { setMarkingAll(false); }
  }

  const emptyCopy = filter === 'unread' ? copy.notifications.empty.unread : copy.notifications.empty.all;
  const pageCount = data === undefined ? 0 : Math.ceil(data.total / data.limit);
  return (
    <Shell locale={locale} path={ADMIN_NOTIFICATIONS_ROUTE} screenId="ADM-65" state={state}>
      <Heading eyebrow={copy.notifications.eyebrow} title={copy.notifications.title} description={copy.notifications.description} action={<Button variant="secondary" size="sm" loading={markingAll} disabled={data?.unreadCount === 0 || state !== 'success'} onClick={() => { void markAllRead(); }}>{copy.notifications.markAll}</Button>} />
      {state !== 'success' && state !== 'empty' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
      {feedback !== undefined ? <p className="admin-notifications-audit__feedback" data-state={feedback.kind} role={feedback.kind === 'success' ? 'status' : 'alert'}>{feedback.text}</p> : null}
      {state === 'empty' ? <section className="admin-notifications-audit__panel"><div className="admin-notifications-audit__empty" data-state="empty"><h2>{emptyCopy.title}</h2><p>{emptyCopy.body}</p></div></section> : null}
      {state === 'success' && data !== undefined ? <section className="admin-notifications-audit__panel" aria-labelledby="admin-notifications-list-title"><div className="admin-notifications-audit__toolbar"><h2 id="admin-notifications-list-title">{copy.notifications.listLabel} <span className="admin-notifications-audit__muted">({data.unreadCount} {copy.notifications.unreadCount})</span></h2><div className="admin-notifications-audit__tabs" aria-label={copy.notifications.listLabel}>{(['all', 'unread'] as const).map(tab => <button key={tab} type="button" className="admin-notifications-audit__tab" data-active={filter === tab} aria-pressed={filter === tab} onClick={() => { setFilter(tab); setPage(1); setFeedback(undefined); }}>{copy.notifications.tabs[tab]}</button>)}</div></div>{data.items.length === 0 ? <div className="admin-notifications-audit__empty" data-state="empty"><h3>{emptyCopy.title}</h3><p>{emptyCopy.body}</p></div> : <div className="admin-notifications-audit__list" role="list" aria-label={copy.notifications.listLabel}>{data.items.map(item => <NotificationRow key={item.id} item={item} locale={locale} copy={copy} marking={markingId === item.id} onMarkRead={() => { void markRead(item.id); }} />)}</div>}<Pagination page={data.page} pageCount={pageCount} onPageChange={next => { setPage(next); setFeedback(undefined); }} previousLabel={copy.previous} nextLabel={copy.next} ariaLabel={copy.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} /></section> : null}
    </Shell>
  );
}

function auditQueryFromFilters(filters: AuditFilters): AuditLogListQuery {
  return auditLogListQuerySchema.parse({
    page: 1,
    limit: ADMIN_AUDIT_LOGS_PAGE_LIMIT,
    ...(filters.actorId.trim() === '' ? {} : { actorId: filters.actorId.trim() }),
    ...(filters.targetType.trim() === '' ? {} : { targetType: filters.targetType.trim() }),
    ...(filters.targetId.trim() === '' ? {} : { targetId: filters.targetId.trim() }),
    ...(filters.action.trim() === '' ? {} : { action: filters.action.trim() }),
    ...(filters.traceId.trim() === '' ? {} : { traceId: filters.traceId.trim() }),
    ...(filters.from === '' ? {} : { from: new Date(`${filters.from}T00:00:00.000Z`).toISOString() }),
    ...(filters.to === '' ? {} : { to: new Date(`${filters.to}T23:59:59.999Z`).toISOString() })
  });
}

function AuditFilterForm({ locale, filters, onSubmit, onClear }: { readonly locale: SupportedLocale; readonly filters: AuditFilters; readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void; readonly onClear: () => void }) {
  const copy = getAdminNotificationsAuditCopy(locale);
  const field = (key: keyof AuditFilters, label: string, type = 'text') => <label key={key} htmlFor={`admin-audit-${key}`}>{label}<input id={`admin-audit-${key}`} name={key} type={type} defaultValue={filters[key]} /></label>;
  return <div className="admin-notifications-audit__filters"><form className="admin-notifications-audit__filter-form" onSubmit={onSubmit}>{field('actorId', copy.audit.actorId)}{field('targetType', copy.audit.targetType)}{field('targetId', copy.audit.targetId)}{field('action', copy.audit.action)}{field('traceId', copy.audit.traceId)}{field('from', copy.audit.from, 'date')}{field('to', copy.audit.to, 'date')}<div className="admin-notifications-audit__filter-actions"><Button type="submit" size="sm">{copy.audit.apply}</Button><Button type="button" variant="ghost" size="sm" onClick={onClear}>{copy.audit.clear}</Button></div></form></div>;
}

function AuditTable({ locale, data }: { readonly locale: SupportedLocale; readonly data: AdminAuditLogPage }) {
  const copy = getAdminNotificationsAuditCopy(locale);
  return <div className="admin-notifications-audit__table-wrap"><table className="admin-notifications-audit__table"><caption className="a11y-visually-hidden">{copy.audit.tableLabel}</caption><thead><tr><th scope="col">{copy.audit.date}</th><th scope="col">{copy.audit.actor}</th><th scope="col">{copy.audit.target}</th><th scope="col">{copy.audit.actionLabel}</th><th scope="col">{copy.audit.reason}</th><th scope="col">{copy.audit.details}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id}><td><time dateTime={item.createdAt}>{dateLabel(item.createdAt, locale)}</time></td><td><strong>{item.actorType}</strong><br /><code>{item.actorId}</code></td><td><strong>{item.targetType}</strong><br /><code>{item.targetId}</code></td><td>{item.action}</td><td>{item.reason}</td><td><a className="admin-notifications-audit__row-link" href={localePath(locale, `${ADMIN_AUDIT_LOGS_ROUTE}/${item.id}`)}>{copy.audit.view}</a></td></tr>)}</tbody></table></div>;
}

function AuditListView({ locale, session, apiOrigin, authClient, load, initialData }: { readonly locale: SupportedLocale; readonly session: RouteSession; readonly apiOrigin?: string | undefined; readonly authClient?: AdminNotificationsAuditProps['authClient']; readonly load?: AdminAuditLogsLoader | undefined; readonly initialData?: AdminAuditLogPage | undefined }) {
  const copy = getAdminNotificationsAuditCopy(locale);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState<AuditLogListQuery>({ page: 1, limit: ADMIN_AUDIT_LOGS_PAGE_LIMIT });
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AdminNotificationsAuditState>(initialData === undefined ? 'loading' : initialData.items.length === 0 ? 'empty' : 'success');
  const [data, setData] = useState<AdminAuditLogPage | undefined>(initialData);
  const [filterError, setFilterError] = useState<string | undefined>();
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const source = useMemo(() => load ?? createAdminAuditLogsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  useEffect(() => {
    if (sessionRole !== 'admin') { setState('permission'); return undefined; }
    if (initialData !== undefined && attempt === 0 && query.page === 1 && Object.keys(query).length === 2) return undefined;
    const controller = new AbortController(); setState('loading');
    void source(query, controller.signal).then(next => { if (controller.signal.aborted) return; setData(next); setState(next.items.length === 0 ? 'empty' : 'success'); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, initialData, query, sessionRole, source]);
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: AuditFilters = { actorId: String(form.get('actorId') ?? ''), targetType: String(form.get('targetType') ?? ''), targetId: String(form.get('targetId') ?? ''), action: String(form.get('action') ?? ''), traceId: String(form.get('traceId') ?? ''), from: String(form.get('from') ?? ''), to: String(form.get('to') ?? '') };
    try { setQuery(auditQueryFromFilters(next)); setFilters(next); setFilterError(undefined); setAttempt(value => value + 1); }
    catch { setFilterError(copy.audit.noEntries); }
  }
  function clear(): void { setFilters(EMPTY_FILTERS); setQuery({ page: 1, limit: ADMIN_AUDIT_LOGS_PAGE_LIMIT }); setFilterError(undefined); setAttempt(value => value + 1); }
  const pageCount = data === undefined ? 0 : Math.ceil(data.total / data.limit);
  return (
    <Shell locale={locale} path={ADMIN_AUDIT_LOGS_ROUTE} screenId="ADM-66" state={state}>
      <Heading eyebrow={copy.audit.eyebrow} title={copy.audit.title} description={copy.audit.description} />
      {state !== 'success' && state !== 'empty' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
      <section className="admin-notifications-audit__panel"><div className="admin-notifications-audit__toolbar"><h2>{copy.audit.filters}</h2></div><AuditFilterForm locale={locale} filters={filters} onSubmit={submit} onClear={clear} />{filterError !== undefined ? <p className="admin-notifications-audit__feedback" role="alert">{filterError}</p> : null}</section>
      {state === 'empty' ? <section className="admin-notifications-audit__panel"><div className="admin-notifications-audit__empty" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.audit.noEntries}</p></div></section> : null}
      {state === 'success' && data !== undefined ? <section className="admin-notifications-audit__panel" aria-labelledby="admin-audit-table-title"><div className="admin-notifications-audit__toolbar"><h2 id="admin-audit-table-title">{copy.audit.tableLabel}</h2></div><AuditTable locale={locale} data={data} /><Pagination page={data.page} pageCount={pageCount} onPageChange={next => { setQuery(current => ({ ...current, page: next })); setAttempt(value => value + 1); }} previousLabel={copy.previous} nextLabel={copy.next} ariaLabel={copy.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} /></section> : null}
    </Shell>
  );
}

function AuditDetailView({ locale, session, apiOrigin, authClient, load, id, initialData }: { readonly locale: SupportedLocale; readonly session: RouteSession; readonly apiOrigin?: string | undefined; readonly authClient?: AdminNotificationsAuditProps['authClient']; readonly load?: AdminAuditLogLoader | undefined; readonly id: string; readonly initialData?: AuditLogData | undefined }) {
  const copy = getAdminNotificationsAuditCopy(locale);
  const [state, setState] = useState<AdminNotificationsAuditState>(initialData === undefined ? 'loading' : 'success');
  const [data, setData] = useState<AuditLogData | undefined>(initialData);
  const [attempt, setAttempt] = useState(0);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const source = useMemo(() => load ?? createAdminAuditLogLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  useEffect(() => {
    if (sessionRole !== 'admin') { setState('permission'); return undefined; }
    if (initialData !== undefined && attempt === 0) return undefined;
    const controller = new AbortController(); setState('loading');
    void source(id, controller.signal).then(next => { if (controller.signal.aborted) return; setData(next); setState('success'); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error, true)); });
    return () => controller.abort();
  }, [attempt, id, initialData, sessionRole, source]);
  if (state !== 'success' || data === undefined) return <Shell locale={locale} path={`${ADMIN_AUDIT_LOGS_ROUTE}/${id}`} screenId="ADM-66" state={state}><StatePanel state={state === 'success' || state === 'empty' ? 'error' : state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /></Shell>;
  return <Shell locale={locale} path={`${ADMIN_AUDIT_LOGS_ROUTE}/${id}`} screenId="ADM-66" state={state}><section className="admin-notifications-audit__detail"><div className="admin-notifications-audit__detail-heading"><div><p className="admin-notifications-audit__eyebrow">{copy.audit.eyebrow}</p><h2>{copy.audit.title}: {data.action}</h2><p className="admin-notifications-audit__muted"><time dateTime={data.createdAt}>{dateLabel(data.createdAt, locale)}</time></p></div><a className="admin-notifications-audit__row-link" href={localePath(locale, ADMIN_AUDIT_LOGS_ROUTE)}>{copy.audit.back}</a></div><div className="admin-notifications-audit__detail-body"><dl className="admin-notifications-audit__detail-grid"><div><dt>{copy.audit.actor}</dt><dd>{data.actorType}<br /><code>{data.actorId}</code></dd></div><div><dt>{copy.audit.target}</dt><dd>{data.targetType}<br /><code>{data.targetId}</code></dd></div><div><dt>{copy.audit.reason}</dt><dd>{data.reason}</dd></div><div><dt>{copy.audit.requestId}</dt><dd><code>{data.requestId}</code></dd></div><div><dt>{copy.audit.trace}</dt><dd><code>{data.traceId}</code></dd></div></dl><div className="admin-notifications-audit__snapshots"><section className="admin-notifications-audit__snapshot"><h3>{copy.audit.before}</h3><pre>{JSON.stringify(data.before, null, 2)}</pre></section><section className="admin-notifications-audit__snapshot"><h3>{copy.audit.after}</h3><pre>{JSON.stringify(data.after, null, 2)}</pre></section></div></div></section></Shell>;
}

export function AdminNotificationsAudit({ url, locale, session, authClient, apiOrigin, loadNotifications, notificationActions, loadAuditLogs, loadAuditLog, initialNotifications, initialAuditLogs, initialAuditLog }: AdminNotificationsAuditProps) {
  const path = pathnameFrom(url);
  const view = viewForPath(path);
  if (view.kind === 'notifications') return <NotificationsView locale={locale} session={session} authClient={authClient} apiOrigin={apiOrigin} load={loadNotifications} actions={notificationActions} initialData={initialNotifications} />;
  if (view.kind === 'audit') return <AuditListView locale={locale} session={session} authClient={authClient} apiOrigin={apiOrigin} load={loadAuditLogs} initialData={initialAuditLogs} />;
  if (view.kind === 'audit-detail') return <AuditDetailView locale={locale} session={session} authClient={authClient} apiOrigin={apiOrigin} load={loadAuditLog} id={view.id} initialData={initialAuditLog} />;
  return <Shell locale={locale} path={path} screenId="ADM-66" state="not_found"><StatePanel state="not_found" locale={locale} onRetry={() => undefined} /></Shell>;
}
