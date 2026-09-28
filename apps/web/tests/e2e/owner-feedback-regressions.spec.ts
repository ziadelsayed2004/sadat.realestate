import { expect, test } from '@playwright/test';

const typeId = '670000000000000000000084';
const listing = {
  items: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'owner-home', kind: 'property', name: { ar: 'شقة في السادات', en: 'Sadat apartment' }, transactionType: 'sale', price: { amount: 1900000, currency: 'EGP' }, area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2 }, imageUrl: '/assets/clone/pub07-a.png', featured: true, installmentAvailable: true }],
  categories: [], propertyTypes: [{ id: typeId, slug: 'showrooms', name: { ar: 'صالات عرض', en: 'Showrooms' }, propertyCount: 1, order: 0 }], page: 1, limit: 20, total: 1
};
const article = {
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb', categoryId: 'cccccccccccccccccccccccc', slug: 'owner-guide', title: { ar: 'دليل الشراء في السادات', en: 'Sadat buying guide' }, body: { ar: 'معلومات تفصيلية عن شراء العقار.', en: 'Detailed information about buying property.' }, imageUrl: '/assets/clone/pub07-a.png', readingTimeMinutes: 8, publishedAt: '2026-09-01T10:00:00.000Z'
};
const developer = {
  id: 'dddddddddddddddddddddddd', kind: 'developer_company', slug: 'owner-builder', name: { ar: 'شركة التطوير', en: 'Owner builder' }, description: { ar: 'شركة تطوير عقاري', en: 'Property development company' }, verified: true, projectCount: 0, propertyCount: 0, projects: [], properties: [], stats: { publishedProjects: 0, availableProperties: 0, saleProperties: 0, rentalProperties: 0 }
};

test('prices apply without reload, selected types have a return path, and list view changes geometry', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const queries: URLSearchParams[] = [];
  await page.route('**/api/v1/public/properties?**', route => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(query);
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: query.has('propertyTypeId') ? { ...listing, items: [], total: 0 } : listing, meta: { requestId: 'owner-listing' } }) });
  });
  await page.goto(`/properties?lang=${locale}`, { waitUntil: 'domcontentloaded' });
  const cards = page.locator('.public-property-listing__cards');
  await expect(cards).toBeVisible();
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  const card = cards.locator('.ui-property-card').first();
  const gridBox = await card.boundingBox();
  await page.getByRole('button', { name: locale === 'ar' ? 'عرض قائمة' : 'List view', exact: true }).click();
  await expect(cards).toHaveAttribute('data-layout', 'list');
  const media = await card.locator('.ui-property-card__media').boundingBox();
  const body = await card.locator('.ui-property-card__body').boundingBox();
  expect(media && body && Math.abs(media.y - body.y) < 2).toBeTruthy();
  expect(media && body && media.width + body.width <= (await card.boundingBox())!.width + 2).toBeTruthy();
  if (test.info().project.name.startsWith('mobile')) expect((await card.boundingBox())!.height).toBeLessThan(gridBox!.height);
  await expect(card.locator('.ui-property-card__price')).toBeVisible();
  await card.locator('.public-property-listing__compare-button').click();
  await expect(card.locator('.public-property-listing__compare-button')).toHaveAttribute('aria-pressed', 'true');
  expect(new URL(page.url()).pathname).toBe('/properties');

  const minimum = page.locator('input[name="minPrice"]');
  const maximum = page.locator('input[name="maxPrice"]');
  await minimum.fill('1000000');
  await maximum.fill('2000000');
  const calls = queries.length;
  await page.getByRole('button', { name: locale === 'ar' ? 'تطبيق التصفية' : 'Apply filters', exact: true }).click();
  await expect.poll(() => queries.some(query => query.get('minPrice') === '1000000' && query.get('maxPrice') === '2000000')).toBe(true);
  expect(queries.length).toBe(calls + 1);
  await page.locator(`input[name="propertyTypeId"][value="${typeId}"]`).check({ force: true });
  await expect(page.locator('[data-listing-state="empty"]')).toBeVisible();
  await page.getByRole('button', { name: locale === 'ar' ? 'العودة إلى كل الفئات' : 'Back to all categories' }).click();
  await expect(cards).toBeVisible();
  expect(new URL(page.url()).searchParams.has('propertyTypeId')).toBe(false);
  expect(new URL(page.url()).searchParams.get('minPrice')).toBe('1000000');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  if (test.info().project.name === 'mobile-ar') await card.screenshot({ path: test.info().outputPath('listing-list.png') });
});

