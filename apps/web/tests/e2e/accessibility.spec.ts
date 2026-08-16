import { expect, test } from '@playwright/test';

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
    fields: ['name', 'transactionType', 'price', 'area', 'layout']
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
        description: { en: 'Published developer description.' },
        verified: true,
        projectCount: 2,
        propertyCount: 4
      }],
      page: 1,
      limit: 20,
      total: 1
    },
    meta: { requestId: 'a11y-developer-directory' }
  };
}

function developerProfileFixture() {
  return {
    data: {
      ...developerDirectoryFixture().data.items[0],
      projects: [{
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        slug: 'central-project',
        name: { en: 'Central project' },
        description: { en: 'Project description.' },
        website: 'https://example.com/central-project'
      }],
      properties: [{
        id: 'cccccccccccccccccccccccc',
        slug: 'published-home',
        kind: 'property',
        name: { en: 'Published home' },
        transactionType: 'sale',
        projectId: 'bbbbbbbbbbbbbbbbbbbbbbbb'
      }]
    },
    meta: { requestId: 'a11y-developer-profile' }
  };
}

function articleListFixture() {
  return {
    data: [{
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      slug: 'buying-in-sadat',
      title: { en: 'Buying in Sadat City' },
      body: { en: 'A practical guide to published homes.' },
      publishedAt: '2026-08-01T10:00:00+00:00'
    }],
    meta: { requestId: 'a11y-articles' }
  };
}

function articleDetailsFixture() {
  return { data: articleListFixture().data[0], meta: { requestId: 'a11y-article-details' } };
}

test('public route shell exposes skip navigation and main landmark', async ({ page }) => {
  const locale = localeForProject();
  await page.goto(`/properties?lang=${encodeURIComponent(locale)}`);

  const skipLink = page.locator('.a11y-skip-link');
  await expect(skipLink).toHaveAttribute('href', '#main-content');
  await expect(page.locator('main#main-content')).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main-content')).toBeFocused();
});

test('public homepage exposes a labeled navigation, search form, and image states', async ({ page }) => {
  const locale = localeForProject();
  await page.goto('/?lang=' + encodeURIComponent(locale));

  await expect(page.locator('[data-page="public-home"]')).toBeVisible();
  await expect(page.locator('.public-homepage__nav')).toHaveAttribute('aria-label', /.+/);
  const homepage = page.locator('[data-page="public-home"]');
  const state = await homepage.getAttribute('data-homepage-state');
  expect(state).toMatch(/^(loading|empty|error|retry|permission|success)$/);
  const searchForm = page.locator('form.public-homepage__search');
  if (await searchForm.count() > 0) {
    await expect(searchForm).toHaveAttribute('aria-label', /.+/);
    await expect(page.locator('input#public-homepage-search')).toHaveAttribute('name', 'search');
  }
  await expect(page.locator('.public-homepage__brand img')).toHaveAttribute('alt', /.+/);
});

test('public property listing exposes labeled filters, query controls, and safe states', async ({ page }) => {
  const locale = localeForProject();
  await page.goto('/properties?lang=' + encodeURIComponent(locale));

  const listing = page.locator('[data-page="public-properties"]');
  await expect(listing).toBeVisible();
  await expect(listing.locator('.public-homepage__nav')).toHaveAttribute('aria-label', /.+/);
  const filters = listing.locator('form[aria-label]');
  await expect(filters).toBeVisible();
  await expect(filters.locator('input[name="search"]')).toHaveAttribute('id', 'public-property-search');
  await expect(listing.locator('select[name="sort"]')).toHaveAttribute('id', 'public-property-sort');
  await expect(listing.locator('select[name="direction"]')).toHaveAttribute('id', 'public-property-direction');
  const state = await listing.getAttribute('data-listing-state');
  expect(state).toMatch(/^(loading|empty|error|retry|permission|success)$/);
  await expect(listing.locator('.public-homepage__brand img')).toHaveAttribute('alt', /.+/);
});

test('public property details exposes one main landmark, labeled actions, and safe media states', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/public/properties/published-home', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: propertyDetailsFixture(), meta: { requestId: 'a11y-property-details' } })
    });
  });

  await page.goto(`/properties/published-home?lang=${encodeURIComponent(locale)}`);
  const details = page.locator('[data-page="public-property-details"]');
  await expect(details).toBeVisible();
  await expect(details).toHaveAttribute('data-details-state', 'success');
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('main#main-content main')).toHaveCount(0);
  await expect(details.locator('[data-gallery] [data-state="missing_image"]')).toBeVisible();
  await expect(details.locator('form[aria-label]')).toHaveAttribute('aria-label', /.+/);
  await expect(details.locator('textarea#public-property-contact-message')).toHaveAttribute('name', 'message');
  const viewingButton = details.locator('[data-action="request-viewing"]');
  await expect(viewingButton).toBeVisible();
  await viewingButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#public-property-viewing-requested-at')).toBeVisible();
});

