import { expect, test } from '@playwright/test';
import { routeAdminNotificationsAuditApis } from './admin-notifications-audit.fixtures.ts';

test('empty unread notifications retain the filter and recover without reload', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminNotificationsAuditApis(page);
  await page.route('**/api/v1/admin/notifications?**', async route => {
    if (new URL(route.request().url()).searchParams.get('unreadOnly') !== 'true') return route.fallback();
    await route.fulfill({ json: { data: { items: [], unreadCount: 0, page: 1, limit: 20, total: 0 }, meta: { requestId: 'empty-unread' } } });
  });
  await page.goto(`/admin/notifications?lang=${locale}`);
  const filters = page.locator('.admin-notifications-audit__tabs button');
  await expect(page.locator('.admin-notifications-audit__notification')).toHaveCount(1);
  await filters.nth(1).click();
  await expect(page.locator('.admin-notifications-audit__empty')).toBeVisible();
  await expect(filters.nth(0)).toBeVisible();
  await filters.nth(0).click();
  await expect(page.locator('.admin-notifications-audit__notification')).toHaveCount(1);
});
