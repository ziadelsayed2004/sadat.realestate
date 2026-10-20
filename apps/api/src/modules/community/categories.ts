import { Types, type Connection } from 'mongoose';
import { communityCategoryCreateSchema, communityCategorySchema, type CommunityCategory } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { CommunityAuthorization } from './service.js';

export const DEFAULT_COMMUNITY_CATEGORIES: CommunityCategory[] = [
  ['question', 'سؤال', 'Question'], ['experience', 'تجربة', 'Experience'], ['advice', 'نصيحة', 'Advice'],
  ['service', 'خدمة', 'Service'], ['area', 'منطقة', 'Area'], ['property', 'عقار', 'Property']
].map(([key, ar, en]) => communityCategorySchema.parse({ key, label: { ar, en } }));

export interface CommunityCategories {
  list(): Promise<CommunityCategory[]>;
  validate(key: string | undefined): Promise<void>;
  create(claims: AccessTokenClaims, input: unknown, context: { requestId: string; traceId: string }): Promise<CommunityCategory>;
}
export function createCommunityCategories(connection: Connection, authorization?: CommunityAuthorization, audit?: AuditWriter): CommunityCategories {
  return {
    async list() {
      const rows = await connection.collection('community_categories').find({}, { projection: { _id: 0, key: 1, label: 1 } }).sort({ createdAt: 1, key: 1 }).limit(194).toArray();
      return [...DEFAULT_COMMUNITY_CATEGORIES, ...rows.flatMap(row => { const parsed = communityCategorySchema.safeParse(row); return parsed.success ? [parsed.data] : []; })];
    },
    async validate(key) {
      if (!key || DEFAULT_COMMUNITY_CATEGORIES.some(category => category.key === key)) return;
      if (!await connection.collection('community_categories').findOne({ key }, { projection: { _id: 1 } })) throw new Error('INVALID_CATEGORY');
    },
    async create(claims, input, context) {
      if (claims.role !== 'admin' || claims.status !== 'verified' || !await authorization?.authorize(claims.sub, 'admin:community.moderate')) throw new Error('FORBIDDEN');
      const parsed = communityCategoryCreateSchema.parse(input), id = new Types.ObjectId();
      const nameKey = (parsed.label.ar ?? parsed.label.en ?? '').trim().normalize('NFKC').toLocaleLowerCase('en');
      if (DEFAULT_COMMUNITY_CATEGORIES.some(category => Object.values(category.label).some(label => label?.trim().normalize('NFKC').toLocaleLowerCase('en') === nameKey))) throw new Error('DUPLICATE');
      const item = communityCategorySchema.parse({ key: `custom_${id}`, label: parsed.label });
      await connection.collection('community_categories').createIndex({ nameKey: 1 }, { unique: true, name: 'community_category_name' });
      const session = await connection.startSession();
      try {
        await session.withTransaction(async () => {
          if (await connection.collection('community_categories').countDocuments({}, { session }) >= 194) throw new Error('CATEGORY_LIMIT');
          await connection.collection('community_categories').insertOne({ _id: id, ...item, nameKey, createdBy: new Types.ObjectId(claims.sub), createdAt: new Date() }, { session });
          await audit?.record({ actorType: 'admin', actorId: claims.sub, targetType: 'community_category', targetId: id.toHexString(), action: 'community_category.create', reason: parsed.reason, before: null, after: item, ...context, occurredAt: new Date() }, session);
        });
      } catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new Error('DUPLICATE', { cause: error }); throw error; }
      finally { await session.endSession(); }
      return item;
    }
  };
}
