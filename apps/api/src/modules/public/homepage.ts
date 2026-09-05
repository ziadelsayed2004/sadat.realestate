import { Types, type Connection } from 'mongoose';
import {
  publicHomepageBannerSchema,
  publicHomepageCategorySchema,
  publicHomepageContentSchema,
  publicHomepageDataSchema,
  publicHomepageDeveloperSchema,
  publicHomepageLocationSchema,
  publicHomepageMetricSchema,
  publicHomepagePropertySchema,
  publicHomepageSectionSchema,
  type PublicHomepageData,
  type PublicHomepageLocation
} from '@sadat-real-estate/contracts';

export interface HomepageSectionSource { key: string; title: unknown; body?: unknown; order: number; status: string; visible: boolean }
export interface HomepageCategorySource { id: string; slug: string; name: unknown; imageUrl?: string; propertyCount: number; order: number; active: boolean }
export interface HomepageLocationSource { id: string; kind: string; name: unknown; slug: string; parentLocationId?: string; order: number; active: boolean }
export interface HomepageMetricSource { key: string; title: unknown; value: number; unit?: unknown; order: number; status: string; visible: boolean }
export interface HomepagePropertySource { id: string; slug: string; kind: string; name: unknown; transactionType: string; imageUrl?: string; projectId?: string; description?: unknown; area?: unknown; layout?: unknown; price?: unknown; locationName?: unknown; sourceName?: unknown; sourceImageUrl?: string; sourceType?: string; sourceVerified?: boolean; publicCode?: string; viewCount?: number; installmentAvailable?: boolean; featured?: boolean; deliveryStatus?: string; featuredOrder?: number; status: string; active: boolean }
export interface HomepageDeveloperSource { id: string; slug: string; name: unknown; imageUrl?: string; description?: unknown; kind: string; status: string }
export interface HomepageContentSource { key: string; type: 'article' | 'community' | 'about' | 'tip'; title: unknown; imageUrl?: string; body?: unknown; order: number; status: string; active?: boolean }
export interface HomepageBannerSource { key: string; title?: unknown; eyebrow?: unknown; body?: unknown; highlight?: unknown; imageUrl?: string; targetUrl?: string; order: number; status: string; active?: boolean }

export interface HomepageSources {
  sections: HomepageSectionSource[];
  categories?: HomepageCategorySource[];
  locations?: HomepageLocationSource[];
  metrics?: HomepageMetricSource[];
  properties: HomepagePropertySource[];
  developers: HomepageDeveloperSource[];
  content: HomepageContentSource[];
  banners: HomepageBannerSource[];
}

function publicCategories(items: HomepageCategorySource[] = []) {
  return [...items].filter((item) => item.active).sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en')).flatMap((item) => {
    const parsed = publicHomepageCategorySchema.safeParse({ id: item.id, slug: item.slug, name: item.name, ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), propertyCount: item.propertyCount, order: item.order });
    return parsed.success ? [parsed.data] : [];
  });
}

function publicLocations(items: HomepageLocationSource[] = []): PublicHomepageLocation[] {
  return [...items]
    .filter((item) => item.active)
    .sort((left, right) => left.order - right.order || left.kind.localeCompare(right.kind, 'en') || left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en'))
    .flatMap((item) => {
      const parsed = publicHomepageLocationSchema.safeParse({
        id: item.id,
        kind: item.kind,
        name: item.name,
        slug: item.slug,
        ...(item.parentLocationId ? { parentLocationId: item.parentLocationId } : {}),
        order: item.order
      });
      return parsed.success ? [parsed.data] : [];
    });
}

function publicMetrics(items: HomepageMetricSource[] = []) {
  return stableOrder(items.filter((item) => item.status === 'published' && item.visible).flatMap((item) => {
    const parsed=publicHomepageMetricSchema.safeParse({key:item.key,title:item.title,value:item.value,...(item.unit!==undefined?{unit:item.unit}:{}),order:item.order});
    return parsed.success ? [parsed.data] : [];
  }));
}

export interface PublicHomepageRepository { read(): Promise<HomepageSources> }

function stableOrder<T extends { order: number; key: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order || left.key.localeCompare(right.key, 'en'));
}

function publicSections(items: HomepageSectionSource[]) {
  return stableOrder(items.filter((item) => item.status === 'published' && item.visible).flatMap((item) => {
    const parsed = publicHomepageSectionSchema.safeParse({ key: item.key, title: item.title, ...(item.body !== undefined ? { body: item.body } : {}), order: item.order });
    return parsed.success ? [parsed.data] : [];
  }));
}

