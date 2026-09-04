import { expect, test } from '@playwright/test';

test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Responsive regression runs on mobile projects.');
});

test('property features and map action remain readable without horizontal overflow', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.route('**/api/v1/public/properties/demo-garden-duplex', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        slug: 'demo-garden-duplex',
        kind: 'property',
        name: { ar: 'دوبلكس بحديقة', en: 'Garden duplex' },
        transactionType: 'sale',
        mapUrl: 'https://maps.google.com/?q=Sadat+City',
        description: { ar: 'عقار تجريبي', en: 'Responsive property fixture' },
        area: { value: 220, unit: 'sqm' },
        layout: { bedrooms: 4, bathrooms: 3, floor: 1 },
        price: { amount: 2500000, currency: 'EGP' },
        source: { sourceType: 'developer_company' },
        seo: { title: { ar: 'دوبلكس بحديقة', en: 'Garden duplex' }, description: { ar: 'عقار تجريبي', en: 'Responsive property fixture' }, slug: 'demo-garden-duplex' },
        project: null,
        media: [],
        features: [
          { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', kind: 'feature', groupKey: 'outdoor', name: { ar: 'حديقة خاصة', en: 'Private garden' }, slug: 'garden', order: 0 },
          { id: 'cccccccccccccccccccccccc', kind: 'feature', groupKey: 'parking', name: { ar: 'مكان للسيارة', en: 'Parking' }, slug: 'parking', order: 1 }
        ],
        services: [],
        relatedProperties: []
      },
      meta: { requestId: 'public-responsive-property' }
    })
  }));
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

test('known guest navigation avoids redundant auth refresh work', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('sadat-real-estate.auth.session-hint', 'anonymous');
  });
  let refreshCalls = 0;
  await page.route('**/api/v1/auth/refresh', route => {
    refreshCalls += 1;
    return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/about?lang=ar', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  expect(refreshCalls).toBe(0);
  await expect(page.locator('[data-page="public-about"]')).toBeVisible();
});
