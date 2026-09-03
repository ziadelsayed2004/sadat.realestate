import { Types, type Connection } from 'mongoose';
import { publicHomepageCategorySchema, publicPropertyListItemSchema, publicPropertyListDataSchema, publicPropertyLocationSchema, publicPropertySearchQuerySchema, type PublicHomepageCategory, type PublicPropertyListData, type PublicPropertyLocation, type PublicPropertySearchQuery } from '@sadat-real-estate/contracts';

export interface PublicPropertySearchSource {
  id: string;
  slug: string;
  kind: string;
  name: unknown;
  transactionType: string;
  imageUrl?: string;
  projectId?: string;
  propertyTypeId?: string;
  locationId?: string;
  organizationId?: string;
  locationName?: unknown;
  sourceName?: unknown;
  sourceImageUrl?: string;
  sourceType?: string;
  publicCode?: string;
  viewCount?: number;
  installmentAvailable?: boolean;
  featured?: boolean;
  deliveryStatus?: string;
  description?: unknown;
  area?: unknown;
  layout?: unknown;
  price?: unknown;
  status: string;
  active: boolean;
}

export interface PublicPropertySearchRepository {
  list(query: PublicPropertySearchQuery): Promise<{ items: PublicPropertySearchSource[]; total: number; categories: PublicHomepageCategory[]; propertyTypes: PublicHomepageCategory[]; locations?: PublicPropertyLocation[] }>;
}

function item(source: PublicPropertySearchSource) {
  const parsed = publicPropertyListItemSchema.safeParse({
    id: source.id,
    slug: source.slug,
    kind: source.kind,
    name: source.name,
    transactionType: source.transactionType,
    ...(source.imageUrl ? { imageUrl: source.imageUrl } : {}),
    ...(source.projectId ? { projectId: source.projectId } : {}),
    ...(source.locationName !== undefined ? { locationName: source.locationName } : {}),
    ...(source.sourceName !== undefined ? { sourceName: source.sourceName } : {}),
    ...(source.sourceImageUrl !== undefined ? { sourceImageUrl: source.sourceImageUrl } : {}),
    ...(source.sourceType !== undefined ? { sourceType: source.sourceType } : {}),
    ...(source.publicCode ? { publicCode: source.publicCode } : {}),
    ...(source.viewCount !== undefined ? { viewCount: source.viewCount } : {}),
    ...(source.installmentAvailable !== undefined ? { installmentAvailable: source.installmentAvailable } : {}),
    ...(source.featured !== undefined ? { featured: source.featured } : {}),
    ...(source.deliveryStatus ? { deliveryStatus: source.deliveryStatus } : {}),
    ...(source.description !== undefined ? { description: source.description } : {}),
    ...(source.area !== undefined ? { area: source.area } : {}),
    ...(source.layout !== undefined ? { layout: source.layout } : {}),
    ...(source.price !== undefined ? { price: source.price } : {})
  });
  return parsed.success ? parsed.data : null;
}

export function createPublicPropertySearchService(dependencies: { repository: PublicPropertySearchRepository }) {
  return {
    async list(unparsedQuery: unknown): Promise<PublicPropertyListData> {
      const query = publicPropertySearchQuerySchema.parse(unparsedQuery);
      const result = await dependencies.repository.list(query);
      const items = result.items.filter((source) => source.status === 'published' && source.active).flatMap((source) => {
        const value = item(source);
        return value ? [value] : [];
      });
      return publicPropertyListDataSchema.parse({ items, categories: result.categories, propertyTypes: result.propertyTypes, ...(result.locations === undefined ? {} : { locations: result.locations }), page: query.page, limit: query.limit, total: result.total });
    }
  };
}

type MongoPropertyRow = {
  _id?: unknown;
  slug?: string;
  kind?: string;
  name?: unknown;
  transactionType?: string;
  imageUrl?: string;
  projectId?: unknown;
  propertyTypeId?: unknown;
  locationId?: unknown;
  organizationId?: unknown;
  viewCount?: number;
  paymentPlans?: unknown[];
  deliveryStatus?: string;
  description?: unknown;
  area?: unknown;
  layout?: unknown;
  price?: unknown;
  status?: string;
  active?: boolean;
};

type NamedMongoRow = { _id?: unknown; name?: unknown; status?: string; active?: boolean; imageUrl?: string; kind?: string; slug?: string; order?: number; parentLocationId?: unknown };
type TaxonomyMongoRow = NamedMongoRow & { slug?: string; imageUrl?: string; order?: number; kind?: string; categoryId?: unknown };

