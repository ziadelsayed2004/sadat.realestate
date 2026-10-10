import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  auditLogDataSchema,
  notificationListDataSchema,
  type AuditLogData,
  type NotificationListData
} from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  AdminNotificationsAudit,
  loadAdminAuditLog,
  loadAdminAuditLogs,
  loadAdminNotifications
} from '../src/features/admin/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { auditChanges } from '../src/features/admin/audit-changes.tsx';

const adminSession = { status: 'authenticated' as const, role: 'admin' as const };
const authorization = { getAuthorizationHeader: () => 'Bearer admin.notifications.test' };
const notificationId = '111111111111111111111111';
const auditId = '222222222222222222222222';
const actorId = '333333333333333333333333';
const traceId = 'a'.repeat(32);

function notifications(): NotificationListData {
  return notificationListDataSchema.parse({
    items: [{ id: notificationId, type: 'settings.updated', title: { ar: 'تم تحديث الإعدادات', en: 'Settings updated',}, message: { ar: 'تم حفظ التغيير.', en: 'The change was saved.',}, link: '/admin/settings/platform', readAt: null, createdAt: '2026-08-20T09:00:00.000Z' }],
    unreadCount: 1,
    page: 1,
    limit: 20,
    total: 1
  });
}

function audit(): AuditLogData {
  return auditLogDataSchema.parse({
    id: auditId,
    actorType: 'admin',
    actorId,
    actorDisplayName: 'Tarek',
    targetType: 'settings',
    targetId: 'platform',
    action: 'settings.update',
    reason: 'Update approved platform settings',
    before: { schemaVersion: 1, platformName: 'Old' },
    after: { schemaVersion: 1, platformName: 'New' },
    requestId: 'admin-audit-test-1',
    traceId,
    createdAt: '2026-08-20T09:00:00.000Z'
  });
}

function envelope(data: unknown, meta: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-notifications-audit-test', ...meta } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; query: string; authorization: string | null }>, data: NotificationListData, log: AuditLogData): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      requests.push({ method: init?.method ?? 'GET', path: url.pathname, query: url.search, authorization: new Headers(init?.headers).get('authorization') });
      if (url.pathname === '/api/v1/admin/audit-logs') return envelope({ items: [log] }, { page: 1, limit: 25, total: 1 });
      if (url.pathname.endsWith(`/audit-logs/${auditId}`)) return envelope(log);
      return envelope(data);
    }
  });
}

