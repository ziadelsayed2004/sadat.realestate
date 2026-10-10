import { Types, type Connection } from 'mongoose';
import { localizedTextSchema } from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';

/** Imported records are reviewable drafts. Never infer an advertiser from copy. */
export async function importLegacyFeatured(connection: Connection, audit: AuditWriter, actorId: string, context: { requestId: string; traceId: string }) {
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      await connection.collection('ad_placements').updateOne({ key: 'homepage.featured' }, { $inc: { bannerWriteVersion: 1 } }, { session });
      const rows = await connection.collection('cms_banners').find({ key: { $not: /^banner_/ }, migratedBannerId: { $exists: false } }, { session }).sort({ order: 1, _id: 1 }).limit(100).toArray();
      const last = await connection.collection('ad_banners').find({ placementKey: 'homepage.featured' }, { session }).sort({ sortOrder: -1 }).limit(1).next();
      let order = (last?.sortOrder ?? -1) + 1;
      for (const row of rows) {
        const title = localizedTextSchema.safeParse(row.title);
        if (!title.success) continue;
        const now = new Date(), bannerId = new Types.ObjectId(), mediaId = new Types.ObjectId();
        const hasImage = typeof row.imageUrl === 'string' && /^(?:\/(?!\/)|https:\/\/)/.test(row.imageUrl);
        const featured = Object.fromEntries(['highlight', 'installment', 'eyebrow', 'ctaLabel'].flatMap(key => { const value = localizedTextSchema.safeParse(row[key]); return value.success ? [[key, value.data]] : []; }));
        const body = localizedTextSchema.safeParse(row.body);
        const after = { placementKey: 'homepage.featured', title: title.data, ...(body.success ? { body: body.data } : {}), featured, ...(hasImage ? { mediaId, mediaIds: [mediaId] } : {}), displaySeconds: 6, status: 'draft', sortOrder: order++, startAt: now, endAt: new Date(now.getTime() + 86400000 * 30), version: 0, legacyKey: row.key, createdBy: new Types.ObjectId(actorId), updatedBy: new Types.ObjectId(actorId), createdAt: now, updatedAt: now };
        await connection.collection('ad_banners').insertOne({ _id: bannerId, ...after }, { session });
        if (hasImage) await connection.collection('ad_banner_media').insertOne({ _id: mediaId, bannerId, url: row.imageUrl, mime: 'image/png', width: 1200, height: 800, active: true, version: 0, createdBy: new Types.ObjectId(actorId), createdAt: now, updatedAt: now }, { session });
        await connection.collection('cms_banners').updateOne({ _id: row._id, migratedBannerId: { $exists: false } }, { $set: { active: false, migratedBannerId: bannerId } }, { session });
        await audit.record({ actorType: 'admin', actorId, targetType: 'ad_banner', targetId: bannerId.toHexString(), action: 'ad_banner.legacy_import', reason: 'Import legacy featured card for advertiser review', before: {}, after: { legacyKey: row.key, status: 'draft', sortOrder: after.sortOrder }, ...context, occurredAt: now }, session);
      }
    });
  } finally { await session.endSession(); }
}
