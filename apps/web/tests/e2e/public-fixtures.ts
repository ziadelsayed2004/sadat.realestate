import { publicHomepageSuccessEnvelopeSchema, publicPropertyListSuccessEnvelopeSchema } from '@sadat-real-estate/contracts';
import { expect, type Page } from '@playwright/test';

const publicAssetOrigin = process.env.PUBLIC_ASSET_ORIGIN ?? 'http://127.0.0.1:4173';
const publicAsset = (assetPath: string) => new URL(assetPath, publicAssetOrigin).toString();

export const PUBLIC_CLONE_ASSETS = Object.freeze({
  homepageHero: publicAsset('/assets/canonical/public/home-hero-sadat-city.png'),
  homepageBanner: publicAsset('/assets/canonical/public/banner-elite-compound.png'),
  propertyHome: publicAsset('/assets/canonical/public/property-home.png'),
  propertyVilla: publicAsset('/assets/canonical/public/property-villa.png'),
  propertyDuplex: publicAsset('/assets/canonical/public/property-duplex.png'),
  articleBuyingGuide: publicAsset('/assets/canonical/public/article-buying-guide.png'),
  articleInvestment: publicAsset('/assets/canonical/public/article-investment.png'),
  articleServices: publicAsset('/assets/canonical/public/article-services.png'),
  communityMohamed: publicAsset('/assets/canonical/public/community-mohamed.png'),
  communityHanaa: publicAsset('/assets/canonical/public/community-hanaa.png'),
  aboutTeam: publicAsset('/assets/canonical/public/about-team.png'),
  listingPropertyHome: publicAsset('/assets/canonical/public/listing-property-home.png'),
  listingPropertyVilla: publicAsset('/assets/canonical/public/listing-property-villa.png'),
  listingPropertyLand: publicAsset('/assets/canonical/public/listing-property-land.png'),
  listingPropertyRental: publicAsset('/assets/canonical/public/listing-property-rental.png'),
  listingPropertyOffice: publicAsset('/assets/canonical/public/listing-property-office.png'),
  listingPropertyDuplex: publicAsset('/assets/canonical/public/listing-property-duplex.png'),
  listingProviderSadat: publicAsset('/assets/canonical/public/listing-provider-sadat.png'),
  listingProviderNile: publicAsset('/assets/canonical/public/listing-provider-nile.png'),
  listingProviderHope: publicAsset('/assets/canonical/public/listing-provider-hope.png'),
  listingProviderAhmed: publicAsset('/assets/canonical/public/listing-provider-ahmed.png'),
  listingProviderDelta: publicAsset('/assets/canonical/public/listing-provider-delta.png'),
  listingProviderSadat2: publicAsset('/assets/canonical/public/listing-provider-sadat-2.png'),
  hero: publicAsset('/assets/clone/pub06-a.png'),
  city: publicAsset('/assets/clone/pub05-c.png'),
  building: publicAsset('/assets/clone/pub05-e.png'),
  house: publicAsset('/assets/clone/pub05-g.png'),
  night: publicAsset('/assets/clone/pub05-a.png'),
  related: publicAsset('/assets/clone/pub05-g.png'),
  article: publicAsset('/assets/clone/pub07-a.png'),
  chart: publicAsset('/assets/clone/pub07-a.png'),
  legal: publicAsset('/assets/clone/pub07-d.png'),
  urban: publicAsset('/assets/clone/pub07-e.png'),
  interior: publicAsset('/assets/clone/pub08-e.png'),
  villa: publicAsset('/assets/clone/pub08-f.png'),
  land: publicAsset('/assets/clone/pub08-g.png'),
  office: publicAsset('/assets/clone/pub05-f.png'),
  provider: publicAsset('/assets/clone/pub05-b.png'),
  glass: publicAsset('/assets/clone/pub05-d.png')
});

