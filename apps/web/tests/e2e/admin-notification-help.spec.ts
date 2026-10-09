import { expect, test } from '@playwright/test';
import { routeAdminNotificationsAuditApis, notificationId } from './admin-notifications-audit.fixtures.ts';

test('explains an empty personal inbox, shows review queues and refreshes new messages', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminNotificationsAuditApis(page);
  let arrived = false;
  let readAll = false;
  const writes: string[] = [];
  await page.route('**/api/v1/admin/notifications**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      writes.push(url.pathname);
      expect(url.pathname).toBe('/api/v1/admin/notifications/read-all');
      readAll = true;
      return route.fulfill({ json: { data: { updatedCount: 3 }, meta: { requestId: 'help-read-all' } } });
    }
    const item = { id: notificationId, type: 'admin.review', title: { ar: 'رسالة مراجعة جديدة', en: 'New review message' }, readAt: readAll ? '2026-10-09T12:00:00.000Z' : null, createdAt: '2026-10-09T11:00:00.000Z', link: '/admin/contact-requests' };
    const items = arrived && !(readAll && url.searchParams.get('unreadOnly') === 'true') ? [item] : [];
    await route.fulfill({ json: { data: { items, unreadCount: arrived && !readAll ? 1 : 0, total: items.length, page: 1, limit: Number(url.searchParams.get('limit') ?? 20), attention: { counts: { 'contact-requests': readAll ? 0 : 2 }, total: readAll ? 0 : 2 } }, meta: { requestId: 'help-list' } } });
  });
  await page.goto(`/admin/notifications?lang=${locale}`);
  const main = page.locator('[data-screen-id="ADM-65"]');
  await expect(main.getByRole('heading', { name: locale === 'ar' ? 'هتلاقي هنا إيه؟' : 'What appears here?' })).toBeVisible();
  const queues = main.locator('.admin-attention__queues');
  await expect(queues.getByRole('link', { name: locale === 'ar' ? /طلبات التواصل/u : /Contact requests/u })).toHaveAttribute('href', `/admin/contact-requests?lang=${locale}`);
  await expect(main.locator('.admin-notifications-audit__empty')).toContainText(locale === 'ar' ? 'عناصر تحتاج المراجعة فوق' : 'review items appear above');
  expect(writes).toEqual([]);
  arrived = true;
  await main.getByRole('button', { name: locale === 'ar' ? 'تحديث الإشعارات' : 'Refresh notifications' }).click();
  await expect(main.getByText(locale === 'ar' ? 'رسالة مراجعة جديدة' : 'New review message')).toBeVisible();
  await main.getByRole('button', { name: locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read' }).click();
  await expect(queues).toHaveCount(0);
  await expect(main.locator('.admin-notifications-audit__notification')).toHaveAttribute('data-state', 'read');
  expect(writes).toEqual(['/api/v1/admin/notifications/read-all']);
  await main.locator('.admin-notifications-audit__tabs button').nth(1).click();
  await expect(main.locator('.admin-notifications-audit__empty')).toBeVisible();
  await main.locator('.admin-notifications-audit__tabs button').nth(0).click();
  await expect(main.locator('.admin-notifications-audit__notification')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await main.locator('h1').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('notification-help.png'), fullPage: true });
});

test('failed refresh offers recovery instead of claiming there are no notifications', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminNotificationsAuditApis(page);
  let unavailable = false;
  await page.route('**/api/v1/admin/notifications**', route => unavailable ? route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', messageKey: 'errors.internal', details: [], requestId: 'help-offline' } } }) : route.fallback());
  await page.goto(`/admin/notifications?lang=${locale}`);
  const main = page.locator('[data-screen-id="ADM-65"]');
  await expect(main.locator('.admin-notifications-audit__notification')).toHaveCount(1);
  unavailable = true;
  await main.getByRole('button', { name: locale === 'ar' ? 'تحديث الإشعارات' : 'Refresh notifications' }).click();
  await expect(main.locator('.admin-notifications-audit__state')).toBeVisible();
  await expect(main.locator('.admin-notifications-audit__empty')).toHaveCount(0);
  unavailable = false;
  await main.getByRole('button', { name: locale === 'ar' ? 'إعادة المحاولة' : 'Retry' }).click();
  await expect(main.locator('.admin-notifications-audit__notification')).toHaveCount(1);
});
