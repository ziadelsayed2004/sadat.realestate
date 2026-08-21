import { fireEvent, screen, waitFor } from '@testing-library/react';
import { notificationDataSchema, notificationListDataSchema, type NotificationReadAllData, type NotificationReadData } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { SeekerNotifications, createSeekerNotificationActions, createSeekerNotificationsLoader, getSeekerNotificationsCopy } from '../src/features/seeker/index.ts';
import type { SeekerNotificationActions } from '../src/features/seeker/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const reminder = notificationDataSchema.parse({
  id: '4123456789abcdef01234567',
  type: 'viewing.reminder',
  title: { ar: 'تذكير بموعد المعاينة', en: 'Viewing reminder', 'zh-CN': '看房提醒' },
  message: { ar: 'لديك موعد معاينة غداً.', en: 'You have a viewing tomorrow.', 'zh-CN': '你明天有看房安排。' },
  link: '/seeker/viewings?viewing=4123456789abcdef01234567',
  readAt: null,
  createdAt: '2026-08-18T10:00:00.000Z'
});

const requestUpdate = notificationDataSchema.parse({
  id: '5123456789abcdef01234567',
  type: 'request.updated',
  title: { ar: 'تم تحديث طلبك', en: 'Your request was updated', 'zh-CN': '你的请求已更新' },
  message: { ar: 'تتوفر تفاصيل جديدة لطلبك.', en: 'New details are available for your request.', 'zh-CN': '你的请求有新的详情。' },
  link: '/seeker/requests/5123456789abcdef01234567',
  readAt: '2026-08-17T10:00:00.000Z',
  createdAt: '2026-08-17T09:00:00.000Z'
});

const list = notificationListDataSchema.parse({ items: [reminder, requestUpdate], unreadCount: 1, page: 1, limit: 20, total: 2 });
const unreadList = notificationListDataSchema.parse({ items: [reminder], unreadCount: 1, page: 1, limit: 20, total: 1 });
const session = { status: 'authenticated' as const, role: 'seeker' as const };

describe('Seeker notifications', () => {
  it('loads the implemented list and read routes with contract-shaped requests', async () => {
    const calls: Array<{ url: string; method: string; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const method = init?.method ?? 'GET';
        calls.push({ url: String(input), method, authorization: new Headers(init?.headers).get('authorization') });
        const data = method === 'GET'
          ? list
          : String(input).endsWith('/read-all')
            ? { updatedCount: 1 }
            : { id: reminder.id, readAt: '2026-08-18T12:00:00.000Z' };
        return new Response(JSON.stringify({ data, meta: { requestId: 'notifications-test' } }), { status: 200 });
      }
    });
    const authorization = { getAuthorizationHeader: () => 'Bearer seeker.access.token' };
    const loader = createSeekerNotificationsLoader({ apiClient: client, authorization });
    await expect(loader({ page: 2, limit: 5, unreadOnly: true })).resolves.toEqual(list);
    const actions = createSeekerNotificationActions({ apiClient: client, authorization });
    await expect(actions.markRead(reminder.id)).resolves.toEqual({ id: reminder.id, readAt: '2026-08-18T12:00:00.000Z' });
    await expect(actions.markAllRead()).resolves.toEqual({ updatedCount: 1 });
    expect(calls).toEqual([
      { url: '/api/v1/seeker/notifications?page=2&limit=5&unreadOnly=true', method: 'GET', authorization: 'Bearer seeker.access.token' },
      { url: `/api/v1/seeker/notifications/${reminder.id}/read`, method: 'POST', authorization: 'Bearer seeker.access.token' },
      { url: '/api/v1/seeker/notifications/read-all', method: 'POST', authorization: 'Bearer seeker.access.token' }
    ]);
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders safe notification projections in the approved direction for %s', async locale => {
    const copy = getSeekerNotificationsCopy(locale);
    const result = renderWithLocale(<SeekerNotifications locale={locale} session={session} load={async () => list} actions={emptyActions()} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`seeker-notification-${reminder.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('seeker-notifications-unread-count')).toHaveTextContent(`1 ${copy.unreadCount}`);
    expect(screen.getAllByRole('link', { name: copy.openLink })[0]).toHaveAttribute('href', `/seeker/viewings?viewing=${reminder.id}&lang=${locale}`);
    expect(result.container.querySelector('[data-screen-id="SEK-07"]')).not.toBeNull();
    expect(result.container.textContent).not.toContain('recipientId');
    expect(result.container.textContent).not.toContain('internalNote');
    result.unmount();
  });

  it('filters unread notifications, marks one read, and marks all read through the actions', async () => {
    const load = vi.fn().mockImplementation(async (query: { readonly unreadOnly?: boolean }) => query.unreadOnly ? unreadList : list);
    const actions = emptyActions();
    renderWithLocale(<SeekerNotifications locale="en" session={session} load={load} actions={actions} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`seeker-notification-${reminder.id}`)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^Unread/u }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ page: 1, limit: 20, unreadOnly: true }, expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(actions.markRead).toHaveBeenCalledWith(reminder.id));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Notification marked as read.'));
    fireEvent.click(screen.getByRole('button', { name: /^All$/u }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ page: 1, limit: 20, unreadOnly: false }, expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(actions.markAllRead).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Unread notifications were updated.'));
  });

  it('renders the truthful empty state and fails closed for an anonymous session', async () => {
    const copy = getSeekerNotificationsCopy('en');
    const empty = notificationListDataSchema.parse({ items: [], unreadCount: 0, page: 1, limit: 20, total: 0 });
    renderWithLocale(<SeekerNotifications locale="en" session={session} load={async () => empty} actions={emptyActions()} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.empty.all.title, level: 3 })).toBeInTheDocument());
    renderWithLocale(<SeekerNotifications locale="en" session={{ status: 'anonymous' }} load={async () => list} actions={emptyActions()} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.states.permission.title })).toBeInTheDocument();
  });
});

function emptyActions(): SeekerNotificationActions & { readonly markRead: ReturnType<typeof vi.fn>; readonly markAllRead: ReturnType<typeof vi.fn> } {
  return {
    markRead: vi.fn().mockResolvedValue({ id: reminder.id, readAt: '2026-08-18T12:00:00.000Z' } as NotificationReadData),
    markAllRead: vi.fn().mockResolvedValue({ updatedCount: 1 } as NotificationReadAllData)
  };
}
