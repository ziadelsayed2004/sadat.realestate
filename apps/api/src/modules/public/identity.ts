import { Types, type Connection } from 'mongoose';
import { createProviderVisibilityReader, directoryIdentityVisible } from '../provider/visibility.js';

export async function individualPublicIdentity(connection: Connection, providerId: unknown) {
  const id = providerId instanceof Types.ObjectId ? providerId.toHexString() : typeof providerId === 'string' ? providerId : '';
  if (!/^[a-f0-9]{24}$/.test(id)) return undefined;
  const policy = await createProviderVisibilityReader(connection).read(id);
  if (!policy.approved || !policy.publicIdentity || policy.providerType !== 'individual_broker' || !policy.accountId) return undefined;
  const profile = await connection.collection('provider_profiles').findOne({ userId: new Types.ObjectId(policy.accountId), status: 'approved' }, { projection: { publicDisplayName: 1, publicImageUrl: 1 } });
  if (!profile?.publicDisplayName) return undefined;
  return { sourceName: profile.publicDisplayName as { ar?: string; en?: string }, ...(typeof profile.publicImageUrl === 'string' && /^\/api\/v1\/public\/organization-photos\/[a-f0-9]{24}$/.test(profile.publicImageUrl) ? { sourceImageUrl: profile.publicImageUrl } : {}), sourceVerified: true, sourceType: 'individual_broker' as const };
}

export async function attachIndividualPublicIdentities<T extends { id: string }>(connection: Connection, cards: T[], rows: readonly { _id?: unknown; providerId?: unknown; sourceType?: unknown }[]): Promise<T[]> {
  const owners = new Map(rows.filter(row => row.sourceType === 'individual_broker' && row.providerId).map(row => [String(row._id), row.providerId]));
  const cache = new Map<string, ReturnType<typeof individualPublicIdentity>>();
  const result: T[] = [];
  for (const card of cards) {
    const owner = owners.get(card.id);
    if (owner && !cache.has(String(owner))) cache.set(String(owner), individualPublicIdentity(connection, owner));
    result.push(owner ? { ...card, ...await cache.get(String(owner)) } : card);
  }
  return result;
}

export async function visiblePublicOrganizations<T extends object>(connection: Connection, rows: readonly T[], scope: 'identity' | 'directory' = 'identity'): Promise<T[]> {
  const reader = createProviderVisibilityReader(connection);
  const cache = new Map<string, Promise<boolean>>();
  const visible = (value: unknown) => {
    const id = value instanceof Types.ObjectId ? value.toHexString() : typeof value === 'string' ? value : '';
    if (!cache.has(id)) cache.set(id, reader.read(id).then(policy => scope === 'directory' ? directoryIdentityVisible(policy) : policy.publicIdentity));
    return cache.get(id)!;
  };
  const result: T[] = [];
  for (let offset = 0; offset < rows.length; offset += 8) {
    const group = rows.slice(offset, offset + 8);
    const allowed = await Promise.all(group.map(row => visible((row as { providerId?: unknown }).providerId)));
    result.push(...group.filter((_row, index) => allowed[index]));
  }
  return result;
}
