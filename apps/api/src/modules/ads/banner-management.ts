import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { Types, type Connection } from 'mongoose';
import sharp, { type OutputInfo } from 'sharp';
import { adBannerConfigPutSchema, adBannerConfigSchema, adBannerMediaSchema } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { RbacService } from '../rbac/service.js';
import type { AuditWriter } from '../audit/writer.js';
import type { StorageAdapter, MalwareScannerAdapter } from '../uploads/adapters.js';
import type { AdvertisingSettingsReader } from '../settings/advertising-policy.js';
import { ApiContractError } from '../contracts/error-boundary.js';

const MAX_BYTES = 10 * 1024 * 1024;
const invalid = () => new ApiContractError('BANNER_UPLOAD_INVALID', 'errors.validation', 400);
const unavailable = () => new ApiContractError('BANNER_UPLOAD_UNAVAILABLE', 'errors.serviceUnavailable', 503);
const notFound = () => new ApiContractError('NOT_FOUND', 'errors.notFound', 404);

/** Both homepage publication and public downloads enforce the same live window. */
export async function readPublishedBannerRows(connection: Connection, at = new Date()) {
  const settings = await connection.collection('ad_settings').findOne({ enabled: true, allowedSurfaces: 'homepage' });
  if (!settings) return [];
  return connection.collection('ad_banners').aggregate([
    { $match: { status: { $in: ['scheduled', 'active'] }, startAt: { $lte: at }, endAt: { $gt: at } } },
    { $lookup: { from: 'ad_placements', localField: 'placementKey', foreignField: 'key', as: 'placement' } },
    { $unwind: '$placement' },
    { $match: { 'placement.active': true, 'placement.surface': 'homepage' } },
    { $lookup: { from: 'ad_banner_media', localField: 'mediaId', foreignField: '_id', as: 'media' } },
    { $unwind: '$media' },
    { $match: { 'media.active': true, $expr: { $and: [{ $eq: ['$media.bannerId', '$_id'] }, { $or: [{ $ne: ['$placement.targetUrlRequired', true] }, { $gt: [{ $strLenCP: { $ifNull: ['$targetUrl', ''] } }, 0] }] }] } } },
    { $sort: { 'placement.sortOrder': 1, sortOrder: 1, _id: 1 } },
    { $limit: Math.min(1000, Math.max(1, Number(settings.maxActiveBanners) || 100)) },
    { $project: { _id: 1, title: 1, altText: 1, targetUrl: 1, mediaId: 1, 'media.url': 1 } }
  ]).toArray();
}

