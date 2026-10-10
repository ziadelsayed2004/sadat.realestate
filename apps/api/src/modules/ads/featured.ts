import { Types, type Connection } from 'mongoose';
import { featuredOptionsSchema, type FeaturedCreative } from '@sadat-real-estate/contracts';
import { createProviderVisibilityReader } from '../provider/visibility.js';
import { ApiContractError } from '../contracts/error-boundary.js';
import { unexpiredPropertyFilter } from '../settings/property-policy.js';

const id = (value: unknown): string | undefined => value instanceof Types.ObjectId ? value.toHexString() : typeof value === 'string' && /^[a-f0-9]{24}$/.test(value) ? value : undefined;
const missing = () => new ApiContractError('FEATURED_ADVERTISER_UNAVAILABLE', 'errors.validation', 400);
export async function featuredAdvertiser(connection: Connection, providerId: string) {
  const policy = await createProviderVisibilityReader(connection).read(providerId);
  if (!policy.publicIdentity || !policy.accountId) return undefined;
  const account = new Types.ObjectId(policy.accountId);
  const profiles = await connection.collection('provider_profiles').find({ userId: account }, { projection: { _id: 1 } }).toArray();
  const applications = await connection.collection('provider_applications').find({ userId: account }, { projection: { _id: 1 } }).toArray();
  const ownerIds = [account, ...profiles.map(row => row._id), ...applications.map(row => row._id)];
  const organization = await connection.collection('organizations').findOne({ providerId: { $in: [...ownerIds, ...ownerIds.map(value => value.toString())] }, status: 'approved' }, { projection: { _id: 1, name: 1, slug: 1, imageUrl: 1 } });
  if (!organization || !organization.name || typeof organization.slug !== 'string') return undefined;
  return { policy, ownerIds, organization, identity: { id: providerId, name: organization.name, ...(typeof organization.imageUrl === 'string' ? { imageUrl: organization.imageUrl } : {}), verified: policy.approved } };
}
export async function featuredOptions(connection: Connection, providerId?: string) {
  const rows = await connection.collection('provider_applications').find({ status: 'approved' }, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(100).toArray();
  const advertisers = [];
  for (let offset = 0; offset < rows.length; offset += 8) {
    const group = await Promise.all(rows.slice(offset, offset + 8).map(row => featuredAdvertiser(connection, row._id.toString())));
    advertisers.push(...group.flatMap(value => value ? [value.identity] : []));
  }
  if (!providerId) return featuredOptionsSchema.parse({ advertisers, destinations: [] });
  const advertiser = await featuredAdvertiser(connection, providerId);
  if (!advertiser) throw missing();
  return featuredOptionsSchema.parse({ advertisers, destinations: await featuredDestinations(connection, advertiser) });
}
async function featuredDestinations(connection: Connection, advertiser: NonNullable<Awaited<ReturnType<typeof featuredAdvertiser>>>) {
  const orgId = advertiser.organization._id;
  const ownership = { $or: [{ organizationId: { $in: [orgId, orgId.toString()] } }, { providerId: { $in: [...advertiser.ownerIds, ...advertiser.ownerIds.map(value => value.toString())] } }] };
  const [properties, projects] = await Promise.all([
    connection.collection('properties').find({ $and: [ownership, unexpiredPropertyFilter()], status: 'published', active: true }, { projection: { name: 1, slug: 1 } }).sort({ slug: 1 }).limit(100).toArray(),
    connection.collection('projects').find({ ...ownership, status: 'published' }, { projection: { name: 1, slug: 1 } }).sort({ slug: 1 }).limit(100).toArray()
  ]);
  return featuredOptionsSchema.shape.destinations.parse([
    { kind: 'organization', id: orgId.toString(), name: advertiser.organization.name, href: `/developers/${advertiser.organization.slug}` },
    ...properties.flatMap(row => id(row._id) && typeof row.slug === 'string' ? [{ kind: 'property', id: row._id.toString(), name: row.name, href: `/properties/${row.slug}` }] : []),
    ...projects.flatMap(row => id(row._id) && typeof row.slug === 'string' ? [{ kind: 'project', id: row._id.toString(), name: row.name, href: `/developers/${advertiser.organization.slug}#project-${row.slug}` }] : [])
  ]);
}
export async function resolveFeatured(connection: Connection, creative: FeaturedCreative) {
  if (!creative.advertiserProviderId || !creative.destination) throw missing();
  const advertiser = await featuredAdvertiser(connection, creative.advertiserProviderId);
  if (!advertiser) throw missing();
  const target = creative.destination;
  const destinations = await featuredDestinations(connection, advertiser);
  const destination = destinations.find(value => value.kind === target.kind && value.id === target.id);
  if (!destination) throw new ApiContractError('FEATURED_DESTINATION_UNAVAILABLE', 'errors.validation', 400);
  return { advertiser: advertiser.identity, targetPath: destination.href };
}
