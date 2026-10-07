import { expect, test } from '@playwright/test';
import { adminHomeBannerId, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';
import { getBannerControlCopy } from '../../src/features/admin_home/banner-controls-copy.ts';

test.use({ timezoneId: 'America/New_York' });
const language = () => test.info().project.name.endsWith('-en') ? 'en' : 'ar';
const title = { ar: 'حبيبة مجدي مديرة المبيعات', en: 'Habiba Magdy sales manager' };

for (const window of [
  { season: 'summer', date: '2026-10-08', startAt: '2026-10-08T13:00:00.000Z', endAt: '2026-10-08T14:00:00.000Z' },
  { season: 'winter', date: '2027-01-08', startAt: '2027-01-08T14:00:00.000Z', endAt: '2027-01-08T15:00:00.000Z' }
]) {
  test(`saves and schedules a banner in Egypt ${window.season} time from an American device and reopens its exact times`, async ({ page }) => {
    const locale = language();
    const copy = getBannerControlCopy(locale);
    await routeAdminHomeApis(page);
    await page.goto(`/admin/banners/new?lang=${locale}`);
    await page.locator('#admin-home-banner-title-ar').fill(title.ar);
    await page.locator('#admin-home-banner-title-en').fill(title.en);
    await page.locator('#admin-home-banner-start').fill(window.date);
    await page.locator('#admin-home-banner-start-time').fill('16:00');
    await page.locator('#admin-home-banner-end').fill(window.date);
    await page.locator('#admin-home-banner-end-time').fill('17:00');
    await page.locator('#admin-home-banner-file').setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
    await page.locator('#admin-home-banner-reason').fill('Set the correct Egypt display window');
    const creation = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/admin/banners'));
    await page.locator('button[type=submit]').click();
    expect((await creation).postDataJSON()).toMatchObject({ title, startAt: window.startAt, endAt: window.endAt });
    await expect(page.locator('.admin-home__feedback[role=status]')).toContainText(copy.draftSaved);
    const publication = page.waitForRequest(request => request.method() === 'PATCH' && request.postDataJSON()?.status === 'scheduled');
    await page.getByRole('button', { name: copy.publish, exact: true }).click();
    expect((await publication).postDataJSON().status).toBe('scheduled');
    await page.goto(`/admin/banners?lang=${locale}`);
    const row = page.getByTestId(`admin-home-banner-${adminHomeBannerId}`);
    await expect(row).toContainText(title[locale]);
    await row.getByRole('button', { name: copy.edit, exact: true }).click();
    await expect(page.locator('#admin-home-banner-start')).toHaveValue(window.date);
    await expect(page.locator('#admin-home-banner-start-time')).toHaveValue('16:00');
    await expect(page.locator('#admin-home-banner-end-time')).toHaveValue('17:00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('shows the published localized title over its image and refreshes the open homepage without losing search state', async ({ page }) => {
  const locale = language();
  await page.clock.install();
  await routePublicHomepageApi(page);
  let phase = 'before';
  await page.route('**/api/v1/public/home**', async route => {
    if (phase === 'outage') { await route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', requestId: 'banner-outage', details: [] } } }); return; }
    const response = publicHomepageFixture();
    response.data.banners = phase === 'published' ? [{ key: `banner_${adminHomeBannerId}`, title, altText: { ar: 'صورة الحملة', en: 'Campaign image' }, imageUrl: '/assets/canonical/public/listing-property-rental.png', order: 0 }] : [];
    await route.fulfill({ json: response });
  });
  await page.goto(`/?lang=${locale}`);
  const heading = page.getByRole('heading', { level: 1 });
  const original = await heading.innerText();
  const rent = page.getByRole('tab', { name: locale === 'ar' ? 'للإيجار' : 'For rent', exact: true });
  await rent.click();
  phase = 'published';
  await page.clock.runFor(30_000);
  await expect(heading).toHaveText(title[locale]);
  await expect(page.locator('.public-homepage__hero-media img')).toHaveAttribute('alt', locale === 'ar' ? 'صورة الحملة' : 'Campaign image');
  await expect(page.locator('.public-homepage__hero-media img')).toHaveAttribute('src', '/assets/canonical/public/listing-property-rental.png');
  await expect(rent).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`managed-banner-${locale}.png`) });
  phase = 'outage';
  await page.clock.runFor(30_000);
  await expect(heading).toHaveText(title[locale]);
  await expect(page.locator('[data-homepage-state]')).toHaveAttribute('data-homepage-state', 'success');
  phase = 'ended';
  await page.clock.runFor(30_000);
  await expect(heading).toHaveText(original, { useInnerText: true });
  await expect(rent).toHaveAttribute('aria-selected', 'true');
});