test('article images and summaries open the card, with working back navigation and no document reload', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.route('**/api/v1/public/article-categories**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [], meta: { requestId: 'owner-categories' } }) }));
  await page.route('**/api/v1/public/articles**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: new URL(route.request().url()).pathname.endsWith('/owner-guide') ? article : [article], meta: { requestId: 'owner-articles', page: 1, limit: 20, total: 1 } }) }));
  await page.goto(`/articles?lang=${locale}`, { waitUntil: 'domcontentloaded' });
  const card = page.locator('[data-article-card]').first();
  await expect(card).toBeVisible();
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await card.scrollIntoViewIfNeeded();
  const media = await card.locator('.public-articles__card-media').boundingBox();
  await page.mouse.click(media!.x + 20, media!.y + 40);
  await expect(page).toHaveURL(new RegExp(`/articles/owner-guide\\?lang=${locale}$`));
  await expect(page.locator('[data-page="public-article-details"] h1')).toHaveText(article.title[locale]);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await page.goBack();
  await expect(page.locator('[data-page="public-articles"]')).toBeVisible();
  const summary = card.locator('.public-articles__card-summary');
  await summary.scrollIntoViewIfNeeded();
  const summaryBox = await summary.boundingBox();
  await page.mouse.click(summaryBox!.x + summaryBox!.width / 2, summaryBox!.y + summaryBox!.height / 2);
  await expect(page.locator('[data-page="public-article-details"] h1')).toHaveText(article.title[locale]);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
});

test('developer section links respond without hiding the page and fonts remain local and stable', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const externalFontRequests: string[] = [];
  page.on('request', request => { if (/fonts\.googleapis|fonts\.gstatic/.test(request.url())) externalFontRequests.push(request.url()); });
  const directoryOrganization = { id: developer.id, kind: developer.kind, slug: developer.slug, name: developer.name, description: developer.description, verified: developer.verified, projectCount: developer.projectCount, propertyCount: developer.propertyCount };
  await page.route('**/api/v1/public/developers?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { items: [directoryOrganization], page: 1, limit: 20, total: 1 }, meta: { requestId: 'owner-directory' } }) }));
  await page.route('**/api/v1/public/developers/owner-builder', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: developer, meta: { requestId: 'owner-developer' } }) }));
  await page.goto(`/developers?lang=${locale}`, { waitUntil: 'domcontentloaded' });
  const directoryCard = page.locator('.public-developer-directory__card').first();
  await expect(directoryCard).toBeVisible();
  const directoryTimeOrigin = await page.evaluate(() => performance.timeOrigin);
  await directoryCard.scrollIntoViewIfNeeded();
  const directoryBox = await directoryCard.boundingBox();
  await page.mouse.click(directoryBox!.x + 20, directoryBox!.y + 20);
  await expect(page).toHaveURL(new RegExp(`/developers/owner-builder\\?lang=${locale}$`));
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(directoryTimeOrigin);
  await expect(page.locator('#developer-contact')).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  const before = await page.locator('h1').boundingBox();
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.locator('.public-developer-profile__tabs a[href="#developer-contact"]').click();
  await expect(page).toHaveURL(/#developer-contact$/);
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/app-navigating/);
  await page.waitForTimeout(2700);
  const after = await page.locator('h1').boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
  expect(await page.evaluate(() => document.fonts.check('400 16px Cairo', 'عقارات السادات'))).toBe(true);
  expect(externalFontRequests).toEqual([]);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
});

test('property controls and list cards fit narrow phones and desktop breakpoints', async ({ page }) => {
  test.skip(!test.info().project.name.startsWith('desktop'), 'One viewport sweep per copy direction.');
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.route('**/api/v1/public/properties?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: listing, meta: { requestId: 'owner-widths' } }) }));
  await page.goto(`/properties?lang=${locale}`);
  await expect(page.locator('.public-property-listing__cards')).toBeVisible();
  await page.getByRole('button', { name: locale === 'ar' ? 'عرض قائمة' : 'List view', exact: true }).click();
  for (const width of [320, 360, 390, 768, 1101, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const card = document.querySelector('.public-property-listing__card')!.getBoundingClientRect();
      const price = document.querySelector('.ui-property-card__price')!.getBoundingClientRect();
      const inputs = [...document.querySelectorAll<HTMLInputElement>('.public-property-listing__price-range input')];
      return { width: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth, priceFits: price.left >= card.left && price.right <= card.right, inputsVisible: inputs.every(input => getComputedStyle(input).visibility === 'visible' && input.getBoundingClientRect().width > 50), smallestInputFont: Math.min(...inputs.map(input => parseFloat(getComputedStyle(input).fontSize))) };
    });
    expect(geometry.overflow, `overflow at ${width}px`).toBeLessThanOrEqual(geometry.width);
    expect(geometry.priceFits, `price at ${width}px`).toBe(true);
    expect(geometry.inputsVisible, `price controls at ${width}px`).toBe(true);
    if (width <= 600) expect(geometry.smallestInputFont).toBeGreaterThanOrEqual(16);
  }
});
