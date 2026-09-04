import { expect, test } from '@playwright/test';

test.beforeEach(async (_, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Responsive regression runs on mobile projects.');
});

test('property features and map action remain readable without horizontal overflow', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.goto(`/properties/demo-garden-duplex?lang=${locale}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.public-property-details__amenities li').first()).toBeVisible();
  const map = page.locator('[data-action="open-map"]');
  await expect(map).toBeVisible();
  const geometry = await page.evaluate(() => {
    const list = document.querySelector('.public-property-details__amenities ul');
    const mapLink = document.querySelector('[data-action="open-map"]');
    const listStyle = list instanceof HTMLElement ? getComputedStyle(list) : undefined;
    const mapRect = mapLink?.getBoundingClientRect();
    return {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      columns: listStyle?.gridTemplateColumns.split(' ').length,
      mapWidth: mapRect?.width ?? 0,
      contentWidth: document.querySelector('.public-property-details__summary')?.clientWidth ?? 0
    };
  });
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.columns).toBe(2);
  expect(geometry.mapWidth).toBeGreaterThan(geometry.contentWidth * 0.8);
});

test('developer directory stays within the narrow viewport', async ({ page }) => {
  await page.goto('/developers?lang=ar', { waitUntil: 'domcontentloaded' });
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.body).toBeLessThanOrEqual(geometry.viewport);
});
