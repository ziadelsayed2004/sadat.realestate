import { Types, type Connection } from 'mongoose';
import type { StoredProperty } from './repository.js';

export type PropertySourceNamesReader = (records: readonly StoredProperty[]) => Promise<Map<string, string>>;
const id = (value: unknown) => value instanceof Types.ObjectId ? value.toHexString() : typeof value === 'string' && /^[a-f0-9]{24}$/u.test(value) ? value : undefined;
const text = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined;

/** Names are projected only into authorized administrative responses, never provider writes. */
export function createPropertySourceNamesReader(connection: Connection): PropertySourceNamesReader {
  return async records => {
    const owners = [...new Set(records.map(record => record.providerId))].map(value => new Types.ObjectId(value));
    if (!owners.length) return new Map();
    const profiles = await connection.collection('provider_profiles').find({ $or: [{ _id: { $in: owners } }, { userId: { $in: owners } }] }, { projection: { userId: 1, publicDisplayName: 1 } }).toArray();
    const keys = [...new Set([...owners.map(String), ...profiles.flatMap(profile => id(profile.userId) ? [id(profile.userId)!] : [])])].map(value => new Types.ObjectId(value));
    const applications = await connection.collection('provider_applications').find({ $or: [{ _id: { $in: keys } }, { userId: { $in: keys } }] }, { projection: { userId: 1, displayName: 1, accountOwnerFullName: 1, brandName: 1, legalCompanyName: 1, legalBusinessName: 1, tradeName: 1 } }).toArray();
    return new Map(records.flatMap(record => {
      const profile = profiles.find(row => id(row._id) === record.providerId || id(row.userId) === record.providerId);
      const account = id(profile?.userId) ?? record.providerId;
      const app = applications.find(row => id(row._id) === record.providerId || id(row.userId) === account);
      const values = record.source.sourceType === 'individual_broker' ? [app?.displayName, app?.accountOwnerFullName] : [app?.brandName, app?.tradeName, app?.legalCompanyName, app?.legalBusinessName, app?.displayName, app?.accountOwnerFullName];
      const name = values.map(text).find(Boolean);
      return name ? [[record.id, name] as const] : [];
    }));
  };
}
