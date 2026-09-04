import { useEffect, useMemo, useState } from 'react';
import type { NotificationData, NotificationListData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Pagination, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { localizedText } from '../public/model.ts';
import { ProviderNavigation } from './overview.tsx';
import {
  createProviderNotificationActions,
  createProviderNotificationsLoader,
  type ProviderNotificationActions,
  type ProviderNotificationsLoader
} from './notifications-data.ts';
import type { ProviderAuthorizationSource } from './data.ts';
import { getProviderNotificationsCopy } from './notifications-copy.ts';
import './notifications.css';

export type ProviderNotificationsViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';

export interface ProviderNotificationsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: ProviderAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly load?: ProviderNotificationsLoader | undefined;
  readonly actions?: ProviderNotificationActions | undefined;
}

type NotificationFilter = 'all' | 'unread';
type MutationFeedback = 'markedRead' | 'markedAll' | 'notFound' | 'permission' | 'error';

function stateForError(error: unknown): Exclude<ProviderNotificationsViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function mutationErrorFor(error: unknown): Exclude<MutationFeedback, 'markedRead' | 'markedAll'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'notFound';
  return 'error';
}

function localeForProviderPath(locale: SupportedLocale, path: string): string | undefined {
  const origin = 'http://sadat-real-estate.local';
  if (path.trim().length === 0) return undefined;
  try {
    const url = new URL(path, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/')) return undefined;
    url.searchParams.set('lang', locale);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return '—'; }
}

function iconForType(type: string): string {
  if (type.startsWith('viewing.')) return '◷';
  if (type.startsWith('request.')) return '▤';
  if (type.startsWith('property.')) return '♡';
  return '•';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<ProviderNotificationsViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getProviderNotificationsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="provider-notifications__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function NotificationRow({ item, locale, copy, marking, onMarkRead }: { readonly item: NotificationData; readonly locale: SupportedLocale; readonly copy: ReturnType<typeof getProviderNotificationsCopy>; readonly marking: boolean; readonly onMarkRead: () => void }) {
  const title = localizedText(item.title, locale) ?? item.type;
  const message = localizedText(item.message, locale);
  const href = item.link === undefined ? undefined : localeForProviderPath(locale, item.link);
  const read = item.readAt !== null;
  return (
    <article className="provider-notifications__item" role="listitem" data-testid={`provider-notification-${item.id}`} data-state={read ? 'read' : 'unread'}>
      <span className="provider-notifications__icon" aria-hidden="true">{iconForType(item.type)}</span>
      <div className="provider-notifications__body">
        <div className="provider-notifications__meta">
          <span className="provider-notifications__type">{copy.typeLabels[item.type] ?? item.type}</span>
          {!read ? <span className="provider-notifications__unread-label">{copy.unreadLabel}</span> : null}
          <time dateTime={item.createdAt}>{dateLabel(item.createdAt, locale)}</time>
        </div>
        <h2>{title}</h2>
        {message !== undefined ? <p>{message}</p> : null}
        <div className="provider-notifications__actions">
          {href !== undefined ? <a href={href}>{copy.openLink}</a> : null}
          {!read ? <Button variant="ghost" size="xs" loading={marking} onClick={onMarkRead}>{copy.markRead}</Button> : null}
        </div>
      </div>
    </article>
  );
}

export function ProviderNotifications({ locale, session, authClient, apiOrigin, load, actions }: ProviderNotificationsProps) {
  const copy = getProviderNotificationsCopy(locale);
  const [state, setState] = useState<ProviderNotificationsViewState>('loading');
  const [data, setData] = useState<NotificationListData | undefined>();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [markingId, setMarkingId] = useState<string | undefined>();
  const [markingAll, setMarkingAll] = useState(false);
  const [mutationFeedback, setMutationFeedback] = useState<MutationFeedback | undefined>();
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const loadSource = useMemo(() => load ?? createProviderNotificationsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const actionSource = useMemo(() => actions ?? createProviderNotificationActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'provider') {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void loadSource({ page, limit: 20, unreadOnly: filter === 'unread' }, controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(filter === 'all' && nextData.items.length === 0 && nextData.total === 0 ? 'empty' : 'success');
    }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, filter, loadSource, page, sessionRole, session.status]);

  const markRead = async (notificationId: string) => {
    if (sessionRole !== 'provider') {
      setMutationFeedback('permission');
      return;
    }
    setMutationFeedback(undefined);
    setMarkingId(notificationId);
    try {
      const result = await actionSource.markRead(notificationId);
      setData(current => current === undefined ? current : {
        ...current,
        items: filter === 'unread' ? current.items.filter(item => item.id !== notificationId) : current.items.map(item => item.id === notificationId ? { ...item, readAt: result.readAt } : item),
        total: filter === 'unread' ? Math.max(0, current.total - 1) : current.total,
        unreadCount: Math.max(0, current.unreadCount - 1)
      });
      setMutationFeedback('markedRead');
    } catch (error) { setMutationFeedback(mutationErrorFor(error)); } finally { setMarkingId(undefined); }
  };

  const markAllRead = async () => {
    if (sessionRole !== 'provider') {
      setMutationFeedback('permission');
      return;
    }
    setMutationFeedback(undefined);
    setMarkingAll(true);
    try { await actionSource.markAllRead(); setMutationFeedback('markedAll'); setAttempt(value => value + 1); }
    catch (error) { setMutationFeedback(mutationErrorFor(error)); }
    finally { setMarkingAll(false); }
  };

  const mutationMessage = mutationFeedback === undefined ? undefined : copy.mutation[mutationFeedback];
  const pageCount = data === undefined ? 0 : Math.ceil(data.total / data.limit);
  const emptyCopy = filter === 'unread' ? copy.empty.unread : copy.empty.all;
  const activePath = typeof window === 'undefined' ? '/provider/notifications' : new URL(window.location.href).pathname;
  return (
    <section className="provider-dashboard provider-notifications" data-testid="provider-notifications-page" data-screen-id="PRV-21" data-route="/provider/notifications" data-device-scope="desktop">
      <ProviderNavigation locale={locale} activePath={activePath} authClient={authClient} />
      <div className="provider-dashboard__content">
        {state !== 'success' && state !== 'empty' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {mutationMessage ? <p className="provider-notifications__feedback" data-state={mutationFeedback === 'markedRead' || mutationFeedback === 'markedAll' ? 'success' : mutationFeedback} role={mutationFeedback === 'markedRead' || mutationFeedback === 'markedAll' ? 'status' : 'alert'}>{mutationMessage}</p> : null}
        {state === 'empty' ? <div className="provider-notifications__empty" data-state="empty"><h1>{emptyCopy.title}</h1><p>{emptyCopy.body}</p></div> : null}
        {(state === 'success' && data !== undefined) ? (
          <>
            <div className="provider-dashboard__heading-row">
              <div><p className="provider-dashboard__eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p><span className="provider-notifications__count" data-testid="provider-notifications-unread-count">{data.unreadCount} {copy.unreadCount}</span></div>
              <Button variant="secondary" size="sm" loading={markingAll} disabled={data.unreadCount === 0} onClick={() => { void markAllRead(); }}>{copy.markAll}</Button>
            </div>
            <section className="provider-notifications__panel" aria-labelledby="provider-notifications-list-title">
              <div className="provider-notifications__toolbar"><h2 id="provider-notifications-list-title">{copy.listLabel}</h2><div className="provider-notifications__tabs" aria-label={copy.listLabel}>{(['all', 'unread'] as const).map(tab => <button key={tab} type="button" className="provider-notifications__tab" data-active={filter === tab} aria-pressed={filter === tab} onClick={() => { setFilter(tab); setPage(1); setMutationFeedback(undefined); }}>{copy.tabs[tab]}{tab === 'unread' && data.unreadCount > 0 ? <span className="provider-notifications__tab-count">{data.unreadCount}</span> : null}</button>)}</div></div>
              {data.items.length === 0 ? <div className="provider-notifications__empty" data-state="empty"><h3>{emptyCopy.title}</h3><p>{emptyCopy.body}</p></div> : <div className="provider-notifications__list" role="list" aria-label={copy.listLabel}>{data.items.map(item => <NotificationRow key={item.id} item={item} locale={locale} copy={copy} marking={markingId === item.id} onMarkRead={() => { void markRead(item.id); }} />)}</div>}
              <Pagination page={data.page} pageCount={pageCount} onPageChange={nextPage => { setPage(nextPage); setMutationFeedback(undefined); }} previousLabel={copy.previous} nextLabel={copy.next} ariaLabel={copy.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}
