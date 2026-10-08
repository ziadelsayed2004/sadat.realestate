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

test('saves multiple images, reorders them and removes one after reopening the draft', async ({ page }) => {
  const locale = language();
  const copy = getBannerControlCopy(locale);
  await routeAdminHomeApis(page);
  await page.goto(`/admin/banners/new?lang=${locale}`);
  await expect(page.getByLabel(copy.upload)).toHaveAttribute('multiple', '');
  await page.locator('#admin-home-banner-title-en').fill('Rotating campaign');
  await page.locator('#admin-home-banner-start').fill('2026-10-09');
  await page.locator('#admin-home-banner-end').fill('2026-10-10');
  const image = { mimeType: 'image/png', buffer: Buffer.from('image fixture') };
  await page.locator('#admin-home-banner-file').setInputFiles([{ ...image, name: 'first.png' }, { ...image, name: 'second.png' }]);
  await expect(page.getByTestId('banner-pending-image')).toHaveCount(2);
  await page.locator('#admin-home-banner-duration').fill('5');
  await page.locator('#admin-home-banner-reason').fill('Save carousel campaign');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.admin-home__feedback[role=status]')).toContainText(copy.draftSaved);
  await expect(page.getByTestId('banner-saved-image')).toHaveCount(2);
  await page.goto(`/admin/banners?lang=${locale}`);
  await page.getByTestId(`admin-home-banner-${adminHomeBannerId}`).getByRole('button', { name: copy.edit, exact: true }).click();
  await expect(page.getByTestId('banner-saved-image')).toHaveCount(2);
  await expect(page.locator('#admin-home-banner-duration')).toHaveValue('5');
  await page.getByTestId('banner-saved-image').nth(1).getByRole('button', { name: locale === 'ar' ? 'تقديم الصورة 2' : 'Move image earlier 2' }).click();
  await page.locator('#admin-home-banner-reason').fill('Reorder carousel images');
  const reordered = page.waitForRequest(request => request.method() === 'PATCH' && request.postDataJSON()?.mediaIds?.length === 2);
  await page.locator('button[type=submit]').click();
  expect((await reordered).postDataJSON().mediaIds).toEqual(['00000000000000000000000f', '00000000000000000000000e']);
  await expect(page.locator('.admin-home__feedback[role=status]')).toContainText(copy.draftSaved);
  await page.getByTestId('banner-saved-image').nth(1).getByRole('button', { name: locale === 'ar' ? 'إزالة' : 'Remove', exact: true }).click();
  const removed = page.waitForRequest(request => request.method() === 'PATCH' && request.postDataJSON()?.mediaIds?.length === 1);
  await page.locator('button[type=submit]').click();
  expect((await removed).postDataJSON().mediaIds).toEqual(['00000000000000000000000f']);
  await expect(page.locator('.admin-home__feedback[role=status]')).toContainText(copy.draftSaved);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => page.getByTestId('banner-saved-image').locator('img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: test.info().outputPath('banner-gallery.png'), fullPage: true });
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.locator('.admin-home__banner-gallery').evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.locator('.admin-home__banner-gallery').screenshot({ path: test.info().outputPath('banner-gallery-controls.png') });
});

test('retries a failed second image without uploading the first image again or publishing the draft', async ({ page }) => {
  const locale = language();
  const copy = getBannerControlCopy(locale);
  await routeAdminHomeApis(page);
  let uploads = 0;
  await page.route('**/api/v1/admin/banners/*/upload', async route => {
    uploads += 1;
    if (uploads === 2) {
      await route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', requestId: 'upload-outage', details: [] } } });
    } else await route.fallback();
  });
  await page.goto(`/admin/banners/new?lang=${locale}`);
  await page.locator('#admin-home-banner-title-en').fill('Retry carousel');
  await page.locator('#admin-home-banner-start').fill('2026-10-09');
  await page.locator('#admin-home-banner-end').fill('2026-10-10');
  const image = { mimeType: 'image/png', buffer: Buffer.from('image fixture') };
  await page.locator('#admin-home-banner-file').setInputFiles([{ ...image, name: 'first.png' }, { ...image, name: 'second.png' }]);
  await page.locator('#admin-home-banner-reason').fill('Save both images as a draft');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('.admin-home__feedback[role=alert]')).toBeVisible();
  await expect(page.getByTestId('banner-saved-image')).toHaveCount(1);
  await expect(page.getByTestId('banner-pending-image')).toHaveCount(1);
  await expect(page.getByRole('button', { name: copy.publish, exact: true })).toBeDisabled();
  const attachment = page.waitForRequest(request => request.method() === 'PATCH' && request.postDataJSON()?.mediaIds?.length === 2);
  await page.locator('button[type=submit]').click();
  expect((await attachment).postDataJSON().mediaIds).toEqual(['00000000000000000000000e', '00000000000000000000000f']);
  await expect(page.locator('.admin-home__feedback[role=status]')).toContainText(copy.draftSaved);
  expect(uploads).toBe(3);
  await expect(page.getByTestId('banner-pending-image')).toHaveCount(0);
});

test('rotates managed images on schedule, pauses and navigates without resetting search', async ({ page }) => {
  const locale = language();
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await routePublicHomepageApi(page);
  const response = publicHomepageFixture();
  response.data.banners = [
    { key: 'banner_campaign_first', title, imageUrl: '/assets/canonical/public/listing-property-rental.png', displaySeconds: 3, targetUrl: 'https://example.com/property', order: 0 },
    { key: 'banner_campaign_second', title, imageUrl: '/assets/canonical/public/banner-elite-compound-figma.png', displaySeconds: 5, targetUrl: 'https://example.com/property', order: 1 }
  ];
  await page.route('**/api/v1/public/home**', route => route.fulfill({ json: response }));
  await page.goto(`/?lang=${locale}`);
  const hero = page.locator('.public-homepage__hero');
  const image = hero.locator('.public-homepage__hero-media img');
  await expect(image).toHaveAttribute('src', response.data.banners[0]!.imageUrl!);
  await page.clock.runFor(3100);
  await expect(image).toHaveAttribute('src', response.data.banners[1]!.imageUrl!);
  await hero.getByRole('button', { name: locale === 'ar' ? 'إيقاف مؤقت' : 'Pause', exact: true }).click();
  await page.mouse.move(1, 1);
  await page.clock.runFor(12_000);
  await expect(image).toHaveAttribute('src', response.data.banners[1]!.imageUrl!);
  await hero.getByRole('button', { name: locale === 'ar' ? 'الصورة التالية' : 'Next image', exact: true }).click();
  await expect(image).toHaveAttribute('src', response.data.banners[0]!.imageUrl!);
  await hero.getByRole('button', { name: locale === 'ar' ? 'الصورة السابقة' : 'Previous image', exact: true }).click();
  await expect(image).toHaveAttribute('src', response.data.banners[1]!.imageUrl!);
  const rent = hero.getByRole('tab', { name: locale === 'ar' ? 'للإيجار' : 'For rent', exact: true });
  await rent.click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await hero.getByRole('button', { name: locale === 'ar' ? 'تشغيل' : 'Play', exact: true }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.mouse.move(1, 1);
  await page.clock.runFor(12_000);
  await expect(image).toHaveAttribute('src', response.data.banners[1]!.imageUrl!);
  await expect(rent).toHaveAttribute('aria-selected', 'true');
  await expect(hero.getByRole('link', { name: locale === 'ar' ? 'عرض الإعلان' : 'View advertisement' })).toHaveAttribute('href', 'https://example.com/property');
  expect(new URL(page.url()).pathname).toBe('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('rotating-hero.png') });
});