function publicProperties(items: HomepagePropertySource[]) {
  return [...items].filter((item) => item.status === 'published' && item.active).sort((left, right) => (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (right.featuredOrder ?? Number.MAX_SAFE_INTEGER) || left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en')).flatMap((item) => {
    const parsed = publicHomepagePropertySchema.safeParse({
      id: item.id, slug: item.slug, kind: item.kind, name: item.name, transactionType: item.transactionType,
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
      ...(item.projectId ? { projectId: item.projectId } : {}), ...(item.description !== undefined ? { description: item.description } : {}),
      ...(item.area !== undefined ? { area: item.area } : {}), ...(item.layout !== undefined ? { layout: item.layout } : {}), ...(item.price !== undefined ? { price: item.price } : {}),
      ...(item.locationName !== undefined ? { locationName: item.locationName } : {}), ...(item.sourceName !== undefined ? { sourceName: item.sourceName } : {}), ...(item.sourceImageUrl ? { sourceImageUrl: item.sourceImageUrl } : {}), ...(item.sourceType ? { sourceType: item.sourceType } : {}), ...(item.sourceVerified !== undefined ? { sourceVerified: item.sourceVerified } : {}), ...(item.publicCode ? { publicCode: item.publicCode } : {}), ...(item.viewCount !== undefined ? { viewCount: item.viewCount } : {}), ...(item.installmentAvailable !== undefined ? { installmentAvailable: item.installmentAvailable } : {}), ...(item.featured !== undefined ? { featured: item.featured } : {}), ...(item.deliveryStatus ? { deliveryStatus: item.deliveryStatus } : {})
    });
    return parsed.success ? [parsed.data] : [];
  });
}

function publicDevelopers(items: HomepageDeveloperSource[]) {
  return [...items].filter((item) => item.status === 'approved' && item.kind === 'developer_company').sort((left, right) => left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en')).flatMap((item) => {
    const parsed = publicHomepageDeveloperSchema.safeParse({ id: item.id, slug: item.slug, name: item.name, ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), ...(item.description !== undefined ? { description: item.description } : {}) });
    return parsed.success ? [parsed.data] : [];
  });
}

function publicContent(items: HomepageContentSource[]) {
  return stableOrder(items.filter((item) => item.status === 'published' && item.active !== false).flatMap((item) => {
    const parsed = publicHomepageContentSchema.safeParse({ key: item.key, type: item.type, title: item.title, ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), ...(item.body !== undefined ? { body: item.body } : {}), order: item.order });
    return parsed.success ? [parsed.data] : [];
  }));
}

function publicBanners(items: HomepageBannerSource[]) {
  return stableOrder(items.filter((item) => item.status === 'published' && item.active !== false).flatMap((item) => {
    const parsed = publicHomepageBannerSchema.safeParse({ key: item.key, ...(item.title !== undefined ? { title: item.title } : {}), ...(item.eyebrow !== undefined ? { eyebrow: item.eyebrow } : {}), ...(item.body !== undefined ? { body: item.body } : {}), ...(item.highlight !== undefined ? { highlight: item.highlight } : {}), ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), ...(item.targetUrl ? { targetUrl: item.targetUrl } : {}), order: item.order });
    return parsed.success ? [parsed.data] : [];
  }));
}

export function publicHomepageProjection(sources: HomepageSources): PublicHomepageData {
  return publicHomepageDataSchema.parse({
    sections: publicSections(sources.sections),
    categories: publicCategories(sources.categories),
    ...(sources.locations === undefined ? {} : { locations: publicLocations(sources.locations) }),
    metrics: publicMetrics(sources.metrics),
    properties: publicProperties(sources.properties),
    developers: publicDevelopers(sources.developers),
    content: publicContent(sources.content),
    banners: publicBanners(sources.banners)
  });
}

export function createPublicHomepageService(dependencies: { repository: PublicHomepageRepository }) {
  return { read: async (): Promise<PublicHomepageData> => publicHomepageProjection(await dependencies.repository.read()) };
}

type MongoRow = {
  _id?: unknown;
  key?: string;
  slug?: string;
  kind?: string;
  name?: unknown;
  title?: unknown;
  eyebrow?: unknown;
  body?: unknown;
  highlight?: unknown;
  description?: unknown;
  order?: number;
  status?: string;
  visible?: boolean;
  active?: boolean;
  transactionType?: string;
  projectId?: unknown;
  area?: unknown;
  layout?: unknown;
  price?: unknown;
  locationId?: unknown;
  organizationId?: unknown;
  publicCode?: string;
  viewCount?: number;
  paymentPlans?: unknown[];
  featured?: boolean;
  deliveryStatus?: string;
  featuredOrder?: number;
  imageUrl?: string;
  targetUrl?: string;
  propertyTypeId?: unknown;
  parentLocationId?: unknown;
  value?: number;
  unit?: unknown;
};
function id(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') return (value as { toHexString: () => string }).toHexString();
  return undefined;
}

