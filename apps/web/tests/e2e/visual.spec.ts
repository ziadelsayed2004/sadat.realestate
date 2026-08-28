import { expect, test } from '@playwright/test';
import { PUBLIC_CLONE_ASSETS, routePublicHomepageApi, routePublicPropertyListApi } from './public-fixtures';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function propertyDetailsFixture() {
  return {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    slug: 'published-home',
    kind: 'property',
    name: { ar: 'منزل منشور', en: 'Published home', 'zh-CN': '已发布房产' },
    transactionType: 'sale',
    description: { ar: 'وصف المنزل المنشور', en: 'A published home description', 'zh-CN': '已发布房产描述' },
    area: { value: 120, unit: 'sqm' },
    layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
    price: { amount: 1250000, currency: 'EGP' },
    source: { sourceType: 'developer_company', organizationId: 'bbbbbbbbbbbbbbbbbbbbbbbb' },
    seo: {
      title: { ar: 'تفاصيل منزل منشور', en: 'Published home details', 'zh-CN': '已发布房产详情' },
      description: { ar: 'وصف محرك البحث', en: 'Search description', 'zh-CN': '搜索描述' },
      slug: 'published-home'
    },
    project: {
      id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      slug: 'central-project',
      name: { ar: 'المشروع المركزي', en: 'Central project', 'zh-CN': '中央项目' },
      description: { ar: 'نبذة المشروع', en: 'Project description', 'zh-CN': '项目描述' }
    },
    media: [],
    features: [],
    services: [],
    relatedProperties: []
  };
}

function propertyComparisonFixture() {
  return {
    items: [
      {
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        slug: 'garden-villa',
        kind: 'property',
        name: { ar: 'Garden villa', en: 'Garden villa', 'zh-CN': 'Garden villa' },
        transactionType: 'sale',
        area: { value: 180, unit: 'sqm' },
        layout: { bedrooms: 4, bathrooms: 3, floor: 1 },
        price: { amount: 2500000, currency: 'EGP' }
      },
      {
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        slug: 'city-apartment',
        kind: 'unit',
        name: { ar: 'City apartment', en: 'City apartment', 'zh-CN': 'City apartment' },
        transactionType: 'rent',
        area: { value: 120, unit: 'sqm' },
        layout: { bedrooms: 3, bathrooms: 2, floor: 8 },
        price: { amount: 20000, currency: 'EGP' }
      }
    ],
    fields: ['kind', 'transactionType', 'sourceName', 'sourceType', 'project', 'developer', 'publicCode', 'price', 'installment', 'area', 'bedrooms', 'bathrooms', 'floor', 'deliveryStatus', 'locationName']
  };
}

function developerDirectoryFixture() {
  return {
    data: {
      items: [{
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        kind: 'developer_company',
        slug: 'approved-builder',
        name: { ar: 'Ø´Ø±ÙƒØ© Ù…Ø¹ØªÙ…Ø¯Ø©', en: 'Approved builder', 'zh-CN': 'å·²æ‰¹å‡†å¼€å‘å•†' },
        description: { ar: 'Ø¬Ù‡Ø© Ù…Ù†Ø´ÙˆØ±Ø©', en: 'Published developer description.', 'zh-CN': 'å·²å‘å¸ƒçš„å¼€å‘å•†' },
        verified: true,
        projectCount: 2,
        propertyCount: 4
      }],
      page: 1,
      limit: 20,
      total: 1
    },
    meta: { requestId: 'e2e-developer-directory' }
  };
}

function developerProfileFixture() {
  return {
    data: {
      ...developerDirectoryFixture().data.items[0],
      projects: [{
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        slug: 'central-project',
        name: { ar: 'Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ', en: 'Central project', 'zh-CN': 'ä¸­å¤®é¡¹ç›®' },
        description: { ar: 'Ù†Ø¨Ø°Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹', en: 'Project description.', 'zh-CN': 'é¡¹ç›®ç®€ä»‹' },
        website: 'https://example.com/central-project'
      }],
      properties: [{
        id: 'cccccccccccccccccccccccc',
        slug: 'published-home',
        kind: 'property',
        name: { ar: 'Ù…Ù†Ø²Ù„ Ù…Ù†Ø´ÙˆØ±', en: 'Published home', 'zh-CN': 'å·²å‘å¸ƒæˆ¿äº§' },
        transactionType: 'sale',
        projectId: 'bbbbbbbbbbbbbbbbbbbbbbbb'
      }],
      stats: { publishedProjects: 2, availableProperties: 4, saleProperties: 3, rentalProperties: 1 }
    },
    meta: { requestId: 'e2e-developer-profile' }
  };
}

