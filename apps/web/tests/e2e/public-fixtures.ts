import { publicHomepageSuccessEnvelopeSchema, publicPropertyListSuccessEnvelopeSchema } from '@sadat-real-estate/contracts';
import { expect, type Page } from '@playwright/test';

export const PUBLIC_CLONE_ASSETS = Object.freeze({
  hero: 'http://127.0.0.1:4173/assets/clone/pub06-a.png',
  city: 'http://127.0.0.1:4173/assets/clone/pub05-a.png',
  building: 'http://127.0.0.1:4173/assets/clone/pub05-c.png',
  house: 'http://127.0.0.1:4173/assets/clone/pub05-e.png',
  night: 'http://127.0.0.1:4173/assets/clone/pub05-g.png',
  article: 'http://127.0.0.1:4173/assets/clone/pub07-a.png',
  chart: 'http://127.0.0.1:4173/assets/clone/pub08-e.png'
});

export function publicHomepageFixture() {
  return publicHomepageSuccessEnvelopeSchema.parse({
    data: {
      sections: [
        {
          key: 'hero',
          title: { ar: 'ابحث عن عقارك', en: 'Find your property', 'zh-CN': '寻找您的房产' },
          body: { ar: 'ابحث في مدينة السادات', en: 'Search Sadat City', 'zh-CN': '搜索萨达特城' },
           order: 0
        },
        {
          key: 'featured',
          title: { ar: 'عقارات مميزة', en: 'Featured properties', 'zh-CN': '精选房产' },
           order: 1
        }
      ],
      properties: [{
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        slug: 'published-home',
        kind: 'property',
        name: { ar: 'منزل منشور', en: 'Published home', 'zh-CN': '已发布房产' },
        transactionType: 'sale',
        imageUrl: PUBLIC_CLONE_ASSETS.house,
        description: { ar: 'وصف المنزل المنشور', en: 'A published home description', 'zh-CN': '已发布房产描述' },
        area: { value: 120, unit: 'sqm' },
        layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
         price: { amount: 1250000, currency: 'EGP' }
       }, {
         id: 'cccccccccccccccccccccccc', slug: 'published-villa', kind: 'property', name: { ar: 'Published villa', en: 'Published villa', 'zh-CN': 'Published villa' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.city, area: { value: 240, unit: 'sqm' }, layout: { bedrooms: 4, bathrooms: 3, floor: 1 }, price: { amount: 5200000, currency: 'EGP' }
       }, {
         id: 'dddddddddddddddddddddddd', slug: 'published-rental', kind: 'unit', name: { ar: 'Published rental', en: 'Published rental', 'zh-CN': 'Published rental' }, transactionType: 'rent', imageUrl: PUBLIC_CLONE_ASSETS.night, area: { value: 95, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 1, floor: 3 }, price: { amount: 20000, currency: 'EGP' }
       }, {
         id: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'published-office', kind: 'unit', name: { ar: 'Published office', en: 'Published office', 'zh-CN': 'Published office' }, transactionType: 'rent', imageUrl: PUBLIC_CLONE_ASSETS.building, area: { value: 150, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 1, floor: 2 }, price: { amount: 12000, currency: 'EGP' }
       }, {
         id: 'ffffffffffffffffffffffff', slug: 'published-unit', kind: 'property', name: { ar: 'Published unit', en: 'Published unit', 'zh-CN': 'Published unit' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.hero, area: { value: 135, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 5 }, price: { amount: 3100000, currency: 'EGP' }
       }, {
         id: '111111111111111111111111', slug: 'published-land', kind: 'property', name: { ar: 'Published land', en: 'Published land', 'zh-CN': 'Published land' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.house, area: { value: 400, unit: 'sqm' }, price: { amount: 780000, currency: 'EGP' }
       }],
      developers: [{
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
         slug: 'approved-builder',
         imageUrl: PUBLIC_CLONE_ASSETS.city,
        name: { ar: 'المطور المعتمد', en: 'Approved builder', 'zh-CN': '已批准开发商' },
        description: { ar: 'وصف المطور', en: 'Published developer description', 'zh-CN': '已发布开发商描述' }
       }, {
          id: 'cccccccccccccccccccccccc', slug: 'city-builders', name: { ar: 'City builders', en: 'City builders', 'zh-CN': 'City builders' }, imageUrl: PUBLIC_CLONE_ASSETS.night, description: { en: 'Published developer description', ar: 'Published developer description', 'zh-CN': 'Published developer description' }
       }, {
          id: 'dddddddddddddddddddddddd', slug: 'sadat-brokers', name: { ar: 'Sadat brokers', en: 'Sadat brokers', 'zh-CN': 'Sadat brokers' }, imageUrl: PUBLIC_CLONE_ASSETS.building, description: { en: 'Published brokerage description', ar: 'Published brokerage description', 'zh-CN': 'Published brokerage description' }
       }, {
          id: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'new-city-developments', name: { ar: 'New city developments', en: 'New city developments', 'zh-CN': 'New city developments' }, imageUrl: PUBLIC_CLONE_ASSETS.house, description: { en: 'Published developer description', ar: 'Published developer description', 'zh-CN': 'Published developer description' }
       }],
       content: [
        {
          key: 'buying_guide',
          type: 'article',
          title: { ar: 'دليل الشراء', en: 'Buying guide', 'zh-CN': '购买指南' },
          body: { ar: 'إرشادات عملية', en: 'A practical guide', 'zh-CN': '实用指南' },
          order: 0
        },
        {
          key: 'community_update',
          type: 'community',
          title: { ar: 'مجتمع السادات', en: 'Sadat community', 'zh-CN': '萨达特社区' },
          order: 1
        },
        {
          key: 'about_platform',
          type: 'about',
          title: { ar: 'عن المنصة', en: 'About the platform', 'zh-CN': '关于平台' },
           imageUrl: PUBLIC_CLONE_ASSETS.building,
           order: 2
        },
        {
          key: 'market_tip',
          type: 'tip',
          title: { ar: 'نصيحة عقارية', en: 'Property tip', 'zh-CN': '房产提示' },
           imageUrl: PUBLIC_CLONE_ASSETS.chart,
           order: 3
         }, {
           key: 'market_news', type: 'article', imageUrl: PUBLIC_CLONE_ASSETS.night,
           title: { ar: 'Market news', en: 'Market news', 'zh-CN': 'Market news' }, body: { ar: 'Market news', en: 'Market news', 'zh-CN': 'Market news' }, order: 4
         }, {
           key: 'community_events', type: 'community', imageUrl: PUBLIC_CLONE_ASSETS.house,
           title: { ar: 'Community events', en: 'Community events', 'zh-CN': 'Community events' }, body: { ar: 'Community events', en: 'Community events', 'zh-CN': 'Community events' }, order: 5
         }, {
           key: 'about_sources', type: 'about', imageUrl: PUBLIC_CLONE_ASSETS.city,
           title: { ar: 'Approved sources', en: 'Approved sources', 'zh-CN': 'Approved sources' }, body: { ar: 'Approved sources', en: 'Approved sources', 'zh-CN': 'Approved sources' }, order: 6
         }, {
           key: 'tip_checklist', type: 'tip', imageUrl: PUBLIC_CLONE_ASSETS.building,
           title: { ar: 'Buying checklist', en: 'Buying checklist', 'zh-CN': 'Buying checklist' }, body: { ar: 'Buying checklist', en: 'Buying checklist', 'zh-CN': 'Buying checklist' }, order: 7
         }
      ],
      banners: [{
        key: 'featured_banner',
        title: { ar: 'اكتشف المزيد', en: 'Discover more', 'zh-CN': '探索更多' },
        imageUrl: PUBLIC_CLONE_ASSETS.hero,
         order: 0
       }, {
         key: 'city_banner', title: { ar: 'City banner', en: 'City banner', 'zh-CN': 'City banner' }, imageUrl: PUBLIC_CLONE_ASSETS.city, targetUrl: 'http://127.0.0.1:4173/properties', order: 1
       }, {
         key: 'market_banner', title: { ar: 'Market banner', en: 'Market banner', 'zh-CN': 'Market banner' }, imageUrl: PUBLIC_CLONE_ASSETS.chart, targetUrl: 'http://127.0.0.1:4173/articles', order: 2
       }]
    },
    meta: { requestId: 'e2e-public-homepage-success' }
  });
}

export async function routePublicHomepageApi(page: Page): Promise<void> {
  await page.route('**/__test-fixtures/homepage-banner.svg', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#102a43"/><circle cx="1180" cy="240" r="180" fill="#d6a95d"/><path d="M0 760 520 300l260 230 250-210 570 440Z" fill="#2f855a"/></svg>'
    });
  });
  await page.route('**/api/v1/public/home**', async route => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(publicHomepageFixture())
    });
  });
}

