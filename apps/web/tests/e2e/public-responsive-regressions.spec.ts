import { expect, test } from '@playwright/test';

const features = Array.from({ length: 12 }, (_, index) => ({
  id: `${index + 1}`.padStart(24, '0'),
  kind: 'feature',
  groupKey: index === 0 ? 'finishing' : 'feature',
  name: { ar: `ميزة عقارية ${index + 1}`, en: `Property feature ${index + 1}` },
  detail: index === 0 ? { ar: 'تشطيب فاخر', en: 'Luxury finishing' } : undefined,
  slug: `property-feature-${index + 1}`,
  order: index
}));

function propertyFixture() {
  return {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'responsive-home', kind: 'property',
    name: { ar: 'دوبلكس بحديقة خاصة', en: 'Duplex with a private garden' }, transactionType: 'sale',
    locationName: { ar: 'الحي المتميز', en: 'Premium District' }, mapUrl: 'https://maps.google.com/?q=30.4,30.5',
    area: { value: 220, unit: 'sqm' }, layout: { bedrooms: 4, bathrooms: 3, floor: 0 },
    price: { amount: 4100000, currency: 'EGP' }, deliveryStatus: 'ready_to_move',
    source: { sourceType: 'developer_company', organizationId: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: { ar: 'شركة السادات للتطوير', en: 'Sadat Development' }, verified: true },
    seo: { title: { ar: 'دوبلكس بحديقة', en: 'Garden duplex' }, description: { ar: 'عقار اختباري', en: 'Test property' }, slug: 'responsive-home' },
    project: null, media: [], features, services: [], relatedProperties: []
  };
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Responsive regression runs on mobile projects.');
  await page.route('**/api/v1/public/properties/responsive-home', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: propertyFixture(), meta: { requestId: 'responsive-property' } })
  }));
});

test('property features and map action remain readable without horizontal overflow', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.goto(`/properties/responsive-home?lang=${locale}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.public-property-details__amenities li')).toHaveCount(features.length);
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
  await page.route('**/api/v1/public/developers**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { items: [], page: 1, limit: 20, total: 0 }, meta: { requestId: 'responsive-developers' } })
  }));
  await page.goto('/developers?lang=ar', { waitUntil: 'domcontentloaded' });
  const geometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.body).toBeLessThanOrEqual(geometry.viewport);
});
