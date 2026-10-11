import { expect, test } from '@playwright/test';
import { adminAdsProviderId, routeAdminAdsApis } from './admin-ads.fixtures.ts';

test('ad calendar offers creation, design preview, and the exact homepage placement', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminAdsApis(page);
  const items = ['homepage.hero', 'homepage.featured'].map((placementKey, index) => ({
    requestId: (index + 1).toString().repeat(24), providerId: adminAdsProviderId, placementKey, status: 'scheduled',
    startsAt: '2027-01-10T10:00:00.000Z', endsAt: '2027-01-11T10:00:00.000Z', timezone: 'Africa/Cairo',
    localStart: '2027-01-10T12:00:00', localEnd: '2027-01-11T12:00:00', version: 1
  }));
  await page.route('**/api/v1/admin/ad-calendar**', route => route.fulfill({ json: { data: { items, page: 1, limit: 50, total: 2 }, meta: { requestId: 'calendar-locations' } } }));
  await page.goto(`/admin/ads/calendar?lang=${locale}`);
  await expect(page.getByRole('link', { name: locale === 'ar' ? 'إضافة إعلان رئيسية مميز' : 'Add featured homepage ad', exact: true })).toHaveAttribute('href', `/admin/ads/featured?lang=${locale}`);
  for (const item of items) {
    const row = page.getByTestId(`admin-ad-calendar-${item.requestId}`);
    await expect(row.getByRole('link', { name: locale === 'ar' ? 'معاينة وتصميم الإعلان' : 'Preview and edit ad', exact: true })).toHaveAttribute('href', `${item.placementKey === 'homepage.featured' ? '/admin/ads/featured?requestId=' : '/admin/banners?adRequestId='}${item.requestId}&lang=${locale}`);
    await expect(row.getByRole('link', { name: locale === 'ar' ? 'مكانه في الرئيسية' : 'Location on homepage', exact: true })).toHaveAttribute('href', `/?lang=${locale}#${item.placementKey === 'homepage.featured' ? 'homepage-featured' : 'homepage-hero'}`);
  }
  let linkedRequest: string | null = null;
  await page.route('**/api/v1/admin/banners**', async route => {
    linkedRequest = new URL(route.request().url()).searchParams.get('adRequestId') ?? linkedRequest;
    await route.fulfill({ json: { data: { items: [], page: 1, limit: 20, total: 0 }, meta: { requestId: 'linked-banners' } } });
  });
  await page.getByTestId(`admin-ad-calendar-${items[0]!.requestId}`).getByRole('link', { name: locale === 'ar' ? 'معاينة وتصميم الإعلان' : 'Preview and edit ad', exact: true }).click();
  await expect.poll(() => linkedRequest).toBe(items[0]!.requestId);
});