function articleListFixture() {
  return {
    data: [
      {
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        slug: 'buying-in-sadat',
        title: { ar: 'Buying in Sadat City', en: 'Buying in Sadat City', 'zh-CN': 'Buying in Sadat City' },
        body: { ar: 'A practical guide to published homes.', en: 'A practical guide to published homes.', 'zh-CN': 'A practical guide to published homes.' },
        seoTitle: { en: 'Buying in Sadat City' },
        seoDescription: { en: 'A practical buying guide.' },
        publishedAt: '2026-08-01T10:00:00+00:00'
      },
      {
        id: 'cccccccccccccccccccccccc',
        categoryId: 'dddddddddddddddddddddddd',
        slug: 'rental-tips',
        title: { ar: 'Rental tips', en: 'Rental tips', 'zh-CN': 'Rental tips' },
        body: { ar: 'A short rental checklist.', en: 'A short rental checklist.', 'zh-CN': 'A short rental checklist.' },
        publishedAt: '2026-07-20T10:00:00+00:00'
      }
    ],
    meta: { requestId: 'e2e-articles' }
  };
}

function articleDetailsFixture() {
  return { data: articleListFixture().data[0], meta: { requestId: 'e2e-article-details' } };
}

async function routeDeveloperApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/public/developers**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pathname.endsWith('/approved-builder') ? developerProfileFixture() : developerDirectoryFixture())
    });
  });
}

async function routeArticleApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/public/articles**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pathname.endsWith('/buying-in-sadat') ? articleDetailsFixture() : articleListFixture())
    });
  });
}

