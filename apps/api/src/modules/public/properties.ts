import { Types, type Connection } from 'mongoose';
import { propertySlugSchema, publicPropertyDetailsSchema, publicPropertyRelatedPropertySchema, type PublicPropertyDetails } from '@sadat-real-estate/contracts';

export interface PublicPropertyDetailsSource {
  id: string;
  slug: string;
  kind: string;
  name: unknown;
  transactionType: string;
  imageUrl?: string;
  locationId?: string;
  locationName?: unknown;
  publicCode?: string;
  viewCount?: number;
  deliveryStatus?: string;
  installmentAvailable?: boolean;
  sourceType: string;
  organizationId?: string;
  sourceName?: unknown;
  sourceImageUrl?: string;
  sourceVerified?: boolean;
  projectId?: string;
  description?: unknown;
  area?: unknown;
  layout?: unknown;
  price?: unknown;
  status: string;
  active: boolean;
  project?: { id: string; slug: string; name: unknown; description?: unknown; status: string } | null;
  media: Array<{ id: string; propertyId: string; kind: string; imageUrl?: string; originalFilename: string; detectedMime: string; byteSize: number; sortOrder: number; isCover: boolean; processingState: string; active: boolean }>;
  relatedProperties: Array<{ id: string; slug: string; kind: string; name: unknown; transactionType: string; imageUrl?: string; locationId?: string; locationName?: unknown; publicCode?: string; viewCount?: number; deliveryStatus?: string; installmentAvailable?: boolean; sourceType?: string; organizationId?: string; sourceName?: unknown; sourceImageUrl?: string; sourceVerified?: boolean; projectId?: string; description?: unknown; area?: unknown; layout?: unknown; price?: unknown; status: string; active: boolean }>;
  features?: Array<{ id: string; kind: string; groupKey: string; name: unknown; detail?: unknown; distanceLabel?: unknown; slug: string; order: number; active: boolean }>;
  services?: Array<{ id: string; kind: string; groupKey: string; name: unknown; detail?: unknown; distanceLabel?: unknown; slug: string; order: number; active: boolean }>;
}

export interface PublicPropertyDetailsRepository { findBySlug(slug: string): Promise<PublicPropertyDetailsSource | null> }

function card(source: { id: string; slug: string; kind: string; name: unknown; transactionType: string; imageUrl?: string; locationName?: unknown; publicCode?: string; viewCount?: number; deliveryStatus?: string; installmentAvailable?: boolean; sourceType?: string; sourceName?: unknown; sourceImageUrl?: string; sourceVerified?: boolean; projectId?: string; description?: unknown; area?: unknown; layout?: unknown; price?: unknown; status: string; active: boolean }) {
  const parsed = publicPropertyRelatedPropertySchema.safeParse({
    id: source.id,
    slug: source.slug,
    kind: source.kind,
    name: source.name,
    transactionType: source.transactionType,
    ...(source.imageUrl ? { imageUrl: source.imageUrl } : {}),
    ...(source.locationName !== undefined ? { locationName: source.locationName } : {}),
    ...(source.publicCode ? { publicCode: source.publicCode } : {}),
    ...(source.deliveryStatus ? { deliveryStatus: source.deliveryStatus } : {}),
    ...(source.installmentAvailable !== undefined ? { installmentAvailable: source.installmentAvailable } : {}),
    ...(source.sourceType ? { sourceType: source.sourceType } : {}),
    ...(source.sourceName !== undefined ? { sourceName: source.sourceName } : {}),
    ...(source.sourceImageUrl ? { sourceImageUrl: source.sourceImageUrl } : {}),
    ...(source.sourceVerified !== undefined ? { sourceVerified: source.sourceVerified } : {}),
    ...(source.viewCount !== undefined ? { viewCount: source.viewCount } : {}),
    ...(source.projectId ? { projectId: source.projectId } : {}),
    ...(source.description !== undefined ? { description: source.description } : {}),
    ...(source.area !== undefined ? { area: source.area } : {}),
    ...(source.layout !== undefined ? { layout: source.layout } : {}),
    ...(source.price !== undefined ? { price: source.price } : {})
  });
  return parsed.success ? parsed.data : null;
}

