import { expect, test } from '@playwright/test';
import { adBannerSchema } from '@sadat-real-estate/contracts';
import { adminHomeBannerFixture, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';
import { getBannerControlCopy } from '../../src/features/admin_home/banner-controls-copy.ts';

test('publishes overlapping homepage banners and rotates their image and copy for each configured duration', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  const controls = getBannerControlCopy(locale);
  await page.clock.install({ time: new Date('2026-10-08T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-08T12:00:01Z'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await routeAdminHomeApis(page);
  const banners = [
    adminHomeBannerFixture({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', title: { ar: 'البانر الأول', en: 'First banner' }, body: { ar: 'محتوى البانر الأول', en: 'First banner content' }, status: 'draft', startAt: '2026-10-08T10:00:00Z', endAt: '2026-10-09T10:00:00Z', mediaId: '111111111111111111111111', displaySeconds: 3, sortOrder: 0 }),
    adminHomeBannerFixture({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', title: { ar: 'البانر الثاني', en: 'Second banner' }, body: { ar: 'محتوى البانر الثاني', en: 'Second banner content' }, status: 'draft', startAt: '2026-10-08T10:00:00Z', endAt: '2026-10-09T10:00:00Z', mediaId: '222222222222222222222222', displaySeconds: 5, sortOrder: 1 })
  ].map(item => adBannerSchema.parse(item));
  await page.route('**/api/v1/admin/banners**', async route => {
    const url = new URL(route.request().url());
    if (!/\/banners(?:\/[a-f0-9]{24})?$/u.test(url.pathname)) return route.fallback();
    if (route.request().method() === 'PATCH') {
      const index = banners.findIndex(item => url.pathname.endsWith(item.id));
      const input = route.request().postDataJSON();
      expect(input).toMatchObject({ status: 'active', expectedVersion: banners[index]!.version });
      banners[index] = { ...banners[index]!, status: input.status, version: banners[index]!.version + 1 };
      return route.fulfill({ json: { data: banners[index], meta: { requestId: 'rotation-publish' } } });
    }
    return route.fulfill({ json: { data: { items: banners, page: 1, limit: 20, total: 2 }, meta: { requestId: 'rotation-list' } } });
  });
  await page.goto(`/admin/banners?lang=${locale}`);
  await expect(page.getByTestId('banner-rotation-hint')).toBeVisible();
  for (const banner of banners) {
    const row = page.getByTestId(`admin-home-banner-${banner.id}`);
    await row.getByRole('button', { name: controls.publish, exact: true }).click();
    await expect(row.getByRole('button', { name: controls.stop, exact: true })).toBeVisible();
  }
  expect(banners.every(item => item.status === 'active')).toBe(true);
  await routePublicHomepageApi(page);
  const response = publicHomepageFixture();
  response.data.banners = banners.map((banner, index) => ({ key: `banner_${banner.id}`, title: banner.title, body: banner.body!, imageUrl: index === 0 ? '/assets/canonical/public/listing-property-rental.png' : '/assets/canonical/public/banner-elite-compound-figma.png', displaySeconds: banner.displaySeconds!, order: banner.sortOrder }));
  await page.route('**/api/v1/public/home**', route => route.fulfill({ json: response }));
  await page.goto(`/?lang=${locale}`);
  const hero = page.locator('.public-homepage__hero');
  const image = hero.locator('.public-homepage__hero-media img');
  const verifyMobileImage = async () => {
    if (page.viewportSize()!.width >= 768) return;
    await expect(hero).toHaveClass(/public-homepage__hero--advertisement/u);
    await expect(image).toHaveCSS('object-fit', 'contain');
    await expect(image).toHaveCSS('opacity', '1');
    await expect(hero.locator('.public-homepage__hero-shade')).toBeHidden();
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const size = await image.evaluate(element => { const img = element as HTMLImageElement; const bounds = img.getBoundingClientRect(); return { width: bounds.width, height: bounds.height, bottom: bounds.bottom, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }; });
    expect(size.width).toBeCloseTo(page.viewportSize()!.width, 0);
    expect(size.height).toBeCloseTo(size.width * size.naturalHeight / size.naturalWidth, 0);
    expect((await hero.locator('.public-homepage__hero-content').boundingBox())!.y).toBeGreaterThanOrEqual(size.bottom - 1);
    const heroBounds = (await hero.boundingBox())!;
    const searchBounds = (await hero.locator('form').boundingBox())!;
    expect(heroBounds.y + heroBounds.height).toBeGreaterThanOrEqual(searchBounds.y + searchBounds.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  };
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(banners[0]!.title[locale]!);
  await page.clock.runFor(2000);
  await expect(page.locator('#site-intro')).toBeHidden();
  await verifyMobileImage();
  await page.mouse.move(1, 1);
  await page.clock.runFor(1100);
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(banners[1]!.title[locale]!);
  await expect(hero.locator('.public-homepage__hero-body')).toHaveText(banners[1]!.body![locale]!);
  await expect(image).toHaveAttribute('src', response.data.banners[1]!.imageUrl!);
  await verifyMobileImage();
  await page.clock.runFor(5100);
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(banners[0]!.title[locale]!);
  await expect(hero.locator('.public-homepage__hero-body')).toHaveText(banners[0]!.body![locale]!);
  await expect(image).toHaveAttribute('src', response.data.banners[0]!.imageUrl!);
  await expect(hero.getByRole('button', { name: locale === 'ar' ? 'إيقاف مؤقت' : 'Pause', exact: true })).toHaveCount(0);
  const next = hero.getByRole('button', { name: locale === 'ar' ? 'الصورة التالية' : 'Next image', exact: true });
  const previous = hero.getByRole('button', { name: locale === 'ar' ? 'الصورة السابقة' : 'Previous image', exact: true });
  await expect(hero.locator('.public-homepage__hero-slider button')).toHaveCount(2);
  const imageBounds = (await image.boundingBox())!;
  expect((await previous.boundingBox())!.x > (await next.boundingBox())!.x).toBe(locale === 'ar');
  for (const arrow of [next, previous]) {
    const bounds = (await arrow.boundingBox())!;
    expect(bounds.y + bounds.height / 2).toBeCloseTo(imageBounds.y + imageBounds.height / 2, 0);
    expect(Math.min(Math.abs(bounds.x - imageBounds.x), Math.abs(bounds.x + bounds.width - imageBounds.x - imageBounds.width))).toBeLessThan(20);
  }
  await next.click();
  await expect(image).toHaveAttribute('src', response.data.banners[1]!.imageUrl!);
  await page.clock.runFor(5100);
  await expect(image).toHaveAttribute('src', response.data.banners[0]!.imageUrl!);
  await previous.click();
  await expect(image).toHaveAttribute('src', response.data.banners[1]!.imageUrl!);
  await page.clock.runFor(5100);
  await expect(image).toHaveAttribute('src', response.data.banners[0]!.imageUrl!);
  await page.screenshot({ path: testInfo.outputPath('rotating-homepage.png') });
});
