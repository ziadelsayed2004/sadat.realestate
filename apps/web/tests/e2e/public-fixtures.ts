import { publicHomepageSuccessEnvelopeSchema, publicPropertyListSuccessEnvelopeSchema } from '@sadat-real-estate/contracts';
import { expect, type Page } from '@playwright/test';

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
        description: { ar: 'وصف المنزل المنشور', en: 'A published home description', 'zh-CN': '已发布房产描述' },
        area: { value: 120, unit: 'sqm' },
        layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
        price: { amount: 1250000, currency: 'EGP' }
      }],
      developers: [{
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        slug: 'approved-builder',
        name: { ar: 'المطور المعتمد', en: 'Approved builder', 'zh-CN': '已批准开发商' },
        description: { ar: 'وصف المطور', en: 'Published developer description', 'zh-CN': '已发布开发商描述' }
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
          order: 2
        },
        {
          key: 'market_tip',
          type: 'tip',
          title: { ar: 'نصيحة عقارية', en: 'Property tip', 'zh-CN': '房产提示' },
          order: 3
        }
      ],
      banners: [{
        key: 'featured_banner',
        title: { ar: 'اكتشف المزيد', en: 'Discover more', 'zh-CN': '探索更多' },
        imageUrl: 'http://127.0.0.1:4173/__test-fixtures/homepage-banner.svg',
        order: 0
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
        price: { amount, currency: 'EGP' }
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
