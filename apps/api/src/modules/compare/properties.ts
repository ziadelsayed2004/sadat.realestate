import { Types, type Connection } from 'mongoose';
import { PUBLIC_PROPERTY_COMPARISON_FIELDS, publicPropertyCompareRequestSchema, publicPropertyComparisonDataSchema, publicPropertyComparisonItemSchema, type PublicPropertyComparisonData } from '@sadat-real-estate/contracts';

export interface PublicPropertyComparisonSource { id: string; slug: string; kind: string; name: unknown; transactionType: string; imageUrl?: string; locationName?: unknown; propertyTypeName?: unknown; publicCode?: string; deliveryStatus?: string; installmentAvailable?: boolean; sourceType?: string; organizationId?: string; sourceName?: unknown; sourceImageUrl?: string; sourceVerified?: boolean; projectId?: string; description?: unknown; area?: unknown; layout?: unknown; price?: unknown; status: string; active: boolean }
export interface PublicPropertyComparisonRepository { findPublished(ids: string[]): Promise<PublicPropertyComparisonSource[]> }
export class PublicPropertyComparisonError extends Error { constructor(readonly code: 'PROPERTY_UNAVAILABLE') { super(code); this.name = 'PublicPropertyComparisonError'; } }

function card(source: PublicPropertyComparisonSource) {
  const parsed = publicPropertyComparisonItemSchema.safeParse({
    id: source.id,
    slug: source.slug,
    kind: source.kind,
    name: source.name,
    transactionType: source.transactionType,
    ...(source.imageUrl ? { imageUrl: source.imageUrl } : {}),
    ...(source.locationName !== undefined ? { locationName: source.locationName } : {}),
    ...(source.propertyTypeName !== undefined ? { propertyTypeName: source.propertyTypeName } : {}),
    ...(source.publicCode ? { publicCode: source.publicCode } : {}),
    ...(source.deliveryStatus ? { deliveryStatus: source.deliveryStatus } : {}),
    ...(source.installmentAvailable !== undefined ? { installmentAvailable: source.installmentAvailable } : {}),
    ...(source.sourceType ? { sourceType: source.sourceType } : {}),
    ...(source.sourceName !== undefined ? { sourceName: source.sourceName } : {}),
    ...(source.sourceImageUrl ? { sourceImageUrl: source.sourceImageUrl } : {}),
    ...(source.sourceVerified !== undefined ? { sourceVerified: source.sourceVerified } : {}),
    ...(source.projectId ? { projectId: source.projectId } : {}),
    ...(source.description !== undefined ? { description: source.description } : {}),
    ...(source.area !== undefined ? { area: source.area } : {}),
    ...(source.layout !== undefined ? { layout: source.layout } : {}),
    ...(source.price !== undefined ? { price: source.price } : {})
  });
  return parsed.success ? parsed.data : null;
}

export function createPublicPropertyComparisonService(dependencies: { repository: PublicPropertyComparisonRepository }) {
  return { async compare(unparsedInput: unknown): Promise<PublicPropertyComparisonData> {
    const input = publicPropertyCompareRequestSchema.parse(unparsedInput);
    const rows = await dependencies.repository.findPublished(input.propertyIds);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const items = input.propertyIds.map((id) => byId.get(id)).flatMap((row) => row ? (card(row) ? [card(row)!] : []) : []);
    if (items.length !== input.propertyIds.length) throw new PublicPropertyComparisonError('PROPERTY_UNAVAILABLE');
    return publicPropertyComparisonDataSchema.parse({ items, fields: [...PUBLIC_PROPERTY_COMPARISON_FIELDS] });
  } };
}

