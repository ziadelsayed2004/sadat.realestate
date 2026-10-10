import { expect, test } from '@playwright/test';
import { adminAdsRequestId, adminAdsRequestFixture, routeAdminAdsApis } from './admin-ads.fixtures.ts';
import { adminHomeBannerId, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';
import { getBannerControlCopy } from '../../src/features/admin_home/banner-controls-copy.ts';

for (const destination of ['properties/customer-property', 'developers/customer-company']) {
  test(`prepares the paid request and publishes its banner linking to ${destination}`, async ({ page }, info) => {
    const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
    const copy = getBannerControlCopy(locale);
    const targetUrl = `https://elsadatrealestate.com/${destination}`;
    const request = { ...adminAdsRequestFixture(), status: 'scheduled', intervalStart: '2027-01-08T14:00:37.012Z', intervalEnd: '2027-01-08T15:00:42.789Z' };
    await routeAdminAdsApis(page);
    await routeAdminHomeApis(page);
    await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}`, route => route.fulfill({ json: { data: { request }, meta: { requestId: 'linked-ad-request' } } }));
    await page.goto(`/admin/ads/financial-review?requestId=${adminAdsRequestId}&lang=${locale}`);
    const actions = page.locator('.admin-ads__delivery');
    const prepare = actions.getByRole('link', { name: locale === 'ar' ? 'تجهيز صورة البانر ورابطه' : 'Prepare banner image and link', exact: true });
    await expect(prepare).toHaveAttribute('href', `/admin/banners/new?requestId=${adminAdsRequestId}&lang=${locale}`);
    await prepare.click();
    await expect(page.locator('.admin-home__request-context')).toContainText(request.purpose);
    await expect(page.locator('#admin-home-banner-start')).toHaveValue('2027-01-08');
    await expect(page.locator('#admin-home-banner-start-time')).toHaveValue('04:00');
    await expect(page.locator('#admin-home-banner-start-time-period')).toHaveValue('pm');
    await expect(page.locator('#admin-home-banner-start-time')).toBeDisabled();
    await expect(page.locator('#admin-home-banner-start-time-period')).toBeDisabled();
    await expect(page.locator('#admin-home-banner-end-time-period')).toBeDisabled();
    await expect(page.locator('#admin-home-banner-placement')).toBeDisabled();
    await expect(page.locator('#admin-home-banner-target')).toHaveAttribute('required', '');
    await page.locator('#admin-home-banner-title-ar').fill('إعلان عقار العميل');
    await page.locator('#admin-home-banner-title-en').fill('Customer property advertisement');
    await page.locator('#admin-home-banner-target').fill(targetUrl);
    await page.locator('#admin-home-banner-file').setInputFiles({ name: 'ad-image.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
    await page.locator('#admin-home-banner-reason').fill('Prepare image for the accepted customer request');
    const created = page.waitForRequest(value => value.method() === 'POST' && value.url().endsWith('/api/v1/admin/banners'));
    await page.locator('.admin-home__editor button[type=submit]').click();
    expect((await created).postDataJSON()).toMatchObject({ adRequestId: adminAdsRequestId, placementKey: request.placementKey, targetUrl, startAt: request.intervalStart, endAt: request.intervalEnd });
    await expect(page.locator('.admin-home__feedback[role=status]')).toContainText(copy.draftSaved);
    await page.getByRole('button', { name: copy.publish, exact: true }).click();
    await expect(page.locator('.admin-home__feedback[role=status]')).toContainText(copy.published);
    const listing = page.waitForRequest(value => value.url().includes('/api/v1/admin/banners?') && new URL(value.url()).searchParams.get('adRequestId') === adminAdsRequestId);
    await page.goto(`/admin/banners?adRequestId=${adminAdsRequestId}&lang=${locale}`);
    await listing;
    await expect(page.getByTestId(`admin-home-banner-${adminHomeBannerId}`)).toContainText(adminAdsRequestId);
    await expect(page.getByTestId(`admin-home-banner-${adminHomeBannerId}`)).toContainText(locale === 'ar' ? 'طلب العميل' : 'Customer request');
    await routePublicHomepageApi(page);
    await page.route('**/api/v1/public/home**', route => {
      const response = publicHomepageFixture();
      response.data.banners = [{ key: `banner_${adminHomeBannerId}`, title: { ar: 'إعلان عقار العميل', en: 'Customer property advertisement' }, imageUrl: '/assets/canonical/public/listing-property-rental.png', targetUrl, order: 0 }];
      return route.fulfill({ json: response });
    });
    await page.goto(`/?lang=${locale}`);
    await expect(page.locator('#site-intro')).toBeHidden();
    const hero = page.locator('.public-homepage__hero');
    await expect(hero.getByRole('heading', { level: 1 })).toContainText(locale === 'ar' ? 'إعلان عقار العميل' : 'Customer property advertisement');
    const link = hero.getByRole('link', { name: locale === 'ar' ? 'عرض الإعلان' : 'View advertisement', exact: true });
    await expect(link).toHaveAttribute('href', targetUrl);
    await link.click({ trial: true });
    const before = page.url();
    await hero.locator('.public-homepage__hero-body').click();
    expect(page.url()).toBe(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (destination.startsWith('properties')) await hero.screenshot({ path: info.outputPath('linked-ad-hero.png') });
    await page.route(targetUrl, route => route.fulfill({ contentType: 'text/html', body: '<h1>Customer advertisement destination</h1>' }));
    await link.click();
    await expect(page).toHaveURL(targetUrl);
  });
}

test('does not expose an empty unlinked editor when the requested campaign cannot load', async ({ page }, info) => {
  await routeAdminHomeApis(page);
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}`, route => route.fulfill({ status: 404, json: {} }));
  await page.goto(`/admin/banners/new?requestId=${adminAdsRequestId}&lang=${info.project.name.endsWith('-en') ? 'en' : 'ar'}`);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('admin-home-banner-editor')).toHaveCount(0);
});
