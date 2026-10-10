import { Types, type Connection } from 'mongoose';
import { createProviderVisibilityReader } from '../provider/visibility.js';

export async function visiblePublicOrganizations<T extends object>(connection: Connection, rows: readonly T[]): Promise<T[]> {
  const reader = createProviderVisibilityReader(connection);
  const cache = new Map<string, Promise<boolean>>();
  const visible = (value: unknown) => {
    const id = value instanceof Types.ObjectId ? value.toHexString() : typeof value === 'string' ? value : '';
    if (!cache.has(id)) cache.set(id, reader.read(id).then(policy => policy.publicIdentity));
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