describe('Admin notifications and audit log', () => {
  it('compares nested fields and actual permission membership without claiming reordered permissions changed', () => {
    expect(auditChanges({ permissions: ['admin:ads.view', 'admin:ads.price'], name: 'Ads', active: true }, { active: true, name: 'Ads', permissions: ['admin:ads.price', 'admin:ads.view'] })).toEqual([]);
    expect(auditChanges({ title: { ar: 'قديم', en: 'Same' }, flag: false, removed: 'Old' }, { title: { en: 'Same', ar: 'جديد' }, flag: true, added: 0 }).map(change => change.path)).toEqual(['added', 'flag', 'removed', 'title.ar']);
    expect(auditChanges({ hidden: '[REDACTED]' }, { hidden: '[REDACTED]' })).toEqual([]);
  });

  it.each(['ar', 'en'] as const)('shows the employee, role name and added/removed permissions clearly in %s', locale => {
    const log = { ...audit(), actorDisplayName: 'طارق', targetType: 'rbac_role', action: 'rbac.role_updated', before: { name: 'Advertising', active: true, permissions: ['admin:ads.view', 'admin:content.manage'] }, after: { name: 'Advertising', active: false, permissions: ['admin:ads.view', 'admin:ads.price'] } };
    const result = renderWithLocale(<AdminNotificationsAudit url={`/admin/audit-logs/${auditId}`} locale={locale} session={adminSession} initialAuditLog={log} />, { locale });
    expect(screen.getByText('طارق')).toBeVisible();
    expect(screen.getByText('Advertising', { exact: true })).toBeVisible();
    const changes = screen.getByRole('region', { name: locale === 'ar' ? 'إيه اللي اتعدل؟' : 'What changed?' });
    expect(changes).toHaveTextContent(locale === 'ar' ? 'صلاحيات اتشالت' : 'Permissions removed');
    expect(changes).toHaveTextContent(locale === 'ar' ? 'صلاحيات اتضافت' : 'Permissions added');
    expect(changes).toHaveTextContent(locale === 'ar' ? 'الإعلانات — تسعير' : 'Advertising — Price');
    expect(changes).toHaveTextContent(locale === 'ar' ? 'محتوى الموقع — إدارة وتعديل' : 'Website content — Manage');
    expect(changes).not.toHaveTextContent('admin:ads.view');
    expect(changes).not.toHaveTextContent(locale === 'ar' ? 'الإعلانات — عرض' : 'Advertising — View');
    expect(changes).toHaveTextContent(locale === 'ar' ? 'نعم' : 'Yes');
    expect(changes).toHaveTextContent(locale === 'ar' ? 'لا' : 'No');
    const technical = screen.getByText(locale === 'ar' ? 'تفاصيل تقنية (اختياري)' : 'Technical details (optional)').closest('details');
    expect(technical).not.toHaveAttribute('open');
    fireEvent.click(technical!.querySelector('summary')!);
    expect(result.container.querySelector('pre')).toBeVisible();
  });

  it('states when the saved snapshots contain no visible differences instead of inventing a change', () => {
    const log = { ...audit(), after: audit().before };
    renderWithLocale(<AdminNotificationsAudit url={`/admin/audit-logs/${auditId}`} locale="en" session={adminSession} initialAuditLog={log} />, { locale: 'en' });
    expect(screen.getByText('No visible differences in the recorded data for this action.')).toBeVisible();
  });

  it('preserves small numeric differences in the visible comparison', () => {
    const log = { ...audit(), before: { price: 1.23456 }, after: { price: 1.23457 } };
    renderWithLocale(<AdminNotificationsAudit url={`/admin/audit-logs/${auditId}`} locale="en" session={adminSession} initialAuditLog={log} />, { locale: 'en' });
    const comparison = screen.getByRole('region', { name: 'What changed?' });
    expect(within(comparison).getByText('1.23456', { exact: true })).toBeVisible();
    expect(within(comparison).getByText('1.23457', { exact: true })).toBeVisible();
  });

  it('uses the implemented strict routes, queries, IDs, and admin authorization', async () => {
    const requests: Array<{ method: string; path: string; query: string; authorization: string | null }> = [];
    const client = apiClientFor(requests, notifications(), audit());
    await expect(loadAdminNotifications({ apiClient: client, authorization, query: { page: 2, limit: 10, unreadOnly: true } })).resolves.toEqual(notifications());
    await expect(loadAdminAuditLogs({ apiClient: client, authorization, query: { action: 'settings.update', page: 1, limit: 25 } })).resolves.toMatchObject({ items: [audit()], page: 1, limit: 25, total: 1 });
    await expect(loadAdminAuditLog(auditId, { apiClient: client, authorization })).resolves.toEqual(audit());
    expect(requests.map(request => `${request.method} ${request.path}${request.query}`)).toEqual([
      'GET /api/v1/admin/notifications?page=2&limit=10&unreadOnly=true',
      'GET /api/v1/admin/audit-logs?page=1&limit=25&action=settings.update',
      `GET /api/v1/admin/audit-logs/${auditId}`
    ]);
    expect(requests.every(request => request.authorization === 'Bearer admin.notifications.test')).toBe(true);
    await expect(loadAdminAuditLog('not-an-object-id', { apiClient: client })).rejects.toThrow();
  });

  it('renders the recipient-safe localized notification view and marks one notification read', async () => {
    let marked: string | undefined;
    const result = renderWithLocale(
      <AdminNotificationsAudit
        url="/admin/notifications"
        locale="ar"
        session={adminSession}
        initialNotifications={notifications()}
        notificationActions={{ markRead: async id => { marked = id; return { id, readAt: '2026-08-20T09:10:00.000Z' }; }, markAllRead: async () => ({ updatedCount: 1 }) }}
      />,
      { locale: 'ar' }
    );
    expect(result.direction).toBe('rtl');
    expect(result.container.querySelector('[data-screen-id="ADM-65"]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'الإشعارات' })).toBeInTheDocument();
    expect(screen.getByText('تم تحديث الإعدادات')).toBeInTheDocument();
    expect(result.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|auditData|secret/u);
    fireEvent.click(screen.getByRole('button', { name: 'تحديد كمقروء' }));
    await waitFor(() => expect(marked).toBe(notificationId));
    expect(screen.getByRole('status')).toHaveTextContent('تم تحديد الإشعار كمقروء');
    result.unmount();
  });

  it('renders audit filters and detail with redacted snapshots without client-side mutation controls', async () => {
    const log = audit();
    const page = { items: [log], page: 1, limit: 25, total: 1 };
    const list = renderWithLocale(<AdminNotificationsAudit url="/admin/audit-logs" locale="en" session={adminSession} initialAuditLogs={page} />, { locale: 'en' });
    expect(list.direction).toBe('ltr');
    expect(list.container.querySelector('[data-screen-id="ADM-66"]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Action log' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Update')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show results' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export log' })).toBeEnabled();
    list.unmount();

    const detail = renderWithLocale(<AdminNotificationsAudit url={`/admin/audit-logs/${auditId}`} locale="en" session={adminSession} initialAuditLog={log} />, { locale: 'en' });
    expect(screen.getByText('Update approved platform settings')).toBeInTheDocument();
    const snapshots = detail.container.querySelectorAll('pre');
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]?.textContent).toContain('"platformName": "Old"');
    expect(snapshots[1]?.textContent).toContain('"platformName": "New"');
    expect(detail.container.textContent).not.toMatch(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|secret/u);
    detail.unmount();
  });

  it('uses understandable choices, retains server pagination filters and resets the visible form', async () => {
    const queries: Array<Record<string, unknown>> = [];
    const page = { items: [audit()], page: 1, limit: 25, total: 30 };
    renderWithLocale(<AdminNotificationsAudit url="/admin/audit-logs" locale="en" session={adminSession} initialAuditLogs={page} loadAuditLogs={async query => { queries.push(query); return { ...page, page: query.page }; }} />, { locale: 'en' });
    expect(screen.getByLabelText('Account ID of the person making the change')).not.toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Section' }), { target: { value: 'property' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Change type' }), { target: { value: 'update' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show results' }));
    await waitFor(() => expect(queries.at(-1)).toMatchObject({ targetType: 'property', actionGroup: 'update', page: 1 }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(queries.at(-1)).toMatchObject({ targetType: 'property', actionGroup: 'update', page: 2 }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(queries.at(-1)).toEqual({ page: 1, limit: 25 }));
    expect(screen.getByRole('combobox', { name: 'Section' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Change type' })).toHaveValue('');
  });

  it('explains invalid dates and advanced IDs without issuing a failed search', () => {
    const queries: unknown[] = [];
    renderWithLocale(<AdminNotificationsAudit url="/admin/audit-logs" locale="en" session={adminSession} initialAuditLogs={{ items: [], page: 1, limit: 25, total: 0 }} loadAuditLogs={async query => { queries.push(query); return { items: [], page: 1, limit: 25, total: 0 }; }} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show results' }));
    expect(screen.getByRole('alert')).toHaveTextContent('start date must be on or before');
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '' } });
    const account = screen.getByLabelText('Account ID of the person making the change');
    fireEvent.change(account, { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show results' }));
    expect(screen.getByRole('alert')).toHaveTextContent('account ID must contain 24');
    fireEvent.change(account, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Record ID within the section'), { target: { value: auditId } });
    fireEvent.click(screen.getByRole('button', { name: 'Show results' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a section');
    expect(queries).toHaveLength(0);
  });

  it('fails closed for anonymous sessions without invoking a loader', async () => {
    let calls = 0;
    renderWithLocale(<AdminNotificationsAudit url="/admin/notifications" locale="en" session={{ status: 'anonymous' }} loadNotifications={async () => { calls += 1; return notifications(); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Access is not permitted' })).toBeInTheDocument());
    expect(calls).toBe(0);
  });

  it('shows real review queues even when the personal inbox is empty and refreshes arrivals', async () => {
    const empty = { items: [], unreadCount: 0, total: 0, page: 1, limit: 20, attention: { counts: { 'contact-requests': 2 }, total: 2 } };
    let calls = 0;
    renderWithLocale(<AdminNotificationsAudit url="/admin/notifications" locale="en" session={adminSession} initialNotifications={empty} loadNotifications={async () => { calls += 1; return notifications(); }} />, { locale: 'en' });
    expect(within(screen.getByRole('region', { name: 'Needs attention' })).getByRole('link', { name: /Contact requests/u })).toHaveAttribute('href', '/admin/contact-requests?lang=en');
    expect(screen.getByText(/no direct messages.*review items appear above/u)).toBeInTheDocument();
    expect(screen.getByText('Read does not mean approved')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh notifications' }));
    await waitFor(() => expect(screen.getByText('Settings updated')).toBeInTheDocument());
    expect(calls).toBe(1);
  });

  it('does not present a failed refresh as an empty inbox or show stale review queues', async () => {
    const empty = { items: [], unreadCount: 0, total: 0, page: 1, limit: 20, attention: { counts: { 'contact-requests': 2 }, total: 2 } };
    renderWithLocale(<AdminNotificationsAudit url="/admin/notifications" locale="en" session={adminSession} initialNotifications={empty} loadNotifications={async () => { throw new ApiClientError('offline', { code: 'NETWORK_ERROR' }); }} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh notifications' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'The service is temporarily unavailable' })).toBeInTheDocument());
    expect(screen.queryByRole('region', { name: 'Needs attention' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No notifications' })).not.toBeInTheDocument();
  });

  it('maps audit not-found responses to an explicit recovery state', async () => {
    renderWithLocale(<AdminNotificationsAudit url={`/admin/audit-logs/${auditId}`} locale="en" session={adminSession} loadAuditLog={async () => { throw new ApiClientError('missing', { code: 'HTTP_ERROR', status: 404 }); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Audit record not found' })).toBeInTheDocument());
  });
});
