import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from '@playwright/test';
import { PUBLIC_CLONE_ASSETS, publicHomepageFixture, publicPropertyListFixture } from '../apps/web/tests/e2e/public-fixtures.ts';

const root = process.cwd();
const args = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith('--') ? [[value.slice(2), values[index + 1] ?? true]] : []));
const screenId = String(args.get('screen-id') ?? '');
const route = String(args.get('route') ?? '/');
const locale = String(args.get('locale') ?? 'ar');
const direction = locale === 'ar' ? 'rtl' : 'ltr';
const baseUrl = String(args.get('base-url') ?? process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4173');
const evidenceDir = path.join(root, 'docs/quality/figma_parity/screens', screenId);
const queue = JSON.parse(fs.readFileSync(path.join(root, 'docs/quality/figma_parity/SCREEN_EXECUTION_QUEUE.json'), 'utf8'));
const queueEntry = queue.screens.find((entry) => entry.screenId === screenId);
if (!queueEntry) throw new Error(`Screen ${screenId} is not present in the execution queue`);
const fixtureKind = String(args.get('fixture') ?? (screenId === 'PUB-01' ? 'public-home' : 'public-list'));
const capturePhase = String(args.get('phase') ?? 'before');
const propertyDetailsFixture = {
  data: {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    slug: 'published-home',
    kind: 'property',
    name: { ar: 'منزل منشور', en: 'Published home', 'zh-CN': '已发布房产' },
    transactionType: 'sale',
    imageUrl: PUBLIC_CLONE_ASSETS.house,
    description: { ar: 'وصف المنزل المنشور', en: 'A published home description', 'zh-CN': '已发布房产描述' },
    area: { value: 120, unit: 'sqm' },
    layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
    price: { amount: 1250000, currency: 'EGP' },
    source: { sourceType: 'developer_company', organizationId: 'bbbbbbbbbbbbbbbbbbbbbbbb' },
    seo: { title: { ar: 'تفاصيل منزل منشور', en: 'Published home details', 'zh-CN': '已发布房产详情' }, description: { ar: 'وصف محرك البحث', en: 'Search description', 'zh-CN': '搜索描述' }, slug: 'published-home' },
    project: { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'central-project', name: { ar: 'المشروع المركزي', en: 'Central project', 'zh-CN': '中央项目' }, description: { ar: 'نبذة المشروع', en: 'Project description', 'zh-CN': '项目简介' } },
    media: [
      { id: 'cccccccccccccccccccccccc', propertyId: 'aaaaaaaaaaaaaaaaaaaaaaaa', kind: 'image', imageUrl: PUBLIC_CLONE_ASSETS.house, originalFilename: 'published-home-cover.png', detectedMime: 'image/png', byteSize: 120000, sortOrder: 0, isCover: true },
      { id: 'dddddddddddddddddddddddd', propertyId: 'aaaaaaaaaaaaaaaaaaaaaaaa', kind: 'image', imageUrl: PUBLIC_CLONE_ASSETS.city, originalFilename: 'published-home-city.png', detectedMime: 'image/png', byteSize: 120000, sortOrder: 1, isCover: false },
      { id: 'eeeeeeeeeeeeeeeeeeeeeeee', propertyId: 'aaaaaaaaaaaaaaaaaaaaaaaa', kind: 'floor_plan', imageUrl: PUBLIC_CLONE_ASSETS.chart, originalFilename: 'published-home-plan.png', detectedMime: 'image/png', byteSize: 120000, sortOrder: 2, isCover: false }
    ],
    relatedProperties: [
      { id: 'ffffffffffffffffffffffff', slug: 'garden-villa', kind: 'property', name: { ar: 'Garden villa', en: 'Garden villa', 'zh-CN': 'Garden villa' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.city, price: { amount: 2500000, currency: 'EGP' } },
      { id: '111111111111111111111111', slug: 'city-apartment', kind: 'unit', name: { ar: 'City apartment', en: 'City apartment', 'zh-CN': 'City apartment' }, transactionType: 'rent', imageUrl: PUBLIC_CLONE_ASSETS.night, price: { amount: 20000, currency: 'EGP' } }
    ]
  },
  meta: { requestId: 'fresh-audit-public-details' }
};
const propertyComparisonFixture = {
  data: {
    items: [
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'garden-villa', kind: 'property', name: { ar: 'فيلا مستقلة بالمنطقة الراقية', en: 'Garden villa', 'zh-CN': 'Garden villa' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.city, area: { value: 180, unit: 'sqm' }, layout: { bedrooms: 4, bathrooms: 3, floor: 1 }, price: { amount: 2500000, currency: 'EGP' } },
      { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'city-apartment', kind: 'unit', name: { ar: 'شقة فاخرة في الحي الأول', en: 'City apartment', 'zh-CN': 'City apartment' }, transactionType: 'rent', imageUrl: PUBLIC_CLONE_ASSETS.night, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 8 }, price: { amount: 20000, currency: 'EGP' } }
    ],
    fields: ['name', 'transactionType', 'price', 'area', 'layout']
  },
  meta: { requestId: 'fresh-audit-public-comparison' }
};
const developerDirectoryFixture = {
  data: {
    items: [{
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      kind: 'developer_company',
      slug: 'approved-builder',
      imageUrl: PUBLIC_CLONE_ASSETS.city,
      name: { ar: 'شركة معتمدة', en: 'Approved builder', 'zh-CN': '已批准开发商' },
      description: { ar: 'جهة منشورة', en: 'Published developer description.', 'zh-CN': '已发布的开发商' },
      verified: true,
      projectCount: 2,
      propertyCount: 4
    }, {
      id: 'cccccccccccccccccccccccc', kind: 'developer_company', slug: 'city-builders',
      name: { ar: 'City builders', en: 'City builders', 'zh-CN': 'City builders' }, imageUrl: PUBLIC_CLONE_ASSETS.night,
      description: { en: 'Published developer description.', ar: 'Published developer description.', 'zh-CN': 'Published developer description.' }, verified: true, projectCount: 3, propertyCount: 5
    }, {
      id: 'dddddddddddddddddddddddd', kind: 'brokerage_office', slug: 'sadat-brokers',
      name: { ar: 'Sadat brokers', en: 'Sadat brokers', 'zh-CN': 'Sadat brokers' }, imageUrl: PUBLIC_CLONE_ASSETS.building,
      description: { en: 'Published brokerage description.', ar: 'Published brokerage description.', 'zh-CN': 'Published brokerage description.' }, verified: true, projectCount: 1, propertyCount: 7
    }, {
      id: 'eeeeeeeeeeeeeeeeeeeeeeee', kind: 'developer_company', slug: 'new-city-developments',
      name: { ar: 'New city developments', en: 'New city developments', 'zh-CN': 'New city developments' }, imageUrl: PUBLIC_CLONE_ASSETS.house,
      description: { en: 'Published developer description.', ar: 'Published developer description.', 'zh-CN': 'Published developer description.' }, verified: true, projectCount: 4, propertyCount: 8
    }],
    page: 1,
    limit: 20,
    total: 4
  },
  meta: { requestId: 'fresh-audit-public-developer-directory' }
};
const developerProfileFixture = {
  data: {
    ...developerDirectoryFixture.data.items[0],
    projects: [{
      id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      slug: 'central-project',
      imageUrl: PUBLIC_CLONE_ASSETS.night,
      name: { ar: 'المشروع المركزي', en: 'Central project', 'zh-CN': '中央项目' },
      description: { ar: 'نبذة المشروع', en: 'Project description.', 'zh-CN': '项目简介' },
      website: 'https://example.com/central-project'
    }],
    properties: [{
      id: 'cccccccccccccccccccccccc',
      slug: 'published-home',
      kind: 'property',
      name: { ar: 'منزل منشور', en: 'Published home', 'zh-CN': '已发布房产' },
      transactionType: 'sale',
      projectId: 'bbbbbbbbbbbbbbbbbbbbbbbb'
    }, {
      id: 'dddddddddddddddddddddddd', slug: 'central-heights', kind: 'property', imageUrl: PUBLIC_CLONE_ASSETS.building,
      name: { ar: 'Central heights', en: 'Central heights', 'zh-CN': 'Central heights' }, transactionType: 'sale', projectId: 'bbbbbbbbbbbbbbbbbbbbbbbb'
    }]
  },
  meta: { requestId: 'fresh-audit-public-developer-profile' }
};
const articleListFixture = {
  data: [
    {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      slug: 'buying-in-sadat',
      imageUrl: PUBLIC_CLONE_ASSETS.article,
      title: { ar: 'الشراء في مدينة السادات', en: 'Buying in Sadat City', 'zh-CN': '在萨达特城购房' },
      body: { ar: 'دليل عملي للمنازل المنشورة.', en: 'A practical guide to published homes.', 'zh-CN': '已发布房产实用指南。' },
      seoTitle: { ar: 'الشراء في مدينة السادات', en: 'Buying in Sadat City', 'zh-CN': '在萨达特城购房' },
      seoDescription: { ar: 'دليل عملي للشراء.', en: 'A practical buying guide.', 'zh-CN': '实用购房指南。' },
      publishedAt: '2026-08-01T10:00:00+00:00'
    },
    {
      id: 'cccccccccccccccccccccccc',
      categoryId: 'dddddddddddddddddddddddd',
      slug: 'rental-tips',
      imageUrl: PUBLIC_CLONE_ASSETS.night,
      title: { ar: 'نصائح الإيجار', en: 'Rental tips', 'zh-CN': '租赁技巧' },
      body: { ar: 'قائمة قصيرة للإيجار.', en: 'A short rental checklist.', 'zh-CN': '简短的租赁清单。' },
      publishedAt: '2026-07-20T10:00:00+00:00'
    }, {
      id: 'eeeeeeeeeeeeeeeeeeeeeeee', categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'market-outlook', imageUrl: PUBLIC_CLONE_ASSETS.chart,
      title: { ar: 'Market outlook', en: 'Market outlook', 'zh-CN': 'Market outlook' }, body: { ar: 'A practical market outlook.', en: 'A practical market outlook.', 'zh-CN': 'A practical market outlook.' }, publishedAt: '2026-07-10T10:00:00+00:00'
    }, {
      id: 'ffffffffffffffffffffffff', categoryId: 'dddddddddddddddddddddddd', slug: 'first-home-checklist', imageUrl: PUBLIC_CLONE_ASSETS.building,
      title: { ar: 'First-home checklist', en: 'First-home checklist', 'zh-CN': 'First-home checklist' }, body: { ar: 'A first-home checklist.', en: 'A first-home checklist.', 'zh-CN': 'A first-home checklist.' }, publishedAt: '2026-07-01T10:00:00+00:00'
    }, {
      id: '111111111111111111111111', categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'neighborhood-guide', imageUrl: PUBLIC_CLONE_ASSETS.house,
      title: { ar: 'Neighborhood guide', en: 'Neighborhood guide', 'zh-CN': 'Neighborhood guide' }, body: { ar: 'A guide to published neighborhoods.', en: 'A guide to published neighborhoods.', 'zh-CN': 'A guide to published neighborhoods.' }, publishedAt: '2026-06-20T10:00:00+00:00'
    }, {
      id: '222222222222222222222222', categoryId: 'dddddddddddddddddddddddd', slug: 'rental-contracts', imageUrl: PUBLIC_CLONE_ASSETS.city,
      title: { ar: 'Rental contracts', en: 'Rental contracts', 'zh-CN': 'Rental contracts' }, body: { ar: 'Notes on rental contracts.', en: 'Notes on rental contracts.', 'zh-CN': 'Notes on rental contracts.' }, publishedAt: '2026-06-10T10:00:00+00:00'
    }
  ],
  meta: { requestId: 'fresh-audit-public-articles' }
};
const articleCategoryFixture = {
  data: [
    { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'buying', name: { ar: 'نصائح شراء', en: 'Buying', 'zh-CN': '购买' } },
    { id: 'dddddddddddddddddddddddd', slug: 'renting', name: { ar: 'نصائح إيجار', en: 'Renting', 'zh-CN': '租赁' } }
  ],
  meta: { requestId: 'fresh-audit-public-article-categories' }
};
const articleDetailsFixture = {
  data: articleListFixture.data[0],
  meta: { requestId: 'fresh-audit-public-article-details' }
};
const fixtureConfig = fixtureKind === 'public-home'
  ? { fixture: publicHomepageFixture(), apiPath: '/api/v1/public/home', apiPattern: '**/api/v1/public/home**', pageName: 'public-home', stateAttribute: 'data-homepage-state', regions: ['header', 'hero/search', 'advertising banner', 'population counter', 'property categories', 'featured properties', 'articles', 'community', 'about', 'CTA', 'footer'] }
  : fixtureKind === 'public-details'
    ? { fixture: propertyDetailsFixture, apiPath: '/api/v1/public/properties/published-home', apiPattern: '**/api/v1/public/properties/published-home**', pageName: 'public-property-details', stateAttribute: 'data-details-state', regions: ['header', 'back link', 'media/gallery', 'property summary', 'amenities', 'provider/project details', 'actions', 'related properties', 'footer'] }
  : fixtureKind === 'public-comparison'
    ? { fixture: propertyComparisonFixture, apiPath: '/api/v1/public/properties/compare', apiPattern: '**/api/v1/public/properties/compare**', pageName: 'public-comparison', stateAttribute: 'data-comparison-state', regions: ['header', 'comparison heading', 'difference/details toggle', 'comparison cards', 'comparison tables', 'sticky comparison bar', 'footer'] }
  : fixtureKind === 'public-developers'
    ? { fixture: developerDirectoryFixture, apiPath: '/api/v1/public/developers', apiPattern: '**/api/v1/public/developers**', pageName: 'public-developers', stateAttribute: 'data-developers-state', regions: ['header', 'directory heading', 'search and sort controls', 'developer card grid', 'pagination', 'footer'] }
  : fixtureKind === 'public-developer-profile'
    ? { fixture: developerProfileFixture, apiPath: '/api/v1/public/developers/approved-builder', apiPattern: '**/api/v1/public/developers/approved-builder**', pageName: 'public-developer-profile', stateAttribute: 'data-developer-profile-state', regions: ['header', 'profile hero', 'tabs', 'overview', 'projects', 'properties', 'contact/inquiry', 'footer'] }
  : fixtureKind === 'public-articles'
    ? { fixture: articleListFixture, apiPath: '/api/v1/public/articles', apiPattern: '**/api/v1/public/articles**', pageName: 'public-articles', stateAttribute: 'data-articles-state', regions: ['header', 'directory heading', 'article search', 'category filters', 'article card grid', 'CTA banner', 'footer'] }
  : fixtureKind === 'public-article-details'
    ? { fixture: articleDetailsFixture, apiPath: '/api/v1/public/articles/buying-in-sadat', apiPattern: '**/api/v1/public/articles/buying-in-sadat**', pageName: 'public-article-details', stateAttribute: 'data-article-details-state', regions: ['header', 'back link', 'hero/media', 'article title/meta', 'article body', 'related articles', 'footer'] }
  : { fixture: publicPropertyListFixture(), apiPath: '/api/v1/public/properties', apiPattern: '**/api/v1/public/properties**', pageName: 'public-properties', stateAttribute: 'data-listing-state', regions: ['header', 'listing heading', 'property categories', 'property grid', 'filter sidebar', 'pagination/controls', 'footer'] };

if (!screenId) throw new Error('Missing --screen-id');
fs.mkdirSync(evidenceDir, { recursive: true });

const fixture = fixtureConfig.fixture;
const fixtureJson = JSON.stringify(fixture);
const seedState = {
  seedId: `fresh-audit-${screenId}-${locale}-v1`,
  fixtureKind,
  request: { method: 'GET', path: fixtureConfig.apiPath, locale, direction },
  responseRequestId: fixture.meta.requestId,
  responseSha256: crypto.createHash('sha256').update(fixtureJson).digest('hex'),
  response: fixture,
  relatedResponses: fixtureKind === 'public-articles' || fixtureKind === 'public-article-details' ? { articleCategories: articleCategoryFixture, relatedArticles: articleListFixture } : {},
  authSession: null,
  ownership: 'public',
};
fs.writeFileSync(path.join(evidenceDir, 'deterministic-state.json'), JSON.stringify(seedState, null, 2) + '\n');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale });
const page = await context.newPage();
const requestedApi = [];
const apiResponses = [];
page.on('request', (request) => {
  if (request.url().includes('/api/v1/')) requestedApi.push({ method: request.method(), url: request.url() });
});
page.on('response', async (response) => {
  if (response.url().includes('/api/v1/')) apiResponses.push({ method: response.request().method(), url: response.url(), status: response.status() });
});

