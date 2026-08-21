import { useEffect, useMemo, useState } from 'react';
import type { NotificationData, NotificationListData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Pagination, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { localizedText } from '../public/model.ts';
import {
  createSeekerNotificationActions,
  createSeekerNotificationsLoader,
  localeForSeekerPath,
  type SeekerAuthorizationSource,
  type SeekerNotificationActions,
  type SeekerNotificationsLoader
} from './data.ts';
import { SeekerNavigation } from './overview.tsx';
import { getSeekerNotificationsCopy } from './notifications-copy.ts';
import './styles.css';

export type SeekerNotificationsViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';

export interface SeekerNotificationsAuthClient extends SeekerAuthorizationSource {
  readonly getSnapshot: () => { readonly status: string };
}

export interface SeekerNotificationsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: SeekerNotificationsAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly load?: SeekerNotificationsLoader | undefined;
  readonly actions?: SeekerNotificationActions | undefined;
}

type NotificationFilter = 'all' | 'unread';
type MutationFeedback = 'markedRead' | 'markedAll' | 'notFound' | 'permission' | 'error';

function stateForError(error: unknown): Exclude<SeekerNotificationsViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function mutationErrorFor(error: unknown): Exclude<MutationFeedback, 'markedRead' | 'markedAll'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'notFound';
  return 'error';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function iconForType(type: string): string {
  if (type.startsWith('viewing.')) return '◷';
  if (type.startsWith('request.')) return '▤';
  if (type.startsWith('property.')) return '♡';
  if (type.startsWith('community.')) return '◌';
  return '•';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<SeekerNotificationsViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getSeekerNotificationsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="seeker-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function NotificationRow({
  item,
  locale,
  copy,
  marking,
  onMarkRead
}: {
  readonly item: NotificationData;
  readonly locale: SupportedLocale;
  readonly copy: ReturnType<typeof getSeekerNotificationsCopy>;
  readonly marking: boolean;
  readonly onMarkRead: () => void;
}) {
  const title = localizedText(item.title, locale) ?? item.type;
  const message = localizedText(item.message, locale);
  const typeLabel = copy.typeLabels[item.type] ?? item.type;
  const href = item.link === undefined ? undefined : localeForSeekerPath(locale, item.link);
  const read = item.readAt !== null;
  return (
    <article className="seeker-notifications__item" data-testid={`seeker-notification-${item.id}`} data-state={read ? 'read' : 'unread'}>
      <span className="seeker-notifications__icon" aria-hidden="true">{iconForType(item.type)}</span>
      <div className="seeker-notifications__body">
        <div className="seeker-notifications__meta">
          <span className="seeker-notifications__type">{typeLabel}</span>
          {!read ? <span className="seeker-notifications__unread-label">{copy.unreadLabel}</span> : null}
          <time dateTime={item.createdAt}>{dateLabel(item.createdAt, locale)}</time>
        </div>
        <h2>{title}</h2>
        {message !== undefined ? <p>{message}</p> : null}
        <div className="seeker-notifications__actions">
          {href !== undefined ? <a href={href}>{copy.openLink}</a> : null}
          {!read ? <Button variant="ghost" size="xs" loading={marking} onClick={onMarkRead}>{copy.markRead}</Button> : null}
        </div>
      </div>
    </article>
  );
}

