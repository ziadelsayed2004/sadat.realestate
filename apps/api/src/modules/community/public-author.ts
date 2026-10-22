import { Types, type Connection } from 'mongoose';
import { localizedTextSchema } from '@sadat-real-estate/contracts';

/** Only a public display name; never copy account email, phone or documents. */
export async function readCommunityAuthor(connection: Connection, authorId: string) {
  if (!/^[a-f0-9]{24}$/u.test(authorId)) return undefined;
  const userId = new Types.ObjectId(authorId);
  const [profile, application] = await Promise.all([
    connection.collection('seeker_profiles').findOne({ userId }, { projection: { firstName: 1, lastName: 1 } }),
    connection.collection('provider_applications').findOne({ userId, status: 'approved' }, { projection: { displayName: 1, brandName: 1 } })
  ]);
  const name = [profile?.firstName, profile?.lastName].filter(value => typeof value === 'string' && value.trim()).join(' ').trim() || application?.brandName || application?.displayName;
  const parsed = localizedTextSchema.safeParse(typeof name === 'string' ? { ar: name, en: name } : name);
  return parsed.success ? parsed.data : undefined;
}
