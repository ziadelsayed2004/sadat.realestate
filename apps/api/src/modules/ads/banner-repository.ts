import { Types, type Connection } from 'mongoose';
import {
  adBannerMediaSchema,
  adBannerPreviewSchema,
  adBannerSchema,
  type AdBanner,
  type AdBannerMedia,
  type AdPlacement
} from '@sadat-real-estate/contracts';
import { AdBannerServiceError, type AdBannerRepository } from './service.js';

type BannerStatus = AdBanner['status'];

interface BannerRow {
  _id: Types.ObjectId;
  placementKey: AdBanner['placementKey'];
  title: AdBanner['title'];
  altText?: AdBanner['altText'];
  mediaId?: Types.ObjectId;
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
  draft: ['scheduled', 'archived'],
  scheduled: ['active', 'ended', 'archived'],
  active: ['ended', 'archived'],
  ended: ['archived'],
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
    placementKey: row.placementKey,
    title: row.title,
    ...(row.altText === undefined ? {} : { altText: row.altText }),
    ...(row.mediaId === undefined ? {} : { mediaId: row.mediaId.toHexString() }),
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

export function createMongooseAdBannerRepository(connection: Connection): AdBannerRepository {
  const banners = connection.collection<BannerRow>('ad_banners');
  const media = connection.collection<BannerMediaRow>('ad_banner_media');
  const placements = connection.collection<PlacementRow>('ad_placements');
  const settings = connection.collection<SettingsRow>('ad_settings');
  let indexesReady: Promise<unknown> | undefined;

  function ensureIndexes(): Promise<unknown> {
    indexesReady ??= Promise.all([
      banners.createIndex({ placementKey: 1, status: 1, sortOrder: 1, _id: 1 }, { name: 'ad_banners_placement_status_order' }),
      banners.createIndex({ placementKey: 1, startAt: 1, endAt: 1, status: 1 }, { name: 'ad_banners_placement_window' }),
      media.createIndex({ bannerId: 1, active: 1, updatedAt: -1, _id: -1 }, { name: 'ad_banner_media_banner_active' }),
      media.createIndex({ bannerId: 1, _id: 1 }, { name: 'ad_banner_media_banner_id' })
    ]);
    return indexesReady;
  }

  async function findPlacement(key: AdBanner['placementKey']): Promise<PlacementRow> {
    await ensureIndexes();
    const placement = await placements.findOne({ key });
    if (!placement) throw new AdBannerServiceError('NOT_FOUND');
    return placement;
  }

  async function findBanner(bannerId: string): Promise<BannerRow> {
    await ensureIndexes();
    const banner = await banners.findOne({ _id: objectId(bannerId) });
    if (!banner) throw new AdBannerServiceError('NOT_FOUND');
    return banner;
  }

  async function validateLiveBanner(next: AdBanner, placement: PlacementRow, currentAt: Date): Promise<void> {
    const end = new Date(next.endAt).getTime();
    if (next.status === 'ended' && currentAt.getTime() < end) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    if (!isLive(next.status)) return;
    const linkedMedia = next.mediaId === undefined
      ? undefined
      : await media.findOne({ _id: objectId(next.mediaId), bannerId: objectId(next.id), active: true });
    if (!linkedMedia) throw new AdBannerServiceError('BANNER_MEDIA_REQUIRED');
    if (!placement.active || (placement.targetUrlRequired && next.targetUrl === undefined)) {
      throw new AdBannerServiceError(placement.targetUrlRequired && next.targetUrl === undefined ? 'BANNER_TARGET_REQUIRED' : 'BANNER_INVALID_STATE');
    }
    const currentSettings = await settings.findOne({});
    if (!currentSettings?.enabled || !currentSettings.allowedSurfaces.includes(placement.surface)) {
      throw new AdBannerServiceError('BANNER_INVALID_STATE');
    }
    const start = new Date(next.startAt).getTime();
    if (next.status === 'scheduled' && currentAt.getTime() >= start) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    if (next.status === 'active' && (currentAt.getTime() < start || currentAt.getTime() >= end)) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    const overlap = await banners.findOne({
      _id: { $ne: objectId(next.id) },
      placementKey: next.placementKey,
      status: { $in: LIVE_STATUSES },
      startAt: { $lt: new Date(next.endAt) },
      endAt: { $gt: new Date(next.startAt) }
    });
    if (overlap) throw new AdBannerServiceError('PLACEMENT_CONFLICT');
    if (next.status === 'active') {
      const activeCount = await banners.countDocuments({ status: 'active', _id: { $ne: objectId(next.id) } });
      if (activeCount >= (currentSettings.maxActiveBanners ?? 100)) throw new AdBannerServiceError('BANNER_CAPACITY');
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
    if (next.mediaId === undefined) unset.mediaId = 1; else set.mediaId = objectId(next.mediaId);
    if (next.targetUrl === undefined) unset.targetUrl = 1; else set.targetUrl = next.targetUrl;
    return { $set: set, ...(Object.keys(unset).length === 0 ? {} : { $unset: unset }), $inc: { version: 1 } };
  }

  return {
    async createBanner(actorId, input, now) {
      await findPlacement(input.placementKey);
      const existing = await banners.findOne({ placementKey: input.placementKey, sortOrder: input.sortOrder, status: { $ne: 'archived' } });
      if (existing) throw new AdBannerServiceError('DUPLICATE');
      const banner = adBannerSchema.parse({
        id: new Types.ObjectId().toHexString(),
        ...input,
        status: 'draft',
        version: 0,
        createdBy: actorId,
        updatedBy: actorId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
      const row: BannerRow = {
        _id: objectId(banner.id, 'FORBIDDEN'),
        placementKey: banner.placementKey,
        title: banner.title,
        ...(banner.altText === undefined ? {} : { altText: banner.altText }),
        ...(banner.mediaId === undefined ? {} : { mediaId: objectId(banner.mediaId) }),
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
      try {
        await banners.insertOne(row);
      } catch (error) {
        if (duplicate(error)) throw new AdBannerServiceError('DUPLICATE');
        throw error;
      }
      return toBanner(row);
    },

    async listBanners(query) {
      await ensureIndexes();
      const filter: Record<string, unknown> = {};
      if (query.placementKey) filter.placementKey = query.placementKey;
      if (query.status) filter.status = query.status;
      const [rows, total] = await Promise.all([
        banners.find(filter).sort({ placementKey: 1, sortOrder: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
        banners.countDocuments(filter)
      ]);
      return { items: rows.map(toBanner), page: query.page, limit: query.limit, total };
    },

    async updateBanner(actorId, bannerId, input, now) {
      const current = await findBanner(bannerId);
      if (current.version !== input.expectedVersion) throw new AdBannerServiceError('VERSION_CONFLICT');
      const currentValue = toBanner(current);
      const nextValue = adBannerSchema.parse({
        ...currentValue,
        ...(input.altText === null ? {} : input.altText === undefined ? {} : { altText: input.altText }),
        ...(input.mediaId === null ? {} : input.mediaId === undefined ? {} : { mediaId: input.mediaId }),
        ...(input.targetUrl === null ? {} : input.targetUrl === undefined ? {} : { targetUrl: input.targetUrl }),
        ...Object.fromEntries(Object.entries(input).filter(([key]) => !['expectedVersion', 'reason', 'altText', 'mediaId', 'targetUrl'].includes(key))),
        ...(input.altText === null ? { altText: undefined } : {}),
        ...(input.mediaId === null ? { mediaId: undefined } : {}),
        ...(input.targetUrl === null ? { targetUrl: undefined } : {}),
        updatedBy: actorId,
        updatedAt: now.toISOString(),
        version: current.version + 1
      });
      if (nextValue.status !== current.status && !TRANSITIONS[current.status].includes(nextValue.status)) throw new AdBannerServiceError('BANNER_INVALID_STATE');
      const placement = await findPlacement(nextValue.placementKey);
      await validateLiveBanner(nextValue, placement, now);
      const result = await banners.updateOne({ _id: current._id, version: input.expectedVersion }, changesFor(nextValue, actorId, now));
      if (result.matchedCount !== 1) throw new AdBannerServiceError('VERSION_CONFLICT');
      return toBanner(await findBanner(bannerId));
    },

    async previewBanner(bannerId) {
      const banner = await findBanner(bannerId);
      const linkedMedia = banner.mediaId === undefined ? undefined : await media.findOne({ _id: banner.mediaId, bannerId: banner._id, active: true });
      return adBannerPreviewSchema.parse({ banner: toBanner(banner), ...(linkedMedia ? { media: toMedia(linkedMedia) } : {}), preview: true });
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
      const inUse = await banners.findOne({ mediaId: current._id, status: { $ne: 'archived' } });
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
      const values = await Promise.all(input.items.map(item => findBanner(item.bannerId)));
      if (values.some(item => item.placementKey !== input.placementKey)) throw new AdBannerServiceError('NOT_FOUND');
      const updated: AdBanner[] = [];
      for (const [index, row] of values.entries()) {
        const item = input.items[index];
        if (!item) throw new AdBannerServiceError('NOT_FOUND');
        if (item.expectedVersion !== undefined && item.expectedVersion !== row.version) throw new AdBannerServiceError('VERSION_CONFLICT');
        const result = await banners.updateOne({ _id: row._id, ...(item.expectedVersion === undefined ? {} : { version: item.expectedVersion }) }, { $set: { sortOrder: item.sortOrder, updatedBy: objectId(actorId, 'FORBIDDEN'), updatedAt: now }, $inc: { version: 1 } });
        if (result.matchedCount !== 1) throw new AdBannerServiceError('VERSION_CONFLICT');
        updated.push(toBanner(await findBanner(row._id.toHexString())));
      }
      return updated.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    }
  };
}
