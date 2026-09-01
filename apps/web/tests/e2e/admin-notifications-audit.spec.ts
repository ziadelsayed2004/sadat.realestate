import { expect, test } from '@playwright/test';
import { auditId, notificationId, routeAdminNotificationsAuditApis } from './admin-notifications-audit.fixtures.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test.describe('ADM-65 and ADM-66 notifications and audit log', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-65 and ADM-66 use approved local Admin Desktop exports under docs/design_sources/final_screens/admin.' });
    await routeAdminNotificationsAuditApis(page);
  });

  test('renders notification and audit routes with safe projections in every approved locale', async ({ page }) => {
    const locale = localeForProject();
    for (const [path, screenId] of [['/admin/notifications', 'ADM-65'], ['/admin/audit-logs', 'ADM-66'], [`/admin/audit-logs/${auditId}`, 'ADM-66']] as const) {
      await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(`[data-screen-id="${screenId}"][data-device-scope="desktop"][data-state="success"]`)).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|secret/u);
    }
  });

  test('supports mark-read, unread filtering, and audit filtering against implemented routes', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/notifications?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-65"]')).toBeVisible();
    const markRead = page.locator(`[data-testid="admin-notification-${notificationId}"] button`);
    await expect(markRead).toHaveCount(1);
    const requestPromise = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith(`/api/v1/admin/notifications/${notificationId}/read`));
    await markRead.click();
    await requestPromise;
    await expect(page.getByRole('status')).toContainText(/marked as read|تم تحديد|已标/u);
    await page.getByRole('button', { name: /unread|غير مقروء|未读/iu }).click();
    await expect(page.locator('[data-screen-id="ADM-65"]')).toBeVisible();

    await page.goto(`/admin/audit-logs?lang=${encodeURIComponent(locale)}`);
    await page.getByLabel(/action|الإجراء|操作/iu).fill('settings.update');
    const auditRequestPromise = page.waitForRequest(request => request.method() === 'GET' && request.url().includes('/api/v1/admin/audit-logs?'));
    await page.getByRole('button', { name: /apply filters|تطبيق الفلاتر|应用筛选/iu }).click();
    await auditRequestPromise;
    await expect(page.locator('[data-screen-id="ADM-66"]')).toBeVisible();
  });

  test('fails closed when the notifications API denies access', async ({ page }) => {
    await routeAdminNotificationsAuditApis(page, { denyNotifications: true });
    await page.goto('/admin/notifications?lang=en');
    await expect(page.locator('[data-screen-id="ADM-65"][data-state="permission"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Access is not permitted' })).toBeVisible();
  });
});
