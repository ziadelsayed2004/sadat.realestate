import assert from 'node:assert/strict';
import test from 'node:test';

const { render } = await import('../dist/server/entry-server.js');

const propertyDetailsData = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  slug: 'published-home',
  kind: 'property',
  name: { ar: 'منزل منشور', en: 'Published home' },
  transactionType: 'sale',
  description: { ar: 'وصف المنزل', en: 'A published home description' },
  area: { value: 120, unit: 'sqm' },
  layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
  price: { amount: 1250000, currency: 'EGP' },
  source: { sourceType: 'developer_company', organizationId: 'bbbbbbbbbbbbbbbbbbbbbbbb' },
  seo: {
    title: { ar: 'تفاصيل منزل منشور', en: 'Published home details' },
    description: { ar: 'وصف محرك البحث', en: 'Search description' },
    slug: 'published-home'
  },
  project: {
    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    slug: 'central-project',
    name: { ar: 'المشروع المركزي', en: 'Central project' },
    description: { ar: 'نبذة المشروع', en: 'Project description' }
  },
  media: [],
  relatedProperties: []
};

const propertyComparisonData = {
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

const developerListData = {
  items: [{
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    kind: 'developer_company',
    slug: 'approved-builder',
    name: { ar: 'Ø´Ø±ÙƒØ© Ù…Ø¹ØªÙ…Ø¯Ø©', en: 'Approved builder', 'zh-CN': 'å·²æ‰¹å‡†å¼€å‘å•†' },
    description: { en: 'Published developer description.' },
    verified: true,
    projectCount: 1,
    propertyCount: 2
  }],
  page: 1,
  limit: 20,
  total: 1
};

const developerProfileData = {
  ...developerListData.items[0],
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
};

const articleListData = [
  {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    slug: 'buying-in-sadat',
    title: { en: 'Buying in Sadat City' },
    body: { en: 'A practical guide to published homes.' },
    seoTitle: { en: 'Buying in Sadat City' },
    seoDescription: { en: 'A practical buying guide.' },
    publishedAt: '2026-08-01T10:00:00+00:00'
  },
  {
    id: 'cccccccccccccccccccccccc',
    categoryId: 'dddddddddddddddddddddddd',
    slug: 'rental-tips',
    title: { en: 'Rental tips' },
    body: { en: 'A short rental checklist.' },
    publishedAt: '2026-07-20T10:00:00+00:00'
  }
];

const articleDetailsData = articleListData[0];

test('SSR renders the public shell with requested locale and LTR direction', async () => {
  const result = await render('/properties?lang=en', { acceptLanguage: 'ar' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'en');
  assert.equal(result.direction, 'ltr');
  assert.match(result.html, /data-surface="public"/);
  assert.match(result.html, /data-locale="en"/);
  assert.match(result.html, /src="\/assets\/sadat-real-estate-logo\.png"/);
});

test('SSR keeps protected dashboard routes in a permission-safe shell', async () => {
  const result = await render('/admin/audit-log', { acceptLanguage: 'ar' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'ar');
  assert.equal(result.direction, 'rtl');
  assert.match(result.html, /data-state="permission"/);
  assert.match(result.html, /data-auth-required="true"/);
});

test('SSR returns a real 404 result for unknown routes', async () => {
  const result = await render('/missing-route', { acceptLanguage: 'zh-CN' });
  assert.equal(result.statusCode, 404);
  assert.equal(result.locale, 'zh-CN');
  assert.match(result.html, /data-state="error"/);
});

test('SSR renders the homepage shell and hydrates CMS data only when supplied', async () => {
  const result = await render('/', {
    homepageData: {
      sections: [{ key: 'hero', title: { en: 'Published homes' }, order: 0 }],
      properties: [],
      developers: [],
      content: [],
      banners: []
    }
  });
  assert.equal(result.statusCode, 200);
  assert.match(result.html, /data-page="public-home"/);
  assert.match(result.html, /Published homes/);
  assert.deepEqual(result.homepageData?.sections[0]?.title, { en: 'Published homes' });
});

test('SSR renders the property listing with the implemented query and safe list data', async () => {
  const result = await render('/properties?lang=en&search=home&sort=price', {
    propertyListData: {
      items: [],
      page: 1,
      limit: 20,
      total: 0
    }
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.propertyListQuery?.search, 'home');
  assert.equal(result.propertyListQuery?.sort, 'price');
  assert.match(result.html, /data-page="public-properties"/);
  assert.match(result.html, /data-listing-state="empty"/);
});

test('SSR renders property details with localized SEO evidence and safe bootstrap state', async () => {
  const result = await render('/properties/published-home?lang=en', { propertyDetailsData });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'en');
  assert.equal(result.direction, 'ltr');
  assert.match(result.html, /data-page="public-property-details"/);
  assert.match(result.html, /data-details-state="success"/);
  assert.match(result.html, /Published home/);
  assert.equal(result.seo?.canonicalPath, '/properties/published-home');
  assert.equal(result.seo?.description, 'Search description');
  assert.equal(result.seo?.jsonLd.name, 'Published home details');
  assert.equal(result.seo?.jsonLd.identifier, 'published-home');
  assert.deepEqual(result.propertyDetailsData?.seo.slug, 'published-home');
});

test('SSR renders the comparison projection and comparison bootstrap state', async () => {
  const result = await render('/compare?lang=en&propertyIds=aaaaaaaaaaaaaaaaaaaaaaaa&propertyIds=bbbbbbbbbbbbbbbbbbbbbbbb', { propertyComparisonData });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'en');
  assert.equal(result.direction, 'ltr');
  assert.match(result.html, /data-page="public-comparison"/);
  assert.match(result.html, /data-comparison-state="success"/);
  assert.match(result.html, /data-comparison-count="2"/);
  assert.match(result.html, /Garden villa/);
  assert.deepEqual(result.propertyComparisonData?.items.map(item => item.slug), ['garden-villa', 'city-apartment']);
  assert.equal(result.propertyComparisonInitialState, undefined);
});

test('SSR renders the public developer directory with the implemented query', async () => {
  const result = await render('/developers?lang=en&search=builder&sort=name', { developerListData });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'en');
  assert.equal(result.direction, 'ltr');
  assert.equal(result.developerListQuery?.search, 'builder');
  assert.equal(result.developerListQuery?.sort, 'name');
  assert.match(result.html, /data-page="public-developers"/);
  assert.match(result.html, /data-developers-state="success"/);
  assert.match(result.html, /Approved builder/);
  assert.deepEqual(result.developerListData?.items.map(item => item.slug), ['approved-builder']);
});

test('SSR renders the public developer profile and truthful profile projection', async () => {
  const result = await render('/developers/approved-builder?lang=en', { developerProfileData });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'en');
  assert.match(result.html, /data-page="public-developer-profile"/);
  assert.match(result.html, /data-developer-profile-state="success"/);
  assert.match(result.html, /Approved builder/);
  assert.match(result.html, /Central project/);
  assert.match(result.html, /Published home/);
  assert.equal(result.developerProfileInitialState, undefined);
});