export function publicPropertyDetailsProjection(source: PublicPropertyDetailsSource): PublicPropertyDetails | null {
  if (source.status !== 'published' || !source.active) return null;
  const property = card(source);
  if (!property) return null;
  const relatedProperties = source.relatedProperties.filter((value) => value.status === 'published' && value.active).flatMap((value) => { const result = card(value); return result ? [result] : []; }).sort((left, right) => left.slug.localeCompare(right.slug, 'en') || left.id.localeCompare(right.id, 'en')).slice(0, 20);
  const media = source.media.filter((value) => value.active && value.processingState === 'ready').flatMap((value) => {
    const result = { id: value.id, propertyId: value.propertyId, kind: value.kind, ...(value.imageUrl ? { imageUrl: value.imageUrl } : {}), originalFilename: value.originalFilename, detectedMime: value.detectedMime, byteSize: value.byteSize, sortOrder: value.sortOrder, isCover: value.isCover };
    return result.kind === 'image' || result.kind === 'floor_plan' ? (result.detectedMime === 'application/pdf' || result.detectedMime === 'image/jpeg' || result.detectedMime === 'image/png' ? [result] : []) : [];
  }).sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id, 'en')).slice(0, 50);
  const project = source.project && source.project.status === 'published' ? { id: source.project.id, slug: source.project.slug, name: source.project.name, ...(source.project.description !== undefined ? { description: source.project.description } : {}) } : null;
  const amenities=(kind:'feature'|'service') => [...(source[kind === 'feature' ? 'features' : 'services'] ?? [])].filter((value)=>value.active&&value.kind===kind).sort((a,b)=>a.order-b.order||a.slug.localeCompare(b.slug,'en')||a.id.localeCompare(b.id,'en')).map(({id,kind,groupKey,name,detail,distanceLabel,slug,order})=>({id,kind,groupKey,name,...(detail!==undefined?{detail}:{}),...(distanceLabel!==undefined?{distanceLabel}:{}),slug,order}));
  const publicProperty = {
    id: property.id,
    slug: property.slug,
    kind: property.kind,
    name: property.name,
    transactionType: property.transactionType,
    ...(property.imageUrl ? { imageUrl: property.imageUrl } : {}),
    ...(property.projectId ? { projectId: property.projectId } : {}),
    ...(property.description !== undefined ? { description: property.description } : {}),
    ...(property.area !== undefined ? { area: property.area } : {}),
    ...(property.layout !== undefined ? { layout: property.layout } : {}),
    ...(property.price !== undefined ? { price: property.price } : {}),
    ...(property.locationName !== undefined ? { locationName: property.locationName } : {}),
    ...(property.publicCode ? { publicCode: property.publicCode } : {}),
    ...(property.deliveryStatus ? { deliveryStatus: property.deliveryStatus } : {}),
    ...(property.installmentAvailable !== undefined ? { installmentAvailable: property.installmentAvailable } : {})
  };
  return publicPropertyDetailsSchema.parse({ ...publicProperty, source: { sourceType: source.sourceType, ...(source.organizationId ? { organizationId: source.organizationId } : {}), ...(source.sourceName !== undefined ? { name: source.sourceName } : {}), ...(source.sourceImageUrl ? { imageUrl: source.sourceImageUrl } : {}), ...(source.sourceVerified !== undefined ? { verified: source.sourceVerified } : {}) }, seo: { title: source.name, ...(source.description !== undefined ? { description: source.description } : {}), slug: source.slug }, project, media, features:amenities('feature'), services:amenities('service'), relatedProperties });
}

export function createPublicPropertyDetailsService(dependencies: { repository: PublicPropertyDetailsRepository }) {
  return { async get(slug: string): Promise<PublicPropertyDetails | null> { const source = await dependencies.repository.findBySlug(propertySlugSchema.parse(slug)); return source ? publicPropertyDetailsProjection(source) : null; } };
}

type Row = Record<string, unknown>;
function id(value: unknown): string | undefined { if (typeof value === 'string') return value; if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') return (value as { toHexString: () => string }).toHexString(); return undefined; }
function property(row: Row): PublicPropertyDetailsSource | null {
  const rowId = id(row._id); const slug = row.slug; const kind = row.kind; const name = row.name; const transactionType = row.transactionType; const sourceType = row.sourceType; const status = row.status; const active = row.active;
  if (!rowId || typeof slug !== 'string' || typeof kind !== 'string' || name === undefined || typeof transactionType !== 'string' || typeof sourceType !== 'string' || typeof status !== 'string' || typeof active !== 'boolean') return null;
  const projectId = id(row.projectId); const organizationId = id(row.organizationId); const locationId = id(row.locationId);
  return { id: rowId, slug, kind, name, transactionType, sourceType, ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}), ...(locationId ? { locationId } : {}), ...(typeof row.publicCode === 'string' ? { publicCode: row.publicCode } : {}), ...(typeof row.viewCount === 'number' ? { viewCount: row.viewCount } : {}), ...(typeof row.deliveryStatus === 'string' ? { deliveryStatus: row.deliveryStatus } : {}), ...(Array.isArray(row.paymentPlans) ? { installmentAvailable: row.paymentPlans.length > 0 } : {}), ...(organizationId ? { organizationId } : {}), ...(projectId ? { projectId } : {}), ...(row.description !== undefined ? { description: row.description } : {}), ...(row.area !== undefined ? { area: row.area } : {}), ...(row.layout !== undefined ? { layout: row.layout } : {}), ...(row.price !== undefined ? { price: row.price } : {}), status, active, media: [], features: [], services: [], relatedProperties: [] };
}

