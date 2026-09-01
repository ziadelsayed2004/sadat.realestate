import type { Page } from '@playwright/test';

const notificationId = '111111111111111111111111';
const auditId = '222222222222222222222222';
const actorId = '333333333333333333333333';

function success(data: unknown, requestId: string, meta: Record<string, unknown> = {}) {
  return { data, meta: { requestId, ...meta } };
}

function notification(readAt: string | null = null) {
  return {
    id: notificationId,
    type: 'settings.updated',
    title: { ar: 'تم تحديث الإعدادات', en: 'Settings updated',},
    message: { ar: 'تم حفظ التغيير.', en: 'The approved change was saved.',},
    link: '/admin/settings/platform',
    readAt,
    createdAt: '2026-08-20T09:00:00.000Z'
  };
}

function audit() {
  return {
    id: auditId,
    actorType: 'admin',
    actorId,
    targetType: 'settings',
    targetId: 'platform',
    action: 'settings.update',
    reason: 'Update approved platform settings',
    before: { schemaVersion: 1, platformName: 'Old' },
    after: { schemaVersion: 1, platformName: 'New' },
    requestId: 'admin-notifications-audit-e2e',
    traceId: 'a'.repeat(32),
    createdAt: '2026-08-20T09:00:00.000Z'
  };
}

export async function routeAdminNotificationsAuditApis(page: Page, options: { readonly denyNotifications?: boolean } = {}): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(success({ accessToken: 'admin-notifications.qa.session', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: actorId, roleType: 'admin', status: 'verified' } }, 'admin-notifications-refresh'))
  }));
  await page.route('**/api/v1/admin/notifications**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const denied = options.denyNotifications;
    const data = pathname.endsWith('/read-all')
      ? { updatedCount: 1 }
      : pathname.endsWith(`/notifications/${notificationId}/read`)
        ? { id: notificationId, readAt: '2026-08-20T09:10:00.000Z' }
        : { items: [notification()], unreadCount: 1, page: 1, limit: 20, total: 1 };
    const requestId = pathname.endsWith('/read-all') ? 'admin-notifications-read-all' : pathname.endsWith('/read') ? 'admin-notification-read' : 'admin-notifications-list';
    await route.fulfill({ status: denied ? 403 : pathname.endsWith('/read-all') || pathname.endsWith('/read') ? 200 : 200, contentType: 'application/json', body: JSON.stringify(denied ? { error: { code: 'FORBIDDEN', messageKey: 'errors.notifications.forbidden', details: [], requestId: 'admin-notifications-denied' } } : success(data, requestId)) });
  });
  await page.route('**/api/v1/admin/audit-logs**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const detail = pathname.endsWith(`/${auditId}`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail ? success(audit(), 'admin-audit-detail') : success({ items: [audit()] }, 'admin-audit-list', { page: 1, limit: 25, total: 1 })) });
  });
}

export { auditId, notificationId };