function id(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') return (value as { toHexString: () => string }).toHexString();
  return undefined;
}

type PublicOrganizationProjection = { name: unknown; imageUrl?: string; kind?: string };

function source(row: MongoPropertyRow, locations = new Map<string, unknown>(), organizations = new Map<string, PublicOrganizationProjection>(), featuredSlugs = new Set<string>()): PublicPropertySearchSource | null {
  const rowId = id(row._id);
  if (!rowId || typeof row.slug !== 'string' || typeof row.kind !== 'string' || row.name === undefined || typeof row.transactionType !== 'string' || typeof row.status !== 'string' || typeof row.active !== 'boolean') return null;
  const projectId = id(row.projectId);
  const propertyTypeId = id(row.propertyTypeId);
  const locationId = id(row.locationId);
  const organizationId = id(row.organizationId);
  const organization = organizationId ? organizations.get(organizationId) : undefined;
  return { id: rowId, slug: row.slug, kind: row.kind, name: row.name, transactionType: row.transactionType, ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}), ...(projectId ? { projectId } : {}), ...(propertyTypeId ? { propertyTypeId } : {}), ...(typeof row.deliveryStatus === 'string' ? { deliveryStatus: row.deliveryStatus } : {}), ...(locationId ? { locationId, ...(locations.has(locationId) ? { locationName: locations.get(locationId) } : {}) } : {}), ...(organizationId ? { organizationId, ...(organization ? { sourceName: organization.name, ...(organization.imageUrl ? { sourceImageUrl: organization.imageUrl } : {}), ...(organization.kind ? { sourceType: organization.kind } : {}) } : {}) } : {}), ...(typeof row.viewCount === 'number' ? { viewCount: row.viewCount } : {}), ...(row.paymentPlans ? { installmentAvailable: row.paymentPlans.length > 0 } : {}), ...(featuredSlugs.has(row.slug) ? { featured: true } : {}), ...(row.description !== undefined ? { description: row.description } : {}), ...(row.area !== undefined ? { area: row.area } : {}), ...(row.layout !== undefined ? { layout: row.layout } : {}), ...(row.price !== undefined ? { price: row.price } : {}), status: row.status, active: row.active };
}