export function publicPropertyListFixture() {
  const items = [
    ['published-home', 'Published home', 'sale', 1250000],
    ['published-villa', 'Published villa', 'sale', 5200000],
    ['published-rental', 'Published rental', 'rent', 20000],
    ['published-office', 'Published office', 'rent', 12000],
    ['published-unit', 'Published unit', 'sale', 3100000],
    ['published-land', 'Published land', 'sale', 780000]
  ] as const;
  return publicPropertyListSuccessEnvelopeSchema.parse({
    data: {
      items: items.map(([slug, title, transactionType, amount], index) => ({
        id: `${String(index + 1).repeat(24)}`,
        slug,
        kind: index === 2 || index === 3 ? 'unit' : 'property',
        name: { ar: title, en: title, 'zh-CN': title },
        transactionType,
        description: { ar: title, en: title, 'zh-CN': title },
        area: { value: 120 + index * 20, unit: 'sqm' },
        layout: { bedrooms: 2 + (index % 3), bathrooms: 1 + (index % 2), floor: index + 1 },
        price: { amount, currency: 'EGP' },
        imageUrl: [PUBLIC_CLONE_ASSETS.house, PUBLIC_CLONE_ASSETS.city, PUBLIC_CLONE_ASSETS.night, PUBLIC_CLONE_ASSETS.building, PUBLIC_CLONE_ASSETS.hero, PUBLIC_CLONE_ASSETS.house][index]
      })),
      page: 1,
      limit: 20,
      total: items.length
    },
    meta: { requestId: 'e2e-public-property-list-success' }
  });
}

export async function routePublicPropertyListApi(page: Page): Promise<void> {
  await page.route('**/api/v1/public/properties**', async route => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(publicPropertyListFixture())
    });
  });
}
