import { expect, test } from '@playwright/test';
import { publicPropertyListFixture, routePublicHomepageApi } from './public-fixtures.ts';

test('a published article recovers a temporary failure while a missing article remains a truthful not-found page', async ({ page }) => {
  const ar = test.info().project.name.endsWith('-ar');
  await routePublicHomepageApi(page);
  const category = { id: 'a'.repeat(24), slug: 'guides', name: { en: 'Guides', ar: 'أدلة' } };
  const article = { id: 'b'.repeat(24), categoryId: category.id, slug: 'published-guide', title: { en: 'Published guide', ar: 'دليل منشور' }, body: { en: 'Published article content.', ar: 'محتوى المقال المنشور.' }, category, publishedAt: '2026-10-01T10:00:00Z' };
  let reads = 0;
  await page.route('**/api/v1/public/article-categories**', route => route.fulfill({ json: { data: [category], meta: { requestId: 'qa-categories' } } }));
  await page.route('**/api/v1/public/properties**', route => route.fulfill({ json: publicPropertyListFixture() }));
  await page.route('**/api/v1/public/articles**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/removed-guide')) return route.fulfill({ status: 404, json: { error: { code: 'ARTICLE_NOT_FOUND', messageKey: 'errors.notFound', details: [], requestId: 'qa-not-found' } } });
    if (path.endsWith('/published-guide') && ++reads === 1) return route.fulfill({ status: 503, body: '' });
    return route.fulfill({ json: { data: path.endsWith('/published-guide') ? article : [article], meta: { requestId: 'qa-article' } } });
  });
  await page.goto(`/articles/published-guide?lang=${ar ? 'ar' : 'en'}`);
  await expect(page.getByRole('heading', { name: ar ? 'دليل منشور' : 'Published guide', exact: true })).toBeVisible();
  expect(reads).toBe(2);
  await page.goto(`/articles/removed-guide?lang=${ar ? 'ar' : 'en'}`);
  await expect(page.locator('[data-article-details-state="not_found"]')).toBeVisible();
});

test('a temporary listing failure recovers and its shared price panel applies precise filters at narrow and wide widths', async ({ page }) => {
  const ar = test.info().project.name.endsWith('-ar');
  const lang = ar ? 'ar' : 'en';
  await routePublicHomepageApi(page);
  let requests = 0;
  await page.route('**/api/v1/public/properties?**', async route => {
    requests += 1;
    if (requests === 1) return route.fulfill({ status: 503, json: { error: { code: 'TEMPORARY', messageKey: 'temporary', requestId: 'qa-retry' } } });
    return route.fulfill({ json: publicPropertyListFixture() });
  });
  await page.goto(`/properties?lang=${lang}&sort=price`);
  await expect(page.locator('.public-property-listing__card').first()).toBeVisible();
  expect(requests).toBeGreaterThanOrEqual(2);
  for (const width of [360, 440, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    if (width < 600) {
      const expand = page.locator('.public-property-listing__filters-toggle');
      await expect(expand).toBeVisible();
      if (await expand.getAttribute('aria-expanded') === 'false') await expand.click();
    }
    await page.getByRole('button', { name: ar ? /^نطاق السعر:/ : /^Price range:/ }).click();
    const panel = page.locator('.homepage-price-range__panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('slider')).toHaveCount(2);
    await panel.getByRole('spinbutton', { name: ar ? 'أقل سعر (اختياري)' : 'Minimum price (Optional)', exact: true }).fill('1250000');
    await panel.getByRole('spinbutton', { name: ar ? 'أعلى سعر (اختياري)' : 'Maximum price (Optional)', exact: true }).fill('3250000');
    expect(await panel.evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; })).toBe(true);
    await panel.screenshot({ path: test.info().outputPath(`price-${width}.png`) });
    await panel.getByRole('button', { name: ar ? 'تطبيق' : 'Apply', exact: true }).click();
    await expect(page).toHaveURL(/minPrice=1250000/u);
    expect(new URL(page.url()).searchParams.get('maxPrice')).toBe('3250000');
    expect(new URL(page.url()).searchParams.get('sort')).toBe('price');
    await expect(panel).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