async function findRows(connection: Connection, collection: string, filter: Record<string, unknown>, projection: Record<string, 0 | 1>, sort: Record<string, 1 | -1>, limit: number): Promise<MongoRow[]> {
  return connection.collection(collection).find(filter, { projection }).sort(sort).limit(limit).toArray() as Promise<MongoRow[]>;
}

export function createMongoosePublicHomepageRepository(connection: Connection): PublicHomepageRepository {
  return {
    async read() {
      const [sections, properties, developers, about, tips, banners, categories, metrics, locations, organizations] = await Promise.all([
        findRows(connection, 'cms_homepage_sections', { status: 'published', visible: true }, { _id: 1, key: 1, title: 1, body: 1, order: 1, status: 1, visible: 1 }, { order: 1, key: 1, _id: 1 }, 100),
        findRows(connection, 'properties', { status: 'published', active: true }, { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, imageUrl: 1, projectId: 1, locationId: 1, organizationId: 1, publicCode: 1, viewCount: 1, paymentPlans: 1, featured: 1, deliveryStatus: 1, featuredOrder: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 }, { slug: 1, _id: 1 }, 100),
        findRows(connection, 'organizations', { status: 'approved', kind: 'developer_company' }, { _id: 1, slug: 1, name: 1, imageUrl: 1, description: 1, kind: 1, status: 1 }, { slug: 1, _id: 1 }, 100),
        findRows(connection, 'cms_about_blocks', { status: 'published', active: true }, { _id: 1, key: 1, title: 1, body: 1, order: 1, status: 1, active: 1 }, { order: 1, key: 1, _id: 1 }, 100),
        findRows(connection, 'cms_real_estate_tips', { status: 'published', active: true }, { _id: 1, key: 1, title: 1, body: 1, order: 1, status: 1, active: 1 }, { order: 1, key: 1, _id: 1 }, 100),
        findRows(connection, 'cms_banners', { status: 'published', active: true }, { _id: 1, key: 1, title: 1, eyebrow: 1, body: 1, highlight: 1, imageUrl: 1, targetUrl: 1, order: 1, status: 1, active: 1 }, { order: 1, key: 1, _id: 1 }, 100),
        findRows(connection, 'property_taxonomy', { kind: 'type', active: true }, { _id: 1, slug: 1, name: 1, imageUrl: 1, order: 1, active: 1 }, { order: 1, slug: 1, _id: 1 }, 100),
        findRows(connection, 'cms_homepage_metrics', { status: 'published', visible: true }, { _id: 1, key: 1, title: 1, value: 1, unit: 1, order: 1, status: 1, visible: 1 }, { order: 1, key: 1, _id: 1 }, 100),
        findRows(connection, 'locations', { active: true }, { _id: 1, kind: 1, name: 1, slug: 1, parentLocationId: 1, order: 1, active: 1 }, { order: 1, kind: 1, slug: 1, _id: 1 }, 500),
        findRows(connection, 'organizations', { status: 'approved' }, { _id: 1, name: 1, imageUrl: 1, kind: 1, status: 1 }, { slug: 1, _id: 1 }, 100)
      ]);
      const categoryIds = categories.flatMap((row) => { const value=id(row._id); return value ? [value] : []; });
      const categoryCounts = categoryIds.length ? await connection.collection('properties').aggregate<{_id: unknown; count: number}>([
        { $match: { status: 'published', active: true, propertyTypeId: { $in: categoryIds.map((value) => new Types.ObjectId(value)) } } },
        { $group: { _id: '$propertyTypeId', count: { $sum: 1 } } }
      ]).toArray() : [];
      const countById = new Map(categoryCounts.flatMap((row) => { const value=id(row._id); return value ? [[value,row.count] as const] : []; }));
      const mapId = (row: MongoRow) => id(row._id);
      const locationNames = new Map(locations.flatMap((row) => { const value = mapId(row); return value && row.name !== undefined ? [[value, row.name] as const] : []; }));
      const organizationById = new Map(organizations.flatMap((row) => { const value = mapId(row); return value && row.name !== undefined && typeof row.kind === 'string' ? [[value, { name: row.name, ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}), kind: row.kind }] as const] : []; }));
      return {
        sections: sections.flatMap((row) => mapId(row) && typeof row.key === 'string' && typeof row.order === 'number' && typeof row.status === 'string' && typeof row.visible === 'boolean' ? [{ key: row.key, title: row.title, ...(row.body !== undefined ? { body: row.body } : {}), order: row.order, status: row.status, visible: row.visible }] : []),
        categories: categories.flatMap((row) => { const rowId=mapId(row); return rowId && typeof row.slug==='string' && row.name!==undefined && typeof row.order==='number' && typeof row.active==='boolean' ? [{id:rowId,slug:row.slug,name:row.name,...(typeof row.imageUrl==='string'?{imageUrl:row.imageUrl}:{}),propertyCount:countById.get(rowId)??0,order:row.order,active:row.active}] : []; }),
        locations: locations.flatMap((row) => { const rowId = mapId(row); const parentLocationId = id(row.parentLocationId); return rowId && typeof row.kind === 'string' && row.name !== undefined && typeof row.slug === 'string' && typeof row.order === 'number' && typeof row.active === 'boolean' ? [{ id: rowId, kind: row.kind, name: row.name, slug: row.slug, ...(parentLocationId ? { parentLocationId } : {}), order: row.order, active: row.active }] : []; }),
        metrics: metrics.flatMap((row)=>typeof row.key==='string'&&row.title!==undefined&&typeof row.value==='number'&&typeof row.order==='number'&&typeof row.status==='string'&&typeof row.visible==='boolean'?[{key:row.key,title:row.title,value:row.value,...(row.unit!==undefined?{unit:row.unit}:{}),order:row.order,status:row.status,visible:row.visible}]:[]),
        properties: properties.flatMap((row) => { const rowId = mapId(row); const projectId = id(row.projectId); const locationId = id(row.locationId); const organizationId = id(row.organizationId); const organization = organizationId ? organizationById.get(organizationId) : undefined; return rowId && typeof row.slug === 'string' && typeof row.kind === 'string' && row.name !== undefined && typeof row.transactionType === 'string' && typeof row.status === 'string' && typeof row.active === 'boolean' ? [{ id: rowId, slug: row.slug, kind: row.kind, name: row.name, transactionType: row.transactionType, ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(projectId ? { projectId } : {}), ...(locationId && locationNames.has(locationId) ? { locationName: locationNames.get(locationId) } : {}), ...(organization ? { sourceName: organization.name, ...(organization.imageUrl ? { sourceImageUrl: organization.imageUrl } : {}), sourceType: organization.kind, sourceVerified: true } : {}), ...(typeof row.publicCode === 'string' ? { publicCode: row.publicCode } : {}), ...(typeof row.viewCount === 'number' ? { viewCount: row.viewCount } : {}), ...(Array.isArray(row.paymentPlans) ? { installmentAvailable: row.paymentPlans.length > 0 } : {}), ...(typeof row.featured === 'boolean' ? { featured: row.featured } : {}), ...(typeof row.deliveryStatus === 'string' ? { deliveryStatus: row.deliveryStatus } : {}), ...(typeof row.featuredOrder === 'number' ? { featuredOrder: row.featuredOrder } : {}), ...(row.description !== undefined ? { description: row.description } : {}), ...(row.area !== undefined ? { area: row.area } : {}), ...(row.layout !== undefined ? { layout: row.layout } : {}), ...(row.price !== undefined ? { price: row.price } : {}), status: row.status, active: row.active }] : []; }),
        developers: developers.flatMap((row) => { const rowId = mapId(row); return rowId && typeof row.slug === 'string' && row.name !== undefined && typeof row.kind === 'string' && typeof row.status === 'string' ? [{ id: rowId, slug: row.slug, name: row.name, ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(row.description !== undefined ? { description: row.description } : {}), kind: row.kind, status: row.status }] : [] }),
        content: [...about, ...tips].flatMap((row) => typeof row.key === 'string' && row.title !== undefined && typeof row.order === 'number' && typeof row.status === 'string' ? [{ key: row.key, type: about.includes(row) ? 'about' as const : 'tip' as const, title: row.title, ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(row.body !== undefined ? { body: row.body } : {}), order: row.order, status: row.status, ...(typeof row.active === 'boolean' ? { active: row.active } : {}) }] : []),
        banners: banners.flatMap((row) => typeof row.key === 'string' && typeof row.order === 'number' && typeof row.status === 'string' ? [{ key: row.key, ...(row.title !== undefined ? { title: row.title } : {}), ...(row.eyebrow !== undefined ? { eyebrow: row.eyebrow } : {}), ...(row.body !== undefined ? { body: row.body } : {}), ...(row.highlight !== undefined ? { highlight: row.highlight } : {}), ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(row.targetUrl ? { targetUrl: row.targetUrl } : {}), order: row.order, status: row.status, ...(typeof row.active === 'boolean' ? { active: row.active } : {}) }] : [])
      };
    }
  };
}
