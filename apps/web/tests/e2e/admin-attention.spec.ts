import { expect, test } from '@playwright/test';
import { adminRequestId, routeAdminRequestApis } from './admin-requests.fixtures';

test('opening a request marks only that detail read and preserves its review actions', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminRequestApis(page);
  let unreadRequest = 1;
  const acknowledgements: unknown[] = [];
  await page.route('**/api/v1/admin/notifications**', async route => {
    if (route.request().method() === 'POST') {
      acknowledgements.push(route.request().postDataJSON()); unreadRequest = 0;
      await route.fulfill({ json: { data: { updatedCount: 1 }, meta: { requestId: 'detail-read' } } });
    } else {
      await route.fulfill({ json: { data: { items: [], unreadCount: 0, total: 0, page: 1, limit: 1, attention: { counts: { 'contact-requests': unreadRequest, 'property-review': 1 }, total: unreadRequest + 1 } }, meta: { requestId: 'detail-alerts' } } });
    }
  });
  await page.goto(`/admin/contact-requests?lang=${locale}`);
  await expect(page.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 2' : 'Alerts: 2' })).toBeVisible();
  await page.getByTestId(`admin-request-${adminRequestId}`).getByRole('button').click();
  await expect(page.getByTestId('admin-request-detail')).toBeVisible();
  await expect.poll(() => acknowledgements).toEqual([{ queueKey: 'contact-requests', itemId: adminRequestId }]);
  await expect(page.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 1' : 'Alerts: 1' })).toBeVisible();
  await expect(page.locator('#admin-request-transition')).toHaveValue('start_review');
  await page.locator('.ui-modal__close').click();
  await page.reload();
  await expect(page.getByTestId(`admin-request-${adminRequestId}`)).toBeVisible();
  await expect(page.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 1' : 'Alerts: 1' })).toBeVisible();
});

test('administrator sees queue alerts, direct destinations and fresh counts without reloading', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  let pending = 3;
  let reads = 0;
  let extraPending = 2;
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: {
    data: { accessToken: 'admin.attention.e2e', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-attention-refresh' }
  } }));
  await page.route('**/api/v1/admin/overview**', route => route.fulfill({ json: {
    data: { range: { from: '2026-09-05T00:00:00.000Z', to: '2026-10-05T00:00:00.000Z' }, metrics: { users: 1, seekers: 1, providers: 1, verifiedProviders: 1, publishedProperties: 1, openRequests: 1, pendingReviews: pending }, generatedAt: '2026-10-05T00:00:00.000Z' }, meta: { requestId: 'attention-overview' }
  } }));
  await page.route('**/api/v1/admin/notifications**', route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.attention.e2e');
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({});
      pending = 0; extraPending = 0;
      return route.fulfill({ json: { data: { updatedCount: 5 }, meta: { requestId: 'read-all' } } });
    }
    reads++;
    return route.fulfill({ json: { data: { items: [], unreadCount: 0, total: 0, page: 1, limit: 1, attention: { counts: { 'property-review': pending, 'community-reports': extraPending }, total: pending + extraPending } }, meta: { requestId: 'attention-queues' } } });
  });
  await page.goto(`/admin?lang=${locale}`);
  const bell = page.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 5' : 'Alerts: 5' });
  await expect(bell).toBeVisible();
  await bell.click();
  const panel = page.getByRole('region', { name: locale === 'ar' ? 'التنبيهات الجديدة' : 'New alerts' });
  await expect(panel).toBeVisible();
  await expect(panel.locator('a[href*="/admin/properties/review"]')).toHaveAttribute('href', `/admin/properties/review?lang=${locale}`);
  await expect(panel.locator('a[href*="/admin/community/moderation"]')).toHaveAttribute('href', `/admin/community/moderation?lang=${locale}`);
  const box = await panel.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  await page.screenshot({ path: `test-results/admin-attention-${testInfo.project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  if (testInfo.project.name.includes('mobile')) await page.getByTestId('admin-sidebar-toggle').click();
  await expect(page.getByTestId('admin-attention-property-review')).toBeVisible();
  if (testInfo.project.name.includes('mobile')) await page.keyboard.press('Escape');
  const originalUrl = page.url();
  pending = 0;
  const previousReads = reads;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => reads).toBeGreaterThan(previousReads);
  await expect(page.getByTestId('admin-attention-property-review')).toHaveCount(0);
  await expect(page.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 2' : 'Alerts: 2' })).toBeVisible();
  expect(page.url()).toBe(originalUrl);
  await page.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 2' : 'Alerts: 2' }).click();
  await page.getByRole('button', { name: locale === 'ar' ? 'تمييز الكل كمقروء' : 'Mark all as read' }).click();
  await expect(page.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 0' : 'Alerts: 0' })).toBeVisible();
  pending = 1;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 1' : 'Alerts: 1' })).toBeVisible();
});
