import { cmsPublicContentListSuccessEnvelopeSchema, communityPublicPostListSuccessEnvelopeSchema, publicHomepageSuccessEnvelopeSchema, publicPropertyListSuccessEnvelopeSchema } from '@sadat-real-estate/contracts';
import { expect, type Page } from '@playwright/test';

const publicAssetOrigin = process.env.PUBLIC_ASSET_ORIGIN ?? process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4173';
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
  communityAsset1: publicAsset('/assets/canonical/public/community-asset-1.png'),
  communityAsset2: publicAsset('/assets/canonical/public/community-asset-2.png'),
  communityAsset3: publicAsset('/assets/canonical/public/community-asset-3.png'),
  communityAsset4: publicAsset('/assets/canonical/public/community-asset-4.png'),
  communityAsset5: publicAsset('/assets/canonical/public/community-asset-5.png'),
  aboutPlatformHero: publicAsset('/assets/canonical/public/about-platform-hero.png'),
  teamAsset1: publicAsset('/assets/canonical/public/team-asset-1.png'),
  teamAsset2: publicAsset('/assets/canonical/public/team-asset-2.png'),
  teamAsset3: publicAsset('/assets/canonical/public/team-asset-3.png'),
  teamAsset4: publicAsset('/assets/canonical/public/team-asset-4.png'),
  teamAsset5: publicAsset('/assets/canonical/public/team-asset-5.png'),
  teamAsset6: publicAsset('/assets/canonical/public/team-asset-6.png'),
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
  related: publicAsset('/assets/canonical/public/listing-property-rental.png'),
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
          title: { ar: 'ابحث عن عقارك\nالان في السادات', en: 'Find your property\nnow in Sadat City',},
          body: { ar: 'منصة متكاملة لعقارات وخدمات مدينة السادات', en: 'A complete real-estate platform for Sadat City services and properties',},
           order: 0
        },
        {
          key: 'featured',
          title: { ar: 'عقارات مميزة', en: 'Featured properties',},
           order: 1
        }
      ],
      categories: [
        { id: '222222222222222222222222', slug: 'restaurants-cafes', name: { ar: 'مطاعم وكافيهات', en: 'Restaurants and cafés',}, propertyCount: 22, order: 0 },
        { id: '333333333333333333333333', slug: 'showrooms', name: { ar: 'صالات عرض', en: 'Showrooms',}, propertyCount: 34, order: 1 },
        { id: '444444444444444444444444', slug: 'full-commercial-building', name: { ar: 'مبنى تجاري كامل', en: 'Full commercial building',}, propertyCount: 19, order: 2 },
        { id: '555555555555555555555555', slug: 'room', name: { ar: 'غرفة', en: 'Room',}, propertyCount: 65, order: 3 },
        { id: '666666666666666666666666', slug: 'roof', name: { ar: 'روف', en: 'Roof',}, propertyCount: 28, order: 4 },
        { id: '777777777777777777777777', slug: 'duplex', name: { ar: 'دوبلكس', en: 'Duplex',}, propertyCount: 43, order: 5 },
        { id: '888888888888888888888888', slug: 'villa', name: { ar: 'فيلا', en: 'Villa',}, propertyCount: 87, order: 6 }
      ],
      metrics: [
        { key: 'population', title: { ar: 'عدد سكان مدينة السادات', en: 'Sadat City population',}, value: 342800, unit: { ar: 'نسمة', en: 'residents',}, order: 0 },
        { key: 'annual_growth', title: { ar: 'نمو سنوي', en: 'Annual growth',}, value: 3500, unit: { ar: 'نسمة', en: 'residents',}, order: 1 },
        { key: 'residential_districts', title: { ar: 'منطقة سكنية', en: 'Residential districts',}, value: 18, order: 2 },
        { key: 'housing_units', title: { ar: 'وحدة سكنية', en: 'Housing units',}, value: 1200, order: 3 }
      ],
      properties: [{
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        slug: 'published-home',
        kind: 'property',
        name: { ar: 'شقة فاخرة في الحي الأول', en: 'Luxury apartment in the First District',},
        transactionType: 'sale',
        imageUrl: PUBLIC_CLONE_ASSETS.propertyHome,
        description: { ar: 'وصف المنزل المنشور', en: 'A published home description',},
        area: { value: 145, unit: 'sqm' },
        layout: { bedrooms: 3, bathrooms: 2 },
         price: { amount: 1900000, currency: 'EGP' }
       }, {
         id: 'cccccccccccccccccccccccc', slug: 'published-villa', kind: 'property', name: { ar: 'فيلا مستقلة بالمنطقة الراقية', en: 'Detached villa in the premium district',}, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.propertyVilla, area: { value: 320, unit: 'sqm' }, layout: { bedrooms: 5, bathrooms: 4 }, price: { amount: 5200000, currency: 'EGP' }
       }, {
         id: 'dddddddddddddddddddddddd', slug: 'published-rental', kind: 'unit', name: { ar: 'دوبلكس فاخر في الحي الخامس', en: 'Luxury duplex in the Fifth District',}, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.propertyDuplex, area: { value: 240, unit: 'sqm' }, layout: { bedrooms: 4, bathrooms: 3 }, price: { amount: 3100000, currency: 'EGP' }
       }, {
         id: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'published-office', kind: 'unit', name: { ar: 'Published office', en: 'Published office',}, transactionType: 'rent', imageUrl: PUBLIC_CLONE_ASSETS.building, area: { value: 150, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 1, floor: 2 }, price: { amount: 12000, currency: 'EGP' }
       }, {
         id: 'ffffffffffffffffffffffff', slug: 'published-unit', kind: 'property', name: { ar: 'Published unit', en: 'Published unit',}, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.hero, area: { value: 135, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 5 }, price: { amount: 3100000, currency: 'EGP' }
       }, {
         id: '111111111111111111111111', slug: 'published-land', kind: 'property', name: { ar: 'Published land', en: 'Published land',}, transactionType: 'sale', imageUrl: PUBLIC_CLONE_ASSETS.house, area: { value: 400, unit: 'sqm' }, price: { amount: 780000, currency: 'EGP' }
       }],
      developers: [{
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
         slug: 'approved-builder',
         imageUrl: PUBLIC_CLONE_ASSETS.city,
        name: { ar: 'المطور المعتمد', en: 'Approved builder',},
        description: { ar: 'وصف المطور', en: 'Published developer description',}
       }, {
          id: 'cccccccccccccccccccccccc', slug: 'city-builders', name: { ar: 'City builders', en: 'City builders',}, imageUrl: PUBLIC_CLONE_ASSETS.night, description: { en: 'Published developer description', ar: 'Published developer description',}
       }, {
          id: 'dddddddddddddddddddddddd', slug: 'sadat-brokers', name: { ar: 'Sadat brokers', en: 'Sadat brokers',}, imageUrl: PUBLIC_CLONE_ASSETS.building, description: { en: 'Published brokerage description', ar: 'Published brokerage description',}
       }, {
          id: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'new-city-developments', name: { ar: 'New city developments', en: 'New city developments',}, imageUrl: PUBLIC_CLONE_ASSETS.house, description: { en: 'Published developer description', ar: 'Published developer description',}
       }],
       content: [
        {
          key: 'buying_guide',
          type: 'article',
          title: { ar: 'دليلك الكامل للشراء في مدينة السادات 2026', en: 'Your complete guide to buying in Sadat City 2026',},
          body: { ar: 'كل ما تحتاج معرفته قبل شراء عقار في مدينة السادات.', en: 'Everything you need to know before buying a property in Sadat City.',},
          imageUrl: PUBLIC_CLONE_ASSETS.articleBuyingGuide,
          order: 0
        },
        {
          key: 'community_update',
          type: 'community',
          title: { ar: 'أحمد محمد', en: 'Ahmed Mohamed',},
          body: { ar: 'تجربتي بعد سنة كاملة في السادات\nانتقلت من القاهرة للسادات السنة اللي فاتت وعندي شوية ملاحظات وتجارب.', en: 'My experience after a full year in Sadat City\nI moved from Cairo last year and have a few observations and experiences to share.',},
          imageUrl: PUBLIC_CLONE_ASSETS.communityHanaa,
          order: 1
        },
        {
          key: 'about_platform',
          type: 'about',
          title: { ar: 'منصة متكاملة لعقارات مدينة السادات', en: 'A complete real-estate platform for Sadat City',},
          body: { ar: 'نحن منصة رقمية متخصصة في السوق العقاري لمدينة السادات، نربط المشترين والمستأجرين بأفضل العروض الموثوقة من المطورين والملاك مباشرة.\nموثوقية تامة\nكل عقار يُتحقق منه\nسرعة الرد\nمتاحون 7 أيام\nخبرة واسعة\n15 عاماً في السوق\nأفضل الأسعار\nمباشرة من المالك', en: 'We are a digital platform focused on the Sadat City real-estate market, connecting buyers and renters with trusted offers directly from developers and owners.\nComplete reliability\nEvery property is verified\nFast response\nAvailable 7 days\nWide experience\n15 years in the market\nBest prices\nDirectly from the owner',},
           order: 2
        },
        {
          key: 'market_tip',
          type: 'tip',
          title: { ar: 'نصيحة عقارية', en: 'Property tip',},
           imageUrl: PUBLIC_CLONE_ASSETS.chart,
           order: 3
         }, {
           key: 'market_news', type: 'article', imageUrl: PUBLIC_CLONE_ASSETS.articleInvestment,
           title: { ar: 'أفضل المناطق للاستثمار العقاري في السادات', en: 'Best areas for real-estate investment in Sadat',}, body: { ar: 'تحليل شامل للمناطق ذات العائد الاستثماري الأعلى.', en: 'A complete analysis of the areas with the highest investment returns.',}, order: 4
         }, {
           key: 'city_services', type: 'article', imageUrl: PUBLIC_CLONE_ASSETS.articleServices,
           title: { ar: 'خدمات مدينة السادات: ما المتاح وما المخطط له', en: 'Sadat City services: what is available and planned',}, body: { ar: 'استعراض شامل للخدمات المتاحة في المدينة.', en: 'A complete overview of the services available in the city.',}, order: 5
         }, {
           key: 'community_events', type: 'community',
           title: { ar: 'محمد السيد', en: 'Mohamed El-Sayed',}, body: { ar: 'ما أفضل حي للسكن بميزانية 2 مليون؟\nأنا وعيلتي بنفكر ننتقل للسادات، ميزانيتنا حوالي 2 مليون جنيه. فين تنصحوني أشتري؟', en: 'What is the best district to live in with a budget of EGP 2 million?\nMy family and I are thinking about moving to Sadat City. Where should we buy?',}, imageUrl: PUBLIC_CLONE_ASSETS.communityMohamed, order: 6
         }, {
           key: 'about_sources', type: 'about', imageUrl: PUBLIC_CLONE_ASSETS.aboutTeam,
           title: { ar: 'مصادر معتمدة', en: 'Approved sources',}, body: { ar: '+500\nصفقة ناجحة', en: '+500\nSuccessful deals',}, order: 7
         }, {
           key: 'tip_checklist', type: 'tip', imageUrl: PUBLIC_CLONE_ASSETS.building,
           title: { ar: 'Buying checklist', en: 'Buying checklist',}, body: { ar: 'Buying checklist', en: 'Buying checklist',}, order: 8
         }
      ],
      banners: [{
        key: 'featured_banner',
        title: { ar: 'اكتشف المزيد', en: 'Discover more',},
        imageUrl: PUBLIC_CLONE_ASSETS.homepageHero,
         order: 0
       }, {
         key: 'city_banner',
        eyebrow: { ar: 'إعلان مميز', en: 'Featured opportunity',},
         title: { ar: 'كمبوند النخبة — الحي الأول', en: 'Elite Compound — First District',},
         body: { ar: 'وحدات سكنية فاخرة بتشطيب سوبر لوكس في أرقى مواقع مدينة السادات. تصميم عصري وإطلالات خضراء مفتوحة.', en: 'Luxury homes with super-lux finishes in one of Sadat City’s finest locations. Modern design with open green views.',},
         highlight: { ar: 'تبدأ من 1.2 مليون جنيه', en: 'Starting from EGP 1.2M',},
         imageUrl: PUBLIC_CLONE_ASSETS.homepageBanner,
         targetUrl: publicAsset('/properties'),
         order: 1
       }, {
           key: 'market_banner', title: { ar: 'Market banner', en: 'Market banner',}, imageUrl: PUBLIC_CLONE_ASSETS.chart, targetUrl: publicAsset('/articles'), order: 2
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
        name: { ar: title, en: title,},
        transactionType,
        description: { ar: title, en: title,},
        area: { value: itemDetails[index]!.area, unit: 'sqm' },
        ...(index === 2 ? {} : { layout: { bedrooms: itemDetails[index]!.bedrooms, bathrooms: itemDetails[index]!.bathrooms, floor: itemDetails[index]!.floor } }),
        price: { amount, currency: 'EGP' },
        imageUrl: itemDetails[index]!.image,
        locationName: { ar: itemDetails[index]!.location, en: itemDetails[index]!.location,},
        sourceName: { ar: itemDetails[index]!.source, en: itemDetails[index]!.source,},
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
        name: { ar, en,},
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
        name: { ar, en,},
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

export function publicCommunityFixture() {
  return communityPublicPostListSuccessEnvelopeSchema.parse({
    data: {
      items: [
        {
          id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
          title: '\u0645\u0627 \u0623\u0641\u0636\u0644 \u062d\u064a \u0644\u0644\u0633\u0643\u0646 \u0628\u0645\u064a\u0632\u0627\u0646\u064a\u0629 2 \u0645\u0644\u064a\u0648\u0646\u061f',
          body: '\u0623\u0646\u0627 \u0648\u0639\u0627\u0626\u0644\u062a\u064a \u0628\u0646\u0641\u0643\u0631 \u0646\u0646\u0642\u0644 \u0644\u0644\u0633\u0627\u062f\u0627\u062a\u060c \u0645\u064a\u0632\u0627\u0646\u064a\u062a\u0646\u0627 \u062d\u0648\u0627\u0644\u064a 2 \u0645\u0644\u064a\u0648\u0646 \u062c\u0646\u064a\u0647. \u0641\u064a\u0646 \u062a\u0646\u0635\u062d\u0648\u0646\u064a \u0623\u0634\u062a\u0631\u064a\u061f',
          createdAt: '2026-08-26T10:00:00+00:00',
          commentCount: 12
        },
        {
          id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
          title: '\u062a\u062c\u0631\u0628\u062a\u064a \u0628\u0639\u062f \u0633\u0646\u0629 \u0643\u0627\u0645\u0644\u0629 \u0641\u064a \u0627\u0644\u0633\u0627\u062f\u0627\u062a',
          body: '\u0627\u0646\u062a\u0642\u0644\u062a \u0645\u0646 \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0644\u0644\u0633\u0627\u062f\u0627\u062a \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0644\u064a \u0641\u0627\u062a\u062a \u0648\u0639\u0646\u062f\u064a \u0634\u0648\u064a\u0629 \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0648\u062a\u062c\u0627\u0631\u0628.',
          createdAt: '2026-08-25T10:00:00+00:00',
          commentCount: 34
        },
        {
          id: 'cccccccccccccccccccccccc',
          title: '\u0646\u0635\u064a\u062d\u0629 \u0645\u0647\u0645\u0629 \u0644\u0643\u0644 \u0645\u0646 \u064a\u0641\u0643\u0631 \u0641\u064a \u0627\u0644\u0634\u0631\u0627\u0621 \u0639\u0644\u0649 \u0627\u0644\u062e\u0631\u064a\u0637\u0629',
          body: '\u0628\u0639\u062f \u062a\u062c\u0631\u0628\u062a\u064a \u0634\u0631\u0627\u0621 \u0648\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0645\u0646 \u0645\u0637\u0648\u0631 \u0645\u062d\u062a\u0631\u0645\u060c \u0639\u0646\u062f\u064a \u0646\u0635\u0627\u0626\u062d \u0645\u0647\u0645\u0629 \u062c\u062f\u0627\u064b.',
          createdAt: '2026-08-21T10:00:00+00:00',
          commentCount: 45
        },
        {
          id: 'dddddddddddddddddddddddd',
          title: '\u0645\u0637\u0639\u0645 \u062c\u062f\u064a\u062f \u0645\u0645\u062a\u0627\u0632 \u0641\u064a \u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644',
          body: '\u0627\u0641\u062a\u062a\u062d \u0645\u0637\u0639\u0645 \u062c\u062f\u064a\u062f \u0641\u064a \u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0623\u0643\u0644 \u0641\u064a\u0647 \u0645\u0645\u062a\u0627\u0632 \u0648\u0623\u0633\u0639\u0627\u0631 \u0645\u0639\u0642\u0648\u0644\u0629.',
          createdAt: '2026-08-24T10:00:00+00:00',
          commentCount: 18
        }
      ],
      page: 1,
      limit: 20,
      total: 4
    },
    meta: { requestId: 'fresh-audit-public-community' }
  });
}

export function publicAboutFixture() {
  return cmsPublicContentListSuccessEnvelopeSchema.parse({
    data: {
      items: [{
        key: 'about_intro',
        title: { ar: '\u0639\u0646 \u0627\u0644\u0645\u0646\u0635\u0629', en: 'About the platform',},
        body: { ar: '\u0623\u0646\u0634\u0623\u0646\u0627 \u0647\u0630\u0647 \u0627\u0644\u0645\u0646\u0635\u0629 \u0644\u0623\u0646 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u064a\u062d\u062a\u0627\u062c \u0645\u0646\u0635\u0629 \u0645\u062a\u062e\u0635\u0635\u0629 \u0648\u0645\u0648\u062b\u0648\u0642\u0629.', en: 'We built this platform because Sadat City needs a specialized and trusted real-estate marketplace.',},
        order: 0
      }]
    },
    meta: { requestId: 'fresh-audit-public-about' }
  });
}

export function publicTeamFixture() {
  const members = [
    ['team_ahmed', '\u0623\u062d\u0645\u062f \u0645\u062d\u0645\u0648\u062f', '\u0645\u0624\u0633\u0633 \u0648\u0645\u062f\u064a\u0631 \u0639\u0627\u0645', '\u062e\u0628\u0631\u0629 15 \u0639\u0627\u0645\u0627\u064b \u0641\u064a \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0627\u0644\u0645\u0635\u0631\u064a.'],
    ['team_sara', '\u0633\u0627\u0631\u0629 \u0623\u062d\u0645\u062f', '\u0645\u062f\u064a\u0631\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a', '\u062e\u0628\u0631\u0629 \u0641\u064a \u062a\u0633\u0648\u064a\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a\u060c \u0623\u0646\u062c\u0632\u062a \u0623\u0643\u062b\u0631 \u0645\u0646 500 \u0635\u0641\u0642\u0629.'],
    ['team_mohamed', '\u0645\u062d\u0645\u062f \u0639\u0644\u064a', '\u0645\u062f\u064a\u0631 \u062f\u0639\u0645 \u0627\u0644\u0639\u0645\u0644\u0627\u0621', '\u0645\u062a\u062e\u0635\u0635 \u0641\u064a \u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0648\u062e\u062f\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621.'],
    ['team_nour', '\u0646\u0648\u0631 \u0625\u0628\u0631\u0627\u0647\u064a\u0645', '\u0645\u062d\u0631\u0631\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649', '\u0643\u0627\u062a\u0628\u0629 \u0645\u062a\u062e\u0635\u0635\u0629 \u0641\u064a \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0648\u0627\u0644\u0627\u0633\u062a\u062b\u0645\u0627\u0631\u064a.'],
    ['team_karim', '\u0643\u0631\u064a\u0645 \u0639\u0628\u062f \u0627\u0644\u0644\u0647', '\u0645\u0633\u062a\u0634\u0627\u0631 \u0639\u0642\u0627\u0631\u064a \u0623\u0648\u0644', '\u0645\u0633\u062a\u0634\u0627\u0631 \u0645\u062a\u0645\u0631\u0633 \u0641\u064a \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a \u0627\u0644\u0633\u0643\u0646\u064a\u0629 \u0648\u0627\u0644\u062a\u062c\u0627\u0631\u064a\u0629.'],
    ['team_ali', '\u0639\u0644\u064a \u0627\u0644\u0633\u064a\u062f', '\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0645\u062c\u062a\u0645\u0639 \u0627\u0644\u0631\u0642\u0645\u064a', '\u064a\u062f\u064a\u0631 \u0645\u062c\u062a\u0645\u0639 \u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u064a\u0636\u0645\u0646 \u062a\u062c\u0631\u0628\u0629 \u062a\u0648\u0627\u0635\u0644 \u0622\u0645\u0646\u0629.']
  ] as const;
  return cmsPublicContentListSuccessEnvelopeSchema.parse({
    data: {
      items: members.map(([key, name, role, bio], order) => ({
        key,
        title: { ar: role, en: role,},
        name: { ar: name, en: name,},
        role: { ar: role, en: role,},
        bio: { ar: bio, en: bio,},
        photoAssetId: `${String(order + 1).repeat(24)}`,
        order
      }))
    },
    meta: { requestId: 'fresh-audit-public-team' }
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
