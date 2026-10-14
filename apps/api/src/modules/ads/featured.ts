import { Types, type Connection } from 'mongoose';
import { featuredOptionsSchema, type FeaturedCreative, type FeaturedOptions } from '@sadat-real-estate/contracts';
import { ApiContractError } from '../contracts/error-boundary.js';
import { unexpiredPropertyFilter } from '../settings/property-policy.js';

const id = (value: unknown): string | undefined => value instanceof Types.ObjectId ? value.toHexString() : typeof value === 'string' && /^[a-f0-9]{24}$/.test(value) ? value : undefined;
const missing = () => new ApiContractError('FEATURED_ADVERTISER_UNAVAILABLE', 'errors.validation', 400);
export async function featuredAdvertiser(connection: Connection, providerId: string) {
  // Featured advertising is available to every approved provider type. Directory
  // identity subscriptions and commission acknowledgements remain separate policies.
  if (!id(providerId)) return undefined;
  const key = new Types.ObjectId(providerId);
  const [application, profile] = await Promise.all([
    connection.collection('provider_applications').findOne({ $or: [{ _id: key }, { userId: key }] }, { projection: { userId: 1, status: 1, providerType: 1 } }),
    connection.collection('provider_profiles').findOne({ $or: [{ _id: key }, { userId: key }] }, { projection: { userId: 1, status: 1, providerType: 1 } })
  ]);
  const account = application?.userId ?? profile?.userId;
  if (!(account instanceof Types.ObjectId)) return undefined;
  const [user, profiles, applications] = await Promise.all([
    connection.collection('users').findOne({ _id: account, roleType: 'provider', status: 'verified', deletedAt: null }, { projection: { _id: 1 } }),
    connection.collection('provider_profiles').find({ userId: account }, { projection: { _id: 1, status: 1, providerType: 1 } }).toArray(),
    connection.collection('provider_applications').find({ userId: account }, { projection: { _id: 1, providerType: 1, status: 1, displayName: 1, tradeName: 1, brandName: 1, legalBusinessName: 1, legalCompanyName: 1 } }).toArray()
  ]);
  const business = applications.find(value => value.status === 'approved' && ['individual_broker', 'brokerage_office', 'developer_company'].includes(String(value.providerType)));
  if (!user || !business || !profiles.some(value => value.status === 'approved' && value.providerType === business.providerType)) return undefined;
  const ownerIds = [account, ...profiles.map(row => row._id), ...applications.map(row => row._id)];
  const organization = await connection.collection('organizations').findOne({ providerId: { $in: [...ownerIds, ...ownerIds.map(value => value.toString())] }, status: 'approved' }, { projection: { _id: 1, name: 1, slug: 1, imageUrl: 1 } });
  const businessName = [business?.brandName, business?.tradeName, business?.displayName, business?.legalCompanyName, business?.legalBusinessName].find(value => typeof value === 'string' && value.trim());
  const name = organization?.name ?? (typeof businessName === 'string' ? { ar: businessName.trim(), en: businessName.trim() } : undefined);
  if (!name) return undefined;
  return { ownerIds, organization, identity: { id: account.toString(), aliases: ownerIds.map(value => value.toString()), name, ...(typeof organization?.imageUrl === 'string' ? { imageUrl: organization.imageUrl } : {}), verified: true } };
}
export async function featuredOptions(connection: Connection, providerId?: string) {
  const advertisers: FeaturedOptions['advertisers'] = [];
  for (let page = 0; advertisers.length < 100; page += 1) {
    const rows = await connection.collection('provider_applications').find({ status: 'approved' }, { projection: { _id: 1 } }).sort({ _id: 1 }).skip(page * 100).limit(100).toArray();
    for (let offset = 0; offset < rows.length && advertisers.length < 100; offset += 8) {
      const group = await Promise.all(rows.slice(offset, offset + 8).map(row => featuredAdvertiser(connection, row._id.toString())));
      for (const value of group) if (value && advertisers.length < 100 && !advertisers.some(item => item.id === value.identity.id)) advertisers.push(value.identity);
    }
    if (rows.length < 100) break;
  }
  if (!providerId) return featuredOptionsSchema.parse({ advertisers, destinations: [] });
  const advertiser = await featuredAdvertiser(connection, providerId);
  if (!advertiser) throw missing();
  return featuredOptionsSchema.parse({ advertisers, destinations: await featuredDestinations(connection, advertiser) });
}
async function featuredDestinations(connection: Connection, advertiser: NonNullable<Awaited<ReturnType<typeof featuredAdvertiser>>>) {
  const organization = advertiser.organization;
  const orgId = organization?._id;
  const ownership = { $or: [...(orgId ? [{ organizationId: { $in: [orgId, orgId.toString()] } }] : []), { providerId: { $in: [...advertiser.ownerIds, ...advertiser.ownerIds.map(value => value.toString())] } }] };
  const [properties, projects] = await Promise.all([
    connection.collection('properties').find({ $and: [ownership, unexpiredPropertyFilter()], status: 'published', active: true }, { projection: { name: 1, slug: 1 } }).sort({ slug: 1 }).limit(100).toArray(),
    connection.collection('projects').find({ ...ownership, status: 'published' }, { projection: { name: 1, slug: 1 } }).sort({ slug: 1 }).limit(100).toArray()
  ]);
  return featuredOptionsSchema.shape.destinations.parse([
    ...(organization && orgId && typeof organization.slug === 'string' ? [{ kind: 'organization', id: orgId.toString(), name: organization.name, href: `/developers/${organization.slug}` }] : []),
    ...properties.flatMap(row => id(row._id) && typeof row.slug === 'string' ? [{ kind: 'property', id: row._id.toString(), name: row.name, href: `/properties/${row.slug}` }] : []),
    ...projects.flatMap(row => organization && typeof organization.slug === 'string' && id(row._id) && typeof row.slug === 'string' ? [{ kind: 'project', id: row._id.toString(), name: row.name, href: `/developers/${organization.slug}/projects/${row.slug}` }] : [])
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
