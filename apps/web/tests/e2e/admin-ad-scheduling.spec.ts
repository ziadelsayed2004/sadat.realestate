import { expect, test } from '@playwright/test';
import { adminAdsRequestFixture, adminAdsRequestId, routeAdminAdsApis } from './admin-ads.fixtures.ts';

test('schedules an advertisement with its current version and reloads the request', async ({ page }) => {
  await routeAdminAdsApis(page);
  let scheduled = false;
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}`, route => route.fulfill({ json: {
    data: { request: { ...adminAdsRequestFixture(), status: scheduled ? 'scheduled' : 'waiting_payment', version: scheduled ? 4 : 3 } }, meta: { requestId: 'schedule-detail' }
  } }));
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}/schedule`, async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ expectedVersion: 3 });
    scheduled = true;
    await route.fulfill({ json: { data: {
      requestId: adminAdsRequestId, placementKey: 'homepage.hero', providerId: adminAdsRequestFixture().providerId,
      status: 'scheduled', startsAt: '2026-08-20T09:00:00.000Z', endsAt: '2026-08-27T09:00:00.000Z',
      timezone: 'Africa/Cairo', localStart: '2026-08-20T12:00:00', localEnd: '2026-08-27T12:00:00', version: 4
    }, meta: { requestId: 'schedule-save' } } });
  });
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.goto(`/admin/ads/requests?requestId=${adminAdsRequestId}&lang=${locale}`);
  const button = page.getByRole('button', { name: locale === 'ar' ? 'جدولة الإعلان' : 'Schedule advertisement' });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveCount(0);
  expect(scheduled).toBe(true);
  await expect(page.locator('.admin-ads__detail [data-status="scheduled"]')).toBeVisible();
});
