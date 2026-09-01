import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  notificationDataSchema,
  notificationListDataSchema,
  providerSettingsDataSchema,
  type NotificationListData,
  type ProviderSettingsData
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  createProviderNotificationActions,
  createProviderNotificationsLoader,
  createProviderSettingsActions,
  createProviderSettingsLoader,
  ProviderNotifications,
  ProviderSettings,
  type ProviderNotificationActions
} from '../src/features/provider/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const notificationId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const auth = { getAuthorizationHeader: () => 'Bearer provider.notifications.token' };
const session = { status: 'authenticated' as const, role: 'provider' as const };

const notification = notificationDataSchema.parse({
  id: notificationId,
  type: 'request.updated',
  title: { ar: 'تحديث على طلب', en: 'Request update',},
  message: { ar: 'تم تحديث حالة الطلب.', en: 'A request status was updated.',},
  link: '/provider/customer-requests',
  readAt: null,
  createdAt: '2026-08-19T08:00:00.000Z'
});
const readNotification = { id: notificationId, readAt: '2026-08-19T09:00:00.000Z' };
const notifications: NotificationListData = notificationListDataSchema.parse({ items: [notification], unreadCount: 1, page: 1, limit: 20, total: 1 });
const emptyNotifications: NotificationListData = notificationListDataSchema.parse({ items: [], unreadCount: 0, page: 1, limit: 20, total: 0 });
const settings: ProviderSettingsData = providerSettingsDataSchema.parse({
  version: 3,
  email: 'provider@example.test',
  whatsappNumber: '+2010998765433',
  officeAddress: '12 Nile Street',
  website: 'https://provider.example.test',
  availableActions: ['update_email', 'update_contact']
});

