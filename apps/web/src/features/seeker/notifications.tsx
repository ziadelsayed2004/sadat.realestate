import { useEffect, useMemo, useState } from 'react';
import type { NotificationData, NotificationListData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Pagination, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { localizedText } from '../public/model.ts';
import {
  createSeekerNotificationActions,
  createSeekerNotificationsLoader,
  isAuthenticatedSeekerSession,
  localeForSeekerPath,
  type SeekerAuthorizationSource,
  type SeekerNotificationActions,
  type SeekerNotificationsLoader
} from './data.ts';
import { SeekerIcon, SeekerNavigation, type SeekerIconName } from './overview.tsx';
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

function relativeTimeLabel(value: string, locale: SupportedLocale): string {
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (elapsedMinutes < 120) return locale === 'ar' ? 'منذ ساعة' : '1 hour ago';
  const hours = Math.round(elapsedMinutes / 60);
  if (hours < 24) return locale === 'ar' ? `منذ ${hours} ساعات` : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return locale === 'ar' ? 'أمس' : 'Yesterday';
  if (days === 2) return locale === 'ar' ? 'منذ يومين' : '2 days ago';
  if (days < 7) return locale === 'ar' ? `منذ ${days} أيام` : `${days} days ago`;
  return locale === 'ar' ? 'منذ أسبوع' : '1 week ago';
}

function referenceForLink(link: string | undefined): string | undefined {
  if (link === undefined) return undefined;
  const reference = new URL(link, 'http://sadat-real-estate.local').searchParams.get('ref');
  return reference === null || reference.trim() === '' ? undefined : reference;
}

function iconForType(type: string): SeekerIconName {
  if (type.startsWith('viewing.')) return 'viewings';
  if (type.startsWith('request.')) return 'requests';
  if (type.startsWith('property.')) return 'saved';
  if (type.startsWith('community.')) return 'notifications';
  return 'notifications';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<SeekerNotificationsViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getSeekerNotificationsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="seeker-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} loadingVariant="list" onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
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
  const href = item.link === undefined ? undefined : localeForSeekerPath(locale, item.link);
  const reference = referenceForLink(item.link);
  const read = item.readAt !== null;
  return (
    <article className="seeker-notifications__item" role="listitem" data-testid={`seeker-notification-${item.id}`} data-state={read ? 'read' : 'unread'}>
      <span className="seeker-notifications__icon" data-type={item.type.split('.')[0]} aria-hidden="true"><SeekerIcon name={iconForType(item.type)} /></span>
      <div className="seeker-notifications__body">
        <div className="seeker-notifications__meta">
          <h2>{href === undefined ? title : <a href={href}>{title}</a>}</h2>
          <time dateTime={item.createdAt}>{relativeTimeLabel(item.createdAt, locale)}</time>
        </div>
        {message !== undefined ? <p>{message}</p> : null}
        {reference ? <code className="seeker-notifications__reference">{reference}</code> : null}
      </div>
      {!read ? <button type="button" className="seeker-notifications__unread-dot" aria-label={copy.markRead} disabled={marking} onClick={onMarkRead} /> : null}
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
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;
  const loadSource = useMemo(() => load ?? createSeekerNotificationsLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const actionSource = useMemo(() => actions ?? createSeekerNotificationActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);

  useEffect(() => {
    if (!isAuthenticatedSeekerSession(session)) {
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
  }, [attempt, filter, loadSource, page, sessionRole]);

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
    <section className="seeker-dashboard seeker-notifications" data-screen-id="SEK-07" data-route="/seeker/notifications" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <SeekerNavigation locale={locale} activePath="/seeker/notifications" authClient={authClient} apiOrigin={apiOrigin} />
      <div className="seeker-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {mutationMessage ? <p className="seeker-notifications__feedback" data-state={mutationFeedback === 'markedRead' || mutationFeedback === 'markedAll' ? 'success' : mutationFeedback} role={mutationFeedback === 'markedRead' || mutationFeedback === 'markedAll' ? 'status' : 'alert'}>{mutationMessage}</p> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? (
          <>
            <div className="seeker-dashboard__heading-row">
              <div>
                <p className="seeker-dashboard__eyebrow">{copy.eyebrow}</p>
                <h1>{copy.title}</h1>
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