test('public route shell has a locale-aware visual snapshot', async ({ page }) => {
  const locale = localeForProject();
  await routePublicPropertyListApi(page);
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const response = await page.goto(`/properties?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', direction);
  await expect(page.locator('.route-shell')).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-properties');
  const listing = page.locator('[data-page="public-properties"]');
  await expect(listing).toBeVisible();
  await expect(listing.locator('.public-homepage__header')).toBeVisible();
  await expect(listing.locator('form[aria-label]')).toBeVisible();
  await expect(listing).toHaveAttribute('data-listing-state', 'success');
  const logo = listing.locator('.public-homepage__brand img');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveJSProperty('complete', true);
  await expect(logo).toHaveJSProperty('naturalWidth', 636);
  await expect(page).toHaveScreenshot(`public-properties-${locale}.png`, { fullPage: true });
});

test('public homepage renders its SSR shell across approved locales and devices', async ({ page }) => {
  const locale = localeForProject();
  await routePublicHomepageApi(page);
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const response = await page.goto('/?lang=' + encodeURIComponent(locale));

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', direction);
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-home');
  const homepage = page.locator('[data-page="public-home"]');
  await expect(homepage).toBeVisible();
  await expect(homepage.locator('.public-homepage__header')).toBeVisible();
  const logo = homepage.locator('.public-homepage__brand img');
  await expect(logo).toHaveAttribute('src', '/assets/sadat-real-estate-logo.png');
  await expect(logo).toHaveJSProperty('complete', true);
  await expect(logo).toHaveJSProperty('naturalWidth', 636);
  await expect(homepage).toHaveAttribute('data-homepage-state', 'success');
  const heroImage = homepage.locator('.public-homepage__hero-media img');
  await expect(heroImage).toBeVisible();
  await expect(heroImage).toHaveAttribute('src', PUBLIC_CLONE_ASSETS.homepageHero);
  await expect(page).toHaveScreenshot('public-homepage-' + locale + '.png', { fullPage: true });
});

test('public property details renders the implemented projection and safe image state', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/public/properties/published-home', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: propertyDetailsFixture(), meta: { requestId: 'e2e-property-details' } })
    });
  });

  const response = await page.goto(`/properties/published-home?lang=${encodeURIComponent(locale)}`);
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-property-details');
  const details = page.locator('[data-page="public-property-details"]');
  await expect(details).toBeVisible();
  await expect(details).toHaveAttribute('data-details-state', 'success');
  await expect(details.locator('[data-gallery]')).toBeVisible();
  await expect(details.locator('[data-gallery] [data-state="missing_image"]')).toBeVisible();
  await expect(details.locator('form[aria-label]')).toBeVisible();
  await expect(page).toHaveScreenshot(`public-property-details-${locale}.png`, { fullPage: true });
});

test('public property comparison renders the fixed two-item projection', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/public/properties/compare', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ propertyIds: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'] });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: propertyComparisonFixture(), meta: { requestId: 'e2e-property-comparison' } })
    });
  });

  const response = await page.goto(`/compare?lang=${encodeURIComponent(locale)}&propertyIds=aaaaaaaaaaaaaaaaaaaaaaaa&propertyIds=bbbbbbbbbbbbbbbbbbbbbbbb`);
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-compare');
  const comparison = page.locator('[data-page="public-comparison"]');
  await expect(comparison).toBeVisible();
  await expect(comparison).toHaveAttribute('data-comparison-state', 'success');
  await expect(comparison).toHaveAttribute('data-comparison-count', '2');
  await expect(comparison.locator('[data-comparison-card]')).toHaveCount(2);
  await expect(comparison.locator('table')).toHaveCount(4);
  await expect(page).toHaveScreenshot(`public-comparison-${locale}.png`, { fullPage: true });
});

test('public developer directory renders approved organizations across locales and devices', async ({ page }) => {
  const locale = localeForProject();
  await routeDeveloperApi(page);
  const response = await page.goto(`/developers?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-developers');
  const directory = page.locator('[data-page="public-developers"]');
  await expect(directory).toBeVisible();
  await expect(directory).toHaveAttribute('data-developers-state', 'success');
  await expect(directory.locator('form[aria-label]')).toBeAttached();
  await expect(directory.locator('[data-state="missing_image"]')).toBeVisible();
  await expect(page).toHaveScreenshot(`public-developers-${locale}.png`, { fullPage: true });
});

test('public developer profile renders projects and published properties across locales and devices', async ({ page }) => {
  const locale = localeForProject();
  await routeDeveloperApi(page);
  const response = await page.goto(`/developers/approved-builder?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-developer-profile');
  const profile = page.locator('[data-page="public-developer-profile"]');
  await expect(profile).toBeVisible();
  await expect(profile).toHaveAttribute('data-developer-profile-state', 'success');
  await expect(profile.locator('#public-developer-profile-title')).toBeVisible();
  await expect(profile.locator('[data-state="missing_image"]')).toBeVisible();
  await expect(profile.locator('a[href="/properties/published-home"]')).toBeVisible();
  await expect(page).toHaveScreenshot(`public-developer-profile-${locale}.png`, { fullPage: true });
});

test('public article listing renders published cards across locales and devices', async ({ page }) => {
  const locale = localeForProject();
  await routeArticleApi(page);
  const response = await page.goto(`/articles?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-articles');
  const listing = page.locator('[data-page="public-articles"]');
  await expect(listing).toBeVisible();
  await expect(listing).toHaveAttribute('data-articles-state', 'success');
  await expect(listing.locator('.public-homepage__header')).toBeVisible();
  await expect(listing.locator('input[type="search"]')).toBeVisible();
  await expect(listing.locator('[data-article-card]')).toHaveCount(2);
  await expect(listing.locator('[data-state="missing_image"]')).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(`public-articles-${locale}.png`, { fullPage: true });
});

test('public article details renders the published projection and safe media state', async ({ page }) => {
  const locale = localeForProject();
  await routeArticleApi(page);
  const response = await page.goto(`/articles/buying-in-sadat?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-article-details');
  const details = page.locator('[data-page="public-article-details"]');
  await expect(details).toBeVisible();
  await expect(details).toHaveAttribute('data-article-details-state', 'success');
  await expect(details.locator('#public-article-details-title')).toBeVisible();
  await expect(details.locator('[data-state="missing_image"]')).toHaveCount(2);
  await expect(page).toHaveScreenshot(`public-article-details-${locale}.png`, { fullPage: true });
});
