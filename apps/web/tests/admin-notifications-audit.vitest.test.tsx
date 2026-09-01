import { fireEvent, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
    expect(screen.getByText('settings.update')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply filters' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
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

  it('fails closed for anonymous sessions without invoking a loader', async () => {
    let calls = 0;
    renderWithLocale(<AdminNotificationsAudit url="/admin/notifications" locale="en" session={{ status: 'anonymous' }} loadNotifications={async () => { calls += 1; return notifications(); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Access is not permitted' })).toBeInTheDocument());
    expect(calls).toBe(0);
  });

  it('maps audit not-found responses to an explicit recovery state', async () => {
    renderWithLocale(<AdminNotificationsAudit url={`/admin/audit-logs/${auditId}`} locale="en" session={adminSession} loadAuditLog={async () => { throw new ApiClientError('missing', { code: 'HTTP_ERROR', status: 404 }); }} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Audit record not found' })).toBeInTheDocument());
  });
});
