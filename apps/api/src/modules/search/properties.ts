import { Types, type Connection } from 'mongoose';
import { publicHomepagePropertySchema, publicPropertyListDataSchema, publicPropertySearchQuerySchema, type PublicPropertyListData, type PublicPropertySearchQuery } from '@sadat-real-estate/contracts';

export interface PublicPropertySearchSource {
  id: string;
  slug: string;
  kind: string;
  name: unknown;
  transactionType: string;
  imageUrl?: string;
  projectId?: string;
  description?: unknown;
  area?: unknown;
  layout?: unknown;
  price?: unknown;
  status: string;
  active: boolean;
}

export interface PublicPropertySearchRepository {
  list(query: PublicPropertySearchQuery): Promise<{ items: PublicPropertySearchSource[]; total: number }>;
}

function item(source: PublicPropertySearchSource) {
  const parsed = publicHomepagePropertySchema.safeParse({
    id: source.id,
    slug: source.slug,
    kind: source.kind,
    name: source.name,
    transactionType: source.transactionType,
    ...(source.imageUrl ? { imageUrl: source.imageUrl } : {}),
    ...(source.projectId ? { projectId: source.projectId } : {}),
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
      return publicPropertyListDataSchema.parse({ items, page: query.page, limit: query.limit, total: result.total });
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
  description?: unknown;
  area?: unknown;
  layout?: unknown;
  price?: unknown;
  status?: string;
  active?: boolean;
};

function id(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') return (value as { toHexString: () => string }).toHexString();
  return undefined;
}

function source(row: MongoPropertyRow): PublicPropertySearchSource | null {
  const rowId = id(row._id);
  if (!rowId || typeof row.slug !== 'string' || typeof row.kind !== 'string' || row.name === undefined || typeof row.transactionType !== 'string' || typeof row.status !== 'string' || typeof row.active !== 'boolean') return null;
  const projectId = id(row.projectId);
  return { id: rowId, slug: row.slug, kind: row.kind, name: row.name, transactionType: row.transactionType, ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}), ...(projectId ? { projectId } : {}), ...(row.description !== undefined ? { description: row.description } : {}), ...(row.area !== undefined ? { area: row.area } : {}), ...(row.layout !== undefined ? { layout: row.layout } : {}), ...(row.price !== undefined ? { price: row.price } : {}), status: row.status, active: row.active };
}

export function createMongoosePublicPropertySearchRepository(connection: Connection): PublicPropertySearchRepository {
  return {
    async list(query) {
      const filter: Record<string, unknown> = { status: 'published', active: true };
      if (query.kind) filter.kind = query.kind;
      if (query.transactionType) filter.transactionType = query.transactionType;
      if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
      if (query.locationId) filter.locationId = new Types.ObjectId(query.locationId);
      if (query.search) filter.$text = { $search: query.search };
      if (query.bedrooms !== undefined) filter['layout.bedrooms'] = query.bedrooms;
      if (query.minPrice !== undefined || query.maxPrice !== undefined) filter['price.amount'] = { ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}) };
      const direction: 1 | -1 = query.direction === 'asc' ? 1 : -1;
      const sortField = query.sort === 'price' ? 'price.amount' : query.sort === 'name' ? 'name.en' : query.sort;
      const sort: Record<string, 1 | -1> = { [sortField]: direction, slug: 1, _id: 1 };
      const collection = connection.collection('properties');
      const [rows, total] = await Promise.all([
        collection.find(filter, { projection: { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, imageUrl: 1, projectId: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 } }).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).toArray() as Promise<MongoPropertyRow[]>,
        collection.countDocuments(filter)
      ]);
      return { items: rows.flatMap((row) => { const value = source(row); return value ? [value] : []; }), total };
    }
  };
}
