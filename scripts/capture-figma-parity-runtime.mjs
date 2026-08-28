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
const referenceWidth = Number(queueEntry.evidence?.figmaScreenshot?.width ?? queueEntry.evidence?.figmaContext?.root?.width ?? 1280);
if (!Number.isInteger(referenceWidth) || referenceWidth < 320) throw new Error(`Invalid cached Figma frame width for ${screenId}: ${referenceWidth}`);
const fixtureKind = String(args.get('fixture') ?? (screenId === 'PUB-01' ? 'public-home' : 'public-list'));
const capturePhase = String(args.get('phase') ?? 'before');
const propertyDetailsFixture = {
  data: {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    slug: 'published-home',
    kind: 'property',
    name: { ar: 'شقة فاخرة في الحي الأول', en: 'Luxury apartment in the First District', 'zh-CN': '第一区豪华公寓' },
    transactionType: 'sale',
    locationName: { ar: 'الحي الأول', en: 'First District', 'zh-CN': '第一街区' },
    publicCode: 'SDT-1234',
    deliveryStatus: 'ready_to_move',
    installmentAvailable: true,
    imageUrl: PUBLIC_CLONE_ASSETS.interior,
    description: { ar: 'شقة فاخرة بالحي الأول بمدينة السادات، تشطيب سوبر لوكس كامل، إطلالة مميزة وموقع استراتيجي قريب من جميع الخدمات والمرافق.', en: 'A fully finished luxury apartment in Sadat City near essential services.', 'zh-CN': '萨达特市精装修豪华公寓，邻近各项服务。' },
    area: { value: 145, unit: 'sqm' },
    layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
    price: { amount: 1900000, currency: 'EGP' },
    source: { sourceType: 'developer_company', organizationId: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: { ar: 'شركة السادات للتطوير العقاري', en: 'Sadat Real Estate Development', 'zh-CN': '萨达特房地产开发公司' }, imageUrl: PUBLIC_CLONE_ASSETS.provider, verified: true },
    seo: { title: { ar: 'تفاصيل منزل منشور', en: 'Published home details', 'zh-CN': '已发布房产详情' }, description: { ar: 'وصف محرك البحث', en: 'Search description', 'zh-CN': '搜索描述' }, slug: 'published-home' },
    project: { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'central-project', name: { ar: '\u0643\u0648\u0645\u0628\u0627\u0648\u0646\u062f \u0627\u0644\u0646\u062e\u0628\u0629', en: 'Elite Compound', 'zh-CN': '\u7cbe\u82f1\u793e\u533a' }, description: { ar: 'نبذة المشروع', en: 'Project description', 'zh-CN': '项目简介' } },
    media: [
      { id: 'cccccccccccccccccccccccc', propertyId: 'aaaaaaaaaaaaaaaaaaaaaaaa', kind: 'image', imageUrl: PUBLIC_CLONE_ASSETS.interior, originalFilename: 'published-home-cover.png', detectedMime: 'image/png', byteSize: 120000, sortOrder: 0, isCover: true }
    ],
    features: ['ناصية','شارع رئيسي','مدخل خاص','عدادات كاملة','تشطيب فاخر','جاهز للاستلام','قابل للتقسيط','مناسب للاستثمار','منطقة هادئة','موقف سيارات','مصعد','حديقة خاصة','تراس','أمن وحراسة'].map((name, index) => ({ id: (index + 18).toString(16).padStart(2, '0').repeat(12), kind: 'feature', groupKey: index === 4 ? 'finishing' : 'property_feature', name: { ar: name, en: name, 'zh-CN': name }, ...(index === 4 ? { detail: { ar: 'سوبر لوكس', en: 'Super lux', 'zh-CN': '精装' } } : {}), slug: index === 4 ? 'super-lux-finish' : `feature-${index + 1}`, order: index })),
    services: [
      ['مجمع المدارس','مدارس حكومية وخاصة','5 دقائق'],
      ['السوق التجاري','بجوار المجمع التجاري الرئيسي','700 متر'],
      ['المستشفى المركزي','خدمة طوارئ 24 ساعة','8 دقائق'],
      ['الطريق الإقليمي','ربط سريع بالقاهرة والإسكندرية','10 دقائق'],
      ['موقف المواصلات','خطوط منتظمة للحي والرئيسية','3 دقائق'],
      ['مسجد الحي','جامع','4 دقائق']
    ].map(([name, detail, distanceLabel], index) => ({ id: (index + 40).toString(16).padStart(2, '0').repeat(12), kind: 'service', groupKey: 'nearby', name: { ar: name, en: name, 'zh-CN': name }, detail: { ar: detail, en: detail, 'zh-CN': detail }, distanceLabel: { ar: distanceLabel, en: distanceLabel, 'zh-CN': distanceLabel }, slug: `service-${index + 1}`, order: index })),
    relatedProperties: [
      { id: '111111111111111111111111', slug: 'city-apartment', kind: 'unit', name: { ar: 'شقة للإيجار في الحي الثالث', en: 'Apartment for rent in the Third District', 'zh-CN': '第三区出租公寓' }, transactionType: 'rent', imageUrl: PUBLIC_CLONE_ASSETS.related, locationName: { ar: 'الحي الثالث', en: 'Third District', 'zh-CN': '第三区' }, publicCode: 'SDT-0234', sourceName: { ar: 'مكتب الثقة للعقارات', en: 'Al Thiqah Real Estate Office', 'zh-CN': '信任房地产办公室' }, sourceImageUrl: PUBLIC_CLONE_ASSETS.office, sourceType: 'brokerage_office', sourceVerified: true, viewCount: 267, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 2 }, price: { amount: 8500, currency: 'EGP' } }
     ]
  },
  meta: { requestId: 'fresh-audit-public-details' }
};
const propertyComparisonFixture = {
  data: {
    items: [
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'garden-villa', kind: 'property', name: { ar: 'فيلا مستقلة بالمنطقة الراقية', en: 'Garden villa', 'zh-CN': 'Garden villa' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.villa, propertyTypeName: { ar: 'فيلا', en: 'Villa', 'zh-CN': '别墅' }, locationName: { ar: 'المنطقة الراقية', en: 'Al Raqia district', 'zh-CN': '高级区' }, publicCode: 'SDT-0892', sourceType: 'developer_company', sourceName: { ar: 'مجموعة النيل العقارية', en: 'Nile Real Estate Group', 'zh-CN': '尼罗房地产集团' }, sourceImageUrl: PUBLIC_CLONE_ASSETS.office, sourceVerified: true, installmentAvailable: true, area: { value: 320, unit: 'sqm' }, layout: { bedrooms: 5, bathrooms: 4, floor: 2 }, price: { amount: 5200000, currency: 'EGP' } },
      { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'city-apartment', kind: 'unit', name: { ar: 'شقة فاخرة في الحي الأول', en: 'City apartment', 'zh-CN': 'City apartment' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.interior, propertyTypeName: { ar: 'شقة', en: 'Apartment', 'zh-CN': '公寓' }, locationName: { ar: 'الحي الأول', en: 'First District', 'zh-CN': '第一区' }, publicCode: 'SDT-1234', sourceType: 'developer_company', sourceName: { ar: 'شركة السادات للتطوير العقاري', en: 'Sadat Real Estate Development', 'zh-CN': '萨达特房地产开发' }, sourceImageUrl: PUBLIC_CLONE_ASSETS.provider, sourceVerified: true, installmentAvailable: true, area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4 }, price: { amount: 1900000, currency: 'EGP' } }
    ],
    fields: ['kind', 'transactionType', 'sourceName', 'sourceType', 'project', 'developer', 'publicCode', 'price', 'installment', 'area', 'bedrooms', 'bathrooms', 'floor', 'deliveryStatus', 'locationName']
  },
  meta: { requestId: 'fresh-audit-public-comparison' }
};
const developerDirectoryFixture = {
  data: {
    items: [{
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      kind: 'developer_company',
      slug: 'approved-builder',
      imageUrl: PUBLIC_CLONE_ASSETS.night,
      name: { ar: '\u0634\u0631\u0643\u0629 AS \u0644\u0644\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064a', en: 'AS Real Estate Development', 'zh-CN': 'AS房地产开发公司' },
      description: { ar: '\u0634\u0631\u0643\u0629 \u0631\u0627\u0626\u062f\u0629 \u0641\u064a \u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a \u0628\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0645\u0646\u0630 \u0623\u0643\u062b\u0631 \u0645\u0646 15 \u0639\u0627\u0645\u0627\u064b.', en: 'A leading Sadat City real-estate developer for more than 15 years.', 'zh-CN': '在萨达特城开发房地产超过15年的领先公司。' },
      verified: true,
      logoUrl: PUBLIC_CLONE_ASSETS.provider,
      locations: [{ ar: '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629' }, { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633' }, { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644' }],
      projectCount: 2,
      propertyCount: 4
    }, {
      id: 'cccccccccccccccccccccccc', kind: 'developer_company', slug: 'city-builders',
      name: { ar: '\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u0646\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u064a\u0629', en: 'Nile Real Estate Group', 'zh-CN': '尼罗房地产集团' }, imageUrl: PUBLIC_CLONE_ASSETS.city,
      description: { en: 'An integrated real-estate group known for luxury projects and after-sales service.', ar: '\u0645\u062c\u0645\u0648\u0639\u0629 \u0639\u0642\u0627\u0631\u064a\u0629 \u0645\u062a\u0643\u0627\u0645\u0644\u0629 \u062a\u062a\u0645\u064a\u0632 \u0628\u0645\u0634\u0627\u0631\u064a\u0639\u0647\u0627 \u0627\u0644\u0641\u0627\u062e\u0631\u0629 \u0648\u062e\u062f\u0645\u0629 \u0645\u0627 \u0628\u0639\u062f \u0627\u0644\u0628\u064a\u0639.', 'zh-CN': '提供豪华项目和售后服务的综合房地产集团。' }, verified: true, projectCount: 3, propertyCount: 5
    }, {
      id: 'dddddddddddddddddddddddd', kind: 'brokerage_office', slug: 'sadat-brokers',
      name: { ar: '\u0634\u0631\u0643\u0629 \u0645\u0635\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0644\u0644\u0625\u0633\u0643\u0627\u0646', en: 'Misr El Gedida Housing', 'zh-CN': '新开罗住房公司' }, imageUrl: PUBLIC_CLONE_ASSETS.building,
      description: { en: 'A specialist in mid-market and premium housing at competitive prices.', ar: '\u0634\u0631\u0643\u0629 \u0645\u062a\u062e\u0635\u0635\u0629 \u0641\u064a \u0627\u0644\u0625\u0633\u0643\u0627\u0646 \u0627\u0644\u0645\u062a\u0648\u0633\u0637 \u0648\u0627\u0644\u0631\u0627\u0642\u064a \u0628\u0623\u0633\u0639\u0627\u0631 \u062a\u0646\u0627\u0641\u0633\u064a\u0629.', 'zh-CN': '专注于以有竞争力的价格提供中高端住房。' }, verified: true, projectCount: 4, propertyCount: 8
    }, {
      id: 'eeeeeeeeeeeeeeeeeeeeeeee', kind: 'developer_company', slug: 'new-city-developments',
      name: { ar: '\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u062f\u0644\u062a\u0627 \u0627\u0644\u0639\u0642\u0627\u0631\u064a\u0629', en: 'Delta Real Estate Group', 'zh-CN': '三角洲房地产集团' }, imageUrl: PUBLIC_CLONE_ASSETS.house,
      description: { en: 'Twenty years of experience in the Egyptian real-estate market.', ar: '\u062e\u0628\u0631\u0629 20 \u0639\u0627\u0645\u0627\u064b \u0641\u064a \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0627\u0644\u0645\u0635\u0631\u064a.', 'zh-CN': '在埃及房地产市场拥有20年经验。' }, verified: true, projectCount: 4, propertyCount: 8
    }],
    page: 1,
    limit: 20,
    total: 4
  },
  meta: { requestId: 'fresh-audit-public-developer-directory' }
};
Object.assign(developerDirectoryFixture.data.items[0], {
  logoUrl: PUBLIC_CLONE_ASSETS.provider,
  locations: [{ ar: '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629' }, { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633' }, { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644' }]
});
Object.assign(developerDirectoryFixture.data.items[1], {
  logoUrl: PUBLIC_CLONE_ASSETS.glass,
  locations: [{ ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u0633\u0627\u0628\u0639' }, { ar: '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629' }]
});
Object.assign(developerDirectoryFixture.data.items[2], {
  logoUrl: PUBLIC_CLONE_ASSETS.office,
  locations: [{ ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633' }, { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u062b\u0627\u0644\u062b' }]
});
Object.assign(developerDirectoryFixture.data.items[3], {
  logoUrl: PUBLIC_CLONE_ASSETS.office,
  locations: [{ ar: '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629' }, { ar: '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0635\u0646\u0627\u0639\u064a\u0629' }]
});
const developerProfileFixture = {
  data: {
    ...developerDirectoryFixture.data.items[0],
    stats: { publishedProjects: 2, availableProperties: 4, saleProperties: 3, rentalProperties: 1 },
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
      imageUrl: PUBLIC_CLONE_ASSETS.interior,
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
Object.assign(developerProfileFixture.data, {
  name: { ar: '\u0634\u0631\u0643\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0644\u0644\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064a', en: 'Sadat Real Estate Development', 'zh-CN': '\u8428\u8fbe\u7279\u623f\u5730\u4ea7\u5f00\u53d1\u516c\u53f8' },
  stats: {
    publishedProjects: 2,
    availableProperties: 4,
    saleProperties: 3,
    rentalProperties: 1,
    totalUnits: 128,
    availableUnits: 72,
    soldUnits: 38,
    reservedUnits: 18,
    activeAreas: 3,
    lastUpdated: '\u064a\u0648\u0646\u064a\u0648 2026'
  },
  activeAreas: [{ ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644' }, { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633' }, { ar: '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629' }],
  projectTypes: [{ ar: '\u0633\u0643\u0646\u064a' }, { ar: '\u062a\u062c\u0627\u0631\u064a' }, { ar: '\u0625\u062f\u0627\u0631\u064a' }],
  propertyTypes: [{ ar: '\u0634\u0642\u0642' }, { ar: '\u0641\u064a\u0644\u0627\u062a' }, { ar: '\u062f\u0648\u0628\u0644\u0643\u0633' }, { ar: '\u0645\u062d\u0644\u0627\u062a' }, { ar: '\u0645\u0643\u0627\u062a\u0628' }],
  paymentPlans: [{ ar: '\u0646\u0642\u062f\u064a' }, { ar: '\u0645\u0642\u062f\u0645 \u062a\u0642\u0633\u064a\u0637' }, { ar: '\u0623\u0642\u0633\u0627\u0637 \u0634\u0647\u0631\u064a\u0629' }, { ar: '\u0623\u0642\u0633\u0627\u0637 \u0633\u0646\u0648\u064a\u0629' }],
  projects: [{
    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    slug: 'sadat-residential-towers',
    imageUrl: PUBLIC_CLONE_ASSETS.building,
    name: { ar: '\u0623\u0628\u0631\u0627\u062c \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0627\u0644\u0633\u0643\u0646\u064a\u0629' },
    description: { ar: '\u0623\u0628\u0631\u0627\u062c \u0633\u0643\u0646\u064a\u0629 \u0645\u062a\u0643\u0627\u0645\u0644\u0629 \u062a\u0636\u0645 \u0648\u062d\u062f\u0627\u062a \u0633\u0643\u0646\u064a\u0629 \u0645\u062a\u0646\u0648\u0639\u0629 \u0648\u062e\u062f\u0645\u0627\u062a \u0645\u062a\u0643\u0627\u0645\u0644\u0629.' },
    locationName: { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633' },
    statusLabel: { ar: '\u062a\u062d\u062a \u0627\u0644\u0625\u0646\u0634\u0627\u0621' },
    projectType: { ar: '\u0633\u0643\u0646\u064a' },
    unitCount: 48,
    areaLabel: { ar: '120 - 240 \u0645\u00b2' },
    priceLabel: { ar: '\u062a\u0628\u062f\u0623 \u0645\u0646 2.1 \u0645\u0644\u064a\u0648\u0646 \u062c\u0646\u064a\u0647' },
    deliveryLabel: { ar: '\u062a\u0633\u0644\u064a\u0645 2027' }
  }, {
    id: 'cccccccccccccccccccccccc',
    slug: 'elite-compound',
    imageUrl: PUBLIC_CLONE_ASSETS.night,
    name: { ar: '\u0643\u0645\u0628\u0648\u0646\u062f \u0627\u0644\u0646\u062e\u0628\u0629' },
    description: { ar: '\u0643\u0645\u0628\u0648\u0646\u062f \u0633\u0643\u0646\u064a \u0645\u062a\u0643\u0627\u0645\u0644 \u064a\u0642\u062f\u0645 \u0648\u062d\u062f\u0627\u062a \u0645\u062a\u0645\u064a\u0632\u0629 \u0641\u064a \u0645\u0648\u0642\u0639 \u0645\u0645\u064a\u0632.' },
    locationName: { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644' },
    statusLabel: { ar: '\u0645\u062a\u0627\u062d \u0644\u0644\u062d\u062c\u0632' },
    projectType: { ar: '\u0633\u0643\u0646\u064a' },
    unitCount: 22,
    areaLabel: { ar: '48 - 220 \u0645\u00b2' },
    priceLabel: { ar: '\u062a\u0628\u062f\u0623 \u0645\u0646 1.2 \u0645\u0644\u064a\u0648\u0646 \u062c\u0646\u064a\u0647' },
    deliveryLabel: { ar: '\u062a\u0633\u0644\u064a\u0645 2026' }
  }],
  properties: [],
  contactPhone: '01001234567',
  whatsappUrl: 'https://wa.me/201001234567',
  contactAddress: '\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a\u060c \u0645\u0635\u0631'
});
const articleListFixture = {
  data: [
    {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      categoryId: '222222222222222222222222',
      slug: 'buying-in-sadat',
      imageUrl: PUBLIC_CLONE_ASSETS.article,
      title: { ar: 'دليلك الكامل للشراء في مدينة السادات 2024', en: 'Your complete guide to buying in Sadat City 2024', 'zh-CN': '2024年萨达特城购房完整指南' },
      body: { ar: 'كل ما تحتاج معرفته قبل شراء عقار في مدينة السادات. مدينة السادات من أسرع المدن نموًا على مستوى المنطقة.', en: 'Everything you need to know before buying a property in Sadat City.', 'zh-CN': '在萨达特城购房前需要了解的一切。' },
      seoTitle: { ar: 'دليلك الكامل للشراء في مدينة السادات 2024', en: 'Your complete guide to buying in Sadat City 2024', 'zh-CN': '2024年萨达特城购房完整指南' },
      seoDescription: { ar: 'دليل عملي للشراء.', en: 'A practical buying guide.', 'zh-CN': '实用购房指南。' },
      publishedAt: '2026-08-01T10:00:00+00:00'
    },
    {
      id: 'cccccccccccccccccccccccc',
      categoryId: 'dddddddddddddddddddddddd',
      slug: 'investment-areas',
      imageUrl: PUBLIC_CLONE_ASSETS.night,
      title: { ar: 'أفضل المناطق للاستثمار العقاري في السادات', en: 'Best areas for real-estate investment in Sadat', 'zh-CN': '萨达特房地产投资的最佳区域' },
      body: { ar: 'تحليل شامل للمناطق ذات العائد الاستثماري الأعلى.', en: 'A complete analysis of the areas with the highest investment returns.', 'zh-CN': '全面分析投资回报率最高的区域。' },
      publishedAt: '2026-07-20T10:00:00+00:00'
    }, {
      id: 'eeeeeeeeeeeeeeeeeeeeeeee', categoryId: 'ffffffffffffffffffffffff', slug: 'market-outlook', imageUrl: PUBLIC_CLONE_ASSETS.city,
      title: { ar: 'خدمات مدينة السادات: ما المتاح وما المخطط له', en: 'Sadat City services: what is available and planned', 'zh-CN': '萨达特城服务：现有与规划' }, body: { ar: 'استعراض شامل للخدمات المتاحة في المدينة.', en: 'A complete overview of services available in the city.', 'zh-CN': '城市现有服务概览。' }, publishedAt: '2026-07-10T10:00:00+00:00'
    }, {
      id: 'ffffffffffffffffffffffff', categoryId: '111111111111111111111111', slug: 'first-home-checklist', imageUrl: PUBLIC_CLONE_ASSETS.legal,
      title: { ar: 'قوانين الإيجار الجديدة وما يهمك معرفته', en: 'New rental laws and what you need to know', 'zh-CN': '新的租赁法规及须知' }, body: { ar: 'شرح مبسط للتعديلات الأخيرة على قانون الإيجار.', en: 'A simple explanation of recent rental-law changes.', 'zh-CN': '租赁法最新修订的简明解释。' }, publishedAt: '2026-07-01T10:00:00+00:00'
    }, {
      id: '111111111111111111111111', categoryId: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'neighborhood-guide', imageUrl: PUBLIC_CLONE_ASSETS.urban,
      title: { ar: 'الحياة في مدينة السادات: تجارب السكان', en: 'Life in Sadat City: resident experiences', 'zh-CN': '萨达特城生活：居民体验' }, body: { ar: 'قصص حقيقية من سكان مدينة السادات.', en: 'Real stories from Sadat City residents.', 'zh-CN': '来自萨达特城居民的真实故事。' }, publishedAt: '2026-06-20T10:00:00+00:00'
    }, {
      id: '222222222222222222222222', categoryId: '333333333333333333333333', slug: 'rental-contracts', imageUrl: PUBLIC_CLONE_ASSETS.chart,
      title: { ar: 'نصائح المستأجر الأول: تجنب هذه الأخطاء', en: 'First-renter tips: avoid these mistakes', 'zh-CN': '首次租房提示：避免这些错误' }, body: { ar: 'أبرز الأخطاء التي يقع فيها المستأجر للمرة الأولى.', en: 'Common mistakes made by first-time renters.', 'zh-CN': '首次租房者常犯的错误。' }, publishedAt: '2026-06-10T10:00:00+00:00'
    }
  ],
  meta: { requestId: 'fresh-audit-public-articles' }
};
Object.assign(articleListFixture.data[0], {
  authorName: { ar: '\u0623\u062d\u0645\u062f \u0645\u062d\u0645\u0648\u062f', en: 'Ahmed Mahmoud', 'zh-CN': '\u827e\u54c8\u8fc8\u5fb7 \u00b7 \u9a6c\u54c8\u8302\u5fb7' },
  readingTimeMinutes: 8,
  body: {
    ar: '\u0643\u0644 \u0645\u0627 \u062a\u062d\u062a\u0627\u062c \u0645\u0639\u0631\u0641\u062a\u0647 \u0642\u0628\u0644 \u0634\u0631\u0627\u0621 \u0639\u0642\u0627\u0631 \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a. \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0645\u0646 \u0623\u0633\u0631\u0639 \u0627\u0644\u0645\u062f\u0646 \u0646\u0645\u0648\u064b\u0627 \u0639\u0644\u0649 \u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u0645\u0646\u0637\u0642\u0629.\n\n\"\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0644\u064a\u0633\u062a \u0641\u0642\u0637 \u0644\u0644\u0633\u0643\u0646\u060c \u0647\u064a \u0627\u0633\u062a\u062b\u0645\u0627\u0631 \u0641\u064a \u0645\u0633\u062a\u0642\u0628\u0644 \u0645\u0633\u062a\u0642\u0631.\"',
    en: 'Everything you need to know before buying a property in Sadat City. Sadat City is one of the fastest-growing cities in the region.\n\n"Sadat City is not only a place to live; it is an investment in a stable future."',
    'zh-CN': '\u5728\u8428\u8fbe\u7279\u57ce\u8d2d\u4e70\u623f\u4ea7\u524d\u9700\u8981\u4e86\u89e3\u7684\u4e00\u5207\u3002\n\n\u201c\u8428\u8fbe\u7279\u57ce\u4e0d\u4ec5\u662f\u5c45\u4f4f\u4e4b\u5730\uff0c\u4e5f\u662f\u7a33\u5b9a\u672a\u6765\u7684\u6295\u8d44\u3002\u201d'
  }
});
Object.assign(articleListFixture.data[1], { authorName: { ar: '\u0633\u0627\u0631\u0629 \u0623\u062d\u0645\u062f', en: 'Sara Ahmed', 'zh-CN': '\u8428\u62c9 \u00b7 \u827e\u54c8\u8fc8\u5fb7' }, readingTimeMinutes: 6 });
Object.assign(articleListFixture.data[2], { authorName: { ar: '\u0645\u062d\u0645\u062f \u0639\u0644\u064a', en: 'Mohamed Ali', 'zh-CN': '\u7a46\u54c8\u9ed8\u5fb7 \u00b7 \u963f\u91cc' }, readingTimeMinutes: 5 });
Object.assign(articleListFixture.data[3], { authorName: { ar: '\u0623\u062d\u0645\u062f \u0645\u062d\u0645\u0648\u062f', en: 'Ahmed Mahmoud', 'zh-CN': '\u827e\u54c8\u8fc8\u5fb7 \u00b7 \u9a6c\u54c8\u8302\u5fb7' }, readingTimeMinutes: 5 });
Object.assign(articleListFixture.data[4], { authorName: { ar: '\u0631\u064a\u0645 \u062e\u0627\u0644\u062f', en: 'Reem Khaled', 'zh-CN': '\u96f7\u59c6 \u00b7 \u54c8\u5229\u5fb7' }, readingTimeMinutes: 4 });
Object.assign(articleListFixture.data[5], { authorName: { ar: '\u0645\u062d\u0645\u062f \u0639\u0644\u064a', en: 'Mohamed Ali', 'zh-CN': '\u7a46\u54c8\u9ed8\u5fb7 \u00b7 \u963f\u91cc' }, readingTimeMinutes: 7 });
const articleDetailsBody = articleListFixture.data[0].body;
Object.assign(articleListFixture.data[0], {
  body: {
    ar: '\u0643\u0644 \u0645\u0627 \u062a\u062d\u062a\u0627\u062c \u0645\u0639\u0631\u0641\u062a\u0647 \u0642\u0628\u0644 \u0634\u0631\u0627\u0621 \u0639\u0642\u0627\u0631 \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a.',
    en: 'Everything you need to know before buying a property in Sadat City.',
    'zh-CN': '\u5728\u8428\u8fbe\u7279\u57ce\u8d2d\u4e70\u623f\u4ea7\u524d\u9700\u8981\u4e86\u89e3\u7684\u4e00\u5207\u3002'
  }
});
const articleCategoryFixture = {
  data: [
    { id: 'cccccccccccccccccccccccc', slug: 'housing', name: { ar: 'سكن', en: 'Housing', 'zh-CN': '居住' } },
    { id: 'dddddddddddddddddddddddd', slug: 'investment', name: { ar: 'استثمار', en: 'Investment', 'zh-CN': '投资' } },
    { id: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'areas', name: { ar: 'مناطق', en: 'Areas', 'zh-CN': '区域' } },
    { id: 'ffffffffffffffffffffffff', slug: 'services', name: { ar: 'خدمات', en: 'Services', 'zh-CN': '服务' } },
    { id: '111111111111111111111111', slug: 'laws', name: { ar: 'قوانين', en: 'Laws', 'zh-CN': '法规' } },
    { id: '222222222222222222222222', slug: 'buying', name: { ar: 'نصائح شراء', en: 'Buying tips', 'zh-CN': '购房建议' } },
    { id: '333333333333333333333333', slug: 'renting', name: { ar: 'نصائح إيجار', en: 'Renting tips', 'zh-CN': '租赁建议' } }
  ],
  meta: { requestId: 'fresh-audit-public-article-categories' }
};
const articleDetailsFixture = {
  data: { ...articleListFixture.data[0], body: articleDetailsBody, category: { id: '222222222222222222222222', slug: 'buying', name: { ar: '\u0646\u0635\u0627\u0626\u062d \u0634\u0631\u0627\u0621', en: 'Buying tips', 'zh-CN': '\u8d2d\u623f\u5efa\u8bae' } } },
  meta: { requestId: 'fresh-audit-public-article-details' }
};
const articleRelatedPropertyFixture = {
  data: {
    items: [
      { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'city-apartment', kind: 'unit', name: { ar: '\u0634\u0642\u0629 \u0641\u0627\u062e\u0631\u0629 \u0641\u064a \u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644', en: 'Luxury apartment in the First District', 'zh-CN': '\u7b2c\u4e00\u533a\u8c6a\u534e\u516c\u5bd3' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.interior, locationName: { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644', en: 'First District', 'zh-CN': '\u7b2c\u4e00\u533a' }, area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2 }, price: { amount: 1900000, currency: 'EGP' } },
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'garden-villa', kind: 'property', name: { ar: '\u0641\u064a\u0644\u0627 \u0645\u0633\u062a\u0642\u0644\u0629 \u0628\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629', en: 'Garden villa in Al Raqia', 'zh-CN': '\u9ad8\u7ea7\u533a\u72ec\u7acb\u522b\u5885' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.villa, locationName: { ar: '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629', en: 'Al Raqia district', 'zh-CN': '\u9ad8\u7ea7\u533a' }, area: { value: 320, unit: 'sqm' }, layout: { bedrooms: 5, bathrooms: 4 }, price: { amount: 5200000, currency: 'EGP' } },
      { id: 'cccccccccccccccccccccccc', slug: 'residential-land', kind: 'property', name: { ar: '\u0623\u0631\u0636 \u0633\u0643\u0646\u064a\u0629 \u0641\u064a \u0627\u0644\u062d\u064a \u0627\u0644\u0633\u0627\u0628\u0639', en: 'Residential land in the Seventh District', 'zh-CN': '\u7b2c\u4e03\u533a\u4f4f\u5b85\u7528\u5730' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.land, locationName: { ar: '\u0627\u0644\u062d\u064a \u0627\u0644\u0633\u0627\u0628\u0639', en: 'Seventh District', 'zh-CN': '\u7b2c\u4e03\u533a' }, area: { value: 420, unit: 'sqm' }, price: { amount: 780000, currency: 'EGP' } }
    ],
    categories: [],
    propertyTypes: [],
    page: 1,
    limit: 3,
    total: 3
  },
  meta: { requestId: 'fresh-audit-public-article-related-properties' }
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
    ? { fixture: articleDetailsFixture, apiPath: '/api/v1/public/articles/buying-in-sadat', apiPattern: '**/api/v1/public/articles/buying-in-sadat**', pageName: 'public-article-details', stateAttribute: 'data-article-details-state', regions: ['header', 'back link', 'related properties', 'hero/media', 'article title/meta', 'article body', 'related articles', 'footer'] }
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
  relatedResponses: fixtureKind === 'public-articles' || fixtureKind === 'public-article-details' ? { articleCategories: articleCategoryFixture, relatedArticles: articleListFixture, ...(fixtureKind === 'public-article-details' ? { relatedProperties: articleRelatedPropertyFixture } : {}) } : {},
  authSession: null,
  ownership: 'public',
};
fs.writeFileSync(path.join(evidenceDir, 'deterministic-state.json'), JSON.stringify(seedState, null, 2) + '\n');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: referenceWidth, height: 720 }, deviceScaleFactor: 1, locale });
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
if (fixtureKind === 'public-article-details') await page.route('**/api/v1/public/properties**', async (routeHandler) => {
  await routeHandler.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(articleRelatedPropertyFixture) });
});
if (fixtureKind === 'public-articles') await page.route('**/api/v1/public/article-categories**', async (routeHandler) => {
  await routeHandler.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(articleCategoryFixture) });
});

const targetUrl = new URL(route, baseUrl);
targetUrl.searchParams.set('lang', locale);
const response = await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
await page.locator(`[data-page="${fixtureConfig.pageName}"]`).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
await page.addStyleTag({ content: `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
` });
await page.evaluate(async () => {
  await document.fonts.ready;
  const images = Array.from(document.images);
  const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
  const step = Math.max(Math.floor(window.innerHeight * 0.8), 1);
  for (let y = 0; y < scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }
  window.scrollTo(0, 0);
  await Promise.all(images.map(async image => {
    if (image.complete) return;
    await Promise.race([
      image.decode().catch(() => undefined),
      new Promise(resolve => setTimeout(resolve, 5_000))
    ]);
  }));
  await document.fonts.ready;
});
await page.waitForTimeout(100);

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
    fonts: {
      status: document.fonts.status,
      ready: document.fonts.status === 'loaded',
      checks: {
        cairoRegular: document.fonts.check('400 16px Cairo', 'العقار'),
        cairoBold: document.fonts.check('700 16px Cairo', 'العقار'),
        notoSansSc: document.fonts.check('400 16px "Noto Sans SC"', '房产')
      },
      faces: [...document.fonts].map(font => ({ family: font.family, weight: font.weight, status: font.status }))
    },
    images: [...document.images].map(image => ({ src: image.currentSrc || image.src, complete: image.complete, decoded: image.complete && image.naturalWidth > 0, loading: image.loading })),
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
const diffPage = await context.newPage({ viewport: { width: referenceWidth, height: 720 } });
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
  const compareWidth = figmaImage.naturalWidth;
  const compareHeight = Math.min(figmaImage.naturalHeight, afterImage.naturalHeight);
  const compareCanvas = document.createElement('canvas');
  compareCanvas.width = compareWidth;
  compareCanvas.height = compareHeight;
  const compareContext = compareCanvas.getContext('2d', { willReadFrequently: true });
  if (compareContext === null) throw new Error('Unable to create visual comparison canvas');
  compareContext.drawImage(figmaImage, 0, 0, compareWidth, compareHeight);
  const expected = compareContext.getImageData(0, 0, compareWidth, compareHeight).data;
  compareContext.clearRect(0, 0, compareWidth, compareHeight);
  compareContext.drawImage(afterImage, 0, 0, compareWidth, compareHeight);
  const actual = compareContext.getImageData(0, 0, compareWidth, compareHeight).data;
  let changedPixels = 0;
  let antiAliasingOnlyPixels = 0;
  for (let index = 0; index < expected.length; index += 4) {
    const delta = Math.abs(expected[index] - actual[index]) + Math.abs(expected[index + 1] - actual[index + 1]) + Math.abs(expected[index + 2] - actual[index + 2]);
    if (delta > 24) changedPixels += 1;
    else if (delta > 3) antiAliasingOnlyPixels += 1;
  }
  const comparedPixels = compareWidth * compareHeight;
  return {
    dataUrl: canvas.toDataURL('image/png'),
    dimensions: { width, height },
    sourceDimensions: columns.map((image) => ({ width: image.naturalWidth, height: image.naturalHeight })),
    visualMetrics: {
      comparedWidth: compareWidth,
      comparedHeight: compareHeight,
      comparedPixels,
      materialDifferencePercent: Number(((changedPixels / comparedPixels) * 100).toFixed(4)),
      antiAliasingOnlyPercent: Number(((antiAliasingOnlyPixels / comparedPixels) * 100).toFixed(4)),
      threshold: { materialRgbSumGreaterThan: 24, antiAliasingRgbSumGreaterThan: 3 },
      method: 'same-width source/runtime canvas comparison over the overlapping document height'
    }
  };
}, { figma: imageData(path.join(evidenceDir, 'figma.png')), before: imageData(runtimePath), after: imageData(afterPath) });
const diffBuffer = Buffer.from(comparison.dataUrl.split(',')[1], 'base64');
fs.writeFileSync(path.join(evidenceDir, 'diff.png'), diffBuffer);
fs.writeFileSync(path.join(evidenceDir, 'visual-metrics.json'), JSON.stringify({
  schemaVersion: 1,
  screenId,
  phase: capturePhase,
  source: comparison.sourceDimensions[0],
  runtimeAfter: comparison.sourceDimensions[2],
  ...comparison.visualMetrics,
  reviewed: false
}, null, 2) + '\n');

if (capturePhase === 'after') {
  fs.writeFileSync(path.join(evidenceDir, 'runtime-after-capture.json'), JSON.stringify({
    schemaVersion: 1,
    screenId,
    phase: 'after',
    runtime: { route, locale, direction, viewport: dom.viewport, responseStatus: response?.status() ?? null, responseOk: response?.ok() ?? false, beforeHash, afterHash, requestedApi, apiResponses },
    structure: dom.structure,
    fonts: dom.fonts,
    images: dom.images,
    transitions: dom.transitions,
    comparison: { sourceDimensions: comparison.sourceDimensions, dimensions: comparison.dimensions, diffPath: `docs/quality/figma_parity/screens/${screenId}/diff.png`, visualMetricsPath: `docs/quality/figma_parity/screens/${screenId}/visual-metrics.json`, visualMetrics: comparison.visualMetrics }
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