function envelope(payload: unknown): Response {
  return new Response(JSON.stringify({ data: payload, meta: { requestId: 'provider-settings-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiError(code: 'HTTP_ERROR' | 'INVALID_RESPONSE' | 'NETWORK_ERROR', status?: number): ApiClientError {
  return new ApiClientError('provider test error', { code, ...(status === undefined ? {} : { status }) });
}

describe('provider notifications and settings adapters', () => {
  it('uses only the implemented provider routes and sends the provider authorization', async () => {
    const calls: Array<{ path: string; method: string; authorization: string | null; body?: unknown }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        const headers = new Headers(init?.headers);
        const entry = { path: url.pathname, method: init?.method ?? 'GET', authorization: headers.get('authorization'), ...(init?.body === undefined ? {} : { body: JSON.parse(String(init.body)) as unknown }) };
        calls.push(entry);
        if (url.pathname === '/api/v1/provider/notifications' && entry.method === 'GET') return envelope(notifications);
        if (url.pathname === `/api/v1/provider/notifications/${notificationId}/read`) return envelope(readNotification);
        if (url.pathname === '/api/v1/provider/notifications/read-all') return envelope({ updatedCount: 1 });
        if (url.pathname === '/api/v1/provider/settings' && entry.method === 'GET') return envelope(settings);
        return envelope({ ...settings, version: 4 });
      }
    });

    await expect(createProviderNotificationsLoader({ apiClient: client, authorization: auth })({ page: 2, limit: 20, unreadOnly: true })).resolves.toEqual(notifications);
    const notificationActions = createProviderNotificationActions({ apiClient: client, authorization: auth });
    await expect(notificationActions.markRead(notificationId)).resolves.toEqual(readNotification);
    await expect(notificationActions.markAllRead()).resolves.toEqual({ updatedCount: 1 });
    await expect(createProviderSettingsLoader({ apiClient: client, authorization: auth })()).resolves.toEqual(settings);
    await expect(createProviderSettingsActions({ apiClient: client, authorization: auth }).update({ expectedVersion: 3, website: 'https://updated.example.test' })).resolves.toMatchObject({ version: 4 });

    expect(calls[0]).toMatchObject({ path: '/api/v1/provider/notifications', method: 'GET', authorization: 'Bearer provider.notifications.token' });
    expect(calls.some(call => call.path === '/api/v1/provider/settings' && call.method === 'PATCH' && call.body && (call.body as { expectedVersion: number }).expectedVersion === 3)).toBe(true);
  });
});

describe('Provider notifications', () => {
  it.each(['ar', 'en',] as const)('renders safe notification data and locale direction for %s', async locale => {
    const actions: ProviderNotificationActions = {
      markRead: vi.fn(async () => readNotification),
      markAllRead: vi.fn(async () => ({ updatedCount: 1 }))
    };
    renderWithLocale(<ProviderNotifications locale={locale} session={session} load={async () => notifications} actions={actions} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`provider-notification-${notificationId}`)).toBeInTheDocument());
    expect(document.documentElement.dir).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByTestId('provider-notifications-unread-count')).toHaveTextContent('1');
    expect(screen.getAllByText(locale === 'ar' ? 'تحديث على طلب' : locale === 'en' ? 'Request update' : '请求更新').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: getMarkReadLabel(locale) }));
    await waitFor(() => expect(actions.markRead).toHaveBeenCalledWith(notificationId));
  });

  it('renders permission state without requesting provider data for an anonymous session', async () => {
    const load = vi.fn(async () => notifications);
    renderWithLocale(<ProviderNotifications locale="en" session={{ status: 'anonymous' }} load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-notifications-page') ?? screen.getByText('Sign-in required')).toBeTruthy());
    expect(load).not.toHaveBeenCalled();
    expect(screen.getByText('Sign-in required')).toBeInTheDocument();
  });

  it('fails closed for unsafe notification links and preserves the unread filter empty state', async () => {
    expect(() => notificationDataSchema.parse({ ...notification, link: 'javascript:alert(1)' })).toThrow();
    const load = vi.fn(async (query: { unreadOnly?: boolean }) => query.unreadOnly ? emptyNotifications : notifications);
    renderWithLocale(<ProviderNotifications locale="en" session={session} load={load} actions={{ markRead: vi.fn(async () => readNotification), markAllRead: vi.fn(async () => ({ updatedCount: 1 })) }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`provider-notification-${notificationId}`)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Open details' })).toHaveAttribute('href', '/provider/customer-requests?lang=en');
    fireEvent.click(screen.getByRole('button', { name: /^Unread/ }));
    await waitFor(() => expect(screen.getByText('No unread notifications')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(load).toHaveBeenLastCalledWith({ page: 1, limit: 20, unreadOnly: true }, expect.anything());
  });

  it('renders empty, retry, and forbidden notification states without leaking data', async () => {
    const emptyLoad = vi.fn(async () => emptyNotifications);
    renderWithLocale(<ProviderNotifications locale="en" session={session} load={emptyLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('No notifications')).toBeInTheDocument());
    expect(screen.queryByTestId(`provider-notification-${notificationId}`)).not.toBeInTheDocument();

    const retryLoad = vi.fn()
      .mockRejectedValueOnce(apiError('NETWORK_ERROR'))
      .mockResolvedValueOnce(notifications);
    const retryView = renderWithLocale(<ProviderNotifications locale="en" session={session} load={retryLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('Notifications could not load')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByTestId(`provider-notification-${notificationId}`)).toBeInTheDocument());
    expect(retryLoad).toHaveBeenCalledTimes(2);
    retryView.unmount();

    const forbiddenLoad = vi.fn(async () => { throw apiError('HTTP_ERROR', 403); });
    const forbiddenView = renderWithLocale(<ProviderNotifications locale="en" session={session} load={forbiddenLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('Sign-in required')).toBeInTheDocument());
    expect(screen.queryByTestId(`provider-notification-${notificationId}`)).not.toBeInTheDocument();
    forbiddenView.unmount();

    const errorLoad = vi.fn(async () => { throw apiError('INVALID_RESPONSE'); });
    const errorView = renderWithLocale(<ProviderNotifications locale="en" session={session} load={errorLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('Notifications are unavailable')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    errorView.unmount();
  });

  it('maps notification mutation authorization and not-found failures to safe feedback', async () => {
    const notFoundActions: ProviderNotificationActions = {
      markRead: vi.fn(async () => { throw apiError('HTTP_ERROR', 404); }),
      markAllRead: vi.fn(async () => ({ updatedCount: 1 }))
    };
    const notFoundView = renderWithLocale(<ProviderNotifications locale="en" session={session} load={async () => notifications} actions={notFoundActions} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`provider-notification-${notificationId}`)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(screen.getByText('This notification is no longer available to your account.')).toBeInTheDocument());
    notFoundView.unmount();

    const forbiddenActions: ProviderNotificationActions = {
      markRead: vi.fn(async () => { throw apiError('HTTP_ERROR', 403); }),
      markAllRead: vi.fn(async () => ({ updatedCount: 1 }))
    };
    renderWithLocale(<ProviderNotifications locale="en" session={session} load={async () => notifications} actions={forbiddenActions} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`provider-notification-${notificationId}`)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(screen.getByText('Your session has expired. Sign in and try again.')).toBeInTheDocument());
  });
});

describe('Provider settings', () => {
  it.each(['ar', 'en',] as const)('renders account data in the approved direction for %s', async locale => {
    const update = vi.fn(async () => settings);
    const copy = locale === 'ar' ? 'حفظ البريد الإلكتروني' : locale === 'en' ? 'Save email address' : '保存电子邮箱';
    const rendered = renderWithLocale(<ProviderSettings locale={locale} session={session} load={async () => settings} actions={{ update }} />, { locale });
    await waitFor(() => expect(screen.getByTestId('provider-settings-page')).toBeInTheDocument());
    expect(document.documentElement.dir).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    fireEvent.click(screen.getByRole('button', { name: copy }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ expectedVersion: 3, email: 'provider@example.test' }));
    rendered.unmount();
  });

  it('renders contact fields and keeps unsupported security actions disabled', async () => {
    const update = vi.fn(async () => settings);
    const contactView = renderWithLocale(<ProviderSettings locale="en" session={session} tab="contact" load={async () => settings} actions={{ update }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-settings-page')).toBeInTheDocument());
    expect(screen.getByDisplayValue('12 Nile Street')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save contact data' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ expectedVersion: 3, whatsappNumber: '+2010998765433', officeAddress: '12 Nile Street', website: 'https://provider.example.test' }));
    contactView.unmount();

    renderWithLocale(<ProviderSettings locale="en" session={session} tab="security" load={async () => settings} actions={{ update }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-settings-page')).toHaveAttribute('data-screen-id', 'PRV-22-3'));
    expect(screen.getByRole('button', { name: 'Update password' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Request account deletion' })).toBeDisabled();
  });

  it('honors server-projected settings actions and never exposes phone identity fields', async () => {
    const update = vi.fn(async () => settings);
    const accountView = renderWithLocale(<ProviderSettings locale="en" session={session} load={async () => settings} actions={{ update }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-settings-page')).toHaveAttribute('data-screen-id', 'PRV-22-1'));
    expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('+2010998765433')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact data' })).toHaveAttribute('href', '/provider/settings?tab=contact&lang=en');
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/provider/settings?tab=security&lang=en');
    accountView.unmount();

    const restricted = providerSettingsDataSchema.parse({ ...settings, availableActions: [] });
    const restrictedUpdate = vi.fn(async () => settings);
    const restrictedView = renderWithLocale(<ProviderSettings locale="en" session={session} load={async () => restricted} actions={{ update: restrictedUpdate }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-settings-page')).toBeInTheDocument());
    expect(screen.getByLabelText('Email address')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save email address' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Account data' }));
    expect(restrictedUpdate).not.toHaveBeenCalled();
    restrictedView.unmount();

    const restrictedContact = providerSettingsDataSchema.parse({ ...settings, availableActions: ['update_email'] });
    const contactView = renderWithLocale(<ProviderSettings locale="en" session={session} tab="contact" load={async () => restrictedContact} actions={{ update: restrictedUpdate }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-settings-page')).toHaveAttribute('data-screen-id', 'PRV-22-2'));
    expect(screen.getByLabelText('WhatsApp number')).toBeDisabled();
    expect(screen.getByLabelText('Office address')).toBeDisabled();
    expect(screen.getByLabelText('Website')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save contact data' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Contact data' }));
    expect(restrictedUpdate).not.toHaveBeenCalled();
    contactView.unmount();
  });

  it('maps settings retry, forbidden, empty, validation, and conflict states', async () => {
    const retryLoad = vi.fn()
      .mockRejectedValueOnce(apiError('NETWORK_ERROR'))
      .mockResolvedValueOnce(settings);
    const retryView = renderWithLocale(<ProviderSettings locale="en" session={session} load={retryLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('Settings could not load')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByLabelText('Email address')).toHaveValue('provider@example.test'));
    expect(retryLoad).toHaveBeenCalledTimes(2);
    retryView.unmount();

    const forbiddenLoad = vi.fn(async () => { throw apiError('HTTP_ERROR', 403); });
    const forbiddenView = renderWithLocale(<ProviderSettings locale="en" session={session} load={forbiddenLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('Sign-in required')).toBeInTheDocument());
    forbiddenView.unmount();

    const emptyLoad = vi.fn(async () => { throw apiError('HTTP_ERROR', 404); });
    const emptyView = renderWithLocale(<ProviderSettings locale="en" session={session} load={emptyLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('Settings unavailable')).toBeInTheDocument());
    emptyView.unmount();

    const errorLoad = vi.fn(async () => { throw apiError('INVALID_RESPONSE'); });
    const errorView = renderWithLocale(<ProviderSettings locale="en" session={session} load={errorLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText('Settings are unavailable')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    errorView.unmount();

    const update = vi.fn(async () => { throw apiError('HTTP_ERROR', 409); });
    const conflictView = renderWithLocale(<ProviderSettings locale="en" session={session} load={async () => settings} actions={{ update }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByLabelText('Email address')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'invalid-email' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Account data' }));
    expect(update).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Review the fields and enter valid values.')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'updated@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save email address' }));
    await waitFor(() => expect(screen.getByText('The data changed. Reload it and try again.')).toBeInTheDocument());
    conflictView.unmount();
  });
});

function getMarkReadLabel(locale: 'ar' | 'en'): string {
  return locale === 'ar' ? 'تحديد كمقروء' : locale === 'en' ? 'Mark as read' : '标为已读';
}
