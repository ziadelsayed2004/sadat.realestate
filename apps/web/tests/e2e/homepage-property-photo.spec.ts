import { expect, test } from '@playwright/test';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';

test('homepage property photos display fully on mobile while desktop retains its card layout', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routePublicHomepageApi(page);
  const data = publicHomepageFixture().data;
  await page.route('**/api/v1/public/homepage**', route => route.fulfill({ json: { data, meta: { requestId: 'portrait-homepage' } } }));
  await page.route('**/assets/canonical/public/property-home.png', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><rect width="300" height="600" fill="#d6ac57"/><circle cx="150" cy="100" r="60" fill="#15233d"/><rect x="80" y="190" width="140" height="360" fill="#15233d"/></svg>' }));
  await page.goto(`/?lang=${locale}`);
  const img = page.locator('.public-homepage__property-card .ui-property-card__media img').first();
  await expect(img).toBeVisible();
  await img.scrollIntoViewIfNeeded();
  await expect(img).toHaveJSProperty('naturalHeight', 600);
  await expect(img).toHaveCSS('object-fit', test.info().project.name.startsWith('mobile') ? 'contain' : 'cover');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await img.screenshot({ path: test.info().outputPath('complete-property-photo.png') });
  if (test.info().project.name.startsWith('mobile')) {
    await page.setViewportSize({ width: 320, height: 740 });
    await expect(img).toHaveCSS('object-fit', 'contain');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
