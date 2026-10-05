import { expect, test } from '@playwright/test';

test('administrator sees queue alerts, direct destinations and fresh counts without reloading', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  let pending = 3;
  let reads = 0;
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: {
    data: { accessToken: 'admin.attention.e2e', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-attention-refresh' }
  } }));
  await page.route('**/api/v1/admin/overview**', route => route.fulfill({ json: {
    data: { range: { from: '2026-09-05T00:00:00.000Z', to: '2026-10-05T00:00:00.000Z' }, metrics: { users: 1, seekers: 1, providers: 1, verifiedProviders: 1, publishedProperties: 1, openRequests: 1, pendingReviews: pending }, generatedAt: '2026-10-05T00:00:00.000Z' }, meta: { requestId: 'attention-overview' }
  } }));
  await page.route('**/api/v1/admin/notifications**', route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.attention.e2e');
    reads++;
    return route.fulfill({ json: { data: { items: [], unreadCount: 0, total: 0, page: 1, limit: 1, attention: { counts: { 'property-review': pending, 'community-reports': 2 }, total: pending + 2 } }, meta: { requestId: 'attention-queues' } } });
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
});