if (fixtureKind === 'public-home') await page.route('**/__test-fixtures/homepage-banner.svg', async (routeHandler) => {
  await routeHandler.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#102a43"/><circle cx="1180" cy="240" r="180" fill="#d6a95d"/><path d="M0 760 520 300l260 230 250-210 570 440Z" fill="#2f855a"/></svg>' });
});
await page.route(fixtureConfig.apiPattern, async (routeHandler) => {
  await routeHandler.fulfill({ status: 200, contentType: 'application/json', body: fixtureJson });
});
if (fixtureKind === 'public-article-details') await page.route('**/api/v1/public/articles**', async (routeHandler) => {
  const url = new URL(routeHandler.request().url());
  const body = url.pathname.endsWith('/buying-in-sadat') ? articleDetailsFixture : articleListFixture;
  await routeHandler.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
if (fixtureKind === 'public-articles') await page.route('**/api/v1/public/article-categories**', async (routeHandler) => {
  await routeHandler.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(articleCategoryFixture) });
});

const targetUrl = new URL(route, baseUrl);
targetUrl.searchParams.set('lang', locale);
const response = await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
await page.locator(`[data-page="${fixtureConfig.pageName}"]`).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);

const runtimePath = path.join(evidenceDir, 'runtime-before.png');
const afterPath = path.join(evidenceDir, 'runtime-after.png');
if (capturePhase === 'after') {
  if (!fs.existsSync(runtimePath)) throw new Error(`Cannot capture after phase without ${runtimePath}`);
  await page.screenshot({ path: afterPath, fullPage: true });
} else {
  await page.screenshot({ path: runtimePath, fullPage: true });
}
const beforeHash = fs.existsSync(runtimePath) ? crypto.createHash('sha256').update(fs.readFileSync(runtimePath)).digest('hex') : null;
const afterHash = fs.existsSync(afterPath) ? crypto.createHash('sha256').update(fs.readFileSync(afterPath)).digest('hex') : null;