export function publicHomepageFixture() {
  return publicHomepageSuccessEnvelopeSchema.parse({
    data: {
      sections: [
        {
          key: 'hero',
          title: { ar: 'ابحث عن عقارك\nالآن في السادات', en: 'Find your property\nnow in Sadat City', 'zh-CN': '寻找您的房产\n就在萨达特城' },
          body: { ar: 'ابحث في مدينة السادات', en: 'Search Sadat City', 'zh-CN': '搜索萨达特城' },
           order: 0
        },
        {
          key: 'featured',
          title: { ar: 'عقارات مميزة', en: 'Featured properties', 'zh-CN': '精选房产' },
           order: 1
        }
      ],
      categories: [
        { id: '222222222222222222222222', slug: 'restaurants-cafes', name: { ar: 'مطاعم وكافيهات', en: 'Restaurants and cafés', 'zh-CN': '餐厅和咖啡馆' }, propertyCount: 22, order: 0 },
        { id: '333333333333333333333333', slug: 'showrooms', name: { ar: 'صالات عرض', en: 'Showrooms', 'zh-CN': '展厅' }, propertyCount: 34, order: 1 },
        { id: '444444444444444444444444', slug: 'full-commercial-building', name: { ar: 'مبنى تجاري كامل', en: 'Full commercial building', 'zh-CN': '完整商业楼' }, propertyCount: 19, order: 2 },
        { id: '555555555555555555555555', slug: 'room', name: { ar: 'غرفة', en: 'Room', 'zh-CN': '房间' }, propertyCount: 65, order: 3 },
        { id: '666666666666666666666666', slug: 'roof', name: { ar: 'روف', en: 'Roof', 'zh-CN': '屋顶' }, propertyCount: 28, order: 4 },
        { id: '777777777777777777777777', slug: 'duplex', name: { ar: 'دوبلكس', en: 'Duplex', 'zh-CN': '复式' }, propertyCount: 43, order: 5 },
        { id: '888888888888888888888888', slug: 'villa', name: { ar: 'فيلا', en: 'Villa', 'zh-CN': '别墅' }, propertyCount: 87, order: 6 }
      ],
      metrics: [
        { key: 'population', title: { ar: 'عدد سكان مدينة السادات', en: 'Sadat City population', 'zh-CN': '萨达特城人口' }, value: 342800, unit: { ar: 'نسمة', en: 'residents', 'zh-CN': '居民' }, order: 0 },
        { key: 'annual_growth', title: { ar: 'نمو سنوي', en: 'Annual growth', 'zh-CN': '年增长' }, value: 3500, unit: { ar: 'نسمة', en: 'residents', 'zh-CN': '居民' }, order: 1 },
        { key: 'residential_districts', title: { ar: 'منطقة سكنية', en: 'Residential districts', 'zh-CN': '住宅区' }, value: 18, order: 2 },
        { key: 'housing_units', title: { ar: 'وحدة سكنية', en: 'Housing units', 'zh-CN': '住房单元' }, value: 1200, order: 3 }
      ],
      properties: [{
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        slug: 'published-home',
        kind: 'property',
        name: { ar: 'شقة فاخرة في الحي الأول', en: 'Luxury apartment in the First District', 'zh-CN': '第一街区豪华公寓' },
        transactionType: 'sale',
        imageUrl: PUBLIC_CLONE_ASSETS.propertyHome,
        description: { ar: 'وصف المنزل المنشور', en: 'A published home description', 'zh-CN': '已发布房产描述' },
        area: { value: 145, unit: 'sqm' },
        layout: { bedrooms: 3, bathrooms: 2 },
         price: { amount: 1900000, currency: 'EGP' }
       }, {
         id: 'cccccccccccccccccccccccc', slug: 'published-villa', kind: 'property', name: { ar: 'فيلا مستقلة بالمنطقة الراقية', en: 'Detached villa in the premium district', 'zh-CN': '高档区独栋别墅' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.propertyVilla, area: { value: 320, unit: 'sqm' }, layout: { bedrooms: 5, bathrooms: 4 }, price: { amount: 5200000, currency: 'EGP' }
       }, {
         id: 'dddddddddddddddddddddddd', slug: 'published-rental', kind: 'unit', name: { ar: 'دوبلكس فاخر في الحي الخامس', en: 'Luxury duplex in the Fifth District', 'zh-CN': '第五街区豪华复式住宅' }, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.propertyDuplex, area: { value: 240, unit: 'sqm' }, layout: { bedrooms: 4, bathrooms: 3 }, price: { amount: 3100000, currency: 'EGP' }
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
          title: { ar: 'دليلك الكامل للشراء في مدينة السادات 2024', en: 'Your complete guide to buying in Sadat City 2024', 'zh-CN': '2024年萨达特城购房完整指南' },
          body: { ar: 'كل ما تحتاج معرفته قبل شراء عقار في مدينة السادات.', en: 'Everything you need to know before buying a property in Sadat City.', 'zh-CN': '在萨达特城购买房产前需要了解的一切。' },
          imageUrl: PUBLIC_CLONE_ASSETS.articleBuyingGuide,
          order: 0
        },
        {
          key: 'community_update',
          type: 'community',
          title: { ar: 'أحمد محمد', en: 'Ahmed Mohamed', 'zh-CN': '艾哈迈德·穆罕默德' },
          body: { ar: 'تجربتي مع منصة عقارات السادات كانت ممتازة وساعدتني في الوصول إلى العقار المناسب بسهولة.', en: 'The platform made it easy to find the right property with confidence.', 'zh-CN': '平台让我轻松而放心地找到合适的房产。' },
          imageUrl: PUBLIC_CLONE_ASSETS.communityHanaa,
          order: 1
        },
        {
          key: 'about_platform',
          type: 'about',
          title: { ar: 'منصة متكاملة لعقارات مدينة السادات', en: 'A complete real-estate platform for Sadat City', 'zh-CN': '萨达特城综合房地产平台' },
          body: { ar: 'اكتشف أحدث العقارات والمشروعات من مصادر موثوقة ومعتمدة.\nبيانات دقيقة ومحدثة\nبحث وفلترة متقدمة\nتواصل مباشر وآمن\nدعم كامل لرحلة البحث', en: 'Discover current properties and projects from trusted approved sources.\nAccurate current data\nAdvanced search and filters\nSafe direct contact\nComplete seeker support', 'zh-CN': '探索来自可信来源的最新房产和项目。\n准确的最新数据\n高级搜索和筛选\n安全直接联系\n完整找房支持' },
           order: 2
        },
        {
          key: 'market_tip',
          type: 'tip',
          title: { ar: 'نصيحة عقارية', en: 'Property tip', 'zh-CN': '房产提示' },
           imageUrl: PUBLIC_CLONE_ASSETS.chart,
           order: 3
         }, {
           key: 'market_news', type: 'article', imageUrl: PUBLIC_CLONE_ASSETS.articleInvestment,
           title: { ar: 'أفضل المناطق للاستثمار العقاري في السادات', en: 'Best areas for real-estate investment in Sadat', 'zh-CN': '萨达特房地产投资的最佳区域' }, body: { ar: 'تحليل شامل للمناطق ذات العائد الاستثماري الأعلى.', en: 'A complete analysis of the areas with the highest investment returns.', 'zh-CN': '全面分析投资回报率最高的区域。' }, order: 4
         }, {
           key: 'city_services', type: 'article', imageUrl: PUBLIC_CLONE_ASSETS.articleServices,
           title: { ar: 'قوانين الإيجار الجديدة وما يهمك معرفته', en: 'New rental laws and what you need to know', 'zh-CN': '新的租赁法规及须知' }, body: { ar: 'شرح مبسط للتعديلات الأخيرة على قانون الإيجار.', en: 'A simple explanation of recent rental-law changes.', 'zh-CN': '租赁法最新修订的简明解释。' }, order: 5
         }, {
           key: 'community_events', type: 'community',
           title: { ar: 'محمد السيد', en: 'Mohamed El-Sayed', 'zh-CN': '穆罕默德·赛义德' }, body: { ar: 'ما أفضل حي للسكن بالقرب من الخدمات؟ وجدت إجابات مفيدة وتجارب حقيقية من سكان المدينة.', en: 'Community answers helped me compare districts close to essential services.', 'zh-CN': '社区经验帮助我比较靠近生活服务的街区。' }, imageUrl: PUBLIC_CLONE_ASSETS.communityMohamed, order: 6
         }, {
           key: 'about_sources', type: 'about', imageUrl: PUBLIC_CLONE_ASSETS.aboutTeam,
           title: { ar: 'مصادر معتمدة', en: 'Approved sources', 'zh-CN': '可靠来源' }, body: { ar: '+500 عقار مضاف', en: '+500 listed properties', 'zh-CN': '超过500套房产' }, order: 7
         }, {
           key: 'tip_checklist', type: 'tip', imageUrl: PUBLIC_CLONE_ASSETS.building,
           title: { ar: 'Buying checklist', en: 'Buying checklist', 'zh-CN': 'Buying checklist' }, body: { ar: 'Buying checklist', en: 'Buying checklist', 'zh-CN': 'Buying checklist' }, order: 8
         }
      ],
      banners: [{
        key: 'featured_banner',
        title: { ar: 'اكتشف المزيد', en: 'Discover more', 'zh-CN': '探索更多' },
        imageUrl: PUBLIC_CLONE_ASSETS.homepageHero,
         order: 0
       }, {
         key: 'city_banner',
         eyebrow: { ar: 'فرصة مميزة', en: 'Featured opportunity', 'zh-CN': '精选机会' },
         title: { ar: 'كمبوند النخبة – الحي الأول', en: 'Elite Compound — First District', 'zh-CN': '精英社区—第一街区' },
         body: { ar: 'وحدات سكنية فاخرة بتشطيب سوبر لوكس في أرقى مواقع مدينة السادات. تصميم عصري وإطلالات خضراء مفتوحة.', en: 'Luxury homes with super-lux finishes in one of Sadat City’s finest locations. Modern design with open green views.', 'zh-CN': '位于萨达特城优越地段的豪华住宅，采用超豪华装修。现代设计，享有开阔绿景。' },
         highlight: { ar: 'تبدأ من 1.2 مليون جنيه', en: 'Starting from EGP 1.2M', 'zh-CN': '120万埃镑起' },
         imageUrl: PUBLIC_CLONE_ASSETS.homepageBanner,
         targetUrl: publicAsset('/properties'),
         order: 1
       }, {
           key: 'market_banner', title: { ar: 'Market banner', en: 'Market banner', 'zh-CN': 'Market banner' }, imageUrl: PUBLIC_CLONE_ASSETS.chart, targetUrl: publicAsset('/articles'), order: 2
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
    ['published-home', 'شقة فاخرة في الحي الأول', 'sale', 1900000],
    ['published-villa', 'فيلا مستقلة بالمنطقة الراقية', 'sale', 5200000],
    ['published-land', 'أرض سكنية في الحي السابع', 'sale', 780000],
    ['published-rental', 'شقة للإيجار في الحي الثالث', 'rent', 8500],
    ['published-office', 'مكتب تجاري في المنطقة الصناعية', 'rent', 12000],
    ['published-unit', 'دوبلكس فاخر في الحي الخامس', 'sale', 3100000]
  ] as const;
  const itemDetails = [
    { area: 145, bedrooms: 3, bathrooms: 2, floor: 1, location: 'الحي الأول', source: 'شركة السادات للتطوير العقاري', code: 'SDT-1234', views: 342, image: PUBLIC_CLONE_ASSETS.listingPropertyHome, sourceImage: PUBLIC_CLONE_ASSETS.listingProviderSadat },
    { area: 320, bedrooms: 5, bathrooms: 4, floor: 2, location: 'المنطقة الراقية', source: 'مجموعة النيل العقارية', code: 'SDT-0892', views: 512, image: PUBLIC_CLONE_ASSETS.listingPropertyVilla, sourceImage: PUBLIC_CLONE_ASSETS.listingProviderNile },
    { area: 400, bedrooms: 0, bathrooms: 0, floor: 0, location: 'الحي السابع', source: 'مكتب الأمل العقاري', code: 'SDT-0456', views: 189, image: PUBLIC_CLONE_ASSETS.listingPropertyLand, sourceImage: PUBLIC_CLONE_ASSETS.listingProviderHope },
    { area: 120, bedrooms: 2, bathrooms: 2, floor: 3, location: 'الحي الثالث', source: 'أحمد حسن', code: 'SDT-0234', views: 267, image: PUBLIC_CLONE_ASSETS.listingPropertyRental, sourceImage: PUBLIC_CLONE_ASSETS.listingProviderAhmed },
    { area: 200, bedrooms: 3, bathrooms: 2, floor: 1, location: 'المنطقة الصناعية', source: 'مجموعة الدلتا العقارية', code: 'SDT-0789', views: 134, image: PUBLIC_CLONE_ASSETS.listingPropertyOffice, sourceImage: PUBLIC_CLONE_ASSETS.listingProviderDelta },
    { area: 240, bedrooms: 4, bathrooms: 3, floor: 5, location: 'الحي الخامس', source: 'شركة السادات للتطوير العقاري', code: 'SDT-0567', views: 423, image: PUBLIC_CLONE_ASSETS.listingPropertyDuplex, sourceImage: PUBLIC_CLONE_ASSETS.listingProviderSadat2 }
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
        area: { value: itemDetails[index]!.area, unit: 'sqm' },
        ...(index === 2 ? {} : { layout: { bedrooms: itemDetails[index]!.bedrooms, bathrooms: itemDetails[index]!.bathrooms, floor: itemDetails[index]!.floor } }),
        price: { amount, currency: 'EGP' },
        imageUrl: itemDetails[index]!.image,
        locationName: { ar: itemDetails[index]!.location, en: itemDetails[index]!.location, 'zh-CN': itemDetails[index]!.location },
        sourceName: { ar: itemDetails[index]!.source, en: itemDetails[index]!.source, 'zh-CN': itemDetails[index]!.source },
        publicCode: itemDetails[index]!.code,
        viewCount: itemDetails[index]!.views,
        sourceImageUrl: itemDetails[index]!.sourceImage,
        sourceType: index === 2 || index === 3 ? 'brokerage_office' : 'developer_company',
        installmentAvailable: index === 0 || index === 1 || index === 5,
        featured: index === 0 || index === 1 || index === 5,
        deliveryStatus: index % 3 === 0 ? 'ready_to_move' : index % 3 === 1 ? 'under_construction' : 'future_delivery'
      })),
      categories: ([
        ['restaurants-cafes', 'مطاعم وكافيهات', 'Restaurants and cafés', 22],
        ['showrooms', 'صالات عرض', 'Showrooms', 34],
        ['full-commercial-building', 'مبنى تجاري كامل', 'Full commercial building', 19],
        ['room', 'غرفة', 'Room', 65],
        ['roof', 'روف', 'Roof', 28],
        ['duplex', 'دوبلكس', 'Duplex', 43],
        ['villa', 'فيلا', 'Villa', 87]
      ] as const).map(([slug, ar, en, propertyCount], index) => ({
        id: (index + 7).toString(16).repeat(24),
        slug,
        name: { ar, en, 'zh-CN': en },
        propertyCount,
        order: index
      })),
      propertyTypes: ([
        ['apartments', 'شقة', 'Apartment', 112],
        ['villas', 'فيلا', 'Villa', 64],
        ['land', 'أرض', 'Land', 48],
        ['offices', 'مكتب', 'Office', 31],
        ['duplex', 'دوبلكس', 'Duplex', 43]
      ] as const).map(([slug, ar, en, propertyCount], index) => ({
        id: (index + 1).toString(16).repeat(24),
        slug,
        name: { ar, en, 'zh-CN': en },
        propertyCount,
        order: index
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
