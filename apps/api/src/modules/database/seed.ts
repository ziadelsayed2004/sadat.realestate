import { Types, type Connection } from 'mongoose';
import { argon2id, hash as argon2Hash } from 'argon2';
import type { AppEnvironment } from '../config/environment.js';
import { isSeedEnvironmentAllowed } from './environment.js';

export interface DevelopmentSeedStep {
  id: string;
  run(connection: Connection): Promise<void>;
}

export class DevelopmentSeedError extends Error {
  readonly code = 'DEVELOPMENT_SEED_FORBIDDEN';

  constructor() {
    super('Synthetic seed is available only in local and UAT environments');
    this.name = 'DevelopmentSeedError';
  }
}

const SEEDED_AT = new Date('2026-01-15T12:00:00.000Z');
const ids = {
  user: new Types.ObjectId('670000000000000000000001'),
  providerProfile: new Types.ObjectId('670000000000000000000002'),
  organization: new Types.ObjectId('670000000000000000000003'),
  location: new Types.ObjectId('670000000000000000000004'),
  neighborhood: new Types.ObjectId('670000000000000000000005'),
  locationFirst: new Types.ObjectId('6700000000000000000000d0'),
  locationUpscale: new Types.ObjectId('6700000000000000000000d1'),
  locationSeventh: new Types.ObjectId('6700000000000000000000d2'),
  locationThird: new Types.ObjectId('6700000000000000000000d3'),
  locationIndustrial: new Types.ObjectId('6700000000000000000000d4'),
  locationFifth: new Types.ObjectId('6700000000000000000000d5'),
  project: new Types.ObjectId('670000000000000000000006'),
  propertyOne: new Types.ObjectId('670000000000000000000007'),
  propertyTwo: new Types.ObjectId('670000000000000000000008'),
  propertyThree: new Types.ObjectId('670000000000000000000009'),
  propertyFour: new Types.ObjectId('670000000000000000000097'),
  propertyFive: new Types.ObjectId('6700000000000000000000c0'),
  propertySix: new Types.ObjectId('6700000000000000000000c1'),
  sourceAhmedOrganization: new Types.ObjectId('6700000000000000000000d6'),
  sourceHopeOrganization: new Types.ObjectId('6700000000000000000000d7'),
  sourceNileOrganization: new Types.ObjectId('670000000000000000000079'),
  sourceMisrOrganization: new Types.ObjectId('67000000000000000000007c'),
  sourceDeltaOrganization: new Types.ObjectId('67000000000000000000007f'),
  directoryAsOrganization: new Types.ObjectId('6700000000000000000000da'),
  directoryProfileOrganization: new Types.ObjectId('6700000000000000000000db'),
  typeLand: new Types.ObjectId('6700000000000000000000d8'),
  typeOffice: new Types.ObjectId('6700000000000000000000d9'),
  articleCategory: new Types.ObjectId('67000000000000000000000a'),
  article: new Types.ObjectId('67000000000000000000000b'),
  communityPost: '67000000000000000000000c',
  about: new Types.ObjectId('67000000000000000000000d'),
  tip: new Types.ObjectId('67000000000000000000000e'),
  homepageSection: new Types.ObjectId('67000000000000000000000f'),
  banner: new Types.ObjectId('670000000000000000000010'),
  seekerUser: new Types.ObjectId('670000000000000000000011'),
  seekerProfile: new Types.ObjectId('670000000000000000000012'),
  brokerUser: new Types.ObjectId('670000000000000000000013'),
  brokerProfile: new Types.ObjectId('670000000000000000000014'),
  officeUser: new Types.ObjectId('670000000000000000000015'),
  officeProfile: new Types.ObjectId('670000000000000000000016'),
  adminViewerUser: new Types.ObjectId('670000000000000000000017'),
  adminViewerProfile: new Types.ObjectId('670000000000000000000018'),
  adminViewerAccount: new Types.ObjectId('670000000000000000000019'),
  adminOpsUser: new Types.ObjectId('67000000000000000000001a'),
  adminOpsProfile: new Types.ObjectId('67000000000000000000001b'),
  adminOpsAccount: new Types.ObjectId('67000000000000000000001c'),
  adminViewerRole: new Types.ObjectId('67000000000000000000001d'),
  adminOpsRole: new Types.ObjectId('67000000000000000000001e'),
  adminViewerAssignment: new Types.ObjectId('67000000000000000000001f'),
  adminOpsAssignment: new Types.ObjectId('670000000000000000000020'),
  request: new Types.ObjectId('670000000000000000000021'),
  viewing: new Types.ObjectId('670000000000000000000022'),
  favorite: new Types.ObjectId('670000000000000000000023'),
  favoriteTwo: new Types.ObjectId('670000000000000000000098'),
  favoriteThree: new Types.ObjectId('670000000000000000000099'),
  favoriteFour: new Types.ObjectId('67000000000000000000009a'),
  notification: new Types.ObjectId('670000000000000000000024'),
  adRequest: new Types.ObjectId('670000000000000000000025'),
  adQuote: new Types.ObjectId('670000000000000000000026'),
  paymentProof: new Types.ObjectId('670000000000000000000027'),
  commissionPolicy: new Types.ObjectId('670000000000000000000028'),
  commissionConfirmation: new Types.ObjectId('670000000000000000000029'),
  commissionSnapshot: new Types.ObjectId('67000000000000000000002a'),
  homepageMetric: new Types.ObjectId('67000000000000000000002b'),
  catResidential: new Types.ObjectId('670000000000000000000030'),
  catCommercial: new Types.ObjectId('670000000000000000000031'),
  typeApartment: new Types.ObjectId('670000000000000000000032'),
  typeDuplex: new Types.ObjectId('670000000000000000000033'),
  typeVilla: new Types.ObjectId('670000000000000000000034'),
  teamAhmed: new Types.ObjectId('670000000000000000000041'),
  teamSara: new Types.ObjectId('670000000000000000000042'),
  teamMohamed: new Types.ObjectId('670000000000000000000043'),
  teamNour: new Types.ObjectId('670000000000000000000044'),
  teamKarim: new Types.ObjectId('670000000000000000000045'),
  teamAli: new Types.ObjectId('670000000000000000000046')
  , buyerUser: new Types.ObjectId('670000000000000000000061')
  , buyerProfile: new Types.ObjectId('670000000000000000000062')
} as const;

const localized = (ar: string, en: string) => ({ ar, en });

interface SyntheticSeedDocument {
  _id: Types.ObjectId;
  synthetic: true;
  seedKey: 'local-showcase-v1' | 'local-showcase-v2' | 'figma-public-content-v3' | 'figma-public-catalogue-v4' | 'figma-public-interactions-v5' | 'auth-buyer-v6' | 'figma-public-details-v9' | 'figma-public-details-v13' | 'figma-public-listing-v10' | 'figma-public-about-v1' | 'figma-public-parity-v11' | 'figma-public-parity-v12' | 'figma-public-directory-v14' | 'figma-public-profile-v15' | 'figma-public-profile-v16' | 'figma-public-articles-v17' | 'figma-public-article-route-v18' | 'figma-public-article-dates-v19' | 'figma-public-community-v20' | 'figma-public-team-v21';
  [key: string]: unknown;
}

function document(
  _id: Types.ObjectId,
  value: Record<string, unknown>,
  seedKey: SyntheticSeedDocument['seedKey'] = 'local-showcase-v1'
): SyntheticSeedDocument {
  return { _id, synthetic: true, seedKey, ...value };
}

async function insertSyntheticDocuments(
  connection: Connection,
  collectionName: string,
  documents: readonly SyntheticSeedDocument[]
): Promise<void> {
  const collection = connection.collection<SyntheticSeedDocument>(collectionName);
  for (const value of documents) {
    await collection.updateOne(
      { _id: value._id },
      { $setOnInsert: value },
      { upsert: true }
    );
  }
}