export function createMongoosePublicPropertySearchRepository(connection: Connection): PublicPropertySearchRepository {
  return {
    async list(query) {
      const filter: Record<string, unknown> = { status: 'published', active: true };
      if (query.kind) filter.kind = query.kind;
      if (query.transactionType) filter.transactionType = query.transactionType;
      if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
      if (query.propertyCategoryId) {
        const childTypes = await connection.collection('property_taxonomy').find({ kind: 'type', categoryId: new Types.ObjectId(query.propertyCategoryId), active: true }, { projection: { _id: 1 } }).limit(100).toArray();
        filter.propertyTypeId = { $in: childTypes.flatMap((row) => { const value = id(row._id); return value ? [new Types.ObjectId(value)] : []; }) };
      }
      if (query.propertyTypeId) filter.propertyTypeId = new Types.ObjectId(query.propertyTypeId);
      if (query.deliveryStatus) filter.deliveryStatus = query.deliveryStatus;
      if (query.locationId) filter.locationId = new Types.ObjectId(query.locationId);
      if (query.search) filter.$text = { $search: query.search };
      if (query.bedrooms !== undefined) filter['layout.bedrooms'] = query.bedrooms;
      if (query.minPrice !== undefined || query.maxPrice !== undefined) filter['price.amount'] = { ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}) };
      const direction: 1 | -1 = query.direction === 'asc' ? 1 : -1;
      const sortField = query.sort === 'price' ? 'price.amount' : query.sort === 'name' ? 'name.en' : query.sort;
      const sort: Record<string, 1 | -1> = { [sortField]: direction, slug: 1, _id: 1 };
      const collection = connection.collection('properties');
      const [rows, total, taxonomyRows, allLocationRows] = await Promise.all([
        collection.find(filter, { projection: { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, imageUrl: 1, projectId: 1, propertyTypeId: 1, deliveryStatus: 1, locationId: 1, organizationId: 1, viewCount: 1, paymentPlans: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 } }).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).toArray() as Promise<MongoPropertyRow[]>,
        collection.countDocuments(filter),
        connection.collection('property_taxonomy').find({ kind: { $in: ['category', 'type'] }, active: true }, { projection: { _id: 1, slug: 1, name: 1, imageUrl: 1, order: 1, kind: 1, categoryId: 1, active: 1 } }).sort({ kind: 1, order: 1, slug: 1, _id: 1 }).limit(200).toArray() as Promise<TaxonomyMongoRow[]>,
        connection.collection('locations').find({ active: true }, { projection: { _id: 1, name: 1, kind: 1, slug: 1, parentLocationId: 1, order: 1, active: 1 } }).sort({ kind: 1, order: 1, slug: 1, _id: 1 }).limit(500).toArray() as Promise<NamedMongoRow[]>
      ]);
      const organizationIds = [...new Set(rows.flatMap((row) => { const value = id(row.organizationId); return value ? [value] : []; }))];
      const typeRows = taxonomyRows.filter((row) => row.kind === 'type');
      const taxonomyIds = typeRows.flatMap((row) => { const value = id(row._id); return value ? [value] : []; });
      const now = new Date();
      const [organizationRows, categoryCounts, featuredRows] = await Promise.all([
        organizationIds.length ? connection.collection('organizations').find({ _id: { $in: organizationIds.map((value) => new Types.ObjectId(value)) }, status: 'approved' }, { projection: { _id: 1, name: 1, imageUrl: 1, kind: 1, status: 1 } }).toArray() as Promise<NamedMongoRow[]> : [],
        taxonomyIds.length ? collection.aggregate<{ _id: unknown; count: number }>([{ $match: { status: 'published', active: true, propertyTypeId: { $in: taxonomyIds.map((value) => new Types.ObjectId(value)) } } }, { $group: { _id: '$propertyTypeId', count: { $sum: 1 } } }]).toArray() : [],
        rows.length ? connection.collection('ad_banners').find({ status: 'active', startAt: { $lte: now }, endAt: { $gt: now }, $or: rows.map((row) => ({ targetUrl: { $regex: `/properties/${row.slug}$` } })) }, { projection: { targetUrl: 1 } }).limit(100).toArray() as Promise<Array<{ targetUrl?: string }>> : []
      ]);
      const names = new Map(allLocationRows.flatMap((row) => { const rowId = id(row._id); return rowId && row.name !== undefined ? [[rowId, row.name] as const] : []; }));
      const locations = allLocationRows.flatMap((row) => {
        const rowId = id(row._id);
        if (!rowId || row.name === undefined || typeof row.kind !== 'string' || typeof row.slug !== 'string' || typeof row.order !== 'number') return [];
        const parentLocationId = id(row.parentLocationId);
        const parsed = publicPropertyLocationSchema.safeParse({ id: rowId, kind: row.kind, name: row.name, slug: row.slug, ...(parentLocationId ? { parentLocationId } : {}), order: row.order });
        return parsed.success ? [parsed.data] : [];
      });
      const organizations = new Map(organizationRows.flatMap((row) => { const rowId = id(row._id); return rowId && row.name !== undefined ? [[rowId, { name: row.name, ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}), ...(row.kind ? { kind: row.kind } : {}) }] as const] : []; }));
      const featuredSlugs = new Set(featuredRows.flatMap((row) => typeof row.targetUrl === 'string' ? [row.targetUrl.split('/').at(-1)!] : []));
      const countById = new Map(categoryCounts.flatMap((row) => { const rowId = id(row._id); return rowId ? [[rowId, row.count] as const] : []; }));
      const propertyTypes = typeRows.flatMap((row) => {
        const rowId = id(row._id);
        if (!rowId || typeof row.slug !== 'string' || row.name === undefined || typeof row.order !== 'number') return [];
        const parsed = publicHomepageCategorySchema.safeParse({ id: rowId, slug: row.slug, name: row.name, ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}), propertyCount: countById.get(rowId) ?? 0, order: row.order });
        return parsed.success ? [parsed.data] : [];
      });
      const countByCategoryId = new Map<string, number>();
      for (const row of typeRows) {
        const rowId = id(row._id);
        const categoryId = id(row.categoryId);
        if (rowId && categoryId) countByCategoryId.set(categoryId, (countByCategoryId.get(categoryId) ?? 0) + (countById.get(rowId) ?? 0));
      }
      const categories = taxonomyRows.filter((row) => row.kind === 'category').flatMap((row) => {
        const rowId = id(row._id);
        if (!rowId || typeof row.slug !== 'string' || row.name === undefined || typeof row.order !== 'number') return [];
        const parsed = publicHomepageCategorySchema.safeParse({ id: rowId, slug: row.slug, name: row.name, ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}), propertyCount: countByCategoryId.get(rowId) ?? 0, order: row.order });
        return parsed.success ? [parsed.data] : [];
      });
      return { items: rows.flatMap((row) => { const value = source(row, names, organizations, featuredSlugs); return value ? [value] : []; }), total, categories, propertyTypes, locations };
    }
  };
}