test('public property comparison exposes labeled controls, tables, and safe media states', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/public/properties/compare', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: propertyComparisonFixture(), meta: { requestId: 'a11y-property-comparison' } })
    });
  });

  await page.goto(`/compare?lang=${encodeURIComponent(locale)}&propertyIds=aaaaaaaaaaaaaaaaaaaaaaaa&propertyIds=bbbbbbbbbbbbbbbbbbbbbbbb`);
  const comparison = page.locator('[data-page="public-comparison"]');
  await expect(comparison).toBeVisible();
  await expect(comparison).toHaveAttribute('data-comparison-state', 'success');
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('main#main-content main')).toHaveCount(0);
  await expect(comparison.locator('.public-homepage__nav')).toHaveAttribute('aria-label', /.+/);
  await expect(comparison.locator('[data-comparison-card]')).toHaveCount(2);
  await expect(comparison.locator('table')).toHaveCount(3);
  await expect(comparison.getByRole('button', { name: /Remove|إزالة|移除/ })).toHaveCount(2);
  await expect(comparison.locator('[data-state="missing_image"]')).toHaveCount(2);
});

test('public developer directory exposes labeled filters and safe media states', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/public/developers**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(developerDirectoryFixture()) });
  });

  await page.goto(`/developers?lang=${encodeURIComponent(locale)}`);
  const directory = page.locator('[data-page="public-developers"]');
  await expect(directory).toBeVisible();
  await expect(directory).toHaveAttribute('data-developers-state', 'success');
  await expect(directory.locator('.public-homepage__nav')).toHaveAttribute('aria-label', /.+/);
  await expect(directory.locator('form[aria-label]')).toHaveAttribute('aria-label', /.+/);
  await expect(directory.locator('input#public-developer-search')).toHaveAttribute('name', 'search');
  await expect(directory.locator('select#public-developer-sort')).toBeVisible();
  await expect(directory.locator('select#public-developer-direction')).toBeVisible();
  await expect(directory.locator('[data-state="missing_image"]')).toBeVisible();
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('main#main-content main')).toHaveCount(0);
});

test('public developer profile exposes tab navigation, project links, and safe media states', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/public/developers**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(developerProfileFixture()) });
  });

  await page.goto(`/developers/approved-builder?lang=${encodeURIComponent(locale)}`);
  const profile = page.locator('[data-page="public-developer-profile"]');
  await expect(profile).toBeVisible();
  await expect(profile).toHaveAttribute('data-developer-profile-state', 'success');
  await expect(profile.locator('.public-developer-profile__tabs')).toHaveAttribute('aria-label', /.+/);
  await expect(profile.locator('.public-developer-profile__tabs a')).toHaveCount(3);
  await expect(profile.locator('[data-state="missing_image"]')).toBeVisible();
  await expect(profile.getByRole('link', { name: /Published home|Ù…Ù†Ø²Ù„/ })).toHaveAttribute('href', '/properties/published-home');
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('main#main-content main')).toHaveCount(0);
});

test('public article listing exposes labeled search, navigation, and safe media states', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/public/articles**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(articleListFixture()) });
  });

  await page.goto(`/articles?lang=${encodeURIComponent(locale)}`);
  const listing = page.locator('[data-page="public-articles"]');
  await expect(listing).toBeVisible();
  await expect(listing).toHaveAttribute('data-articles-state', 'success');
  await expect(listing.locator('.public-homepage__nav')).toHaveAttribute('aria-label', /.+/);
  await expect(listing.locator('input#public-articles-search')).toHaveAttribute('name', 'search');
  await expect(listing.locator('[data-state="missing_image"]')).toBeVisible();
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('main#main-content main')).toHaveCount(0);
});

test('public article details exposes a main landmark, content heading, and safe media state', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/public/articles**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pathname.endsWith('/buying-in-sadat') ? articleDetailsFixture() : articleListFixture())
    });
  });

  await page.goto(`/articles/buying-in-sadat?lang=${encodeURIComponent(locale)}`);
  const details = page.locator('[data-page="public-article-details"]');
  await expect(details).toBeVisible();
  await expect(details).toHaveAttribute('data-article-details-state', 'success');
  await expect(details.locator('#public-article-details-title')).toBeVisible();
  await expect(details.locator('#public-article-body-title')).toBeVisible();
  await expect(details.locator('[data-state="missing_image"]')).toBeVisible();
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('main#main-content main')).toHaveCount(0);
});
