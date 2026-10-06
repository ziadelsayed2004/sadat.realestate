import { expect, test, type Page } from '@playwright/test';
import { publicPropertyListFixture, routePublicHomepageApi } from './public-fixtures';

const locale = () => test.info().project.name.endsWith('-en') ? 'en' : 'ar';

async function returnPosition(page: Page, expected: number) {
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 12_000 }).toBeCloseTo(expected, 0);
}

test.beforeEach(async ({ page }) => {
  await routePublicHomepageApi(page);
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } } }));
  await page.route('**/api/v1/public/properties**', async route => {
    const url = new URL(route.request().url());
    const envelope = publicPropertyListFixture();
    if (url.pathname === '/api/v1/public/properties') {
      // A returning page must wait for results instead of restoring against a skeleton.
      await new Promise(resolve => setTimeout(resolve, 350));
      await route.fulfill({ json: { ...envelope, data: { ...envelope.data, page: Number(url.searchParams.get('page') ?? 1), limit: 6, total: 18 } } });
    } else {
      const item = envelope.data.items[0]!;
      const slug = url.pathname.split('/').at(-1)!;
      await route.fulfill({ json: { data: { id: item.id, kind: item.kind, name: item.name, transactionType: item.transactionType, price: item.price, area: item.area, layout: item.layout, slug, source: { sourceType: 'developer_company', organizationId: 'bbbbbbbbbbbbbbbbbbbbbbbb' }, seo: { title: item.name, description: item.name, slug }, project: null, media: [], features: [], services: [], relatedProperties: [] }, meta: envelope.meta } });
    }
  });
});

test('browser back and results link restore filtered page, list layout, and exact scroll', async ({ page }) => {
  const language = locale();
  const listingUrl = `/properties?page=2&transactionType=sale&lang=${language}`;
  await page.goto(listingUrl);
  await page.getByRole('button', { name: language === 'ar' ? 'عرض قائمة' : 'List view', exact: true }).click();
  const filterToggle = page.locator('.public-property-listing__filters-toggle');
  const mobileFilters = await filterToggle.isVisible();
  if (mobileFilters) await filterToggle.click();
  const link = page.locator('.public-property-listing__card .ui-property-card__title').nth(2);
  await link.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const saved = await page.evaluate(() => window.scrollY);
  expect(saved).toBeGreaterThan(100);
  await link.click();
  await expect(page.locator('.public-property-details__back')).toHaveAttribute('href', listingUrl);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp('page=2&transactionType=sale'));
  await expect(page.locator('.public-property-listing__cards')).toHaveAttribute('data-layout', 'list');
  if (mobileFilters) await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
  await returnPosition(page, saved);
  await link.click();
  await page.locator('.public-property-details__back').click();
  await expect(page.locator('.public-property-listing__cards')).toHaveAttribute('data-layout', 'list');
  if (mobileFilters) await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
  await returnPosition(page, saved);
  // Forward must restore details, not add duplicate listing entries to history.
  await page.goForward();
  await expect(page.locator('.public-property-details__back')).toBeVisible();
});

test('return from property details preserves the homepage position', async ({ page }) => {
  const language = locale();
  await page.goto(`/?lang=${language}`);
  const link = page.locator('[data-page="public-home"] .ui-property-card__title').first();
  await link.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const saved = await page.evaluate(() => window.scrollY);
  expect(saved).toBeGreaterThan(100);
  await link.click();
  await expect(page.locator('.public-property-details__back')).toHaveAttribute('href', `/?lang=${language}`);
  await page.goBack();
  await expect(page.locator('[data-page="public-home"] .ui-property-card__title').first()).toBeAttached();
  await returnPosition(page, saved);
  await link.click();
  await page.locator('.public-property-details__back').click();
  await returnPosition(page, saved);
  await expect(page).toHaveURL(new RegExp(`/\\?lang=${language}$`));
});

test('a new property page starts at the top even while its details are still loading', async ({ page }) => {
  const language = locale();
  await page.goto(`/properties?lang=${language}`);
  const link = page.locator('.public-property-listing__card .ui-property-card__title').nth(2);
  await link.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  const target = new URL((await link.getAttribute('href'))!, page.url());
  const slug = target.pathname.split('/').at(-1)!;
  let reading = false;
  let release: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/v1/public/properties/${slug}`, async route => {
    reading = true;
    await gate;
    const item = publicPropertyListFixture().data.items[0]!;
    await route.fulfill({ json: { data: { id: item.id, kind: item.kind, name: item.name, transactionType: item.transactionType, slug, source: { sourceType: 'developer_company' }, seo: { title: item.name, slug }, project: null, media: [], features: [], services: [], relatedProperties: [] }, meta: { requestId: 'slow-property' } } });
  });
  await link.click();
  await expect.poll(() => reading).toBe(true);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  release?.();
  await expect(page.locator('[data-details-state="success"]')).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
