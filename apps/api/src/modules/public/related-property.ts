import { Types } from 'mongoose';
import {
  publicPropertyRelatedPropertySchema,
  type PublicPropertyRelatedProperty
} from '@sadat-real-estate/contracts';

export type PublicRelatedPropertyRow = Record<string, unknown>;
export type PublicRelatedOrganization = { readonly name: unknown; readonly imageUrl?: string };

export const publicRelatedPropertyProjection = {
  _id: 1,
  slug: 1,
  kind: 1,
  name: 1,
  transactionType: 1,
  imageUrl: 1,
  locationId: 1,
  organizationId: 1,
  sourceType: 1,
  publicCode: 1,
  viewCount: 1,
  paymentPlans: 1,
  featured: 1,
  deliveryStatus: 1,
  projectId: 1,
  description: 1,
  area: 1,
  layout: 1,
  price: 1
} as const;

export function publicRelatedId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') {
    return (value as { toHexString: () => string }).toHexString();
  }
  return undefined;
}

export function publicRelatedObjectIds(values: readonly string[]): Types.ObjectId[] {
  return values.flatMap(value => /^[a-f0-9]{24}$/u.test(value) ? [new Types.ObjectId(value)] : []);
}

export function publicRelatedUnique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function projectPublicRelatedProperty(
  row: PublicRelatedPropertyRow,
  locationName: unknown,
  organization: PublicRelatedOrganization | undefined
): PublicPropertyRelatedProperty | undefined {
  const propertyId = publicRelatedId(row._id);
  const projectId = publicRelatedId(row.projectId);
  if (!propertyId || typeof row.slug !== 'string' || typeof row.kind !== 'string' || row.name === undefined || typeof row.transactionType !== 'string') return undefined;
  const parsed = publicPropertyRelatedPropertySchema.safeParse({
    id: propertyId,
    slug: row.slug,
    kind: row.kind,
    name: row.name,
    transactionType: row.transactionType,
    ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}),
    ...(projectId ? { projectId } : {}),
    ...(row.description !== undefined ? { description: row.description } : {}),
    ...(row.area !== undefined ? { area: row.area } : {}),
    ...(row.layout !== undefined ? { layout: row.layout } : {}),
    ...(row.price !== undefined ? { price: row.price } : {}),
    ...(locationName !== undefined ? { locationName } : {}),
    ...(typeof row.sourceType === 'string' ? { sourceType: row.sourceType } : {}),
    ...(organization?.name !== undefined ? { sourceName: organization.name, sourceVerified: true } : {}),
    ...(typeof organization?.imageUrl === 'string' ? { sourceImageUrl: organization.imageUrl } : {}),
    ...(typeof row.publicCode === 'string' ? { publicCode: row.publicCode } : {}),
    ...(typeof row.viewCount === 'number' ? { viewCount: row.viewCount } : {}),
    ...(Array.isArray(row.paymentPlans) ? { installmentAvailable: row.paymentPlans.length > 0 } : {}),
    ...(typeof row.featured === 'boolean' ? { featured: row.featured } : {}),
    ...(typeof row.deliveryStatus === 'string' ? { deliveryStatus: row.deliveryStatus } : {})
  });
  return parsed.success ? parsed.data : undefined;
}