test('SSR renders the public article listing with query and safe public projection', async () => {
  const result = await render('/articles?lang=en&categoryId=bbbbbbbbbbbbbbbbbbbbbbbb&page=2', { articleListData });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'en');
  assert.equal(result.direction, 'ltr');
  assert.equal(result.articleListQuery?.categoryId, 'bbbbbbbbbbbbbbbbbbbbbbbb');
  assert.equal(result.articleListQuery?.page, 2);
  assert.match(result.html, /data-page="public-articles"/);
  assert.match(result.html, /data-articles-state="success"/);
  assert.match(result.html, /Buying in Sadat City/);
  assert.doesNotMatch(result.html, /authorId/);
  assert.deepEqual(result.articleListData?.map(item => item.slug), ['buying-in-sadat', 'rental-tips']);
});

test('SSR renders article details with localized SEO and related-content bootstrap', async () => {
  const result = await render('/articles/buying-in-sadat?lang=en', { articleDetailsData, relatedArticles: articleListData });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'en');
  assert.equal(result.direction, 'ltr');
  assert.match(result.html, /data-page="public-article-details"/);
  assert.match(result.html, /data-article-details-state="success"/);
  assert.match(result.html, /Buying in Sadat City/);
  assert.match(result.html, /Rental tips/);
  assert.equal(result.seo?.canonicalPath, '/articles/buying-in-sadat');
  assert.equal(result.seo?.description, 'A practical buying guide.');
  assert.equal(result.seo?.jsonLd['@type'], 'Article');
  assert.equal(result.seo?.jsonLd.headline, 'Buying in Sadat City');
  assert.deepEqual(result.relatedArticles?.map(item => item.slug), ['buying-in-sadat', 'rental-tips']);
});

test('SSR returns 404 for an article slug that does not match the safe slug contract', async () => {
  const result = await render('/articles/not%20a%20slug?lang=en');
  assert.equal(result.statusCode, 404);
  assert.equal(result.articleDetailsInitialState, 'not_found');
  assert.match(result.html, /data-state="not_found"/);
});