type Row = Record<string, unknown>;
function id(value: unknown): string | undefined { if (typeof value === 'string') return value; if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') return (value as { toHexString: () => string }).toHexString(); return undefined; }
function mapRow(row: Row): PublicPropertyComparisonSource | null {
  const rowId = id(row._id); const projectId = id(row.projectId); const organizationId = id(row.organizationId);
  if (!rowId || typeof row.slug !== 'string' || typeof row.kind !== 'string' || row.name === undefined || typeof row.transactionType !== 'string' || typeof row.status !== 'string' || typeof row.active !== 'boolean') return null;
  return {
    id: rowId,
    slug: row.slug,
    kind: row.kind,
    name: row.name,
    transactionType: row.transactionType,
    ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}),
    ...(row.propertyTypeName !== undefined ? { propertyTypeName: row.propertyTypeName } : {}),
    ...(typeof row.publicCode === 'string' ? { publicCode: row.publicCode } : {}),
    ...(typeof row.deliveryStatus === 'string' ? { deliveryStatus: row.deliveryStatus } : {}),
    ...(Array.isArray(row.paymentPlans) ? { installmentAvailable: row.paymentPlans.length > 0 } : {}),
    ...(typeof row.sourceType === 'string' ? { sourceType: row.sourceType } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(row.description !== undefined ? { description: row.description } : {}),
    ...(row.area !== undefined ? { area: row.area } : {}),
    ...(row.layout !== undefined ? { layout: row.layout } : {}),
    ...(row.price !== undefined ? { price: row.price } : {}),
    status: row.status,
    active: row.active
  };
}

export function createMongoosePublicPropertyComparisonRepository(connection: Connection): PublicPropertyComparisonRepository {
  return { async findPublished(ids) {
    const rows = await connection.collection('properties').find({ _id: { $in: ids.map((value) => new Types.ObjectId(value)) }, status: 'published', active: true }, { projection: { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, imageUrl: 1, sourceType: 1, organizationId: 1, projectId: 1, locationId: 1, propertyTypeId: 1, publicCode: 1, deliveryStatus: 1, paymentPlans: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 } }).toArray();
    const mapped = rows.flatMap((row) => { const value = mapRow(row as Row); return value ? [value] : []; });
    const organizationIds = [...new Set(mapped.flatMap((value) => value.organizationId ? [value.organizationId] : []))];
    const locationIds = [...new Set(rows.flatMap((row) => { const value = id((row as Row).locationId); return value ? [value] : []; }))];
    const propertyTypeIds = [...new Set(rows.flatMap((row) => { const value = id((row as Row).propertyTypeId); return value ? [value] : []; }))];
    const [organizations, locations, propertyTypes] = await Promise.all([
      organizationIds.length ? connection.collection('organizations').find({ _id: { $in: organizationIds.map((value) => new Types.ObjectId(value)) }, status: 'approved' }, { projection: { _id: 1, name: 1, imageUrl: 1 } }).toArray() : [],
      locationIds.length ? connection.collection('locations').find({ _id: { $in: locationIds.map((value) => new Types.ObjectId(value)) }, active: true }, { projection: { _id: 1, name: 1 } }).toArray() : [],
      propertyTypeIds.length ? connection.collection('property_taxonomy').find({ _id: { $in: propertyTypeIds.map((value) => new Types.ObjectId(value)) }, kind: 'type', active: true }, { projection: { _id: 1, name: 1 } }).toArray() : []
    ]);
    const organizationById = new Map<string, { name: unknown; imageUrl?: string }>(organizations.flatMap((row) => {
      const value = id((row as Row)._id);
      return value && (row as Row).name !== undefined ? [[value, { name: (row as Row).name, ...(typeof (row as Row).imageUrl === 'string' ? { imageUrl: (row as Row).imageUrl as string } : {}) }] as const] : [];
    }));
    const locationById = new Map<string, unknown>(locations.flatMap((row) => {
      const value = id((row as Row)._id);
      return value && (row as Row).name !== undefined ? [[value, (row as Row).name] as const] : [];
    }));
    const propertyTypeById = new Map<string, unknown>(propertyTypes.flatMap((row) => {
      const value = id((row as Row)._id);
      return value && (row as Row).name !== undefined ? [[value, (row as Row).name] as const] : [];
    }));
    return mapped.map((value, index) => {
      const row = rows[index] as Row;
      const organization = value.organizationId ? organizationById.get(value.organizationId) : undefined;
      const locationId = id(row.locationId);
      return {
        ...value,
        ...(locationId && locationById.has(locationId) ? { locationName: locationById.get(locationId) } : {}),
        ...(id(row.propertyTypeId) && propertyTypeById.has(id(row.propertyTypeId)!) ? { propertyTypeName: propertyTypeById.get(id(row.propertyTypeId)!) } : {}),
        ...(organization ? { sourceName: organization.name, ...(organization.imageUrl ? { sourceImageUrl: organization.imageUrl } : {}), sourceVerified: true } : {})
      };
    });
  } };
}