export function SeekerNotifications({ locale, session, authClient, apiOrigin, load, actions }: SeekerNotificationsProps) {
  const copy = getSeekerNotificationsCopy(locale);
  const [state, setState] = useState<SeekerNotificationsViewState>('loading');
  const [data, setData] = useState<NotificationListData | undefined>();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [markingId, setMarkingId] = useState<string | undefined>();
  const [markingAll, setMarkingAll] = useState(false);
  const [mutationFeedback, setMutationFeedback] = useState<MutationFeedback | undefined>();
  const loadSource = useMemo(() => load ?? createSeekerNotificationsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const actionSource = useMemo(() => actions ?? createSeekerNotificationActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void loadSource({ page, limit: 20, unreadOnly: filter === 'unread' }, controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(nextData.items.length === 0 ? 'empty' : 'success');
    }).catch(error => {
      if (!controller.signal.aborted) setState(stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, filter, loadSource, page, session.status]);

  const markRead = async (notificationId: string) => {
    setMutationFeedback(undefined);
    setMarkingId(notificationId);
    try {
      const result = await actionSource.markRead(notificationId);
      setData(current => {
        if (current === undefined) return current;
        const nextItems = filter === 'unread'
          ? current.items.filter(item => item.id !== notificationId)
          : current.items.map(item => item.id === notificationId ? { ...item, readAt: result.readAt } : item);
        return {
          ...current,
          items: nextItems,
          total: filter === 'unread' ? Math.max(0, current.total - 1) : current.total,
          unreadCount: Math.max(0, current.unreadCount - 1)
        };
      });
      setState(current => filter === 'unread' && data?.items.length === 1 ? 'empty' : current);
      setMutationFeedback('markedRead');
    } catch (error) {
      setMutationFeedback(mutationErrorFor(error));
    } finally {
      setMarkingId(undefined);
    }
  };

  const markAllRead = async () => {
    setMutationFeedback(undefined);
    setMarkingAll(true);
    try {
      await actionSource.markAllRead();
      setMutationFeedback('markedAll');
      setAttempt(value => value + 1);
    } catch (error) {
      setMutationFeedback(mutationErrorFor(error));
    } finally {
      setMarkingAll(false);
    }
  };

  const mutationMessage = mutationFeedback === undefined
    ? undefined
    : mutationFeedback === 'markedRead'
      ? copy.mutation.markedRead
      : mutationFeedback === 'markedAll'
        ? copy.mutation.markedAll
        : copy.mutation[mutationFeedback];
  const pageCount = data === undefined ? 0 : Math.ceil(data.total / data.limit);
  const emptyCopy = filter === 'unread' ? copy.empty.unread : copy.empty.all;
  return (
    <section className="seeker-dashboard seeker-notifications" data-screen-id="SEK-07" data-route="/seeker/notifications">
      <SeekerNavigation locale={locale} activePath="/seeker/notifications" />
      <div className="seeker-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {mutationMessage ? <p className="seeker-notifications__feedback" data-state={mutationFeedback === 'markedRead' || mutationFeedback === 'markedAll' ? 'success' : mutationFeedback} role={mutationFeedback === 'markedRead' || mutationFeedback === 'markedAll' ? 'status' : 'alert'}>{mutationMessage}</p> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? (
          <>
            <div className="seeker-dashboard__heading-row">
              <div>
                <p className="seeker-dashboard__eyebrow">{copy.eyebrow}</p>
                <h1>{copy.title}</h1>
                <p>{copy.description}</p>
                <span className="seeker-notifications__count" data-testid="seeker-notifications-unread-count">{data.unreadCount} {copy.unreadCount}</span>
              </div>
              <Button variant="secondary" size="sm" loading={markingAll} disabled={data.unreadCount === 0} onClick={() => { void markAllRead(); }}>{markingAll ? copy.markingAll : copy.markAll}</Button>
            </div>
            <section className="seeker-notifications__panel" aria-labelledby="seeker-notifications-list-title">
              <div className="seeker-notifications__toolbar">
                <h2 id="seeker-notifications-list-title">{copy.listLabel}</h2>
                <div className="seeker-notifications__tabs" aria-label={copy.listLabel}>
                  {(['all', 'unread'] as const).map(tab => (
                    <button key={tab} type="button" className="seeker-notifications__tab" data-active={filter === tab} aria-pressed={filter === tab} onClick={() => { setFilter(tab); setPage(1); setMutationFeedback(undefined); }}>
                      {copy.tabs[tab]}{tab === 'unread' && data.unreadCount > 0 ? <span className="seeker-notifications__tab-count" aria-label={`${data.unreadCount} ${copy.unreadCount}`}>{data.unreadCount}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
              {data.items.length === 0 ? (
                <div className="seeker-dashboard__empty" data-state="empty"><h3>{emptyCopy.title}</h3><p>{emptyCopy.body}</p></div>
              ) : (
                <div className="seeker-notifications__list" role="list" aria-label={copy.listLabel}>
                  {data.items.map(item => <NotificationRow key={item.id} item={item} locale={locale} copy={copy} marking={markingId === item.id} onMarkRead={() => { void markRead(item.id); }} />)}
                </div>
              )}
              <Pagination page={data.page} pageCount={pageCount} onPageChange={nextPage => { setPage(nextPage); setMutationFeedback(undefined); }} previousLabel={copy.previous} nextLabel={copy.next} ariaLabel={copy.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}