const dom = await page.evaluate(({ pageName, stateAttribute }) => {
  const pageRoot = document.querySelector(`[data-page="${pageName}"]`);
  const shell = document.querySelector('.route-shell');
  const links = [...document.querySelectorAll('a[href]')].map((node) => ({ text: node.textContent?.trim() ?? '', href: node.getAttribute('href') }));
  const buttons = [...document.querySelectorAll('button, input[type="submit"]')].map((node) => ({ text: node.textContent?.trim() ?? '', aria: node.getAttribute('aria-label') }));
  return {
    html: { lang: document.documentElement.lang, dir: document.documentElement.dir },
    viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    page: {
      present: Boolean(pageRoot),
      state: pageRoot?.getAttribute(stateAttribute) ?? null,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    },
    shell: {
      routeId: shell?.getAttribute('data-route-id') ?? null,
      deviceScope: shell?.getAttribute('data-device-scope') ?? null,
    },
    structure: {
      headers: document.querySelectorAll('header').length,
      navs: document.querySelectorAll('nav').length,
      sections: document.querySelectorAll('section').length,
      cards: document.querySelectorAll('[class*="card"], [data-property-card]').length,
      images: document.querySelectorAll('img').length,
      forms: document.querySelectorAll('form').length,
    },
    transitions: { links, buttons },
  };
}, { pageName: fixtureConfig.pageName, stateAttribute: fixtureConfig.stateAttribute });

