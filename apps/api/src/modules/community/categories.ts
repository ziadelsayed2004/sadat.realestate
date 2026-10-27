import { Types, type Connection } from 'mongoose';
import { communityCategoryCreateSchema, communityCategoryDeleteSchema, communityCategoryParamsSchema, communityCategorySchema, type CommunityCategory } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { CommunityAuthorization } from './service.js';

export const DEFAULT_COMMUNITY_CATEGORIES: CommunityCategory[] = [
  ['question', 'سؤال', 'Question'], ['experience', 'تجربة', 'Experience'], ['advice', 'نصيحة', 'Advice'],
  ['service', 'خدمة', 'Service'], ['area', 'منطقة', 'Area'], ['property', 'عقار', 'Property']
].map(([key, ar, en]) => communityCategorySchema.parse({ key, label: { ar, en } }));

export interface CommunityCategories {
  list(): Promise<CommunityCategory[]>;
  labels(keys: string[]): Promise<CommunityCategory[]>;
  validate(key: string | undefined): Promise<void>;
  create(claims: AccessTokenClaims, input: unknown, context: { requestId: string; traceId: string }): Promise<CommunityCategory>;
  remove(claims: AccessTokenClaims, key: string, input: unknown, context: { requestId: string; traceId: string }): Promise<void>;
}
export function createCommunityCategories(connection: Connection, authorization?: CommunityAuthorization, audit?: AuditWriter): CommunityCategories {
  const defaults = DEFAULT_COMMUNITY_CATEGORIES.map(item => item.key);
  const collection = () => connection.collection('community_categories');
  const authorize = async (claims: AccessTokenClaims) => {
    if (claims.role !== 'admin' || claims.status !== 'verified' || !await authorization?.authorize(claims.sub, 'admin:community.moderate')) throw new Error('FORBIDDEN');
  };
  return {
    async list() {
      const rows = await collection().find({ deletedAt: { $exists: false } }, { projection: { _id: 0, key: 1, label: 1 } }).sort({ createdAt: 1, key: 1 }).limit(194).toArray();
      const removed = await collection().find({ key: { $in: defaults }, deletedAt: { $exists: true } }, { projection: { key: 1 } }).limit(6).toArray();
      return [...DEFAULT_COMMUNITY_CATEGORIES.filter(item => !removed.some(row => row.key === item.key)), ...rows.flatMap(row => { const parsed = communityCategorySchema.safeParse(row); return parsed.success && !defaults.includes(parsed.data.key) ? [parsed.data] : []; })];
    },
    async labels(keys) {
      if (!keys.length) return [];
      const rows = await collection().find({ key: { $in: keys } }, { projection: { _id: 0, key: 1, label: 1 } }).toArray();
      return [...DEFAULT_COMMUNITY_CATEGORIES.filter(item => keys.includes(item.key)), ...rows.flatMap(row => { const parsed = communityCategorySchema.safeParse(row); return parsed.success && !defaults.includes(parsed.data.key) ? [parsed.data] : []; })];
    },
    async validate(key) {
      if (!key) return;
      const row = await collection().findOne({ key }, { projection: { deletedAt: 1 } });
      if (row?.deletedAt || (!row && !defaults.includes(key))) throw new Error('INVALID_CATEGORY');
    },
    async create(claims, input, context) {
      await authorize(claims);
      const parsed = communityCategoryCreateSchema.parse(input), id = new Types.ObjectId();
      const nameKey = (parsed.label.ar ?? parsed.label.en ?? '').trim().normalize('NFKC').toLocaleLowerCase('en');
      if ((await this.list()).some(category => Object.values(category.label).some(label => label?.trim().normalize('NFKC').toLocaleLowerCase('en') === nameKey))) throw new Error('DUPLICATE');
      const item = communityCategorySchema.parse({ key: `custom_${id}`, label: parsed.label });
      await connection.collection('community_categories').createIndex({ nameKey: 1 }, { unique: true, name: 'community_category_name' });
      const session = await connection.startSession();
      try {
        await session.withTransaction(async () => {
          if (await collection().countDocuments({ deletedAt: { $exists: false } }, { session }) >= 194) throw new Error('CATEGORY_LIMIT');
          await connection.collection('community_categories').insertOne({ _id: id, ...item, nameKey, createdBy: new Types.ObjectId(claims.sub), createdAt: new Date() }, { session });
          await audit?.record({ actorType: 'admin', actorId: claims.sub, targetType: 'community_category', targetId: id.toHexString(), action: 'community_category.create', reason: parsed.reason, before: null, after: item, ...context, occurredAt: new Date() }, session);
        });
      } catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new Error('DUPLICATE', { cause: error }); throw error; }
      finally { await session.endSession(); }
      return item;
    },
    async remove(claims, key, input, context) {
      await authorize(claims);
      communityCategoryParamsSchema.parse({ categoryKey: key });
      const parsed = communityCategoryDeleteSchema.parse(input);
      await collection().createIndex({ key: 1 }, { unique: true, name: 'community_category_key' });
      const session = await connection.startSession();
      try {
        await session.withTransaction(async () => {
          const row = await collection().findOne({ key }, { session });
          if (row?.deletedAt) return;
          const item = DEFAULT_COMMUNITY_CATEGORIES.find(item => item.key === key) ?? (row ? communityCategorySchema.parse({ key: row.key, label: row.label }) : undefined);
          if (!item) throw new Error('NOT_FOUND');
          const id = row?._id ?? new Types.ObjectId(), now = new Date();
          await collection().updateOne({ key }, { $set: { ...item, deletedAt: now, deletedBy: new Types.ObjectId(claims.sub), nameKey: `deleted:${id}` }, $setOnInsert: { _id: id, createdAt: now } }, { session, upsert: true });
          await audit?.record({ actorType: 'admin', actorId: claims.sub, targetType: 'community_category', targetId: String(id), action: 'community_category.delete', reason: parsed.reason, before: item, after: { ...item, deletedAt: now.toISOString() }, ...context, occurredAt: now }, session);
        });
      } finally { await session.endSession(); }
    }
  };
}
