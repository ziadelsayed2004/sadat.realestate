import { resolveFeatured } from './featured.js';
import { Types, type ClientSession, type Connection } from 'mongoose';
import {
  adBannerMediaSchema,
  adBannerPreviewSchema,
  adBannerSchema,
  type AdBanner,
  type AdBannerMedia,
  type AdPlacement
} from '@sadat-real-estate/contracts';
import { AdBannerServiceError, type AdBannerRepository } from './service.js';
import type { AuditWriter } from '../audit/writer.js';
import { bannerImageChanges, selectedBannerMediaIds } from './banner-images.js';
import { validateBannerCampaign } from './banner-campaign.js';

type BannerStatus = AdBanner['status'];

interface BannerRow {
  _id: Types.ObjectId;
  adRequestId?: Types.ObjectId;
  placementKey: AdBanner['placementKey'];
  featured?: AdBanner['featured'];
  title: AdBanner['title'];
  altText?: AdBanner['altText'];
  body?: AdBanner['body'];
  mediaId?: Types.ObjectId;
  mediaIds?: Types.ObjectId[];
  displaySeconds?: number;
  targetUrl?: string;
  startAt: Date;
  endAt: Date;
  status: BannerStatus;
  sortOrder: number;
  version: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface BannerMediaRow {
  _id: Types.ObjectId;
  bannerId: Types.ObjectId;
  url: string;
  mime: AdBannerMedia['mime'];
  width: number;
  height: number;
  active: boolean;
  version: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface PlacementRow {
  key: AdPlacement['key'];
  surface: AdPlacement['surface'];
  active: boolean;
  targetUrlRequired: boolean;
  sortOrder: number;
}

interface SettingsRow {
  enabled: boolean;
  allowedSurfaces: AdPlacement['surface'][];
  maxActiveBanners: number;
}

const LIVE_STATUSES: readonly BannerStatus[] = ['scheduled', 'active'];
const TRANSITIONS: Record<BannerStatus, readonly BannerStatus[]> = {
  draft: ['scheduled', 'active', 'archived'],
  scheduled: ['draft', 'active', 'ended', 'archived'],
  active: ['draft', 'ended', 'archived'],
  ended: ['draft', 'archived'],
  archived: []
};

function objectId(value: string, code: 'NOT_FOUND' | 'FORBIDDEN' = 'NOT_FOUND'): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw new AdBannerServiceError(code);
  return new Types.ObjectId(value);
}

function duplicate(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function toBanner(row: BannerRow): AdBanner {
  return adBannerSchema.parse({
    id: row._id.toHexString(),
    ...(row.adRequestId ? { adRequestId: row.adRequestId.toHexString() } : {}),
    placementKey: row.placementKey,
    title: row.title,
    ...(row.featured ? { featured: row.featured } : {}),
    ...(row.altText === undefined ? {} : { altText: row.altText }),
    ...(row.body === undefined ? {} : { body: row.body }),
    ...(row.mediaId === undefined ? {} : { mediaId: row.mediaId.toHexString() }),
    ...(row.mediaIds === undefined ? {} : { mediaIds: row.mediaIds.map(value => value.toHexString()) }),
    ...(row.displaySeconds === undefined ? {} : { displaySeconds: row.displaySeconds }),
    ...(row.targetUrl === undefined ? {} : { targetUrl: row.targetUrl }),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    sortOrder: row.sortOrder,
    version: row.version,
    createdBy: row.createdBy.toHexString(),
    updatedBy: row.updatedBy.toHexString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  });
}

function toMedia(row: BannerMediaRow): AdBannerMedia {
  return adBannerMediaSchema.parse({
    id: row._id.toHexString(),
    bannerId: row.bannerId.toHexString(),
    url: row.url,
    mime: row.mime,
    width: row.width,
    height: row.height,
    active: row.active,
    version: row.version,
    createdBy: row.createdBy.toHexString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  });
}

function isLive(status: BannerStatus): boolean {
  return LIVE_STATUSES.includes(status);
}

export function createMongooseAdBannerRepository(connection: Connection, audit?: AuditWriter): AdBannerRepository {
  const banners = connection.collection<BannerRow>('ad_banners');
  const media = connection.collection<BannerMediaRow>('ad_banner_media');
  const placements = connection.collection<PlacementRow>('ad_placements');
  const settings = connection.collection<SettingsRow>('ad_settings');
  let indexesReady: Promise<unknown> | undefined;

  function ensureIndexes(): Promise<unknown> {
    indexesReady ??= Promise.all([
      banners.createIndex({ placementKey: 1, status: 1, sortOrder: 1, _id: 1 }, { name: 'ad_banners_placement_status_order' }),
      banners.createIndex({ adRequestId: 1, status: 1 }, { name: 'ad_banners_request_status' }),
      banners.createIndex({ placementKey: 1, startAt: 1, endAt: 1, status: 1 }, { name: 'ad_banners_placement_window' }),
      media.createIndex({ bannerId: 1, active: 1, updatedAt: -1, _id: -1 }, { name: 'ad_banner_media_banner_active' }),
      media.createIndex({ bannerId: 1, _id: 1 }, { name: 'ad_banner_media_banner_id' })
    ]);
    return indexesReady;
  }

  async function findPlacement(key: AdBanner['placementKey'], session?: ClientSession): Promise<PlacementRow> {
    await ensureIndexes();
    const placement = await placements.findOne({ key }, session ? { session } : {});
    if (!placement) throw new AdBannerServiceError('NOT_FOUND');
    return placement;
  }

  async function findBanner(bannerId: string, session?: ClientSession): Promise<BannerRow> {
    await ensureIndexes();
    const banner = await banners.findOne({ _id: objectId(bannerId) }, session ? { session } : {});
    if (!banner) throw new AdBannerServiceError('NOT_FOUND');
    return banner;
  }

  async function transaction<T>(run: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await connection.startSession();
    try {
      return await session.withTransaction(() => run(session));
    } finally {
      await session.endSession();
    }
  }

  async function validateLiveBanner(next: AdBanner, placement: PlacementRow, currentAt: Date, session?: ClientSession): Promise<void> {
    const end = new Date(next.endAt).getTime();
    if (next.status === 'ended' && currentAt.getTime() < end) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    const imageIds = selectedBannerMediaIds(next);
    const linkedCount = imageIds.length ? await media.countDocuments({ _id: { $in: imageIds.map(value => objectId(value)) }, bannerId: objectId(next.id), active: true }, session ? { session } : {}) : 0;
    if (linkedCount !== imageIds.length) throw new AdBannerServiceError('BANNER_MEDIA_REQUIRED');
    if (!isLive(next.status)) return;
    await validateCampaign(next, session);
    if (!linkedCount) throw new AdBannerServiceError('BANNER_MEDIA_REQUIRED');
    if (!placement.active || (placement.targetUrlRequired && next.targetUrl === undefined)) {
      throw new AdBannerServiceError(placement.targetUrlRequired && next.targetUrl === undefined ? 'BANNER_TARGET_REQUIRED' : 'BANNER_INVALID_STATE');
    }
    const currentSettings = await settings.findOne({}, session ? { session } : {});
    if (!currentSettings?.enabled || !currentSettings.allowedSurfaces.includes(placement.surface)) {
      throw new AdBannerServiceError('BANNER_INVALID_STATE');
    }
    const start = new Date(next.startAt).getTime();
    if (next.status === 'scheduled' && currentAt.getTime() >= start) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    if (next.status === 'active' && (currentAt.getTime() < start || currentAt.getTime() >= end)) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    const overlap = ['homepage.hero', 'homepage.featured'].includes(next.placementKey) ? null : await banners.findOne({
      _id: { $ne: objectId(next.id) },
      placementKey: next.placementKey,
      status: { $in: LIVE_STATUSES },
      startAt: { $lt: new Date(next.endAt) },
      endAt: { $gt: new Date(next.startAt) }
    }, session ? { session } : {});
    if (overlap) throw new AdBannerServiceError('PLACEMENT_CONFLICT');
    if (next.status === 'active') {
      const activeCount = await banners.countDocuments({ status: 'active', _id: { $ne: objectId(next.id) } }, session ? { session } : {});
      if (activeCount >= (currentSettings.maxActiveBanners ?? 100)) throw new AdBannerServiceError('BANNER_CAPACITY');
    }
  }

  async function validateCampaign(banner: AdBanner, session?: ClientSession): Promise<void> {
    if (!banner.adRequestId) return;
    const request = await connection.collection('ad_requests').findOne({ _id: objectId(banner.adRequestId) }, session ? { session } : {});
    validateBannerCampaign(banner, request ? { id: request._id.toHexString(), status: request.status, placementKey: request.placementKey, intervalStart: request.intervalStart?.toISOString(), intervalEnd: request.intervalEnd?.toISOString() } : undefined);
    if (banner.featured && request) {
      const { featuredAdvertiser } = await import('./featured.js');
      const owner = banner.featured.advertiserProviderId && await featuredAdvertiser(connection, banner.featured.advertiserProviderId);
      if (!owner || !owner.ownerIds.some(value => value.toString() === request.providerId?.toString())) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    }
    if (isLive(banner.status) && request && !request.paymentWaiver) {
      const proof = await connection.collection('payment_proofs').findOne({ adRequestId: request._id, providerId: request.providerId, active: true, status: 'approved', securityState: 'clean' }, session ? { session, projection: { _id: 1 } } : { projection: { _id: 1 } });
      if (!proof) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    }
  }

  function changesFor(next: AdBanner, actorId: string, now: Date): { $set: Record<string, unknown>; $unset?: Record<string, 1>; $inc: { version: 1 } } {
    const set: Record<string, unknown> = {
      placementKey: next.placementKey,
      title: next.title,
      startAt: new Date(next.startAt),
      endAt: new Date(next.endAt),
      status: next.status,
      sortOrder: next.sortOrder,
      updatedBy: objectId(actorId, 'FORBIDDEN'),
      updatedAt: now
    };
    const unset: Record<string, 1> = {};
    if (next.altText === undefined) unset.altText = 1; else set.altText = next.altText;
    if (next.featured === undefined) unset.featured = 1; else set.featured = next.featured;
    if (next.body === undefined) unset.body = 1; else set.body = next.body;
    if (next.mediaId === undefined) unset.mediaId = 1; else set.mediaId = objectId(next.mediaId);
    if (next.mediaIds !== undefined) set.mediaIds = next.mediaIds.map(value => objectId(value));
    if (next.displaySeconds !== undefined) set.displaySeconds = next.displaySeconds;
    if (next.targetUrl === undefined) unset.targetUrl = 1; else set.targetUrl = next.targetUrl;
    return { $set: set, ...(Object.keys(unset).length === 0 ? {} : { $unset: unset }), $inc: { version: 1 } };
  }

  return {
    async createBanner(actorId, input, now, metadata) {
      if (input.placementKey === 'homepage.featured' && !input.featured || input.featured && input.placementKey !== 'homepage.featured') throw new AdBannerServiceError('BANNER_INVALID_STATE');
      if (input.featured) { const resolved = await resolveFeatured(connection, input.featured); input = { ...input, targetUrl: `https://elsadatrealestate.com${resolved.targetPath}` }; }
      if (audit && !metadata) throw new AdBannerServiceError('FORBIDDEN');
      const banner = adBannerSchema.parse({
        id: new Types.ObjectId().toHexString(),
        ...input,
        ...(input.placementKey === 'homepage.featured' ? { displaySeconds: input.displaySeconds ?? 6 } : {}),
        sortOrder: input.sortOrder ?? 0,
        status: 'draft',
        version: 0,
        createdBy: actorId,
        updatedBy: actorId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
      const row: BannerRow = {
        _id: objectId(banner.id, 'FORBIDDEN'),
        ...(banner.adRequestId ? { adRequestId: objectId(banner.adRequestId) } : {}),
        placementKey: banner.placementKey,
        title: banner.title,
        ...(banner.featured ? { featured: banner.featured } : {}),
        ...(banner.altText === undefined ? {} : { altText: banner.altText }),
        ...(banner.body === undefined ? {} : { body: banner.body }),
        ...(banner.mediaId === undefined ? {} : { mediaId: objectId(banner.mediaId) }),
        ...(banner.mediaIds === undefined ? {} : { mediaIds: banner.mediaIds.map(value => objectId(value)) }),
        ...(banner.displaySeconds === undefined ? {} : { displaySeconds: banner.displaySeconds }),
        ...(banner.targetUrl === undefined ? {} : { targetUrl: banner.targetUrl }),
        startAt: new Date(banner.startAt),
        endAt: new Date(banner.endAt),
        status: banner.status,
        sortOrder: banner.sortOrder,
        version: 0,
        createdBy: objectId(actorId, 'FORBIDDEN'),
        updatedBy: objectId(actorId, 'FORBIDDEN'),
        createdAt: now,
        updatedAt: now
      };
      const write = async (session?: ClientSession): Promise<AdBanner> => {
        await validateCampaign(banner, session);
        await findPlacement(input.placementKey, session);
        await placements.updateOne({ key: input.placementKey }, { $inc: { bannerWriteVersion: 1 } }, session ? { session } : {});
        if (input.sortOrder === undefined) {
          const last = await banners.find({ placementKey: input.placementKey }, session ? { session } : {}).sort({ sortOrder: -1 }).limit(1).next();
          row.sortOrder = (last?.sortOrder ?? -1) + 1;
        }
        const existing = await banners.findOne(
          { placementKey: input.placementKey, sortOrder: row.sortOrder, status: { $ne: 'archived' } },
          session ? { session } : {}
        );
        if (existing) throw new AdBannerServiceError('DUPLICATE');
        await banners.insertOne(row, session ? { session } : {});
        if (audit && metadata) {
          await audit.record({
            actorType: 'admin', actorId, targetType: 'ad_banner', targetId: banner.id,
            action: 'ad_banner.create', reason: `Create banner for ${banner.placementKey}`,
            before: {}, after: banner, requestId: metadata.requestId, traceId: metadata.traceId, occurredAt: now
          }, session);
        }
        return toBanner(row);
      };
      try {
        return await transaction(session => write(session));
      } catch (error) {
        if (duplicate(error)) throw new AdBannerServiceError('DUPLICATE');
        throw error;
      }
    },

    async listBanners(query) {
      await ensureIndexes();
      const filter: Record<string, unknown> = {};
      if (query.adRequestId) filter.adRequestId = objectId(query.adRequestId);
      if (query.placementKey) filter.placementKey = query.placementKey;
      if (query.status) filter.status = query.status;
      const [rows, total] = await Promise.all([
        banners.find(filter).sort({ placementKey: 1, sortOrder: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
        banners.countDocuments(filter)
      ]);
      return { items: rows.map(toBanner), page: query.page, limit: query.limit, total };
    },

    async updateBanner(actorId, bannerId, input, now, metadata) {
      if (audit && !metadata) throw new AdBannerServiceError('FORBIDDEN');
      const write = async (session?: ClientSession): Promise<AdBanner> => {
        const current = await findBanner(bannerId, session);
        if (current.version !== input.expectedVersion) throw new AdBannerServiceError('VERSION_CONFLICT');
        const currentValue = toBanner(current);
        const creative = input.featured ?? currentValue.featured;
        if (creative && (input.placementKey ?? currentValue.placementKey) !== 'homepage.featured') throw new AdBannerServiceError('BANNER_INVALID_STATE');
        if ((input.placementKey ?? currentValue.placementKey) === 'homepage.featured' && !creative) throw new AdBannerServiceError('BANNER_INVALID_STATE');
        if (creative && !(input.status === 'draft' && !input.featured) && !['archived', 'ended'].includes(input.status ?? '') && (creative.advertiserProviderId || ['active', 'scheduled'].includes(input.status ?? currentValue.status))) { const resolved = await resolveFeatured(connection, creative); input = { ...input, targetUrl: `https://elsadatrealestate.com${resolved.targetPath}` }; }
        const nextValue = adBannerSchema.parse({
          ...currentValue,
          ...(input.featured ? { featured: input.featured } : {}),
          ...(input.altText === null ? {} : input.altText === undefined ? {} : { altText: input.altText }),
          ...(input.mediaId === null ? {} : input.mediaId === undefined ? {} : { mediaId: input.mediaId }),
          ...(input.targetUrl === null ? {} : input.targetUrl === undefined ? {} : { targetUrl: input.targetUrl }),
          ...Object.fromEntries(Object.entries(input).filter(([key]) => !['expectedVersion', 'reason', 'altText', 'body', 'mediaId', 'targetUrl'].includes(key))),
          ...(input.altText === null ? { altText: undefined } : {}),
          ...(input.body === undefined ? {} : { body: input.body === null ? undefined : input.body }),
          ...(input.mediaId === null ? { mediaId: undefined } : {}),
          ...(input.targetUrl === null ? { targetUrl: undefined } : {}),
          ...bannerImageChanges(currentValue, input),
          updatedBy: actorId,
          updatedAt: now.toISOString(),
          version: current.version + 1
        });
        if (nextValue.status !== current.status && !TRANSITIONS[current.status].includes(nextValue.status)) throw new AdBannerServiceError('BANNER_INVALID_STATE');
        const placement = await findPlacement(nextValue.placementKey, session);
        await placements.updateOne({ key: nextValue.placementKey }, { $inc: { bannerWriteVersion: 1 } }, session ? { session } : {});
        await validateLiveBanner(nextValue, placement, now, session);
        const result = await banners.updateOne(
          { _id: current._id, version: input.expectedVersion },
          changesFor(nextValue, actorId, now),
          session ? { session } : {}
        );
        if (result.matchedCount !== 1) throw new AdBannerServiceError('VERSION_CONFLICT');
        const updated = toBanner(await findBanner(bannerId, session));
        if (audit && metadata) {
          await audit.record({
            actorType: 'admin', actorId, targetType: 'ad_banner', targetId: updated.id,
            action: 'ad_banner.update', reason: input.reason,
            before: currentValue, after: updated, requestId: metadata.requestId, traceId: metadata.traceId, occurredAt: now
          }, session);
        }
        return updated;
      };
      return await transaction(session => write(session));
    },

    async previewBanner(bannerId) {
      const banner = await findBanner(bannerId);
      const value = toBanner(banner);
      const rows = await media.find({ _id: { $in: selectedBannerMediaIds(value).map(id => objectId(id)) }, bannerId: banner._id, active: true }).toArray();
      const mediaItems = selectedBannerMediaIds(value).flatMap(id => { const row = rows.find(item => item._id.toHexString() === id); return row ? [toMedia(row)] : []; });
      return adBannerPreviewSchema.parse({ banner: value, ...(mediaItems[0] ? { media: mediaItems[0] } : {}), mediaItems, preview: true });
    },

    async createBannerMedia(actorId, bannerId, input, now) {
      const banner = await findBanner(bannerId);
      const row: BannerMediaRow = {
        _id: new Types.ObjectId(),
        bannerId: banner._id,
        url: input.url,
        mime: input.mime,
        width: input.width,
        height: input.height,
        active: true,
        version: 0,
        createdBy: objectId(actorId, 'FORBIDDEN'),
        createdAt: now,
        updatedAt: now
      };
      try {
        await media.insertOne(row);
      } catch (error) {
        if (duplicate(error)) throw new AdBannerServiceError('DUPLICATE');
        throw error;
      }
      return toMedia(row);
    },

    async listBannerMedia(bannerId) {
      await findBanner(bannerId);
      const rows = await media.find({ bannerId: objectId(bannerId), active: true }).sort({ updatedAt: -1, _id: -1 }).limit(100).toArray();
      return rows.map(toMedia);
    },

    async updateBannerMedia(actorId, mediaId, input, now) {
      const current = await media.findOne({ _id: objectId(mediaId), active: true });
      if (!current) throw new AdBannerServiceError('NOT_FOUND');
      if (current.version !== input.expectedVersion) throw new AdBannerServiceError('VERSION_CONFLICT');
      const set: Record<string, unknown> = { updatedAt: now };
      for (const key of ['url', 'mime', 'width', 'height'] as const) if (input[key] !== undefined) set[key] = input[key];
      const result = await media.updateOne({ _id: current._id, version: input.expectedVersion, active: true }, { $set: set, $inc: { version: 1 } });
      if (result.matchedCount !== 1) throw new AdBannerServiceError('VERSION_CONFLICT');
      const updated = await media.findOne({ _id: current._id });
      if (!updated) throw new AdBannerServiceError('NOT_FOUND');
      void actorId;
      return toMedia(updated);
    },

    async deleteBannerMedia(actorId, mediaId, input, now) {
      const current = await media.findOne({ _id: objectId(mediaId), active: true });
      if (!current) throw new AdBannerServiceError('NOT_FOUND');
      const inUse = await banners.findOne({ $or: [{ mediaId: current._id }, { mediaIds: current._id }], status: { $ne: 'archived' } });
      if (inUse) throw new AdBannerServiceError('MEDIA_IN_USE');
      if (input && input.expectedVersion !== current.version) throw new AdBannerServiceError('VERSION_CONFLICT');
      const result = await media.updateOne({ _id: current._id, version: input?.expectedVersion ?? current.version, active: true }, { $set: { active: false, updatedAt: now }, $inc: { version: 1 } });
      if (result.matchedCount !== 1) throw new AdBannerServiceError('VERSION_CONFLICT');
      const deleted = await media.findOne({ _id: current._id });
      if (!deleted) throw new AdBannerServiceError('NOT_FOUND');
      void actorId;
      return toMedia(deleted);
    },

    async reorderBanners(actorId, input, now) {
      return transaction(async session => {
      await findPlacement(input.placementKey, session);
      await placements.updateOne({ key: input.placementKey }, { $inc: { bannerWriteVersion: 1 } }, { session });
      const values = await Promise.all(input.items.map(item => findBanner(item.bannerId, session)));
      if (values.some(item => item.placementKey !== input.placementKey)) throw new AdBannerServiceError('NOT_FOUND');
      const updated: AdBanner[] = [];
      for (const [index, row] of values.entries()) {
        const item = input.items[index];
        if (!item) throw new AdBannerServiceError('NOT_FOUND');
        if (item.expectedVersion !== undefined && item.expectedVersion !== row.version) throw new AdBannerServiceError('VERSION_CONFLICT');
        const result = await banners.updateOne({ _id: row._id, ...(item.expectedVersion === undefined ? {} : { version: item.expectedVersion }) }, { $set: { sortOrder: item.sortOrder, updatedBy: objectId(actorId, 'FORBIDDEN'), updatedAt: now }, $inc: { version: 1 } }, { session });
        if (result.matchedCount !== 1) throw new AdBannerServiceError('VERSION_CONFLICT');
        updated.push(toBanner(await findBanner(row._id.toHexString(), session)));
      }
      return updated.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
      });
    }
  };
}
