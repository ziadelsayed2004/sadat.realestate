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
  project: new Types.ObjectId('670000000000000000000006'),
  propertyOne: new Types.ObjectId('670000000000000000000007'),
  propertyTwo: new Types.ObjectId('670000000000000000000008'),
  propertyThree: new Types.ObjectId('670000000000000000000009'),
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
  notification: new Types.ObjectId('670000000000000000000024'),
  adRequest: new Types.ObjectId('670000000000000000000025'),
  adQuote: new Types.ObjectId('670000000000000000000026'),
  paymentProof: new Types.ObjectId('670000000000000000000027'),
  commissionPolicy: new Types.ObjectId('670000000000000000000028'),
  commissionConfirmation: new Types.ObjectId('670000000000000000000029'),
  commissionSnapshot: new Types.ObjectId('67000000000000000000002a'),
  homepageMetric: new Types.ObjectId('67000000000000000000002b')
} as const;

const localized = (ar: string, en: string, zhCN: string) => ({ ar, en, 'zh-CN': zhCN });

interface SyntheticSeedDocument {
  _id: Types.ObjectId;
  synthetic: true;
  seedKey: 'local-showcase-v1' | 'local-showcase-v2';
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
      name: localized('شركة السادات التجريبية', 'Sadat Demo Developer', '萨达特演示开发商'),
      description: localized(
        'هوية مطور اصطناعية لبيئة العرض المحلية فقط.',
        'Synthetic developer identity for local preview only.',
        '仅用于本地预览的合成开发商身份。'
      ),
      slug: 'sadat-demo-developer',
      status: 'approved',
      reviewedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'locations', [
      document(ids.location, {
        kind: 'location',
        name: localized('مدينة السادات', 'Sadat City', '萨达特城'),
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
        name: localized('الحي السكني التجريبي', 'Demo Residential District', '演示住宅区'),
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
      providerId: ids.user,
      organizationId: ids.organization,
      locationId: ids.location,
      name: localized('مشروع الواحة التجريبي', 'Demo Oasis Project', '演示绿洲项目'),
      slug: 'demo-oasis-project',
      description: localized(
        'مشروع اصطناعي لاختبار واجهات المنصة محليًا.',
        'Synthetic project used to exercise the local platform UI.',
        '用于测试本地平台界面的合成项目。'
      ),
      website: 'https://example.invalid/demo-oasis-project',
      status: 'published',
      submittedAt: SEEDED_AT,
      reviewedAt: SEEDED_AT,
      publishedAt: SEEDED_AT,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);

    const propertyBase = {
      providerId: ids.user,
      sourceType: 'developer_company',
      organizationId: ids.organization,
      kind: 'unit',
      projectId: ids.project,
      locationId: ids.neighborhood,
      coordinates: { type: 'Point', coordinates: [30.5065, 30.3676] },
      transactionType: 'sale',
      status: 'published',
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
        name: localized('شقة تجريبية بإطلالة مفتوحة', 'Demo Apartment with Open View', '开放景观演示公寓'),
        slug: 'demo-open-view-apartment',
        description: localized('بيانات عرض فقط وليست إعلانًا حقيقيًا.', 'Preview data only; this is not a real listing.', '仅为预览数据，并非真实房源。'),
        area: { value: 145, unit: 'sqm' },
        layout: { bedrooms: 3, bathrooms: 2, floor: 3, totalFloors: 8 },
        price: { amount: 2_450_000, currency: 'EGP' }
      }),
      document(ids.propertyTwo, {
        ...propertyBase,
        name: localized('دوبلكس تجريبي بحديقة', 'Demo Duplex with Garden', '带花园的演示复式住宅'),
        slug: 'demo-garden-duplex',
        description: localized('بيانات اصطناعية لاختبار البحث والمقارنة.', 'Synthetic data for search and comparison testing.', '用于搜索和比较测试的合成数据。'),
        area: { value: 220, unit: 'sqm' },
        layout: { bedrooms: 4, bathrooms: 3, floor: 0, totalFloors: 2 },
        price: { amount: 4_100_000, currency: 'EGP' }
      }),
      document(ids.propertyThree, {
        ...propertyBase,
        transactionType: 'rent',
        name: localized('شقة إيجار تجريبية', 'Demo Rental Apartment', '演示出租公寓'),
        slug: 'demo-rental-apartment',
        description: localized('بيانات عرض قابلة للحذف بإزالة حاوية Mongo المحلية.', 'Disposable preview data from the local Mongo volume.', '可通过删除本地 Mongo 卷清除的预览数据。'),
        area: { value: 110, unit: 'sqm' },
        layout: { bedrooms: 2, bathrooms: 1, floor: 2, totalFloors: 6 },
        price: { amount: 12_000, currency: 'EGP' }
      })
    ]);
    await insertSyntheticDocuments(connection, 'article_categories', [document(ids.articleCategory, {
      slug: 'demo-guides',
      name: localized('أدلة تجريبية', 'Demo Guides', '演示指南'),
      description: localized('محتوى اصطناعي للمعاينة.', 'Synthetic preview content.', '合成预览内容。'),
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
      title: localized('دليل تجريبي لاختيار العقار', 'Demo Guide to Choosing a Property', '演示选房指南'),
      body: localized(
        'هذا محتوى اصطناعي يساعد على اختبار قائمة المقالات وصفحة التفاصيل.',
        'This synthetic article exercises the article list and detail views.',
        '此合成文章用于测试文章列表和详情页面。'
      ),
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
      title: 'سؤال تجريبي عن أحياء مدينة السادات',
      body: 'منشور اصطناعي لاختبار قائمة المجتمع وحالات العرض المحلية فقط.',
      status: 'published',
      createdAt: SEEDED_AT.toISOString(),
      updatedAt: SEEDED_AT.toISOString()
    })]);
    await insertSyntheticDocuments(connection, 'cms_homepage_sections', [document(ids.homepageSection, {
      key: 'local_preview_intro',
      title: localized('استكشف مدينة السادات', 'Explore Sadat City', '探索萨达特城'),
      body: localized('محتوى تجريبي آمن للمعاينة المحلية.', 'Safe synthetic content for local preview.', '用于本地预览的安全合成内容。'),
      order: 10,
      visible: true,
      status: 'published',
      updatedBy: ids.user,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'cms_homepage_metrics', [
      document(ids.homepageMetric, { key: 'population', title: localized('عدد سكان مدينة السادات', 'Sadat City population', '萨达特城人口'), value: 342800, unit: localized('نسمة', 'residents', '居民'), order: 0, visible: true, status: 'published', updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT }),
      document(new Types.ObjectId('67000000000000000000002c'), { key: 'annual_growth', title: localized('نمو سنوي', 'Annual growth', '年增长'), value: 3500, unit: localized('نسمة', 'residents', '居民'), order: 1, visible: true, status: 'published', updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT }),
      document(new Types.ObjectId('67000000000000000000002d'), { key: 'residential_districts', title: localized('منطقة سكنية', 'Residential districts', '住宅区'), value: 18, order: 2, visible: true, status: 'published', updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT }),
      document(new Types.ObjectId('67000000000000000000002e'), { key: 'housing_units', title: localized('وحدة سكنية', 'Housing units', '住房单元'), value: 1200, order: 3, visible: true, status: 'published', updatedBy: ids.user, createdAt: SEEDED_AT, updatedAt: SEEDED_AT })
    ]);
    await insertSyntheticDocuments(connection, 'cms_about_blocks', [document(ids.about, {
      key: 'local_preview_about',
      title: localized('عن منصة السادات', 'About the Sadat Platform', '关于萨达特平台'),
      body: localized('نسخة عرض محلية ببيانات اصطناعية.', 'Local preview with synthetic data.', '使用合成数据的本地预览。'),
      order: 10,
      active: true,
      status: 'published',
      updatedBy: ids.user,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
      version: 0
    })]);
    await insertSyntheticDocuments(connection, 'cms_real_estate_tips', [document(ids.tip, {
      key: 'local_preview_tip',
      title: localized('نصيحة تجريبية', 'Demo Tip', '演示提示'),
      body: localized('تحقق من المستندات والموقع قبل اتخاذ قرار.', 'Review documents and location before deciding.', '做出决定前请核实文件和位置。'),
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
      title: localized('بيئة عرض محلية', 'Local Preview Environment', '本地预览环境'),
      eyebrow: localized('فرصة مميزة', 'Featured opportunity', '精选机会'),
      body: localized('بيانات منشورة لاختبار بطاقة العرض العامة.', 'Published data for exercising the public promotional card.', '用于测试公共推广卡片的已发布数据。'),
      highlight: localized('بيانات تجريبية', 'Demo data', '演示数据'),
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
        locale: 'zh-CN',
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
        bedroomsMin: 2,
        bedroomsMax: 4
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
    await insertSyntheticDocuments(connection, 'favorites', [document(ids.favorite, {
      seekerId: ids.seekerUser,
      propertyId: ids.propertyOne,
      savedAt: SEEDED_AT
    }, 'local-showcase-v2')]);
    await insertSyntheticDocuments(connection, 'notifications', [document(ids.notification, {
      recipientId: ids.seekerUser,
      type: 'request.updated',
      title: localized('تم تحديث طلبك', 'Your request was updated', '您的请求已更新'),
      message: localized('يمكنك مراجعة حالة الطلب من لوحة الباحث.', 'Review the request from your seeker dashboard.', '请在求购者面板查看请求。'),
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

export const DEVELOPMENT_SEED_STEPS: readonly DevelopmentSeedStep[] = [
  SYNTHETIC_SHOWCASE_SEED_STEP,
  SYNTHETIC_WORKFLOW_SEED_STEP
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
