import { expect, test } from '@playwright/test';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';

test('homepage property photos display fully on mobile while desktop retains its card layout', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicHomepageApi(page);
  const data = publicHomepageFixture().data;
  await page.route('**/api/v1/public/homepage**', route => route.fulfill({ json: { data, meta: { requestId: 'portrait-homepage' } } }));
  await page.route(/\/assets\/canonical\/public\/(?:listing-)?property-home\.png$/, route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><rect width="300" height="600" fill="#d6ac57"/><circle cx="150" cy="100" r="60" fill="#15233d"/><rect x="80" y="190" width="140" height="360" fill="#15233d"/></svg>' }));
  await page.goto(`/?lang=${locale}`);
  const img = page.locator('.public-homepage__property-card .ui-property-card__media img').first();
  await expect(img).toBeVisible();
  await img.scrollIntoViewIfNeeded();
  await expect(img).toHaveJSProperty('naturalHeight', 600);
  await expect(img).toHaveCSS('object-fit', page.viewportSize()!.width < 768 ? 'contain' : 'cover');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await img.screenshot({ path: test.info().outputPath('complete-property-photo.png') });
  if (test.info().project.name.startsWith('mobile')) {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      await expect(img).toHaveCSS('object-fit', 'contain');
      const geometry = await img.evaluate(element => {
        const image = element as HTMLImageElement;
        const bounds = image.getBoundingClientRect();
        const media = image.parentElement!.getBoundingClientRect();
        return { ratio: bounds.height / bounds.width, naturalRatio: image.naturalHeight / image.naturalWidth,
          imageWidth: bounds.width, mediaWidth: media.width, imageHeight: bounds.height, mediaHeight: media.height };
      });
      expect(geometry.ratio).toBeCloseTo(geometry.naturalRatio, 2);
      expect(geometry.imageWidth).toBeCloseTo(geometry.mediaWidth, 0);
      expect(geometry.imageHeight).toBeCloseTo(geometry.mediaHeight, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});