export const SYNTHETIC_SHOWCASE_SEED_STEP: DevelopmentSeedStep = {
  id: 'local-showcase-v1',
  async run(connection) {
    await insertSyntheticDocuments(connection, 'users', [document(ids.user, {
      normalizedEmail: 'provider.demo@example.invalid',
      normalizedPhone: '+201000000001',
      roleType: 'provider',
      status: 'verified',
      locale: 'ar',
      statusChangedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'provider_profiles', [document(ids.providerProfile, {
      userId: ids.user,
      providerType: 'developer_company',
      status: 'approved',
      statusChangedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'organizations', [document(ids.organization, {
      providerId: ids.providerProfile,
      kind: 'developer_company',
      name: localized('شركة السادات للتطوير العقاري', 'Sadat Real Estate Development'),
      description: localized(
        'شركة رائدة في التطوير العقاري وإدارة المشاريع السكنية والتجارية بمدينة السادات.',
        'A leading real estate developer managing residential and commercial projects in Sadat City.'),
      slug: 'sadat-demo-developer',
      imageUrl: '/assets/canonical/public/developer-sadat.png',
      status: 'approved',
      reviewedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'property_taxonomy', [
      document(ids.catResidential, {
        kind: 'category',
        name: localized('سكني', 'Residential'),
        slug: 'residential',
        imageUrl: '/assets/canonical/public/category-all.png',
        order: 10,
        active: true,
        createdBy: ids.user,
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.catCommercial, {
        kind: 'category',
        name: localized('تجاري', 'Commercial'),
        slug: 'commercial',
        imageUrl: '/assets/canonical/public/category-full-commercial-building.png',
        order: 20,
        active: true,
        createdBy: ids.user,
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.typeApartment, {
        kind: 'type',
        categoryId: ids.catResidential,
        name: localized('شقق', 'Apartments'),
        slug: 'apartment',
        imageUrl: '/assets/canonical/public/category-room.png',
        order: 10,
        active: true,
        createdBy: ids.user,
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.typeDuplex, {
        kind: 'type',
        categoryId: ids.catResidential,
        name: localized('دوبلكس', 'Duplexes'),
        slug: 'duplex',
        imageUrl: '/assets/canonical/public/category-duplex.png',
        order: 20,
        active: true,
        createdBy: ids.user,
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.typeVilla, {
        kind: 'type',
        categoryId: ids.catResidential,
        name: localized('فيلات', 'Villas'),
        slug: 'villa',
        imageUrl: '/assets/canonical/public/category-villa.png',
        order: 30,
        active: true,
        createdBy: ids.user,
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      })
    ]);
    await insertSyntheticDocuments(connection, 'locations', [
      document(ids.location, {
        kind: 'location',
        name: localized('مدينة السادات', 'Sadat City'),
        slug: 'sadat-city',
        coordinates: { type: 'Point', coordinates: [30.5065, 30.3676] },
        order: 10,
        active: true,
        createdBy: ids.user,
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.neighborhood, {
        kind: 'neighborhood',
        name: localized('الحي السكني التجريبي', 'Demo Residential District'),
        slug: 'demo-residential-district',
        parentLocationId: ids.location,
        order: 20,
        active: true,
        createdBy: ids.user,
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      })
    ]);
    await insertSyntheticDocuments(connection, 'projects', [document(ids.project, {
      providerId: ids.providerProfile,
      organizationId: ids.organization,
      locationId: ids.location,
      name: localized('مشروع زهرة السادات السكني', 'Zahrat Sadat Residential Project'),
      slug: 'demo-oasis-project',
      description: localized(
        'مشروع سكني متكامل يضم عمارات سكنية ومساحات خضراء ومول تجاري بالمنطقة المركزية بمدينة السادات.',
        'Integrated residential community with green areas, modern apartments, and retail mall in Sadat City.'),
      website: 'https://sadat-realestate.com/projects/zahrat-sadat',
      status: 'published',
      submittedAt: SEEDED_AT,
      reviewedAt: SEEDED_AT,
      publishedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);

    const propertyBase = {
      providerId: ids.providerProfile,
      sourceType: 'developer_company',
      organizationId: ids.organization,
      kind: 'property',
      projectId: ids.project,
      locationId: ids.location,
      coordinates: { type: 'Point', coordinates: [30.5065, 30.3676] },
      mapUrl: 'https://maps.google.com/?q=30.5065,30.3676',
      transactionType: 'sale',
      status: 'published',
      deliveryStatus: 'ready_to_move',
      active: true,
      submittedAt: SEEDED_AT,
      reviewedAt: SEEDED_AT,
      publishedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    } as const;
    await insertSyntheticDocuments(connection, 'properties', [
      document(ids.propertyOne, {
        ...propertyBase,
        propertyTypeId: ids.typeApartment,
        imageUrl: '/assets/canonical/public/listing-property-home.png',
        publicCode: 'SDT-1234',
        viewCount: 342,
        featured: true,
        paymentPlans: [{ label: localized('تقسيط متاح', 'Installments available'), months: 60 }],
        name: localized('شقة فاخرة بإطلالة مفتوحة في الحي الأول', 'Luxury Open-View Apartment in District 1'),
        slug: 'demo-open-view-apartment',
        description: localized('شقة مميزة بتشطيب ألترا سوبر لوكس وإطلالة بحرية على الحدائق المركزية، قريبة من كافة المدارس والخدمات.', 'Distinctive apartment with ultra super lux finishing, open view of central parks, and close to top schools and services.'),
        area: { value: 145, unit: 'sqm' },
        layout: { bedrooms: 3, bathrooms: 2, floor: 3, totalFloors: 8 },
        price: { amount: 2_450_000, currency: 'EGP' }
      }),
      document(ids.propertyTwo, {
        ...propertyBase,
        propertyTypeId: ids.typeDuplex,
        imageUrl: '/assets/canonical/public/listing-property-duplex.png',
        publicCode: 'SDT-0567',
        viewCount: 423,
        paymentPlans: [{ label: localized('تقسيط متاح', 'Installments available'), months: 60 }],
        name: localized('دوبلكس راقي بحديقة خاصة في الحي المتميز', 'Premium Duplex with Private Garden in Elite District'),
        slug: 'demo-garden-duplex',
        description: localized('دوبلكس فاخر بمدخل خاص وحديقة منسقة بموقع استراتيجي بالحي المتميز بمدينة السادات مع تسهيلات في السداد.', 'Luxury duplex with private entrance, landscaped garden, and prime location in Sadat Elite District with flexible payment terms.'),
        area: { value: 220, unit: 'sqm' },
        layout: { bedrooms: 4, bathrooms: 3, floor: 0, totalFloors: 2 },
        price: { amount: 4_100_000, currency: 'EGP' }
      }),
      document(ids.propertyThree, {
        ...propertyBase,
        propertyTypeId: ids.typeApartment,
        imageUrl: '/assets/canonical/public/listing-property-rental.png',
        transactionType: 'rent',
        publicCode: 'SDT-0234',
        viewCount: 267,
        paymentPlans: [],
        name: localized('شقة عصرية للإيجار بالمنطقة المركزية', 'Modern Rental Apartment in Central District'),
        slug: 'demo-rental-apartment',
        description: localized('شقة مؤثثة بالكامل وجاهزة للسكن الفوري بالقرب من جامعة مدينة السادات والمراكز الحيوية.', 'Fully furnished apartment ready for immediate occupancy near Sadat City University and vital amenities.'),
        area: { value: 110, unit: 'sqm' },
        layout: { bedrooms: 2, bathrooms: 1, floor: 2, totalFloors: 6 },
        price: { amount: 12_000, currency: 'EGP' }
      }),
      document(ids.propertyFour, {
        ...propertyBase,
        propertyTypeId: ids.typeVilla,
        imageUrl: '/assets/canonical/public/listing-property-villa.png',
        publicCode: 'SDT-0892',
        viewCount: 512,
        featured: true,
        paymentPlans: [{ label: localized('تقسيط متاح', 'Installments available'), months: 60 }],
        name: localized('فيلا مستقلة بالمنطقة الراقية', 'Independent villa in the upscale district'),
        slug: 'demo-upscale-villa',
        description: localized('فيلا مستقلة بحديقة خاصة وتشطيب كامل في المنطقة الراقية بمدينة السادات.', 'Independent villa with a private garden and complete finishing in Sadat City’s upscale district.'),
        area: { value: 320, unit: 'sqm' },
        layout: { bedrooms: 5, bathrooms: 4, floor: 0, totalFloors: 2 },
        price: { amount: 5_200_000, currency: 'EGP' }
      })
    ]);
    await insertSyntheticDocuments(connection, 'article_categories', [document(ids.articleCategory, {
      slug: 'demo-guides',
      name: localized('أدلة الشراء والاستثمار', 'Buying & Investment Guides'),
      description: localized('مقالات وإرشادات شاملة لاختيار وتوثيق العقارات بمدينة السادات.', 'Comprehensive articles and guidelines for choosing and registering properties in Sadat City.'),
      displayOrder: 10,
      active: true,
      createdBy: ids.user,
      updatedBy: ids.user,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'articles', [document(ids.article, {
      categoryId: ids.articleCategory,
      slug: 'demo-home-buying-guide',
      imageUrl: '/assets/canonical/public/article-buying-guide.png',
      title: localized('دليلك الشامل لشراء عقارك الأول في مدينة السادات', 'Complete Guide to Buying Your First Property in Sadat City'),
      body: localized(
        'تعد مدينة السادات واحدة من أكثر المدن الواعدة للاستثمار العقاري في مصر بفضل بنيتها التحتية المتطورة وموقعها الاستراتيجي على طريق مصر - الإسكندرية الصحراوي. في هذا الدليل نستعرض أهم المعايير لاختيار الحي المناسب، والتأكد من التراخيص الرسمية، وضمان أفضل عائد على الاستثمار العقاري.',
        'Sadat City is one of the most promising real estate investment destinations in Egypt, boasting modern infrastructure and strategic positioning on the Cairo-Alexandria Desert Road. In this guide, we explore how to choose the right district, verify official permits, and maximize property return on investment.'),
      authorId: ids.user,
      status: 'published',
      publishedAt: SEEDED_AT,
      createdBy: ids.user,
      updatedBy: ids.user,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'community_posts', [document(new Types.ObjectId(ids.communityPost), {
      id: ids.communityPost,
      authorId: ids.user.toHexString(),
      title: 'ما هي أفضل المدارس والخدمات التعليمية القريبة من المنطقة الخامسة؟',
      body: 'أخطط للانتقال مع الأسرة إلى الحي الخامس في مدينة السادات، وأود معرفة تجاربكم مع المدارس الحكومية والخاصة والمستشفيات القريبة من المنطقة. شكراً مقدماً لتعاونكم!',
      status: 'published',
      createdAt: SEEDED_AT.toISOString(),
      updatedAt: SEEDED_AT.toISOString()
    })]);
    await insertSyntheticDocuments(connection, 'cms_homepage_sections', [document(ids.homepageSection, {
      key: 'local_preview_intro',
      title: localized('وجهتك الأولى لعقارات مدينة السادات', 'Your #1 Destination for Sadat City Real Estate'),
      body: localized('ابحث، قارن، واختر عقارك المثالي بكل ثقة وشفافية من بين أفضل الشقق والفيلات والدوبلكس المعتمدة.', 'Search, compare, and choose your dream property with trust and full transparency among top verified apartments and villas.'),
      order: 10,
      visible: true,
      status: 'published',
      updatedBy: ids.user,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'cms_homepage_metrics', [
      document(ids.homepageMetric, { key: 'population', title: localized('عدد سكان مدينة السادات', 'Sadat City population'), value: 342800, unit: localized('نسمة', 'residents'), order: 0, visible: true, status: 'published', updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT }),
      document(new Types.ObjectId('67000000000000000000002c'), { key: 'annual_growth', title: localized('نمو سنوي', 'Annual growth'), value: 3500, unit: localized('نسمة', 'residents'), order: 1, visible: true, status: 'published', updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT }),
      document(new Types.ObjectId('67000000000000000000002d'), { key: 'residential_districts', title: localized('منطقة سكنية', 'Residential districts'), value: 18, order: 2, visible: true, status: 'published', updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT }),
      document(new Types.ObjectId('67000000000000000000002e'), { key: 'housing_units', title: localized('وحدة سكنية', 'Housing units'), value: 1200, order: 3, visible: true, status: 'published', updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT })
    ]);
    await insertSyntheticDocuments(connection, 'cms_about_blocks', [
      document(ids.about, {
        key: 'about_intro',
        title: localized('عن منصة عقارات السادات', 'About Sadat Real Estate Platform'),
        body: localized(
          'المنصة الرقمية الرائدة في توثيق وتسويق العقارات في مدينة السادات، نوفر بيئة آمنة للمشترين والمستثمرين والمطورين مع خدمات بحث ومقارنة ذكية.',
          'The leading digital platform for property verification and listing in Sadat City, providing a secure environment for buyers, investors, and developers with smart comparison tools.'),
        order: 10,
        active: true,
        status: 'published',
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(new Types.ObjectId('67000000000000000000003f'), {
        key: 'local_preview_about',
        title: localized('رؤيتنا وخدماتنا المتكاملة', 'Our Vision & Integrated Services'),
        body: localized('نهدف إلى تطوير السوق العقاري في مدينة السادات من خلال توفير معلومات دقيقة، واستشارات متخصصة، وتسهيل إجراءات المعاينة والتعاقد.', 'We aim to elevate the real estate market in Sadat City by delivering accurate data, expert advisory, and seamless viewing and contract procedures.'),
        order: 20,
        active: true,
        status: 'published',
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      })
    ]);
    await insertSyntheticDocuments(connection, 'cms_team_members', [
      document(ids.teamAhmed, {
        key: 'team_ahmed',
        name: localized('أحمد محمود', 'Ahmed Mahmoud'),
        title: localized('المدير التنفيذي والمؤسس', 'CEO & Founder'),
        bio: localized('خبرة أكثر من 15 عاماً في التطوير العقاري وإدارة المشروعات في مدينة السادات.', 'Over 15 years of real estate development and project management experience in Sadat City.'),
        order: 10,
        active: true,
        status: 'published',
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.teamSara, {
        key: 'team_sara',
        name: localized('سارة إبراهيم', 'Sara Ibrahim'),
        title: localized('مديرة المبيعات والتسويق', 'Head of Sales & Marketing'),
        bio: localized('متخصصة في تقديم الاستشارات العقارية وتسهيل أفضل فرص الاستثمار للعملاء.', 'Specialist in real estate advisory and delivering top investment opportunities for clients.'),
        order: 20,
        active: true,
        status: 'published',
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.teamMohamed, {
        key: 'team_mohamed',
        name: localized('محمد علي', 'Mohamed Ali'),
        title: localized('مسؤول خدمة ودعم العملاء', 'Customer Support Lead'),
        bio: localized('متابعة المعاينات وتنسيق طلبات المشترين والمستأجرين على مدار الساعة.', 'Coordinating viewings and supporting seeker requests around the clock.'),
        order: 30,
        active: true,
        status: 'published',
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.teamNour, {
        key: 'team_nour',
        name: localized('نور الدين حسن', 'Nour El-Din Hassan'),
        title: localized('أخصائي توثيق ومحتوى عقاري', 'Real Estate Content Specialist'),
        bio: localized('مراجعة بيانات الوحدات وصياغة التقارير الإرشادية لمدينة السادات.', 'Auditing property listings and authoring city guide reports.'),
        order: 40,
        active: true,
        status: 'published',
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.teamKarim, {
        key: 'team_karim',
        name: localized('كريم عادل', 'Karim Adel'),
        title: localized('مستشار مبيعات المشاريع', 'Project Sales Consultant'),
        bio: localized('مرافقة المستثمرين في جولات المعاينة الميدانية ومطابقة الاحتياجات.', 'Guiding investors through field viewings and finding the ideal property matches.'),
        order: 50,
        active: true,
        status: 'published',
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }),
      document(ids.teamAli, {
        key: 'team_ali',
        name: localized('علي رضا', 'Ali Reda'),
        title: localized('مسؤول التحقق والجودة', 'Verification & Quality Lead'),
        bio: localized('فحص صحة المستندات ومطابقة مواصفات الإعلانات مع الواقع.', 'Verifying legal documentation and confirming on-the-ground listing accuracy.'),
        order: 60,
        active: true,
        status: 'published',
        updatedBy: ids.user,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      })
    ]);
    await insertSyntheticDocuments(connection, 'cms_real_estate_tips', [document(ids.tip, {
      key: 'local_preview_tip',
      title: localized('نصيحة تجريبية', 'Demo Tip'),
      body: localized('تحقق من المستندات والموقع قبل اتخاذ قرار.', 'Review documents and location before deciding.'),
      order: 10,
      active: true,
      status: 'published',
      updatedBy: ids.user,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'cms_banners', [document(ids.banner, {
      key: 'local_preview_banner',
      title: localized('بيئة عرض محلية', 'Local Preview Environment'),
      eyebrow: localized('فرصة مميزة', 'Featured opportunity'),
      body: localized('بيانات منشورة لاختبار بطاقة العرض العامة.', 'Published data for exercising the public promotional card.'),
      highlight: localized('بيانات تجريبية', 'Demo data'),
      imageUrl: '/assets/canonical/public/home-hero-sadat-city.png',
      order: 10,
      active: true,
      status: 'published',
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
  }
};

/**
 * The second local showcase slice intentionally uses the same stable ObjectId
 * values on every run.  It exercises authenticated dashboard projections and
 * workflow states without pretending that any record is production data.
 */
export const SYNTHETIC_WORKFLOW_SEED_STEP: DevelopmentSeedStep = {
  id: 'local-showcase-v2',
  async run(connection) {
    const viewerPermissions = [
      'admin:overview.view',
      'admin:properties.view',
      'admin:requests.view',
      'admin:ads.view'
    ];
    const operationsPermissions = [
      'admin:requests.view',
      'admin:requests.manage',
      'admin:requests.assign',
      'admin:payments.review',
      'admin:commissions.manage',
      'admin:commissions.view'
    ];
    const localAdminPasswordHash = await argon2Hash(
      'LocalPreview-Admin-Only-2026!',
      { type: argon2id, salt: Buffer.from('sadat-local-admin-v2-fixed-salt') }
    );
    const futureViewing = new Date('2026-09-15T10:00:00.000Z');
    const intervalStart = new Date('2026-09-20T08:00:00.000Z');
    const intervalEnd = new Date('2026-09-27T20:00:00.000Z');

    await insertSyntheticDocuments(connection, 'users', [
      document(ids.seekerUser, {
        normalizedEmail: 'seeker.demo@example.invalid',
        normalizedPhone: '+201000000011',
        roleType: 'seeker',
        status: 'verified',
        locale: 'ar',
        statusChangedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2'),
      document(ids.buyerUser, {
        normalizedEmail: 'buyer.demo@example.invalid',
        roleType: 'seeker',
        status: 'verified',
        locale: 'ar',
        statusChangedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2'),
      document(ids.brokerUser, {
        normalizedEmail: 'broker.demo@example.invalid',
        normalizedPhone: '+201000000012',
        roleType: 'provider',
        status: 'verified',
        locale: 'en',
        statusChangedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2'),
      document(ids.officeUser, {
        normalizedEmail: 'office.demo@example.invalid',
        normalizedPhone: '+201000000013',
        roleType: 'provider',
        status: 'verified',
        locale: 'ar',
        statusChangedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2'),
      document(ids.adminViewerUser, {
        normalizedEmail: 'admin.viewer@example.invalid',
        roleType: 'admin',
        status: 'verified',
        locale: 'en',
        statusChangedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2'),
      document(ids.adminOpsUser, {
        normalizedEmail: 'admin.operations@example.invalid',
        roleType: 'admin',
        status: 'verified',
        locale: 'ar',
        statusChangedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2')
    ]);

    await insertSyntheticDocuments(connection, 'seeker_profiles', [document(ids.seekerProfile, {
      userId: ids.seekerUser,
      firstName: 'Local',
      lastName: 'Seeker',
      preferences: {
        propertyTypes: ['apartment'],
        locations: [ids.location.toHexString()],
        purpose: 'buy',
        minPrice: 1_000_000,
        maxPrice: 5_000_000,
        minArea: 100,
        maxArea: 200,
        bedroomsMin: 2,
        bedroomsMax: 4,
        paymentMethod: 'any'
      },
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    }, 'local-showcase-v2'), document(ids.buyerProfile, {
      userId: ids.buyerUser,
      firstName: 'مشتري',
      lastName: 'تجريبي',
      preferences: {
        propertyTypes: ['apartment', 'villa'],
        locations: [ids.location.toHexString()],
        purpose: 'buy',
        minPrice: 1_500_000,
        maxPrice: 6_000_000,
        minArea: 100,
        maxArea: 200,
        bedroomsMin: 2,
        bedroomsMax: 5,
        paymentMethod: 'any'
      },
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    }, 'local-showcase-v2')]);
    await insertSyntheticDocuments(connection, 'provider_profiles', [
      document(ids.brokerProfile, {
        userId: ids.brokerUser,
        providerType: 'individual_broker',
        status: 'approved',
        statusChangedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2'),
      document(ids.officeProfile, {
        userId: ids.officeUser,
        providerType: 'brokerage_office',
        status: 'approved',
        statusChangedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2')
    ]);
    await insertSyntheticDocuments(connection, 'admin_profiles', [
      document(ids.adminViewerProfile, { userId: ids.adminViewerUser, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, 'local-showcase-v2'),
      document(ids.adminOpsProfile, { userId: ids.adminOpsUser, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, 'local-showcase-v2')
    ]);
    await insertSyntheticDocuments(connection, 'admin_accounts', [
      document(ids.adminViewerAccount, { userId: ids.adminViewerUser, displayName: 'Local Viewer Admin', accessLevel: 'standard_admin', createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, 'local-showcase-v2'),
      document(ids.adminOpsAccount, { userId: ids.adminOpsUser, displayName: 'Local Operations Admin', accessLevel: 'standard_admin', createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, 'local-showcase-v2')
    ]);
    await insertSyntheticDocuments(connection, 'admin_credentials', [
      document(new Types.ObjectId('67000000000000000000002b'), { userId: ids.adminViewerUser, passwordHash: localAdminPasswordHash, passwordChangedAt: SEEDED_AT, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, 'local-showcase-v2'),
      document(new Types.ObjectId('67000000000000000000002c'), { userId: ids.adminOpsUser, passwordHash: localAdminPasswordHash, passwordChangedAt: SEEDED_AT, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, 'local-showcase-v2')
    ]);
    await insertSyntheticDocuments(connection, 'roles', [
      document(ids.adminViewerRole, {
        name: 'Local View Only Admin',
        nameKey: 'local-view-only-admin',
        description: 'Synthetic read-only permissions for local dashboard checks.',
        accessMode: 'view_only',
        permissions: viewerPermissions,
        active: true,
        createdBy: ids.adminOpsUser,
        updatedBy: ids.adminOpsUser,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2'),
      document(ids.adminOpsRole, {
        name: 'Local Operations Admin',
        nameKey: 'local-operations-admin',
        description: 'Synthetic workflow permissions for local dashboard checks.',
        accessMode: 'custom',
        permissions: operationsPermissions,
        active: true,
        createdBy: ids.adminOpsUser,
        updatedBy: ids.adminOpsUser,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, 'local-showcase-v2')
    ]);
    await insertSyntheticDocuments(connection, 'admin_role_assignments', [
      document(ids.adminViewerAssignment, { adminUserId: ids.adminViewerUser, roleIds: [ids.adminViewerRole], assignedBy: ids.adminOpsUser, assignedAt: SEEDED_AT, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, 'local-showcase-v2'),
      document(ids.adminOpsAssignment, { adminUserId: ids.adminOpsUser, roleIds: [ids.adminOpsRole], assignedBy: ids.adminOpsUser, assignedAt: SEEDED_AT, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, 'local-showcase-v2')
    ]);

    await insertSyntheticDocuments(connection, 'requests', [document(ids.request, {
      type: 'contact',
      source: 'seeker',
      creatorId: ids.seekerUser,
      seekerId: ids.seekerUser,
      providerId: ids.user,
      propertyId: ids.propertyOne,
      status: 'under_review',
      payload: { message: 'Please share the available viewing times for this local preview listing.', propertyId: ids.propertyOne.toHexString(), locale: 'en' },
      version: 0,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT
    }, 'local-showcase-v2')]);
    await insertSyntheticDocuments(connection, 'viewings', [document(ids.viewing, {
      propertyId: ids.propertyOne.toHexString(),
      seekerId: ids.seekerUser,
      providerId: ids.user,
      status: 'requested',
      requestedAt: futureViewing,
      timezone: 'Africa/Cairo',
      note: 'Synthetic viewing request for local journey checks.',
      version: 0,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT
    }, 'local-showcase-v2')]);
    await insertSyntheticDocuments(connection, 'favorites', [
      document(ids.favorite, { seekerId: ids.seekerUser, propertyId: ids.propertyOne, savedAt: new Date('2026-01-15T12:00:00.000Z') }, 'local-showcase-v2'),
      document(ids.favoriteTwo, { seekerId: ids.seekerUser, propertyId: ids.propertyTwo, savedAt: new Date('2026-01-14T12:00:00.000Z') }, 'local-showcase-v2'),
      document(ids.favoriteThree, { seekerId: ids.seekerUser, propertyId: ids.propertyThree, savedAt: new Date('2026-01-13T12:00:00.000Z') }, 'local-showcase-v2'),
      document(ids.favoriteFour, { seekerId: ids.seekerUser, propertyId: ids.propertyFour, savedAt: new Date('2026-01-12T12:00:00.000Z') }, 'local-showcase-v2')
    ]);
    await insertSyntheticDocuments(connection, 'notifications', [document(ids.notification, {
      recipientId: ids.seekerUser,
      type: 'request.updated',
      title: localized('تم تحديث طلبك', 'Your request was updated'),
      message: localized('يمكنك مراجعة حالة الطلب من لوحة الباحث.', 'Review the request from your seeker dashboard.'),
      link: '/seeker/requests',
      readAt: null,
      audience: 'seeker',
      createdAt: SEEDED_AT
    }, 'local-showcase-v2')]);

    await insertSyntheticDocuments(connection, 'ad_requests', [document(ids.adRequest, {
      providerId: ids.brokerUser,
      placementKey: 'homepage.hero',
      purpose: 'Synthetic advertising workflow for local preview.',
      intervalStart,
      intervalEnd,
      status: 'waiting_payment',
      version: 1,
      history: [
        { status: 'review', version: 0, changedAt: SEEDED_AT },
        { status: 'waiting_payment', version: 1, reason: 'Synthetic quote accepted.', changedAt: SEEDED_AT }
      ],
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT
    }, 'local-showcase-v2')]);
    await insertSyntheticDocuments(connection, 'ad_quotes', [document(ids.adQuote, {
      requestId: ids.adRequest,
      providerId: ids.brokerUser,
      currency: 'EGP',
      lineItems: [{ description: 'Local preview homepage placement', quantity: 1, unitAmountMinor: 125_000 }],
      totalMinor: 125_000,
      validUntil: new Date('2026-09-18T20:00:00.000Z'),
      terms: 'Synthetic quote. It has no financial or publication value.',
      status: 'accepted',
      issuerId: ids.adminOpsUser,
      version: 1,
      decisionHistory: [{ action: 'accepted', actorId: ids.brokerUser, actorRole: 'provider', version: 1, createdAt: SEEDED_AT }],
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT
    }, 'local-showcase-v2')]);
    await insertSyntheticDocuments(connection, 'payment_proofs', [document(ids.paymentProof, {
      adRequestId: ids.adRequest,
      providerId: ids.brokerUser,
      originalFilename: 'local-preview-payment-proof.pdf',
      normalizedExtension: '.pdf',
      detectedMime: 'application/pdf',
      byteSize: 1_024,
      sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      version: 1,
      securityState: 'scan_pending',
      status: 'pending_review',
      reviewHistory: [],
      uploadedAt: SEEDED_AT,
      active: true,
      idempotentReplay: false,
      storageKey: 'local-preview/payment-proofs/670000000000000000000027.pdf'
    }, 'local-showcase-v2')]);

    const policyId = ids.commissionPolicy.toHexString();
    const adminId = ids.adminOpsUser.toHexString();
    const policyEffectiveAt = '2026-01-01T00:00:00.000Z';
    await insertSyntheticDocuments(connection, 'commission_policies', [document(ids.commissionPolicy, {
      id: policyId,
      key: 'local.default.provider',
      label: 'Local default provider commission',
      kind: 'percentage',
      scope: { kind: 'default' },
      percentageBps: 250,
      effectiveFrom: policyEffectiveAt,
      status: 'active',
      version: 1,
      createdBy: adminId,
      updatedBy: adminId,
      createdAt: policyEffectiveAt,
      updatedAt: policyEffectiveAt
    }, 'local-showcase-v2')]);
    await insertSyntheticDocuments(connection, 'commission_confirmations', [document(ids.commissionConfirmation, {
      id: ids.commissionConfirmation.toHexString(),
      accountId: ids.brokerUser.toHexString(),
      source: 'policy',
      sourceRecordId: policyId,
      policyVersion: 1,
      policyId,
      effectiveAt: policyEffectiveAt,
      status: 'acknowledged',
      acknowledgedAt: policyEffectiveAt,
      acknowledgedBy: ids.brokerUser.toHexString(),
      version: 0,
      createdAt: policyEffectiveAt,
      updatedAt: policyEffectiveAt
    }, 'local-showcase-v2')]);
    await insertSyntheticDocuments(connection, 'commission_snapshots', [document(ids.commissionSnapshot, {
      id: ids.commissionSnapshot.toHexString(),
      commercialEventId: `local-ad:${ids.adRequest.toHexString()}`,
      commercialEventStatus: 'approved',
      accountId: ids.brokerUser.toHexString(),
      approvedAt: policyEffectiveAt,
      capturedAt: policyEffectiveAt,
      resolution: {
        accountId: ids.brokerUser.toHexString(),
        source: 'policy',
        effectiveAt: policyEffectiveAt,
        sourceRecordId: policyId,
        sourceVersion: 1,
        policyId,
        kind: 'percentage',
        percentageBps: 250
      },
      createdAt: policyEffectiveAt
    }, 'local-showcase-v2')]);
  }
};

/**
 * Keeps the local/UAT public catalogue aligned with the approved Figma Public
 * screens. These are normal domain records (and therefore visible in the
 * corresponding dashboards), tagged synthetic only so they can never be
 * mistaken for production content.
 */
export const FIGMA_PUBLIC_CONTENT_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-content-v3',
  async run(connection) {
    const seedKey = 'figma-public-content-v3';
    const articleRows = [
      {
        id: '670000000000000000000071', slug: 'investment-opportunities-sadat', imageUrl: '/assets/canonical/public/article-investment.png',
        title: localized('أفضل فرص الاستثمار العقاري في مدينة السادات', 'Top real-estate investment opportunities in Sadat City'),
        body: localized('تعرف على المناطق الأسرع نمواً والعوامل التي تساعدك على اختيار استثمار عقاري ناجح طويل الأجل.', 'Explore the fastest-growing districts and the factors behind a successful long-term property investment.')
      },
      {
        id: '670000000000000000000072', slug: 'services-near-your-home', imageUrl: '/assets/canonical/public/article-services.png',
        title: localized('دليلك إلى أهم الخدمات بالقرب من عقارك', 'Your guide to essential services near your property'),
        body: localized('مقارنة عملية بين المدارس والمستشفيات والأسواق ووسائل الانتقال في أحياء مدينة السادات.', 'A practical comparison of schools, hospitals, markets, and transport across Sadat City districts.')
      }
    ];
    await insertSyntheticDocuments(connection, 'articles', articleRows.map((row) => document(new Types.ObjectId(row.id), {
      categoryId: ids.articleCategory,
      slug: row.slug,
      imageUrl: row.imageUrl,
      title: row.title,
      body: row.body,
      authorId: ids.user,
      status: 'published',
      publishedAt: SEEDED_AT,
      createdBy: ids.user,
      updatedBy: ids.user,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    }, seedKey)));

    const communityRows = [
      ['670000000000000000000073', 'تجربتي بعد سنة كاملة في الحي المتميز', 'انتقلت مع أسرتي منذ عام، والخدمات قريبة والهدوء ممتاز. هذه أهم الملاحظات التي قد تفيد المقبلين على السكن.'],
      ['670000000000000000000074', 'نصيحة مهمة لكل من يبحث عن شراء شقة', 'راجع مستندات الملكية والمرافق، وقارن السعر بالعقارات المشابهة قبل توقيع أي عقد أو دفع مقدم.'],
      ['670000000000000000000075', 'مطرح جديد ممتاز في الحي الأول', 'افتتح مطعم جديد مناسب للعائلات ويقدم خدمة جيدة وأسعاراً مناسبة. شاركونا تجاربكم.']
    ] as const;
    await insertSyntheticDocuments(connection, 'community_posts', communityRows.map(([id, title, body]) => document(new Types.ObjectId(id), {
      id,
      authorId: ids.user.toHexString(),
      title,
      body,
      status: 'published',
      createdAt: SEEDED_AT.toISOString(),
      updatedAt: SEEDED_AT.toISOString()
    }, seedKey)));

    await insertSyntheticDocuments(connection, 'cms_banners', [
      document(new Types.ObjectId('670000000000000000000076'), {
        key: 'city_banner',
        title: localized('كمبوند النخبة — الحي الأول', 'Elite Compound — First District'),
        eyebrow: localized('إعلان مميز', 'Featured ad'),
        body: localized('وحدات سكنية حديثة بتصميمات متنوعة وخدمات متكاملة في قلب مدينة السادات.', 'Modern homes with varied layouts and integrated services in the heart of Sadat City.'),
        highlight: localized('تبدأ من 1.2 مليون جنيه', 'Starting from EGP 1.2 million'),
        imageUrl: '/assets/canonical/public/banner-elite-compound-figma.png',
        targetUrl: '/properties/demo-open-view-apartment',
        order: 20,
        active: true,
        status: 'published',
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, seedKey)
    ]);

    const publicAssetUpdates = [
      ['organizations', ids.organization, { imageUrl: '/assets/canonical/public/developer-sadat.png' }],
      ['properties', ids.propertyOne, { imageUrl: '/assets/canonical/public/listing-property-home.png' }],
      ['properties', ids.propertyTwo, { imageUrl: '/assets/canonical/public/listing-property-duplex.png' }],
      ['properties', ids.propertyThree, { imageUrl: '/assets/canonical/public/listing-property-rental.png' }],
      ['articles', ids.article, { imageUrl: '/assets/canonical/public/article-buying-guide.png' }],
      ['cms_banners', ids.banner, {
        key: 'hero',
        title: localized('ابحث عن عقارك\nالآن في السادات', 'Find your property\nnow in Sadat City'),
        eyebrow: localized('بوابتك لعقارات مدينة السادات', 'Your Sadat City real-estate portal'),
        body: localized('منصة متكاملة لعقارات وخدمات مدينة السادات', 'An integrated platform for Sadat City properties and services'),
        highlight: localized('عقارات موثقة', 'Verified properties'),
        imageUrl: '/assets/canonical/public/home-hero-sadat-city.png',
        order: 0,
        active: true,
        status: 'published'
      }]
    ] as const;
    for (const [collectionName, id, fields] of publicAssetUpdates) {
      await connection.collection(collectionName).updateOne(
        { _id: id, synthetic: true },
        { $set: { ...fields, updatedAt: SEEDED_AT, seedKey } }
      );
    }
  }
};

/**
 * Repairs the local synthetic About intro when an older showcase seed has
 * already been applied. The copy is taken from the canonical Figma screen.
 */
export const FIGMA_PUBLIC_ABOUT_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-about-v1',
  async run(connection) {
    await connection.collection('cms_about_blocks').updateOne(
      { _id: ids.about, synthetic: true, key: 'about_intro' },
      { $set: {
        body: localized(
          'أنشأنا هذه المنصة لأن السوق العقاري في مدينة السادات يحتاج منصة متخصصة وموثوقة.',
          'We built this platform because Sadat City needs a specialized and trusted real-estate marketplace.'),
        seedKey: 'figma-public-about-v1',
        updatedAt: SEEDED_AT
      } }
    );
  }
};

export const FIGMA_PUBLIC_CATALOGUE_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-catalogue-v4',
  async run(connection) {
    const seedKey = 'figma-public-catalogue-v4';
    await connection.collection('cms_homepage_sections').updateOne(
      { _id: ids.homepageSection, synthetic: true },
      { $set: {
        title: localized('ابحث عن عقارك\nالآن في السادات', 'Find your property\nnow in Sadat City'),
        body: localized('منصة متكاملة لعقارات وخدمات مدينة السادات', 'An integrated platform for Sadat City properties and services'),
        seedKey,
        updatedAt: SEEDED_AT
      } }
    );
    for (const [id, imageUrl] of [
      [ids.catResidential, '/assets/canonical/public/category-all.png'],
      [ids.catCommercial, '/assets/canonical/public/category-full-commercial-building.png'],
      [ids.typeApartment, '/assets/canonical/public/category-room.png'],
      [ids.typeDuplex, '/assets/canonical/public/category-duplex.png'],
      [ids.typeVilla, '/assets/canonical/public/category-villa.png']
    ] as const) {
      await connection.collection('property_taxonomy').updateOne({ _id: id, synthetic: true }, { $set: { imageUrl, seedKey, updatedAt: SEEDED_AT } });
    }

    const companies = [
      ['670000000000000000000077', '670000000000000000000078', '670000000000000000000079', 'nile-real-estate-group', 'مجموعة النيل العقارية', 'Nile Real Estate Group', '/assets/canonical/public/developer-nile.png'],
      ['67000000000000000000007a', '67000000000000000000007b', '67000000000000000000007c', 'misr-el-gedida-housing', 'شركة مصر الجديدة للإسكان', 'Misr El Gedida Housing', '/assets/canonical/public/listing-provider-delta.png'],
      ['67000000000000000000007d', '67000000000000000000007e', '67000000000000000000007f', 'delta-real-estate-group', 'مجموعة الدلتا العقارية', 'Delta Real Estate Group', '/assets/canonical/public/listing-provider-hope.png']
    ] as const;
    await insertSyntheticDocuments(connection, 'users', companies.map(([userId], index) => document(new Types.ObjectId(userId), {
      normalizedEmail: `figma.provider.${index + 1}@example.invalid`,
      roleType: 'provider', status: 'verified', locale: 'ar', statusChangedAt: SEEDED_AT,
      createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
    }, seedKey)));
    await insertSyntheticDocuments(connection, 'provider_profiles', companies.map(([userId, profileId]) => document(new Types.ObjectId(profileId), {
      userId: new Types.ObjectId(userId), providerType: 'developer_company', status: 'approved',
      statusChangedAt: SEEDED_AT, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
    }, seedKey)));
    await insertSyntheticDocuments(connection, 'organizations', companies.map(([, profileId, organizationId, slug, ar, en, imageUrl]) => document(new Types.ObjectId(organizationId), {
      providerId: new Types.ObjectId(profileId), kind: 'developer_company', slug,
      name: localized(ar, en),
      description: localized('شركة تطوير عقاري معتمدة في مدينة السادات تقدم مشروعات سكنية وخدمات متكاملة.', 'An approved Sadat City developer offering residential projects and integrated services.'),
      imageUrl, status: 'approved', reviewedAt: SEEDED_AT, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
    }, seedKey)));
  }
};

export const FIGMA_PUBLIC_INTERACTIONS_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-interactions-v5',
  async run(connection) {
    const seedKey = 'figma-public-interactions-v5';
    const taxonomy = [
      ['670000000000000000000081', ids.catResidential, 'room', 'غرفة', 'Room', '/assets/canonical/public/category-room.png', 40],
      ['670000000000000000000082', ids.catResidential, 'roof', 'روف', 'Roof', '/assets/canonical/public/category-roof.png', 50],
      ['670000000000000000000083', ids.catCommercial, 'showrooms', 'صالات عرض', 'Showrooms', '/assets/canonical/public/category-showrooms.png', 60],
      ['670000000000000000000084', ids.catCommercial, 'full-commercial-building', 'مبنى تجاري كامل', 'Full commercial building', '/assets/canonical/public/category-full-commercial-building.png', 70]
    ] as const;
    await insertSyntheticDocuments(connection, 'property_taxonomy', taxonomy.map(([id, categoryId, slug, ar, en, imageUrl, order]) => document(new Types.ObjectId(id), {
      kind: 'type', categoryId, slug, name: localized(ar, en), imageUrl, order, active: true,
      createdBy: ids.user, updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
    }, seedKey)));

    const promotions = [
      ['670000000000000000000085', 'safwa_tower', 'برج الصفوة التجاري — المنطقة المركزية', 'Al Safwa Commercial Tower — Central Hub', 'مكاتب وعيادات ومحلات تجارية بمساحات متنوعة وتسهيلات سداد مرنة.', 'Offices, clinics, and retail spaces with flexible payment plans.', 'عائد استثماري يصل إلى 15%', 'ROI up to 15%', '/assets/canonical/public/category-full-commercial-building.png', 30],
      ['670000000000000000000086', 'palm_oasis', 'واحة النخيل السكنية — الحي الخامس', 'Palm Oasis Residential — Fifth District', 'تاون هاوس وفيلات مستقلة بتصميم عصري ومساحات خضراء واسعة.', 'Townhouses and standalone villas with modern design and spacious green areas.', 'مساحات تبدأ من 220 م²', 'Sizes from 220 sqm', '/assets/canonical/public/category-villa.png', 40]
    ] as const;
    await insertSyntheticDocuments(connection, 'cms_banners', promotions.map(([id, key, titleAr, titleEn, bodyAr, bodyEn, highlightAr, highlightEn, imageUrl, order]) => document(new Types.ObjectId(id), {
      key, title: localized(titleAr, titleEn), eyebrow: localized('إعلان مميز', 'Featured ad'),
      body: localized(bodyAr, bodyEn), highlight: localized(highlightAr, highlightEn), imageUrl,
      targetUrl: '/properties', order, active: true, status: 'published', createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
    }, seedKey)));
  }
};

/**
 * Completes the published property fixture after the original showcase seed.
 * This is a separate, idempotent step so environments that already applied
 * local-showcase-v1 can receive the public details contract safely.
 */
export const FIGMA_PUBLIC_DETAILS_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-details-v9',
  async run(connection) {
    const seedKey = 'figma-public-details-v9' as const;
    const featureRows = [
      ['670000000000000000000092', 'private-garden', 'حديقة خاصة', 'Private garden', 'exterior'],
      ['670000000000000000000093', 'private-entrance', 'مدخل خاص', 'Private entrance', 'exterior'],
      ['670000000000000000000094', 'landscaped-garden', 'حدائق منسقة', 'Landscaped gardens', 'exterior'],
      ['670000000000000000000095', 'flexible-payment', 'أنظمة سداد مرنة', 'Flexible payment plans', 'payment'],
      ['670000000000000000000096', 'ultra-finish', 'تشطيب فاخر', 'Premium finishing', 'finishing'],
      ['670000000000000000000097', 'balcony', 'شرفة واسعة', 'Spacious balcony', 'interior'],
      ['670000000000000000000098', 'private-parking', 'جراج خاص', 'Private parking', 'building'],
      ['670000000000000000000099', 'security', 'أمن وحراسة', 'Security and guarding', 'building'],
      ['67000000000000000000009a', 'elevator', 'مصعد', 'Elevator', 'building'],
      ['67000000000000000000009b', 'clubhouse', 'نادي اجتماعي', 'Clubhouse', 'community'],
      ['67000000000000000000009c', 'smart-home', 'تجهيزات منزل ذكي', 'Smart-home provisions', 'interior'],
      ['67000000000000000000009d', 'natural-light', 'إضاءة طبيعية', 'Natural light', 'interior'],
      ['67000000000000000000009e', 'maid-room', 'غرفة للخادمة', 'Maid room', 'layout'],
      ['67000000000000000000009f', 'verified-documents', 'مستندات موثقة', 'Verified documents', 'trust'],
      ['6700000000000000000000a0', 'family-friendly', 'مناسب للعائلات', 'Family-friendly layout', 'layout']
    ] as const;
    const serviceRows = [
      ['6700000000000000000000a1', 'schools', 'مدارس قريبة', 'Nearby schools', 'education', '5 دقائق', '5 min'],
      ['6700000000000000000000a2', 'retail-mall', 'مول تجاري', 'Retail mall', 'shopping', '8 دقائق', '8 min'],
      ['6700000000000000000000a3', 'hospital', 'مستشفى', 'Hospital', 'healthcare', '10 دقائق', '10 min'],
      ['6700000000000000000000a4', 'public-transport', 'مواصلات عامة', 'Public transport', 'transport', '4 دقائق', '4 min'],
      ['6700000000000000000000a5', 'mosque', 'مسجد', 'Mosque', 'community', '3 دقائق', '3 min'],
      ['6700000000000000000000a6', 'restaurants', 'مطاعم وكافيهات', 'Restaurants and cafés', 'dining', '6 دقائق', '6 min']
    ] as const;
    await insertSyntheticDocuments(connection, 'features_services', [
      ...featureRows.map(([id, slug, ar, en, groupKey], order) => document(new Types.ObjectId(id), {
        kind: 'feature', groupKey, name: localized(ar, en), slug, order, active: true,
        createdBy: ids.user, updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
      }, seedKey)),
      ...serviceRows.map(([id, slug, ar, en, groupKey, distanceAr, distanceEn], order) => document(new Types.ObjectId(id), {
        kind: 'service', groupKey, name: localized(ar, en), detail: localized('بالقرب من العقار', 'Close to the property'), distanceLabel: localized(distanceAr, distanceEn), slug, order, active: true,
        createdBy: ids.user, updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
      }, seedKey))
    ]);

    await insertSyntheticDocuments(connection, 'property_media', [document(new Types.ObjectId('670000000000000000000091'), {
      propertyId: ids.propertyTwo,
      providerId: ids.providerProfile,
      kind: 'image',
      imageUrl: '/assets/figma/public/PUB-03/raw-02.jpg',
      originalFilename: 'demo-garden-duplex-cover.jpg',
      declaredMime: 'image/jpeg',
      detectedMime: 'image/jpeg',
      byteSize: 1,
      sha256: 'a'.repeat(64),
      storageKey: `public/${'a'.repeat(32)}`,
      sortOrder: 0,
      isCover: true,
      processingState: 'ready',
      active: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    }, seedKey)]);
    await connection.collection('property_media').updateOne(
      { _id: new Types.ObjectId('670000000000000000000091'), synthetic: true },
      { $set: {
        imageUrl: '/assets/figma/public/PUB-03/raw-02.jpg',
        originalFilename: 'demo-garden-duplex-cover.jpg',
        declaredMime: 'image/jpeg',
        detectedMime: 'image/jpeg',
        seedKey,
        updatedAt: SEEDED_AT
      } }
    );

    await connection.collection('properties').updateOne(
      { _id: ids.propertyTwo, synthetic: true },
      { $set: {
        featureIds: featureRows.map(([id]) => new Types.ObjectId(id)),
        serviceIds: serviceRows.map(([id]) => new Types.ObjectId(id)),
        seedKey,
        updatedAt: SEEDED_AT
      } }
    );
  }
};

export const AUTH_BUYER_SEED_STEP: DevelopmentSeedStep = {
  id: 'auth-buyer-v6',
  async run(connection) {
    await insertSyntheticDocuments(connection, 'users', [document(ids.buyerUser, {
      normalizedEmail: 'buyer.demo@example.invalid', roleType: 'seeker', status: 'verified', locale: 'ar',
      statusChangedAt: SEEDED_AT, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
    }, 'auth-buyer-v6')]);
    await insertSyntheticDocuments(connection, 'seeker_profiles', [document(ids.buyerProfile, {
      userId: ids.buyerUser, firstName: 'مشتري', lastName: 'تجريبي',
      preferences: { propertyTypes: ['apartment', 'villa'], locations: [ids.location.toHexString()], purpose: 'buy', minPrice: 1_500_000, maxPrice: 6_000_000, minArea: 100, maxArea: 200, bedroomsMin: 2, bedroomsMax: 5, paymentMethod: 'any' },
      createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
    }, 'auth-buyer-v6')]);
  }
};

export const FIGMA_PUBLIC_LISTING_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-listing-v10',
  async run(connection) {
    const seedKey = 'figma-public-listing-v10' as const;
    const common = {
      providerId: ids.providerProfile,
      sourceType: 'developer_company',
      organizationId: ids.organization,
      kind: 'property',
      projectId: ids.project,
      locationId: ids.location,
      coordinates: { type: 'Point', coordinates: [30.5065, 30.3676] },
      mapUrl: 'https://maps.google.com/?q=30.5065,30.3676',
      status: 'published',
      deliveryStatus: 'ready_to_move',
      active: true,
      submittedAt: SEEDED_AT,
      reviewedAt: SEEDED_AT,
      publishedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    } as const;
    await insertSyntheticDocuments(connection, 'properties', [
      document(ids.propertyFour, {
        ...common,
        propertyTypeId: ids.typeVilla,
        transactionType: 'sale',
        imageUrl: '/assets/canonical/public/listing-property-villa.png',
        publicCode: 'SDT-0892',
        viewCount: 512,
        featured: true,
        paymentPlans: [{ label: localized('تقسيط متاح', 'Installments available'), months: 60 }],
        name: localized('فيلا مستقلة بالمنطقة الراقية', 'Independent villa in the upscale district'),
        slug: 'demo-upscale-villa',
        description: localized('فيلا مستقلة بحديقة خاصة وتشطيب كامل في مدينة السادات.', 'Independent villa with a private garden and complete finishing in Sadat City.'),
        area: { value: 320, unit: 'sqm' },
        layout: { bedrooms: 5, bathrooms: 4, floor: 0, totalFloors: 2 },
        price: { amount: 5_200_000, currency: 'EGP' }
      }, seedKey),
      document(ids.propertyFive, {
        ...common,
        propertyTypeId: new Types.ObjectId('670000000000000000000084'),
        transactionType: 'sale',
        imageUrl: '/assets/canonical/public/listing-property-office.png',
        publicCode: 'SDT-0715',
        viewCount: 198,
        paymentPlans: [{ label: localized('تقسيط متاح', 'Installments available'), months: 36 }],
        name: localized('مكتب إداري في المنطقة المركزية', 'Administrative office in the central district'),
        slug: 'demo-central-office',
        description: localized('مكتب إداري جاهز للعمل بالقرب من الخدمات الرئيسية.', 'A ready-to-use office close to the main services.'),
        area: { value: 95, unit: 'sqm' },
        layout: { bedrooms: 0, bathrooms: 1, floor: 4, totalFloors: 8 },
        price: { amount: 1_850_000, currency: 'EGP' }
      }, seedKey),
      document(ids.propertySix, {
        ...common,
        propertyTypeId: new Types.ObjectId('670000000000000000000082'),
        transactionType: 'sale',
        deliveryStatus: 'under_construction',
        imageUrl: '/assets/canonical/public/listing-property-land.png',
        publicCode: 'SDT-0641',
        viewCount: 156,
        paymentPlans: [],
        name: localized('قطعة أرض سكنية مميزة', 'Prime residential land plot'),
        slug: 'demo-residential-land',
        description: localized('قطعة أرض سكنية في موقع مميز وقريبة من المحاور الرئيسية.', 'A residential plot in a prime location near the main roads.'),
        area: { value: 420, unit: 'sqm' },
        layout: { bedrooms: 0, bathrooms: 0, floor: 0 },
        price: { amount: 1_300_000, currency: 'EGP' }
      }, seedKey)
    ]);
  }
};

export const FIGMA_PUBLIC_PARITY_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-parity-v12',
  async run(connection) {
    const seedKey = 'figma-public-parity-v12' as const;
    await insertSyntheticDocuments(connection, 'locations', ([
      ['locationFirst', 'first-district', 'الحي الأول', 'First District', 21],
      ['locationUpscale', 'upscale-district', 'المنطقة الراقية', 'Upscale District', 22],
      ['locationSeventh', 'seventh-district', 'الحي السابع', 'Seventh District', 23],
      ['locationThird', 'third-district', 'الحي الثالث', 'Third District', 24],
      ['locationIndustrial', 'industrial-district', 'المنطقة الصناعية', 'Industrial District', 25],
      ['locationFifth', 'fifth-district', 'الحي الخامس', 'Fifth District', 26]
    ] as const).map(([key, slug, ar, en, order]) => document(ids[key as keyof typeof ids] as Types.ObjectId, {
      kind: 'neighborhood', name: localized(ar, en), slug, parentLocationId: ids.location, order: Number(order), active: true,
      createdBy: ids.user, updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
    }, seedKey)));
    await insertSyntheticDocuments(connection, 'organizations', [
      document(ids.sourceAhmedOrganization, {
        providerId: ids.officeProfile, kind: 'brokerage_office', slug: 'ahmed-hassan-brokerage',
        name: localized('أحمد حسن', 'Ahmed Hassan'),
        description: localized('وسيط عقاري معتمد في مدينة السادات.', 'An approved real-estate broker in Sadat City.'),
        imageUrl: '/assets/canonical/public/listing-provider-ahmed.png', status: 'approved', reviewedAt: SEEDED_AT,
        createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
      }, seedKey),
      document(ids.sourceHopeOrganization, {
        providerId: ids.brokerProfile, kind: 'brokerage_office', slug: 'hope-real-estate-office',
        name: localized('مكتب الأمل العقاري', 'Hope Real Estate Office'),
        description: localized('مكتب وساطة عقارية معتمد في مدينة السادات.', 'An approved real-estate brokerage office in Sadat City.'),
        imageUrl: '/assets/canonical/public/listing-provider-hope.png', status: 'approved', reviewedAt: SEEDED_AT,
        createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
      }, seedKey)
    ]);
    await insertSyntheticDocuments(connection, 'property_taxonomy', [
      document(ids.typeLand, { kind: 'type', categoryId: ids.catResidential, slug: 'land', name: localized('أرض', 'Land'), imageUrl: '/assets/canonical/public/category-all.png', order: 40, active: true, createdBy: ids.user, updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, seedKey),
      document(ids.typeOffice, { kind: 'type', categoryId: ids.catCommercial, slug: 'offices', name: localized('مكتب', 'Office'), imageUrl: '/assets/canonical/public/category-showrooms.png', order: 50, active: true, createdBy: ids.user, updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0 }, seedKey)
    ]);
    await connection.collection('property_taxonomy').updateOne({ _id: ids.typeApartment, synthetic: true }, { $set: { slug: 'apartments', name: localized('شقة', 'Apartment'), imageUrl: '/assets/canonical/public/category-all.png', seedKey, updatedAt: SEEDED_AT } });
    await connection.collection('property_taxonomy').updateOne({ _id: ids.typeVilla, synthetic: true }, { $set: { name: localized('فيلا', 'Villa'), seedKey, updatedAt: SEEDED_AT } });
    const propertyUpdates = [
      [ids.propertyOne, { kind: 'property', propertyTypeId: ids.typeApartment, transactionType: 'sale', providerId: ids.providerProfile, organizationId: ids.organization, locationId: ids.locationFirst, imageUrl: '/assets/canonical/public/listing-property-home.png', publicCode: 'SDT-1234', viewCount: 342, featured: true, featuredOrder: 10, paymentPlans: [{ label: localized('تقسيط متاح', 'Installments available'), months: 60 }], name: localized('شقة فاخرة في الحي الأول', 'Luxury apartment in the First District'), area: { value: 145, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 1, totalFloors: 8 }, price: { amount: 1_900_000, currency: 'EGP' }, publishedAt: new Date('2026-01-15T12:05:00.000Z') }],
      [ids.propertyFour, { kind: 'property', propertyTypeId: ids.typeVilla, transactionType: 'sale', providerId: new Types.ObjectId('670000000000000000000078'), organizationId: new Types.ObjectId('670000000000000000000079'), locationId: ids.locationUpscale, imageUrl: '/assets/canonical/public/listing-property-villa.png', publicCode: 'SDT-0892', viewCount: 512, featured: true, featuredOrder: 20, paymentPlans: [{ label: localized('تقسيط متاح', 'Installments available'), months: 60 }], name: localized('فيلا مستقلة بالمنطقة الراقية', 'Independent villa in the upscale district'), area: { value: 320, unit: 'sqm' }, layout: { bedrooms: 5, bathrooms: 4, floor: 2, totalFloors: 2 }, price: { amount: 5_200_000, currency: 'EGP' }, publishedAt: new Date('2026-01-15T12:04:00.000Z') }],
      [ids.propertySix, { kind: 'property', propertyTypeId: ids.typeLand, transactionType: 'sale', providerId: ids.brokerProfile, organizationId: ids.sourceHopeOrganization, locationId: ids.locationSeventh, imageUrl: '/assets/canonical/public/listing-property-land.png', publicCode: 'SDT-0456', viewCount: 189, featured: false, paymentPlans: [], name: localized('أرض سكنية في الحي السابع', 'Residential land in the Seventh District'), area: { value: 400, unit: 'sqm' }, layout: { bedrooms: 0, bathrooms: 0, floor: 0 }, price: { amount: 780_000, currency: 'EGP' }, publishedAt: new Date('2026-01-15T12:03:00.000Z') }],
      [ids.propertyThree, { kind: 'unit', propertyTypeId: ids.typeApartment, transactionType: 'rent', providerId: ids.officeProfile, organizationId: ids.sourceAhmedOrganization, locationId: ids.locationThird, imageUrl: '/assets/canonical/public/listing-property-rental.png', publicCode: 'SDT-0234', viewCount: 267, featured: false, paymentPlans: [], name: localized('شقة للإيجار في الحي الثالث', 'Rental apartment in the Third District'), area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 2, bathrooms: 2, floor: 3, totalFloors: 6 }, price: { amount: 8_500, currency: 'EGP' }, publishedAt: new Date('2026-01-15T12:02:00.000Z') }],
      [ids.propertyFive, { kind: 'unit', propertyTypeId: ids.typeOffice, transactionType: 'rent', providerId: new Types.ObjectId('67000000000000000000007e'), organizationId: new Types.ObjectId('67000000000000000000007f'), locationId: ids.locationIndustrial, imageUrl: '/assets/canonical/public/listing-property-office.png', publicCode: 'SDT-0789', viewCount: 134, featured: false, paymentPlans: [], name: localized('مكتب تجاري في المنطقة الصناعية', 'Commercial office in the Industrial District'), area: { value: 200, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 1, totalFloors: 8 }, price: { amount: 12_000, currency: 'EGP' }, publishedAt: new Date('2026-01-15T12:01:00.000Z') }],
      [ids.propertyTwo, { kind: 'property', propertyTypeId: ids.typeDuplex, transactionType: 'sale', providerId: ids.providerProfile, organizationId: ids.organization, locationId: ids.locationFifth, imageUrl: '/assets/canonical/public/listing-property-duplex.png', publicCode: 'SDT-0567', viewCount: 423, featured: true, featuredOrder: 30, paymentPlans: [{ label: localized('تقسيط متاح', 'Installments available'), months: 60 }], name: localized('دوبلكس فاخر في الحي الخامس', 'Luxury duplex in the Fifth District'), area: { value: 240, unit: 'sqm' }, layout: { bedrooms: 4, bathrooms: 3 }, price: { amount: 3_100_000, currency: 'EGP' }, publishedAt: new Date('2026-01-15T12:00:00.000Z') }]
    ] as const;
    for (const [propertyId, fields] of propertyUpdates) {
      await connection.collection('properties').updateOne({ _id: propertyId, synthetic: true }, { $set: { ...fields, status: 'published', deliveryStatus: 'ready_to_move', active: true, seedKey, updatedAt: SEEDED_AT } });
    }
  }
};

/**
 * Completes the apartment details showcase used by the canonical property
 * details frame. The listing parity step intentionally keeps the catalog
 * projection small; this follow-up adds the detail-only media and amenity
 * relationships without changing the public list payload.
 */
export const FIGMA_PUBLIC_DETAILS_PARITY_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-details-v13',
  async run(connection) {
    const seedKey = 'figma-public-details-v13' as const;
    const featureRows = [
      ['6700000000000000000000b0', 'corner-lot', '\u0646\u0627\u0635\u064a\u0629', 'Corner lot', 'property_feature'],
      ['6700000000000000000000b1', 'main-road', '\u0634\u0627\u0631\u0639 \u0631\u0626\u064a\u0633\u064a', 'Main road', 'property_feature'],
      ['6700000000000000000000b2', 'apartment-private-entrance', '\u0645\u062f\u062e\u0644 \u062e\u0627\u0635', 'Private entrance', 'property_feature'],
      ['6700000000000000000000b3', 'full-meters', '\u0639\u062f\u0627\u062f\u0627\u062a \u0643\u0627\u0645\u0644\u0629', 'Full utility meters', 'property_feature'],
      ['6700000000000000000000b4', 'super-lux-finish', '\u062a\u0634\u0637\u064a\u0628 \u0641\u0627\u062e\u0631', 'Premium finishing', 'finishing'],
      ['6700000000000000000000b5', 'ready-to-move', '\u062c\u0627\u0647\u0632 \u0644\u0644\u0627\u0633\u062a\u0644\u0627\u0645', 'Ready to move', 'property_feature'],
      ['6700000000000000000000b6', 'installment-available', '\u0642\u0627\u0628\u0644 \u0644\u0644\u062a\u0642\u0633\u064a\u0637', 'Installment available', 'property_feature'],
      ['6700000000000000000000b7', 'investment-friendly', '\u0645\u0646\u0627\u0633\u0628 \u0644\u0644\u0627\u0633\u062a\u062b\u0645\u0627\u0631', 'Investment friendly', 'property_feature'],
      ['6700000000000000000000b8', 'quiet-area', '\u0645\u0646\u0637\u0642\u0629 \u0647\u0627\u062f\u0626\u0629', 'Quiet area', 'property_feature'],
      ['6700000000000000000000b9', 'parking', '\u0645\u0648\u0642\u0641 \u0633\u064a\u0627\u0631\u0627\u062a', 'Parking', 'property_feature'],
      ['6700000000000000000000ba', 'apartment-elevator', '\u0645\u0635\u0639\u062f', 'Elevator', 'property_feature'],
      ['6700000000000000000000bb', 'apartment-private-garden', '\u062d\u062f\u064a\u0642\u0629 \u062e\u0627\u0635\u0629', 'Private garden', 'property_feature'],
      ['6700000000000000000000bc', 'terrace', '\u062a\u0631\u0627\u0633', 'Terrace', 'property_feature'],
      ['6700000000000000000000bd', 'apartment-security', '\u0623\u0645\u0646 \u0648\u062d\u0631\u0627\u0633\u0629', 'Security and guarding', 'property_feature']
    ] as const;
    const serviceRows = [
      ['6700000000000000000000c8', 'apartment-schools', '\u0645\u062c\u0645\u0639 \u0627\u0644\u0645\u062f\u0627\u0631\u0633', '\u0645\u062f\u0627\u0631\u0633 \u062d\u0643\u0648\u0645\u064a\u0629 \u0648\u062e\u0627\u0635\u0629', '5 \u062f\u0642\u0627\u0626\u0642', 'Schools complex', 'Government and private schools', '5 min'],
      ['6700000000000000000000c9', 'apartment-retail-market', '\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u062a\u062c\u0627\u0631\u064a', '\u0628\u062c\u0648\u0627\u0631 \u0627\u0644\u0645\u062c\u0645\u0639 \u0627\u0644\u062a\u062c\u0627\u0631\u064a \u0627\u0644\u0631\u0626\u064a\u0633\u064a', '700 \u0645\u062a\u0631', 'Retail market', 'Next to the main retail mall', '700 m'],
      ['6700000000000000000000ca', 'apartment-central-hospital', '\u0627\u0644\u0645\u0633\u062a\u0634\u0641\u0649 \u0627\u0644\u0645\u0631\u0643\u0632\u064a', '\u062e\u062f\u0645\u0629 \u0637\u0648\u0627\u0631\u0626 24 \u0633\u0627\u0639\u0629', '8 \u062f\u0642\u0627\u0626\u0642', 'Central hospital', '24-hour emergency service', '8 min'],
      ['6700000000000000000000cb', 'apartment-regional-road', '\u0627\u0644\u0637\u0631\u064a\u0642 \u0627\u0644\u0625\u0642\u0644\u064a\u0645\u064a', '\u0631\u0628\u0637 \u0628\u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0648\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629', '10 \u062f\u0642\u0627\u0626\u0642', 'Regional road', 'Direct Cairo and Alexandria connection', '10 min'],
      ['6700000000000000000000cc', 'apartment-transport-stop', '\u0645\u0648\u0642\u0641 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062a', '\u062e\u0637\u0648\u0637 \u0645\u0646\u062a\u0638\u0645\u0629 \u0644\u0644\u062d\u064a \u0648\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629', '3 \u062f\u0642\u0627\u0626\u0642', 'Transport stop', 'Regular district and main-route lines', '3 min'],
      ['6700000000000000000000cd', 'apartment-neighborhood-mosque', '\u0645\u0633\u062c\u062f \u0627\u0644\u062d\u064a', '\u062c\u0627\u0645\u0639', '4 \u062f\u0642\u0627\u0626\u0642', 'Neighborhood mosque', 'Mosque', '4 min']
    ] as const;
    await insertSyntheticDocuments(connection, 'features_services', [
      ...featureRows.map(([id, slug, ar, en, groupKey], order) => document(new Types.ObjectId(id), {
        kind: 'feature', groupKey, name: localized(ar, en), ...(slug === 'super-lux-finish' ? { detail: localized('\u0633\u0648\u0628\u0631 \u0644\u0648\u0643\u0633', 'Super lux') } : {}), slug, order, active: true,
        createdBy: ids.user, updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
      }, seedKey)),
      ...serviceRows.map(([id, slug, ar, detailAr, distanceAr, en, detailEn, distanceEn], order) => document(new Types.ObjectId(id), {
        kind: 'service', groupKey: 'nearby', name: localized(ar, en), detail: localized(detailAr, detailEn), distanceLabel: localized(distanceAr, distanceEn), slug, order, active: true,
        createdBy: ids.user, updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT, version: 0
      }, seedKey))
    ]);
    await insertSyntheticDocuments(connection, 'property_media', [document(new Types.ObjectId('6700000000000000000000ce'), {
      propertyId: ids.propertyOne,
      providerId: ids.providerProfile,
      kind: 'image',
      imageUrl: '/assets/canonical/public/listing-property-home.png',
      originalFilename: 'demo-open-view-apartment-cover.png',
      declaredMime: 'image/png',
      detectedMime: 'image/png',
      byteSize: 1,
      sha256: 'c'.repeat(64),
      storageKey: `public/${'c'.repeat(32)}`,
      sortOrder: 0,
      isCover: true,
      processingState: 'ready',
      active: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    }, seedKey)]);
    await connection.collection('properties').updateOne(
      { _id: ids.propertyOne, synthetic: true },
      { $set: {
        featureIds: featureRows.map(([id]) => new Types.ObjectId(id)),
        serviceIds: serviceRows.map(([id]) => new Types.ObjectId(id)),
        layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 8 },
        seedKey,
        updatedAt: SEEDED_AT
      } }
    );
  }
};

/**
 * Keeps source-only brokerages out of the public developer directory and adds
 * the editorial directory records used by the canonical public frame.
 */
export const FIGMA_PUBLIC_DIRECTORY_PARITY_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-directory-v14',
  async run(connection) {
    const seedKey = 'figma-public-directory-v14' as const;
    await insertSyntheticDocuments(connection, 'organizations', [
      document(ids.directoryAsOrganization, {
        providerId: ids.providerProfile,
        kind: 'developer_company',
        slug: 'as-real-estate-development',
        name: localized('\u0634\u0631\u0643\u0629 AS \u0644\u0644\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064a', 'AS Real Estate Development'),
        description: localized('\u0634\u0631\u0643\u0629 \u0631\u0627\u0626\u062f\u0629 \u0641\u064a \u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a \u0628\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0645\u0646\u0630 \u0623\u0643\u062b\u0631 \u0645\u0646 15 \u0639\u0627\u0645\u0627\u064b. \u062a\u0639\u0645\u0644 \u0627\u0644\u0634\u0631\u0643\u0629 \u0641\u064a \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0628\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0645\u0646\u0630 \u0639\u0627\u0645 2008\u060c \u0628\u062e\u0628\u0631\u0629 \u062a\u0645\u062a\u062f \u0644\u0623\u0643\u062b\u0631 \u0645\u0646 18 \u0639\u0627\u0645\u0627\u064b.', 'A leading Sadat City real-estate developer for more than 15 years. The company has operated in Sadat City since 2008, with more than 18 years of experience.'),
        imageUrl: '/assets/clone/pub05-a.png',
        logoUrl: '/assets/clone/pub05-b.png',
        locations: [
          localized('\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629', 'Upscale District'),
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633', 'Fifth District'),
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644', 'First District')
        ],
        directoryOrder: 10,
        directoryVisible: true,
        status: 'approved',
        reviewedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, seedKey)
    ]);
    const updates: readonly [Types.ObjectId, Record<string, unknown>][] = [
      [ids.organization, { directoryVisible: false }],
      [ids.sourceAhmedOrganization, { directoryVisible: false }],
      [ids.sourceHopeOrganization, { directoryVisible: false }],
      [ids.sourceNileOrganization, {
        directoryVisible: true,
        directoryOrder: 20,
        imageUrl: '/assets/clone/pub05-c.png',
        logoUrl: '/assets/clone/pub05-d.png',
        name: localized('\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u0646\u064a\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u064a\u0629', 'Nile Real Estate Group'),
        description: localized('\u0645\u062c\u0645\u0648\u0639\u0629 \u0639\u0642\u0627\u0631\u064a\u0629 \u0645\u062a\u0643\u0627\u0645\u0644\u0629 \u062a\u062a\u0645\u064a\u0632 \u0628\u0645\u0634\u0627\u0631\u064a\u0639\u0647\u0627 \u0627\u0644\u0641\u0627\u062e\u0631\u0629 \u0648\u062e\u062f\u0645\u0629 \u0645\u0627 \u0628\u0639\u062f \u0627\u0644\u0628\u064a\u0639.', 'An integrated real-estate group known for luxury projects and after-sales service.'),
        locations: [
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u0633\u0627\u0628\u0639', 'Seventh District'),
          localized('\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629', 'Upscale District')
        ]
      }],
      [ids.sourceMisrOrganization, {
        directoryVisible: true,
        directoryOrder: 30,
        kind: 'brokerage_office',
        imageUrl: '/assets/clone/pub05-e.png',
        logoUrl: '/assets/clone/pub05-f.png',
        name: localized('\u0634\u0631\u0643\u0629 \u0645\u0635\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0644\u0644\u0625\u0633\u0643\u0627\u0646', 'Misr El Gedida Housing'),
        description: localized('\u0634\u0631\u0643\u0629 \u0645\u062a\u062e\u0635\u0635\u0629 \u0641\u064a \u0627\u0644\u0625\u0633\u0643\u0627\u0646 \u0627\u0644\u0645\u062a\u0648\u0633\u0637 \u0648\u0627\u0644\u0631\u0627\u0642\u064a \u0628\u0623\u0633\u0639\u0627\u0631 \u062a\u0646\u0627\u0641\u0633\u064a\u0629.', 'A specialist in mid-market and premium housing at competitive prices.'),
        locations: [
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633', 'Fifth District'),
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u062b\u0627\u0644\u062b', 'Third District')
        ]
      }],
      [ids.sourceDeltaOrganization, {
        directoryVisible: true,
        directoryOrder: 40,
        imageUrl: '/assets/clone/pub05-g.png',
        logoUrl: '/assets/clone/pub05-f.png',
        name: localized('\u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u062f\u0644\u062a\u0627 \u0627\u0644\u0639\u0642\u0627\u0631\u064a\u0629', 'Delta Real Estate Group'),
        description: localized('\u062e\u0628\u0631\u0629 20 \u0639\u0627\u0645\u0627\u064b \u0641\u064a \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0627\u0644\u0645\u0635\u0631\u064a.', 'Twenty years of experience in the Egyptian real-estate market.'),
        locations: [
          localized('\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629', 'Upscale District'),
          localized('\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0635\u0646\u0627\u0639\u064a\u0629', 'Industrial District')
        ]
      }]
    ];
    for (const [organizationId, fields] of updates) {
      await connection.collection('organizations').updateOne(
        { _id: organizationId },
        { $set: { ...fields, seedKey, updatedAt: SEEDED_AT } }
      );
    }
  }
};

/**
 * Provides the isolated approved-builder profile used by the canonical
 * profile frame. Its project cards are embedded so they do not leak into the
 * public property catalogue used by the listing screens.
 */
export const FIGMA_PUBLIC_PROFILE_PARITY_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-profile-v15',
  async run(connection) {
    const seedKey = 'figma-public-profile-v15' as const;
    await insertSyntheticDocuments(connection, 'organizations', [
      document(ids.directoryProfileOrganization, {
        providerId: ids.providerProfile,
        kind: 'developer_company',
        slug: 'approved-builder',
        name: localized('\u0634\u0631\u0643\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0644\u0644\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064a', 'Sadat Real Estate Development'),
        description: localized('\u0634\u0631\u0643\u0629 \u0631\u0627\u0626\u062f\u0629 \u0641\u064a \u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a \u0628\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0645\u0646\u0630 \u0623\u0643\u062b\u0631 \u0645\u0646 15 \u0639\u0627\u0645\u0627\u064b.', 'A leading Sadat City real-estate developer for more than 15 years.'),
        imageUrl: '/assets/clone/pub05-a.png',
        logoUrl: '/assets/clone/pub05-b.png',
        locations: [
          localized('\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629', 'Upscale District'),
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633', 'Fifth District'),
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644', 'First District')
        ],
        activeAreas: [
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644', 'First District'),
          localized('\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633', 'Fifth District'),
          localized('\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0631\u0627\u0642\u064a\u0629', 'Upscale District')
        ],
        projectTypes: [
          localized('\u0633\u0643\u0646\u064a', 'Residential'),
          localized('\u062a\u062c\u0627\u0631\u064a', 'Commercial'),
          localized('\u0625\u062f\u0627\u0631\u064a', 'Administrative')
        ],
        propertyTypes: [
          localized('\u0634\u0642\u0642', 'Apartments'),
          localized('\u0641\u064a\u0644\u0627\u062a', 'Villas'),
          localized('\u062f\u0648\u0628\u0644\u0643\u0633', 'Duplexes'),
          localized('\u0645\u062d\u0644\u0627\u062a', 'Retail'),
          localized('\u0645\u0643\u0627\u062a\u0628', 'Offices')
        ],
        paymentPlans: [
          localized('\u0646\u0642\u062f\u064a', 'Cash'),
          localized('\u0645\u0642\u062f\u0645 \u062a\u0642\u0633\u064a\u0637', 'Down payment'),
          localized('\u0623\u0642\u0633\u0627\u0637 \u0634\u0647\u0631\u064a\u0629', 'Monthly installments'),
          localized('\u0623\u0642\u0633\u0627\u0637 \u0633\u0646\u0648\u064a\u0629', 'Annual installments')
        ],
        totalUnits: 128,
        availableUnits: 72,
        soldUnits: 38,
        reservedUnits: 18,
        activeAreaCount: 3,
        lastUpdated: '\u064a\u0648\u0646\u064a\u0648 2026',
        contactPhone: '01001234567',
        whatsappUrl: 'https://wa.me/201001234567',
        contactAddress: '\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a\u060c \u0645\u0635\u0631',
        profileProjects: [
          {
            _id: new Types.ObjectId('6700000000000000000000dc'),
            slug: 'sadat-residential-towers',
            imageUrl: '/assets/clone/pub05-e.png',
            name: localized('\u0623\u0628\u0631\u0627\u062c \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0627\u0644\u0633\u0643\u0646\u064a\u0629', 'Sadat Residential Towers'),
            description: localized('\u0623\u0628\u0631\u0627\u062c \u0633\u0643\u0646\u064a\u0629 \u0645\u062a\u0643\u0627\u0645\u0644\u0629 \u062a\u0636\u0645 \u0648\u062d\u062f\u0627\u062a \u0633\u0643\u0646\u064a\u0629 \u0645\u062a\u0646\u0648\u0639\u0629 \u0648\u062e\u062f\u0645\u0627\u062a \u0645\u062a\u0643\u0627\u0645\u0644\u0629.', 'A complete residential tower community with varied homes and integrated services.'),
            locationName: localized('\u0627\u0644\u062d\u064a \u0627\u0644\u062e\u0627\u0645\u0633', 'Fifth District'),
            statusLabel: localized('\u062a\u062d\u062a \u0627\u0644\u0625\u0646\u0634\u0627\u0621', 'Under construction'),
            projectType: localized('\u0633\u0643\u0646\u064a', 'Residential'),
            unitCount: 48,
            areaLabel: localized('120 - 240 \u0645\u00b2', '120 - 240 sqm'),
            priceLabel: localized('\u062a\u0628\u062f\u0623 \u0645\u0646 2.1 \u0645\u0644\u064a\u0648\u0646 \u062c\u0646\u064a\u0647', 'Starting from EGP 2.1 million'),
            deliveryLabel: localized('\u062a\u0633\u0644\u064a\u0645 2027', 'Delivery 2027'),
            sortOrder: 1,
            status: 'published'
          },
          {
            _id: new Types.ObjectId('6700000000000000000000dd'),
            slug: 'elite-compound',
            imageUrl: '/assets/clone/pub05-a.png',
            name: localized('\u0643\u0645\u0628\u0648\u0646\u062f \u0627\u0644\u0646\u062e\u0628\u0629', 'Elite Compound'),
            description: localized('\u0643\u0645\u0628\u0648\u0646\u062f \u0633\u0643\u0646\u064a \u0645\u062a\u0643\u0627\u0645\u0644 \u064a\u0642\u062f\u0645 \u0648\u062d\u062f\u0627\u062a \u0645\u062a\u0645\u064a\u0632\u0629 \u0641\u064a \u0645\u0648\u0642\u0639 \u0645\u0645\u064a\u0632.', 'An integrated compound offering distinctive homes in a prime location.'),
            locationName: localized('\u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644', 'First District'),
            statusLabel: localized('\u0645\u062a\u0627\u062d \u0644\u0644\u062d\u062c\u0632', 'Available for reservation'),
            projectType: localized('\u0633\u0643\u0646\u064a', 'Residential'),
            unitCount: 22,
            areaLabel: localized('48 - 220 \u0645\u00b2', '48 - 220 sqm'),
            priceLabel: localized('\u062a\u0628\u062f\u0623 \u0645\u0646 1.2 \u0645\u0644\u064a\u0648\u0646 \u062c\u0646\u064a\u0647', 'Starting from EGP 1.2 million'),
            deliveryLabel: localized('\u062a\u0633\u0644\u064a\u0645 2026', 'Delivery 2026'),
            sortOrder: 2,
            status: 'published'
          }
        ],
        profileProperties: [],
        directoryVisible: false,
        status: 'approved',
        reviewedAt: SEEDED_AT,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
        version: 0
      }, seedKey)
    ]);
  }
};

export const FIGMA_PUBLIC_PROFILE_CONTENT_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-profile-v16',
  async run(connection) {
    await connection.collection('organizations').updateOne(
      { _id: ids.directoryProfileOrganization, synthetic: true },
      {
        $set: {
          description: localized(
            '\u0634\u0631\u0643\u0629 \u0631\u0627\u0626\u062f\u0629 \u0641\u064a \u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a \u0628\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0645\u0646\u0630 \u0623\u0643\u062b\u0631 \u0645\u0646 15 \u0639\u0627\u0645\u0627\u064b. \u062a\u0639\u0645\u0644 \u0627\u0644\u0634\u0631\u0643\u0629 \u0641\u064a \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0628\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0645\u0646\u0630 \u0639\u0627\u0645 2008\u060c \u0628\u062e\u0628\u0631\u0629 \u062a\u0645\u062a\u062f \u0644\u0623\u0643\u062b\u0631 \u0645\u0646 18 \u0639\u0627\u0645\u0627\u064b.',
            'A leading Sadat City real-estate developer for more than 15 years. The company has operated in Sadat City since 2008, with more than 18 years of experience.'
          ),
          seedKey: 'figma-public-profile-v16',
          updatedAt: SEEDED_AT
        }
      }
    );
  }
};

/**
 * Brings the local article catalogue in line with the approved Figma article
 * list and article-details fixture. The records stay synthetic and the step
 * is safe to apply to databases that already ran the earlier showcase seed.
 */
export const FIGMA_PUBLIC_ARTICLES_PARITY_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-articles-v17',
  async run(connection) {
    const seedKey = 'figma-public-articles-v17' as const;
    const categoryRows = [
      [new Types.ObjectId('6700000000000000000000e0'), 'housing', '\u0633\u0643\u0646', 'Housing', 10],
      [new Types.ObjectId('6700000000000000000000e1'), 'investment', '\u0627\u0633\u062a\u062b\u0645\u0627\u0631', 'Investment', 20],
      [new Types.ObjectId('6700000000000000000000e2'), 'areas', '\u0645\u0646\u0627\u0637\u0642', 'Areas', 30],
      [new Types.ObjectId('6700000000000000000000e3'), 'services', '\u062e\u062f\u0645\u0627\u062a', 'Services', 40],
      [new Types.ObjectId('6700000000000000000000e4'), 'laws', '\u0642\u0648\u0627\u0646\u064a\u0646', 'Laws', 50],
      [ids.articleCategory, 'buying-tips', '\u0646\u0635\u0627\u0626\u062d \u0634\u0631\u0627\u0621', 'Buying tips', 60],
      [new Types.ObjectId('6700000000000000000000e6'), 'rental-tips', '\u0646\u0635\u0627\u0626\u062d \u0625\u064a\u062c\u0627\u0631', 'Rental tips', 70]
    ] as const;
    const categoryCollection = connection.collection('article_categories');
    for (const [id, slug, nameAr, nameEn, displayOrder] of categoryRows) {
      await categoryCollection.updateOne(
        { _id: id, synthetic: true },
        {
          $set: {
            synthetic: true,
            seedKey,
            slug,
            name: localized(nameAr, nameEn),
            description: localized('\u0625\u0631\u0634\u0627\u062f\u0627\u062a \u0648\u0645\u0642\u0627\u0644\u0627\u062a \u0645\u0641\u064a\u062f\u0629 \u0644\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064a.', 'Useful guidance and articles for the real-estate market.'),
            displayOrder,
            active: true,
            updatedBy: ids.user,
            updatedAt: SEEDED_AT,
            version: 0
          },
          $setOnInsert: { createdBy: ids.user, createdAt: SEEDED_AT }
        },
        { upsert: true }
      );
    }

    const authorRows = [
      [ids.teamAhmed, '\u0623\u062d\u0645\u062f \u0645\u062d\u0645\u0648\u062f', 'article.author.ahmed@example.invalid'],
      [ids.teamSara, '\u0633\u0627\u0631\u0629 \u0623\u062d\u0645\u062f', 'article.author.sara@example.invalid'],
      [ids.teamMohamed, '\u0645\u062d\u0645\u062f \u0639\u0644\u064a', 'article.author.mohamed@example.invalid'],
      [ids.teamNour, '\u0646\u0648\u0631 \u0625\u0628\u0631\u0627\u0647\u064a\u0645', 'article.author.nour@example.invalid'],
      [new Types.ObjectId('6700000000000000000000ea'), '\u0631\u064a\u0645 \u062e\u0627\u0644\u062f', 'article.author.reem@example.invalid']
    ] as const;
    await insertSyntheticDocuments(connection, 'users', authorRows.map(([id, _displayName, normalizedEmail]) => document(id, {
      normalizedEmail,
      roleType: 'admin',
      status: 'verified',
      locale: 'ar',
      statusChangedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    }, seedKey)));
    await insertSyntheticDocuments(connection, 'admin_accounts', authorRows.map(([userId, displayName], index) => document(new Types.ObjectId(`6700000000000000000000f${index}`), {
      userId,
      displayName,
      accessLevel: 'standard_admin',
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    }, seedKey)));

    const publishedAt = (daysAgo: number) => new Date(Date.UTC(2024, 0, 15 - daysAgo, 10, 0, 0));
    const articleRows = [
      {
        id: ids.article,
        categoryId: ids.articleCategory,
        slug: 'buying-in-sadat',
        imageUrl: '/assets/clone/pub07-a.png',
        title: localized('\u062f\u0644\u064a\u0644\u0643 \u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0644\u0634\u0631\u0627\u0621 \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a 2024', 'Your complete guide to buying in Sadat City 2024'),
        body: localized('\u0643\u0644 \u0645\u0627 \u062a\u062d\u062a\u0627\u062c \u0645\u0639\u0631\u0641\u062a\u0647 \u0642\u0628\u0644 \u0634\u0631\u0627\u0621 \u0639\u0642\u0627\u0631 \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a. \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0645\u0646 \u0623\u0633\u0631\u0639 \u0627\u0644\u0645\u062f\u0646 \u0646\u0645\u0648\u0627\u064b \u0639\u0644\u0649 \u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u0645\u0646\u0637\u0642\u0629.\n\n"\u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u0644\u064a\u0633\u062a \u0641\u0642\u0637 \u0644\u0644\u0633\u0643\u0646\u060c \u0647\u064a \u0627\u0633\u062a\u062b\u0645\u0627\u0631 \u0641\u064a \u0645\u0633\u062a\u0642\u0628\u0644 \u0645\u0633\u062a\u0642\u0631."', 'Everything you need to know before buying a property in Sadat City. Sadat City is one of the fastest-growing cities in the region.\n\n"Sadat City is not only a place to live; it is an investment in a stable future."'),
        authorId: ids.teamAhmed,
        readingTimeMinutes: 8,
        publishedAt: publishedAt(0)
      },
      {
        id: new Types.ObjectId('670000000000000000000071'),
        categoryId: new Types.ObjectId('6700000000000000000000e1'),
        slug: 'investment-opportunities-sadat',
        imageUrl: '/assets/clone/pub07-b.png',
        title: localized('\u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0644\u0644\u0627\u0633\u062a\u062b\u0645\u0627\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0641\u064a \u0627\u0644\u0633\u0627\u062f\u0627\u062a', 'Best areas for real-estate investment in Sadat City'),
        body: localized('\u062a\u062d\u0644\u064a\u0644 \u0634\u0627\u0645\u0644 \u0644\u0644\u0645\u0646\u0627\u0637\u0642 \u0630\u0627\u062a \u0627\u0644\u0639\u0627\u0626\u062f \u0627\u0644\u0627\u0633\u062a\u062b\u0645\u0627\u0631\u064a \u0627\u0644\u0623\u0639\u0644\u0649.', 'A complete analysis of the areas with the strongest investment returns.'),
        authorId: ids.teamSara,
        readingTimeMinutes: 6,
        publishedAt: publishedAt(1)
      },
      {
        id: new Types.ObjectId('670000000000000000000072'),
        categoryId: new Types.ObjectId('6700000000000000000000e3'),
        slug: 'services-near-your-home',
        imageUrl: '/assets/clone/pub07-c.png',
        title: localized('\u062e\u062f\u0645\u0627\u062a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a: \u0645\u0627 \u0627\u0644\u0645\u062a\u0627\u062d \u0648\u0645\u0627 \u0627\u0644\u0645\u062e\u0637\u0637 \u0644\u0647', 'Sadat City services: what is available and planned'),
        body: localized('\u0627\u0633\u062a\u0639\u0631\u0627\u0636 \u0634\u0627\u0645\u0644 \u0644\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u0641\u064a \u0627\u0644\u0645\u062f\u064a\u0646\u0629.', 'A complete overview of the services available across the city.'),
        authorId: ids.teamMohamed,
        readingTimeMinutes: 5,
        publishedAt: publishedAt(2)
      },
      {
        id: new Types.ObjectId('6700000000000000000000e7'),
        categoryId: new Types.ObjectId('6700000000000000000000e4'),
        slug: 'new-rental-laws-guide',
        imageUrl: '/assets/clone/pub07-d.png',
        title: localized('\u0642\u0648\u0627\u0646\u064a\u0646 \u0627\u0644\u0625\u064a\u062c\u0627\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0648\u0645\u0627 \u064a\u0647\u0645\u0643 \u0645\u0639\u0631\u0641\u062a\u0647', 'New rental laws and what you need to know'),
        body: localized('\u0634\u0631\u062d \u0645\u0628\u0633\u0637 \u0644\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a \u0627\u0644\u0623\u062e\u064a\u0631\u0629 \u0639\u0644\u0649 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0625\u064a\u062c\u0627\u0631.', 'A simple explanation of the latest rental-law amendments.'),
        authorId: ids.teamNour,
        readingTimeMinutes: 7,
        publishedAt: publishedAt(3)
      },
      {
        id: new Types.ObjectId('6700000000000000000000e8'),
        categoryId: new Types.ObjectId('6700000000000000000000e2'),
        slug: 'life-in-sadat-city',
        imageUrl: '/assets/clone/pub07-e.png',
        title: localized('\u0627\u0644\u062d\u064a\u0627\u0629 \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a: \u062a\u062c\u0627\u0631\u0628 \u0627\u0644\u0633\u0643\u0627\u0646', 'Life in Sadat City: residents’ experiences'),
        body: localized('\u0642\u0635\u0635 \u062d\u0642\u064a\u0642\u064a\u0629 \u0645\u0646 \u0633\u0643\u0627\u0646 \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a.', 'Real stories from Sadat City residents.'),
        authorId: new Types.ObjectId('6700000000000000000000ea'),
        readingTimeMinutes: 4,
        publishedAt: publishedAt(4)
      },
      {
        id: new Types.ObjectId('6700000000000000000000e9'),
        categoryId: new Types.ObjectId('6700000000000000000000e6'),
        slug: 'first-time-renter-mistakes',
        imageUrl: '/assets/clone/pub07-a.png',
        title: localized('\u0646\u0635\u0627\u0626\u062d \u0644\u0644\u0645\u0633\u062a\u0623\u062c\u0631 \u0627\u0644\u0623\u0648\u0644: \u062a\u062c\u0646\u0628 \u0647\u0630\u0647 \u0627\u0644\u0623\u062e\u0637\u0627\u0621', 'First-time renter tips: avoid these mistakes'),
        body: localized('\u0623\u0628\u0631\u0632 \u0627\u0644\u0623\u062e\u0637\u0627\u0621 \u0627\u0644\u062a\u064a \u064a\u0642\u0639 \u0641\u064a\u0647\u0627 \u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631 \u0644\u0644\u0645\u0631\u0629 \u0627\u0644\u0623\u0648\u0644\u0649.', 'The most common mistakes first-time renters make.'),
        authorId: ids.teamAhmed,
        readingTimeMinutes: 5,
        publishedAt: publishedAt(5)
      }
    ] as const;
    const articleCollection = connection.collection('articles');
    for (const row of articleRows) {
      await articleCollection.updateOne(
        { _id: row.id, synthetic: true },
        {
          $set: {
            synthetic: true,
            seedKey,
            categoryId: row.categoryId,
            slug: row.slug,
            imageUrl: row.imageUrl,
            title: row.title,
            body: row.body,
            authorId: row.authorId,
            readingTimeMinutes: row.readingTimeMinutes,
            status: 'published',
            publishedAt: row.publishedAt,
            updatedBy: ids.user,
            updatedAt: SEEDED_AT,
            version: 0
          },
          $setOnInsert: { createdBy: ids.user, createdAt: SEEDED_AT }
        },
        { upsert: true }
      );
    }
  }
};

/** Keeps the canonical article-details URL stable after the showcase seed. */
export const FIGMA_PUBLIC_ARTICLE_ROUTE_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-article-route-v18',
  async run(connection) {
    await connection.collection('articles').updateOne(
      { _id: ids.article, synthetic: true },
      { $set: { slug: 'buying-in-sadat', seedKey: 'figma-public-article-route-v18', updatedAt: SEEDED_AT } }
    );
  }
};

/** Keeps the article dates aligned with the canonical 2024 article-details screen. */
export const FIGMA_PUBLIC_ARTICLE_DATES_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-article-dates-v19',
  async run(connection) {
    const articleDates = [
      [ids.article, new Date('2024-01-15T10:00:00.000Z')],
      [new Types.ObjectId('670000000000000000000071'), new Date('2024-01-14T10:00:00.000Z')],
      [new Types.ObjectId('670000000000000000000072'), new Date('2024-01-13T10:00:00.000Z')],
      [new Types.ObjectId('6700000000000000000000e7'), new Date('2024-01-12T10:00:00.000Z')],
      [new Types.ObjectId('6700000000000000000000e8'), new Date('2024-01-11T10:00:00.000Z')],
      [new Types.ObjectId('6700000000000000000000e9'), new Date('2024-01-10T10:00:00.000Z')]
    ] as const;
    for (const [id, publishedAt] of articleDates) {
      await connection.collection('articles').updateOne(
        { _id: id, synthetic: true },
        { $set: { publishedAt, seedKey: 'figma-public-article-dates-v19', updatedAt: SEEDED_AT } }
      );
    }
  }
};

/** Aligns the local community feed with the canonical public community screen. */
export const FIGMA_PUBLIC_COMMUNITY_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-community-v20',
  async run(connection) {
    const seedKey = 'figma-public-community-v20' as const;
    const rows = [
      [new Types.ObjectId(ids.communityPost), 'aaaaaaaaaaaaaaaaaaaaaaaa', '\u0645\u0627 \u0623\u0641\u0636\u0644 \u062d\u064a \u0644\u0644\u0633\u0643\u0646 \u0628\u0645\u064a\u0632\u0627\u0646\u064a\u0629 2 \u0645\u0644\u064a\u0648\u0646\u061f', '\u0623\u0646\u0627 \u0648\u0639\u0627\u0626\u0644\u062a\u064a \u0628\u0646\u0641\u0643\u0631 \u0646\u0646\u0642\u0644 \u0644\u0644\u0633\u0627\u062f\u0627\u062a\u060c \u0645\u064a\u0632\u0627\u0646\u064a\u062a\u0646\u0627 \u062d\u0648\u0627\u0644\u064a 2 \u0645\u0644\u064a\u0648\u0646 \u062c\u0646\u064a\u0647. \u0641\u064a\u0646 \u062a\u0646\u0635\u062d\u0648\u0646\u064a \u0623\u0634\u062a\u0631\u064a\u061f', 'question', 24, 2, '2026-08-26T10:00:00+00:00'],
      [new Types.ObjectId('670000000000000000000073'), 'bbbbbbbbbbbbbbbbbbbbbbbb', '\u062a\u062c\u0631\u0628\u062a\u064a \u0628\u0639\u062f \u0633\u0646\u0629 \u0643\u0627\u0645\u0644\u0629 \u0641\u064a \u0627\u0644\u0633\u0627\u062f\u0627\u062a', '\u0627\u0646\u062a\u0642\u0644\u062a \u0645\u0646 \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0644\u0644\u0633\u0627\u062f\u0627\u062a \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0644\u064a \u0641\u0627\u062a\u062a \u0648\u0639\u0646\u062f\u064a \u0634\u0648\u064a\u0629 \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0648\u062a\u062c\u0627\u0631\u0628.', 'experience', 31, 1, '2026-08-25T10:00:00+00:00'],
      [new Types.ObjectId('670000000000000000000074'), 'cccccccccccccccccccccccc', '\u0646\u0635\u064a\u062d\u0629 \u0645\u0647\u0645\u0629 \u0644\u0643\u0644 \u0645\u0646 \u064a\u0641\u0643\u0631 \u0641\u064a \u0627\u0644\u0634\u0631\u0627\u0621 \u0639\u0644\u0649 \u0627\u0644\u062e\u0631\u064a\u0637\u0629', '\u0628\u0639\u062f \u062a\u062c\u0631\u0628\u062a\u064a \u0634\u0631\u0627\u0621 \u0648\u062d\u062f\u0629 \u0639\u0644\u0649 \u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0645\u0646 \u0645\u0637\u0648\u0631 \u0645\u062d\u062a\u0631\u0645\u060c \u0639\u0646\u062f\u064a \u0646\u0635\u0627\u0626\u062d \u0645\u0647\u0645\u0629 \u062c\u062f\u0627\u064b.', 'advice', 42, 3, '2026-08-24T10:00:00+00:00'],
      [new Types.ObjectId('670000000000000000000075'), 'dddddddddddddddddddddddd', '\u0645\u0637\u0639\u0645 \u062c\u062f\u064a\u062f \u0645\u0645\u062a\u0627\u0632 \u0641\u064a \u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644', '\u0627\u0641\u062a\u062a\u062d \u0645\u0637\u0639\u0645 \u062c\u062f\u064a\u062f \u0641\u064a \u0627\u0644\u062d\u064a \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0623\u0643\u0644 \u0641\u064a\u0647 \u0645\u0645\u062a\u0627\u0632 \u0648\u0623\u0633\u0639\u0627\u0631 \u0645\u0639\u0642\u0648\u0644\u0629.', 'service', 18, 0, '2026-08-23T10:00:00+00:00']
    ] as const;
    for (const [mongoId, id, title, body, category, likeCount, dislikeCount, createdAt] of rows) {
      await connection.collection('community_posts').updateOne(
        { _id: mongoId, synthetic: true },
        {
          $set: {
            id,
            authorId: ids.user.toHexString(),
            title,
            body,
            category,
            likeCount,
            dislikeCount,
            status: 'published',
            createdAt,
            updatedAt: createdAt,
            seedKey
          }
        }
      );
    }
  }
};

/** Aligns the local public team content with the canonical team screen. */
export const FIGMA_PUBLIC_TEAM_SEED_STEP: DevelopmentSeedStep = {
  id: 'figma-public-team-v21',
  async run(connection) {
    const seedKey = 'figma-public-team-v21' as const;
    const rows = [
      [ids.teamAhmed, 'أحمد محمود', 'Ahmed Mahmoud', 'مؤسس ومدير عام', 'Founder & General Manager', 'خبرة 15 عاماً في السوق العقاري المصري.', '15 years of experience in the Egyptian real-estate market.', 'management', 10],
      [ids.teamSara, 'سارة أحمد', 'Sara Ahmed', 'مديرة المبيعات', 'Sales Manager', 'خبرة في تسويق العقارات، أنجزت أكثر من 500 صفقة.', 'Experienced in real-estate marketing, with more than 500 completed deals.', 'sales', 20],
      [ids.teamMohamed, 'محمد علي', 'Mohamed Ali', 'مدير دعم العملاء', 'Customer Support Manager', 'متخصص في تجربة المستخدم وخدمة العملاء.', 'Specialist in user experience and customer service.', 'support', 30],
      [ids.teamNour, 'نور إبراهيم', 'Nour Ibrahim', 'محررة المحتوى', 'Content Editor', 'كاتبة متخصصة في المحتوى العقاري والاستثماري.', 'Writer specialising in real-estate and investment content.', 'content', 40],
      [ids.teamKarim, 'كريم عبد الله', 'Karim Abdullah', 'مستشار عقاري أول', 'Senior Real-Estate Consultant', 'مستشار متمرس في العقارات السكنية والتجارية.', 'Experienced consultant in residential and commercial real estate.', 'sales', 50],
      [ids.teamAli, 'علي السيد', 'Ali El-Sayed', 'مسؤول المجتمع الرقمي', 'Digital Community Manager', 'يدير مجتمع المنصة ويضمن تجربة تواصل آمنة.', 'Manages the platform community and ensures a safe communication experience.', 'content', 60]
    ] as const;
    for (const [id, nameAr, nameEn, titleAr, titleEn, bioAr, bioEn, category, order] of rows) {
      await connection.collection('cms_team_members').updateOne(
        { _id: id, synthetic: true },
        {
          $set: {
            key: `team_${id === ids.teamAhmed ? 'ahmed' : id === ids.teamSara ? 'sara' : id === ids.teamMohamed ? 'mohamed' : id === ids.teamNour ? 'nour' : id === ids.teamKarim ? 'karim' : 'ali'}`,
            name: localized(nameAr, nameEn),
            title: localized(titleAr, titleEn),
            bio: localized(bioAr, bioEn),
            category,
            order,
            active: true,
            status: 'published',
            updatedBy: ids.user,
            updatedAt: SEEDED_AT,
            seedKey,
            version: 0
          },
          $setOnInsert: { createdAt: SEEDED_AT }
        }
      );
    }
  }
};

export const DEVELOPMENT_SEED_STEPS: readonly DevelopmentSeedStep[] = [
  SYNTHETIC_SHOWCASE_SEED_STEP,
  SYNTHETIC_WORKFLOW_SEED_STEP,
  FIGMA_PUBLIC_CONTENT_SEED_STEP,
  FIGMA_PUBLIC_ABOUT_SEED_STEP,
  FIGMA_PUBLIC_CATALOGUE_SEED_STEP,
  FIGMA_PUBLIC_INTERACTIONS_SEED_STEP,
  FIGMA_PUBLIC_DETAILS_SEED_STEP,
  FIGMA_PUBLIC_LISTING_SEED_STEP,
  FIGMA_PUBLIC_PARITY_SEED_STEP,
  FIGMA_PUBLIC_DETAILS_PARITY_SEED_STEP,
  FIGMA_PUBLIC_DIRECTORY_PARITY_SEED_STEP,
  FIGMA_PUBLIC_PROFILE_PARITY_SEED_STEP,
  FIGMA_PUBLIC_PROFILE_CONTENT_SEED_STEP,
  FIGMA_PUBLIC_ARTICLES_PARITY_SEED_STEP,
  FIGMA_PUBLIC_ARTICLE_ROUTE_SEED_STEP,
  FIGMA_PUBLIC_ARTICLE_DATES_SEED_STEP,
  FIGMA_PUBLIC_COMMUNITY_SEED_STEP,
  FIGMA_PUBLIC_TEAM_SEED_STEP,
  AUTH_BUYER_SEED_STEP
];

export function assertDevelopmentSeedAllowed(environment: AppEnvironment): void {
  if (!isSeedEnvironmentAllowed(environment)) throw new DevelopmentSeedError();
}

export async function runDevelopmentSeed(
  environment: AppEnvironment,
  connection: Connection,
  steps: readonly DevelopmentSeedStep[] = DEVELOPMENT_SEED_STEPS
): Promise<number> {
  assertDevelopmentSeedAllowed(environment);
  if (steps.length === 0) return 0;
  if (!connection.db) throw new Error('Database connection is not ready');

  const ledger = connection.db.collection<{ id: string; appliedAt: Date }>('_development_seed_runs');
  await ledger.createIndex({ id: 1 }, { unique: true });
  let applied = 0;
  for (const step of steps) {
    const existing = await ledger.findOne({ id: step.id });
    if (existing) continue;
    await step.run(connection);
    await ledger.updateOne({ id: step.id }, { $setOnInsert: { id: step.id, appliedAt: new Date() } }, { upsert: true });
    applied += 1;
  }
  return applied;
}