export function createMongoosePublicPropertyDetailsRepository(connection: Connection): PublicPropertyDetailsRepository {
  return { async findBySlug(slug) {
    const properties = connection.collection('properties');
    const row = await properties.findOne({ slug, status: 'published', active: true }, { projection: { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, imageUrl: 1, sourceType: 1, organizationId: 1, projectId: 1, locationId: 1, publicCode: 1, viewCount: 1, deliveryStatus: 1, paymentPlans: 1, featureIds:1, serviceIds:1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 } });
    const base = property(row as Row | null ?? {}); if (!base) return null;
    const project = base.projectId ? await connection.collection('projects').findOne({ _id: new Types.ObjectId(base.projectId), status: 'published' }, { projection: { _id: 1, slug: 1, name: 1, description: 1, status: 1 } }) : null;
    const location = base.locationId ? await connection.collection('locations').findOne({ _id: new Types.ObjectId(base.locationId), active: true }, { projection: { name: 1, active: 1 } }) : null;
    const media = await connection.collection('property_media').find({ propertyId: new Types.ObjectId(base.id), active: true, processingState: 'ready' }, { projection: { _id: 1, propertyId: 1, kind: 1, imageUrl: 1, originalFilename: 1, detectedMime: 1, byteSize: 1, sortOrder: 1, isCover: 1, processingState: 1, active: 1 } }).sort({ sortOrder: 1, _id: 1 }).limit(50).toArray();
    const featureIds=Array.isArray(row?.featureIds)?row.featureIds:[]; const serviceIds=Array.isArray(row?.serviceIds)?row.serviceIds:[];
    const amenityRows=await connection.collection('features_services').find({_id:{$in:[...featureIds,...serviceIds]},active:true},{projection:{_id:1,kind:1,groupKey:1,name:1,detail:1,distanceLabel:1,slug:1,order:1,active:1}}).sort({order:1,slug:1,_id:1}).limit(200).toArray();
    const amenities=amenityRows.flatMap((value)=>{const amenityId=id(value._id);return amenityId&&typeof value.kind==='string'&&typeof value.groupKey==='string'&&value.name!==undefined&&typeof value.slug==='string'&&typeof value.order==='number'&&typeof value.active==='boolean'?[{id:amenityId,kind:value.kind,groupKey:value.groupKey,name:value.name,...(value.detail!==undefined?{detail:value.detail}:{}),...(value.distanceLabel!==undefined?{distanceLabel:value.distanceLabel}:{}),slug:value.slug,order:value.order,active:value.active}]:[];});
    const relatedRows = base.projectId ? await properties.find({ projectId: new Types.ObjectId(base.projectId), _id: { $ne: new Types.ObjectId(base.id) }, status: 'published', active: true }, { projection: { _id: 1, slug: 1, kind: 1, name: 1, transactionType: 1, imageUrl: 1, sourceType: 1, organizationId: 1, projectId: 1, locationId: 1, publicCode: 1, viewCount: 1, deliveryStatus: 1, paymentPlans: 1, description: 1, area: 1, layout: 1, price: 1, status: 1, active: 1 } }).sort({ slug: 1, _id: 1 }).limit(20).toArray() : [];
    const relatedLocationIds = [...new Set(relatedRows.flatMap((value) => { const valueId = id(value.locationId); return valueId ? [valueId] : []; }))];
    const relatedOrganizationIds = [...new Set(relatedRows.flatMap((value) => { const valueId = id(value.organizationId); return valueId ? [valueId] : []; }))];
    const [relatedLocationRows, relatedOrganizationRows] = await Promise.all([
      relatedLocationIds.length ? connection.collection('locations').find({ _id: { $in: relatedLocationIds.map((value) => new Types.ObjectId(value)) }, active: true }, { projection: { _id: 1, name: 1 } }).toArray() : [],
      relatedOrganizationIds.length ? connection.collection('organizations').find({ _id: { $in: relatedOrganizationIds.map((value) => new Types.ObjectId(value)) }, status: 'approved' }, { projection: { _id: 1, name: 1, imageUrl: 1, status: 1 } }).toArray() : []
    ]);
    const relatedLocations = new Map<string, unknown>(relatedLocationRows.flatMap((value) => { const valueId = id(value._id); return valueId && value.name !== undefined ? [[valueId, value.name] as const] : []; }));
    const relatedOrganizations = new Map<string, { name: unknown; imageUrl?: string }>(relatedOrganizationRows.flatMap((value) => { const valueId = id(value._id); return valueId && value.name !== undefined ? [[valueId, { name: value.name, ...(typeof value.imageUrl === 'string' ? { imageUrl: value.imageUrl } : {}) }] as const] : []; }));
    const mappedProject = project ? { id: id(project._id) ?? '', slug: String(project.slug ?? ''), name: project.name, ...(project.description !== undefined ? { description: project.description } : {}), status: String(project.status ?? '') } : null;
    const mappedMedia = media.flatMap((value) => { const mediaId = id(value._id); const propertyId = id(value.propertyId); return mediaId && propertyId && typeof value.kind === 'string' && typeof value.originalFilename === 'string' && typeof value.detectedMime === 'string' && typeof value.byteSize === 'number' && typeof value.sortOrder === 'number' && typeof value.isCover === 'boolean' && typeof value.processingState === 'string' && typeof value.active === 'boolean' ? [{ id: mediaId, propertyId, kind: value.kind, ...(typeof value.imageUrl === 'string' ? { imageUrl: value.imageUrl } : {}), originalFilename: value.originalFilename, detectedMime: value.detectedMime, byteSize: value.byteSize, sortOrder: value.sortOrder, isCover: value.isCover, processingState: value.processingState, active: value.active }] : []; });
    const relatedProperties = relatedRows.flatMap((value) => {
      const mapped = property(value as Row);
      if (!mapped) return [];
      const relatedOrganization = mapped.organizationId ? relatedOrganizations.get(mapped.organizationId) : undefined;
      return [{
        id: mapped.id,
        slug: mapped.slug,
        kind: mapped.kind,
        name: mapped.name,
        transactionType: mapped.transactionType,
        ...(mapped.imageUrl ? { imageUrl: mapped.imageUrl } : {}),
        ...(mapped.locationId ? { locationId: mapped.locationId } : {}),
        ...(mapped.locationId && relatedLocations.has(mapped.locationId) ? { locationName: relatedLocations.get(mapped.locationId) } : {}),
        ...(mapped.publicCode ? { publicCode: mapped.publicCode } : {}),
        ...(mapped.viewCount !== undefined ? { viewCount: mapped.viewCount } : {}),
        ...(mapped.deliveryStatus ? { deliveryStatus: mapped.deliveryStatus } : {}),
        ...(mapped.installmentAvailable !== undefined ? { installmentAvailable: mapped.installmentAvailable } : {}),
        ...(mapped.sourceType ? { sourceType: mapped.sourceType } : {}),
        ...(mapped.organizationId ? { organizationId: mapped.organizationId } : {}),
        ...(relatedOrganization ? { sourceName: relatedOrganization.name, ...(relatedOrganization.imageUrl ? { sourceImageUrl: relatedOrganization.imageUrl } : {}), sourceVerified: true } : {}),
        ...(mapped.projectId ? { projectId: mapped.projectId } : {}),
        ...(mapped.description !== undefined ? { description: mapped.description } : {}),
        ...(mapped.area !== undefined ? { area: mapped.area } : {}),
        ...(mapped.layout !== undefined ? { layout: mapped.layout } : {}),
        ...(mapped.price !== undefined ? { price: mapped.price } : {}),
        status: mapped.status,
        active: mapped.active
      }];
    });
    const organization = base.organizationId ? await connection.collection('organizations').findOne({ _id: new Types.ObjectId(base.organizationId), status: 'approved' }, { projection: { name: 1, imageUrl: 1, status: 1 } }) : null;
    return { ...base, ...(location?.name !== undefined ? { locationName: location.name } : {}), ...(organization?.name !== undefined ? { sourceName: organization.name, sourceVerified: true } : {}), ...(typeof organization?.imageUrl === 'string' ? { sourceImageUrl: organization.imageUrl } : {}), project: mappedProject, media: mappedMedia, features:amenities.filter((value)=>value.kind==='feature'), services:amenities.filter((value)=>value.kind==='service'), relatedProperties };
  } };
}