export function createBannerManagement(dependencies: {
  connection: Connection;
  authorization: Pick<RbacService, 'authorize'>;
  audit: AuditWriter;
  storage: StorageAdapter;
  scanner: MalwareScannerAdapter;
  policy: AdvertisingSettingsReader;
}) {
  const { connection, authorization, audit, storage, scanner, policy } = dependencies;
  async function authorize(claims: AccessTokenClaims, permission: 'admin:banners.view' | 'admin:banners.manage') {
    if (claims.role !== 'admin' || claims.status !== 'verified' || !await authorization.authorize(claims.sub, permission)) {
      throw new ApiContractError('FORBIDDEN', 'errors.forbidden', 403);
    }
  }
  async function config() {
    const settings = await connection.collection('ad_settings').findOne({});
    const placements = await connection.collection('ad_placements').find({ surface: 'homepage' }).sort({ sortOrder: 1, key: 1 }).limit(100).toArray();
    return adBannerConfigSchema.parse({ enabled: settings?.enabled === true && settings.allowedSurfaces?.includes('homepage') === true, version: settings?.version ?? 0, placements: placements.map(row => ({ key: row.key, label: row.label ?? { ar: row.key, en: row.key }, active: row.active === true })) });
  }
  return {
    async readConfig(claims: AccessTokenClaims) { await authorize(claims, 'admin:banners.view'); return config(); },
    async updateConfig(claims: AccessTokenClaims, input: unknown, context: { requestId: string; traceId: string }) {
      await authorize(claims, 'admin:banners.manage');
      const parsed = adBannerConfigPutSchema.parse(input);
      const session = await connection.startSession();
      try {
        await session.withTransaction(async () => {
          const settings = connection.collection('ad_settings');
          const before = await settings.findOne({}, { session });
          if ((before?.version ?? 0) !== parsed.expectedVersion) throw new ApiContractError('VERSION_CONFLICT', 'errors.conflict', 409);
          const now = new Date();
          const after = { enabled: parsed.enabled, allowedSurfaces: [...new Set([...(before?.allowedSurfaces ?? []), 'homepage'])], maxActiveBanners: before?.maxActiveBanners ?? 100, defaultDisplaySeconds: before?.defaultDisplaySeconds ?? 8, version: parsed.expectedVersion + 1, updatedBy: new Types.ObjectId(claims.sub), updatedAt: now };
          if (before) await settings.updateOne({ _id: before._id, version: parsed.expectedVersion }, { $set: after }, { session });
          else await settings.insertOne({ _id: new Types.ObjectId('00000000000000000000ba01'), ...after }, { session });
          // Explicit setup action only; never silently re-enable an existing placement.
          await connection.collection('ad_placements').updateOne({ key: 'homepage.hero' }, { $setOnInsert: { surface: 'homepage', label: { ar: 'بانر الصفحة الرئيسية', en: 'Homepage banner' }, width: 1200, height: 400, active: true, sortOrder: 0, allowedLocales: ['ar', 'en'], targetUrlRequired: false, version: 0, updatedBy: new Types.ObjectId(claims.sub), updatedAt: now } }, { upsert: true, session });
          await audit.record({ actorType: 'admin', actorId: claims.sub, targetType: 'ad_settings', targetId: 'homepage', action: 'ad_settings.banner_display', reason: parsed.reason, before: { enabled: before?.enabled ?? false, version: before?.version ?? 0 }, after: { enabled: parsed.enabled, version: after.version }, ...context, occurredAt: now }, session);
        });
      } finally { await session.endSession(); }
      return config();
    },
    async upload(claims: AccessTokenClaims, bannerId: string, source: AsyncIterable<Uint8Array>, mime: string, context: { requestId: string; traceId: string }) {
      await authorize(claims, 'admin:banners.manage');
      if (!await storage.isReady() || !await scanner.isReady()) throw unavailable();
      const banner = await connection.collection('ad_banners').findOne({ _id: new Types.ObjectId(bannerId), status: { $ne: 'archived' } });
      if (!banner) throw notFound();
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw invalid();
      const chunks: Buffer[] = []; let bytes = 0;
      for await (const chunk of source) { bytes += chunk.length; if (bytes > MAX_BYTES) throw invalid(); chunks.push(Buffer.from(chunk)); }
      if (!bytes) throw invalid();
      const original = Buffer.concat(chunks);
      const scan = await scanner.scan(Readable.from(original));
      if (scan !== 'clean') throw scan === 'infected' ? invalid() : unavailable();
      let processed: { data: Buffer; info: OutputInfo };
      try {
        const image = sharp(original, { limitInputPixels: 40_000_000, failOn: 'warning' });
        const meta = await image.metadata();
        const expectedFormat = mime === 'image/jpeg' ? 'jpeg' : mime === 'image/png' ? 'png' : 'webp';
        if (meta.format !== expectedFormat || (meta.pages ?? 1) > 1) throw invalid();
        processed = await image.rotate().toFormat(expectedFormat).toBuffer({ resolveWithObject: true });
      } catch { throw invalid(); }
      const rules = await policy.read();
      if ((rules.acceptedFileFormats.length && !rules.acceptedFileFormats.includes(mime as 'image/png')) || (rules.dimensions.length && !rules.dimensions.some(size => size.width === processed.info.width && size.height === processed.info.height))) throw invalid();
      if (processed.data.length > MAX_BYTES) throw invalid();
      const mediaId = new Types.ObjectId(); const now = new Date();
      const media = adBannerMediaSchema.parse({ id: mediaId.toHexString(), bannerId, url: `/api/v1/public/banner-media/${mediaId.toHexString()}`, mime, width: processed.info.width, height: processed.info.height, active: true, version: 0, createdBy: claims.sub, createdAt: now.toISOString(), updatedAt: now.toISOString() });
      const storageKey = `quarantine/${randomUUID().replaceAll('-', '')}`;
      await storage.putPrivateQuarantine(storageKey, Readable.from(processed.data));
      const session = await connection.startSession();
      try {
        await session.withTransaction(async () => {
          await connection.collection('ad_banner_media').insertOne({ ...media, id: undefined, _id: mediaId, bannerId: banner._id, createdBy: new Types.ObjectId(claims.sub), createdAt: now, updatedAt: now, storageKey }, { session });
          await audit.record({ actorType: 'admin', actorId: claims.sub, targetType: 'ad_banner_media', targetId: media.id, action: 'ad_banner_media.upload', reason: 'Upload scanned banner image', before: {}, after: { bannerId, mime, width: media.width, height: media.height }, ...context, occurredAt: now }, session);
        });
      } catch (error) { await storage.deletePrivate(storageKey); throw error; }
      finally { await session.endSession(); }
      return media;
    },
    async openMedia(mediaId: string, claims?: AccessTokenClaims) {
      const media = await connection.collection('ad_banner_media').findOne({ _id: new Types.ObjectId(mediaId), active: true, storageKey: { $type: 'string' } });
      if (!media) throw notFound();
      if (claims) await authorize(claims, 'admin:banners.view');
      else if (!(await readPublishedBannerRows(connection)).some(row => row.mediaId?.toString() === mediaId)) throw notFound();
      return { mime: String(media.mime), stream: await storage.openPrivate(String(media.storageKey)) };
    }
  };
}

export type BannerManagement = ReturnType<typeof createBannerManagement>;
