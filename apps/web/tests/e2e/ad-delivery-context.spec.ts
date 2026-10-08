import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { adminAdsRequestId, adminAdsProviderId, adminAdsRequestFixture, adminAdsFinancialFixture, routeAdminAdsApis } from './admin-ads.fixtures.ts';
import { adminHomeBannerFixture } from './admin-home.fixtures.ts';

test('identifies the requested placement, displays linked ad images and preserves it in banner preparation', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'ad-context-qa' } });
  await routeAdminAdsApis(page);
  const campaign = { request: { ...adminAdsRequestFixture(), placementKey: 'search.sidebar', adType: 'property_promotion', contactPhone: '+201028514572', purpose: 'SDT-1234 — First District apartment', intervalStart: '2026-10-10T09:00:00Z', intervalEnd: '2027-10-20T09:00:00Z' }, pricingOptions: { placements: [{ key: 'search.sidebar', label: { ar: 'بانر صفحة البحث', en: 'Search page banner' } }], adTypes: ['property_promotion'] } };
  const banner = adminHomeBannerFixture({ id: 'ffffffffffffffffffffffff', adRequestId: adminAdsRequestId, placementKey: 'search.sidebar', title: { ar: 'شقة الحي الأول', en: 'First District apartment' }, status: 'draft', targetUrl: 'https://elsadatrealestate.com/properties/demo-open-view-apartment' });
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}`, route => route.fulfill({ json: envelope(campaign) }));
  await page.route(`**/api/v1/admin/ad-financial-review/${adminAdsRequestId}`, route => route.fulfill({ json: envelope({ ...adminAdsFinancialFixture(), placementKey: campaign.request.placementKey, intervalStart: campaign.request.intervalStart, intervalEnd: campaign.request.intervalEnd }) }));
  const files = await Promise.all(['listing-property-home.png', 'listing-property-rental.png'].map(name => readFile(new URL(`../../public/assets/canonical/public/${name}`, import.meta.url))));
  await page.route('**/api/v1/public/banner-media/**', route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.ads.qa');
    return route.fulfill({ contentType: 'image/png', body: files[route.request().url().endsWith('111111111111111111111111') ? 0 : 1]! });
  });
  await page.route('**/api/v1/admin/banners**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/config')) { await route.fulfill({ status: 403, json: { error: { code: 'PERMISSION_DENIED', messageKey: 'errors.permissionDenied', requestId: 'config-denied', details: [] } } }); return; }
    if (url.pathname.endsWith('/preview')) {
      const mediaItems = ['111111111111111111111111', '222222222222222222222222'].map(id => ({ id, bannerId: banner.id, url: `/api/v1/public/banner-media/${id}`, mime: 'image/png', width: 800, height: 600, active: true, version: 0, createdBy: adminAdsProviderId, createdAt: banner.createdAt, updatedAt: banner.updatedAt }));
      await route.fulfill({ json: envelope({ banner, preview: true, mediaItems }) }); return;
    }
    expect(url.searchParams.get('adRequestId')).toBe(adminAdsRequestId);
    await route.fulfill({ json: envelope({ items: [banner], page: 1, limit: 20, total: 1 }) });
  });
  await page.goto(`/admin/ads/financial-review?requestId=${adminAdsRequestId}&lang=${locale}`);
  const summary = page.getByTestId('ad-request-summary');
  await expect(summary).toContainText(campaign.request.purpose);
  await expect(summary).toContainText(ar ? 'بانر صفحة البحث' : 'Search page banner');
  await expect(summary.getByRole('link')).toHaveAttribute('href', 'tel:+201028514572');
  const creative = page.getByTestId('request-creative');
  await expect(creative.getByRole('img')).toHaveCount(2);
  await expect.poll(() => creative.getByRole('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(creative.getByRole('link')).toHaveAttribute('href', 'https://elsadatrealestate.com/properties/demo-open-view-apartment');
  await expect(creative).toContainText(ar ? 'مسودة' : 'Draft');
  await page.getByRole('heading', { level: 1 }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await creative.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await page.screenshot({ path: info.outputPath('ad-request-context.png'), fullPage: true });
  await page.getByRole('link', { name: ar ? 'إعداد بانر: بانر صفحة البحث' : 'Prepare banner: Search page banner' }).click();
  await expect(page.getByTestId('ad-request-summary')).toContainText(campaign.request.purpose);
  const placement = page.locator('#admin-home-banner-placement');
  await expect(placement).toHaveValue('search.sidebar');
  await expect(placement).toBeDisabled();
  await expect(placement.locator('option:checked')).toHaveText(ar ? 'بانر صفحة البحث' : 'Search page banner');
  await expect(page.getByText(ar ? /هذا النموذج لإعداد بانر في موضع الطلب/u : /This form prepares a banner in the request’s placement/u)).toBeVisible();
});