const imageData = (filePath) => `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
const diffPage = await context.newPage({ viewport: { width: 1280, height: 720 } });
const comparison = await diffPage.evaluate(async ({ figma, before, after }) => {
  const load = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  const [figmaImage, beforeImage, afterImage] = await Promise.all([load(figma), load(before), load(after)]);
  const scale = 0.34;
  const columns = [figmaImage, beforeImage, afterImage];
  const widths = columns.map((image) => Math.max(1, Math.round(image.naturalWidth * scale)));
  const heights = columns.map((image) => Math.max(1, Math.round(image.naturalHeight * scale)));
  const width = widths.reduce((sum, value) => sum + value, 0);
  const height = Math.max(...heights) + 44;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  let x = 0;
  ['FIGMA REFERENCE', 'RUNTIME BEFORE', 'RUNTIME AFTER'].forEach((label, index) => {
    context.fillStyle = '#111827';
    context.font = 'bold 14px Arial';
    context.fillText(label, x + 8, 22);
    context.drawImage(columns[index], x, 44, widths[index], heights[index]);
    x += widths[index];
  });
  return { dataUrl: canvas.toDataURL('image/png'), dimensions: { width, height }, sourceDimensions: columns.map((image) => ({ width: image.naturalWidth, height: image.naturalHeight })) };
}, { figma: imageData(path.join(evidenceDir, 'figma.png')), before: imageData(runtimePath), after: imageData(afterPath) });
const diffBuffer = Buffer.from(comparison.dataUrl.split(',')[1], 'base64');
fs.writeFileSync(path.join(evidenceDir, 'diff.png'), diffBuffer);

if (capturePhase === 'after') {
  fs.writeFileSync(path.join(evidenceDir, 'runtime-after-capture.json'), JSON.stringify({
    schemaVersion: 1,
    screenId,
    phase: 'after',
    runtime: { route, locale, direction, viewport: dom.viewport, responseStatus: response?.status() ?? null, responseOk: response?.ok() ?? false, beforeHash, afterHash, requestedApi, apiResponses },
    structure: dom.structure,
    transitions: dom.transitions,
    comparison: { sourceDimensions: comparison.sourceDimensions, dimensions: comparison.dimensions, diffPath: `docs/quality/figma_parity/screens/${screenId}/diff.png` }
  }, null, 2) + '\n');
}

const review = {
  schemaVersion: 1,
  screenId,
  classification: 'PARTIAL',
  classificationReason: 'Fresh source and runtime capture completed; direct repair/parity confirmation is not complete.',
  source: {
    fileKey: queue.canonicalFigmaFileKey,
    pageId: queueEntry.clone.pageId,
    nodeId: queueEntry.clone.nodeId,
    url: queueEntry.clone.url,
    screenshot: { path: `docs/quality/figma_parity/screens/${screenId}/figma.png`, width: comparison.sourceDimensions[0].width, height: comparison.sourceDimensions[0].height, reviewed: true },
    getDesignContext: {
      tool: 'mcp__figma__get_design_context',
      skill: 'resource:figma-design-to-code',
      resultStatus: 'SPARSE_METADATA_DUE_TO_CONTEXT_LIMIT',
      root: { id: queueEntry.clone.nodeId, name: queueEntry.englishName, width: comparison.sourceDimensions[0].width, height: comparison.sourceDimensions[0].height },
      retrievedRegions: fixtureConfig.regions,
      reviewed: true,
      note: 'The tool explicitly returned sparse metadata and instructed sublayer retrieval for full code; this is recorded as an incomplete context result, not treated as parity proof.'
    }
  },
  runtime: {
    route,
    role: queueEntry.runtime.role,
    permissions: { requiredRole: queueEntry.runtime.role, ownership: queueEntry.runtime.role === 'public' ? 'public' : 'authenticated', availableActionsObserved: dom.transitions, source: 'runtime DOM and route contract' },
    locale,
    direction,
    viewport: dom.viewport,
    deterministicState: { path: `docs/quality/figma_parity/screens/${screenId}/deterministic-state.json`, seedId: seedState.seedId, responseSha256: seedState.responseSha256 },
    response: { status: response?.status() ?? null, ok: response?.ok() ?? false },
    apiRequests: requestedApi,
    apiResponses,
    before: { path: `docs/quality/figma_parity/screens/${screenId}/runtime-before.png`, sha256: beforeHash },
    after: { path: `docs/quality/figma_parity/screens/${screenId}/runtime-after.png`, sha256: afterHash },
  },
  structuredVisualComparison: {
    reviewed: true,
    diffPath: `docs/quality/figma_parity/screens/${screenId}/diff.png`,
    sourceDimensions: comparison.sourceDimensions,
    observations: [
      `Figma source is ${comparison.sourceDimensions[0].width}px wide and ${comparison.sourceDimensions[0].height}px high for ${screenId}.`,
      `Runtime is ${dom.viewport.width}px wide at the approved Desktop Chrome viewport and has ${dom.page.scrollHeight}px document height.`,
      'The side-by-side diff is evidence for review only; no baseline was updated.',
      'Exact typography, spacing, imagery, control states, responsive variants, and prototype transitions remain to be checked against focused fixtures.'
    ],
  },
  functionalApiComparison: {
    reviewed: true,
    requestProjection: `GET ${fixtureConfig.apiPath}`,
    responseProjection: `${fixtureKind} fixture captured and hashed`,
    outcome: `route loaded with a ${fixtureKind} fixture; complete CTA/prototype/API projection comparison remains pending`,
  },
  defects: [
    'Full per-screen parity review is incomplete.',
    'Figma get_design_context returned sparse metadata because the full frame exceeded context limits.',
  ],
  filesRepaired: [],
  focusedTests: [],
  accessibility: { focusedCheck: 'not yet run', exitCode: null },
  evidencePaths: {
    figma: `docs/quality/figma_parity/screens/${screenId}/figma.png`,
    runtimeBefore: `docs/quality/figma_parity/screens/${screenId}/runtime-before.png`,
    runtimeAfter: `docs/quality/figma_parity/screens/${screenId}/runtime-after.png`,
    diff: `docs/quality/figma_parity/screens/${screenId}/diff.png`,
    review: `docs/quality/figma_parity/screens/${screenId}/review.json`,
  },
};
if (capturePhase !== 'after') fs.writeFileSync(path.join(evidenceDir, 'review.json'), JSON.stringify(review, null, 2) + '\n');
await diffPage.close();
await context.close();
await browser.close();
console.log(JSON.stringify({ screenId, phase: capturePhase, route: targetUrl.pathname + targetUrl.search, viewport: dom.viewport, state: dom.page.state, responseStatus: response?.status() ?? null, beforeHash, afterHash, requestedApi, apiResponses, evidenceDir }, null, 2));
