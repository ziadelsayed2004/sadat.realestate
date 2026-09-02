import { randomBytes } from 'node:crypto';
import type { AccessTokenClaims } from '../auth/crypto.js';
import { resolveLocalizedText } from '../quality/localization-audit.js';
import {
  AD_EGYPT_TIME_ZONE,
  adAdminRequestListQuerySchema,
  adBannerCreateSchema,
  adBannerListQuerySchema,
  adBannerMediaCreateSchema,
  adBannerMediaDeleteSchema,
  adBannerMediaPatchSchema,
  adBannerMediaSchema,
  adBannerOrderSchema,
  adBannerPatchSchema,
  adBannerPreviewSchema,
  adBannerPublicSchema,
  adBannerSchema,
  adCalendarEventSchema,
  adCalendarListDataSchema,
  adCalendarQuerySchema,
  adPlacementCreateSchema,
  adPlacementListQuerySchema,
  adPlacementPatchSchema,
  adPlacementSchema,
  adQuoteDecisionSchema,
  adQuoteIssueSchema,
  adQuoteSchema,
  adRequestCreateSchema,
  adRequestSchema,
  adRequestTransitionSchema,
  adScheduleRequestSchema,
  adSettingsPatchSchema,
  adSettingsSchema,
  supportedLocaleSchema,
  type AdBanner,
  type AdBannerCreate,
  type AdBannerListData,
  type AdBannerListQuery,
  type AdBannerMediaCreate,
  type AdBannerMediaDelete,
  type AdAdminRequest,
  type AdAdminRequestListData,
  type AdAdminRequestListQuery,
  type AdBannerMedia,
  type AdBannerMediaPatch,
  type AdBannerOrder,
  type AdBannerPatch,
  type AdBannerPreview,
  type AdCalendarEvent,
  type AdCalendarListData,
  type AdCalendarQuery,
  type AdPlacement,
  type AdQuote,
  type AdQuoteDecision,
  type AdQuoteIssue,
  type AdRequest,
  type AdRequestCreate,
  type AdSettings,
  type SupportedLocale
} from '@sadat-real-estate/contracts';

type AdSettingsServiceErrorCode =
  | 'FORBIDDEN'
  | 'DUPLICATE'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'PLACEMENT_CONFLICT'
  | 'BANNER_INVALID_STATE'
  | 'BANNER_TARGET_REQUIRED'
  | 'BANNER_MEDIA_REQUIRED'
  | 'BANNER_CAPACITY'
  | 'MEDIA_IN_USE';

export class AdSettingsServiceError extends Error {
  constructor(readonly code: AdSettingsServiceErrorCode) {
    super(code);
    this.name = 'AdSettingsServiceError';
  }
}

export type AdBannerServiceErrorCode = AdSettingsServiceErrorCode;
export class AdBannerServiceError extends AdSettingsServiceError {
  constructor(code: AdBannerServiceErrorCode) {
    super(code);
    this.name = 'AdBannerServiceError';
  }
}

export interface AdRequestRepository {
  createProviderRequest(providerId: string, input: AdRequestCreate, now: Date): Promise<AdRequest>;
}

export interface AdAdminRequestRepository {
  listAdminRequests(query: AdAdminRequestListQuery): Promise<{ items: AdAdminRequest[]; total: number }>;
  getAdminRequest(requestId: string): Promise<AdAdminRequest | undefined>;
}

export interface AdAdminRequestAuthorization {
  authorize(adminId: string, permission: 'admin:ads.view'): Promise<boolean>;
}

export interface AdAdminRequestService {
  list(claims: AccessTokenClaims, input: unknown): Promise<AdAdminRequestListData>;
  get(claims: AccessTokenClaims, requestId: string): Promise<AdAdminRequest>;
}

export interface AdCalendarRepository {
  listCalendar(query: AdCalendarQuery): Promise<{ items: AdCalendarEvent[]; total: number }>;
  schedule(requestId: string, expectedVersion: number): Promise<AdCalendarEvent>;
}

export interface AdCalendarAuthorization {
  authorize(adminId: string, permission: 'admin:ads.view' | 'admin:ads.schedule'): Promise<boolean>;
}

export interface AdCalendarService {
  list(claims: AccessTokenClaims, input: unknown): Promise<AdCalendarListData>;
  schedule(claims: AccessTokenClaims, requestId: string, input: unknown): Promise<AdCalendarEvent>;
}

export interface AdBannerRepository {
  createBanner(actorId: string, input: AdBannerCreate, now: Date): Promise<AdBanner>;
  listBanners(query: AdBannerListQuery): Promise<AdBannerListData>;
  updateBanner(actorId: string, bannerId: string, input: AdBannerPatch, now: Date): Promise<AdBanner>;
  previewBanner(bannerId: string): Promise<AdBannerPreview>;
  createBannerMedia(actorId: string, bannerId: string, input: AdBannerMediaCreate, now: Date): Promise<AdBannerMedia>;
  listBannerMedia(bannerId: string): Promise<AdBannerMedia[]>;
  updateBannerMedia(actorId: string, mediaId: string, input: AdBannerMediaPatch, now: Date): Promise<AdBannerMedia>;
  deleteBannerMedia(actorId: string, mediaId: string, input: AdBannerMediaDelete | undefined, now: Date): Promise<AdBannerMedia>;
  reorderBanners(actorId: string, input: AdBannerOrder, now: Date): Promise<AdBanner[]>;
}

export interface AdBannerService {
  createBanner(claims: AccessTokenClaims, input: unknown): Promise<AdBanner>;
  listBanners(claims: AccessTokenClaims, input: unknown): Promise<AdBannerListData>;
  updateBanner(claims: AccessTokenClaims, bannerId: string, input: unknown): Promise<AdBanner>;
  previewBanner(claims: AccessTokenClaims, bannerId: string): Promise<AdBannerPreview>;
  createBannerMedia(claims: AccessTokenClaims, bannerId: string, input: unknown): Promise<AdBannerMedia>;
  listBannerMedia(claims: AccessTokenClaims, bannerId: string): Promise<AdBannerMedia[]>;
  updateBannerMedia(claims: AccessTokenClaims, mediaId: string, input: unknown): Promise<AdBannerMedia>;
  deleteBannerMedia(claims: AccessTokenClaims, mediaId: string, input?: unknown): Promise<AdBannerMedia>;
  reorderBanners(claims: AccessTokenClaims, inputOrPlacement: unknown, maybeInput?: unknown): Promise<AdBanner[]>;
}

export interface AdQuoteRepository {
  issueAdminQuote(adminId: string, input: AdQuoteIssue, now: Date): Promise<AdQuote>;
  acceptProviderQuote(providerId: string, requestId: string, input: AdQuoteDecision, now: Date): Promise<AdQuote>;
}

export interface AdRequestWorkflowService {
  createRequest(claims: AccessTokenClaims, input: unknown): Promise<AdRequest>;
  issueQuote(claims: AccessTokenClaims, input: unknown): Promise<AdQuote>;
  acceptQuote(claims: AccessTokenClaims, requestId: string, input: unknown): Promise<AdQuote>;
}

export function createAdAdminRequestService(dependencies: {
  repository: AdAdminRequestRepository;
  authorization: AdAdminRequestAuthorization;
}): AdAdminRequestService {
  const requirePermission = async (claims: AccessTokenClaims): Promise<void> => {
    if (claims.role !== 'admin' || claims.status !== 'verified' || !await dependencies.authorization.authorize(claims.sub, 'admin:ads.view')) {
      throw new AdSettingsServiceError('FORBIDDEN');
    }
  };
  return {
    async list(claims, input) {
      await requirePermission(claims);
      const query = adAdminRequestListQuerySchema.parse(input);
      const result = await dependencies.repository.listAdminRequests(query);
      return { items: result.items, page: query.page, limit: query.limit, total: result.total };
    },
    async get(claims, requestId) {
      await requirePermission(claims);
      const result = await dependencies.repository.getAdminRequest(requestId);
      if (!result) throw new AdSettingsServiceError('NOT_FOUND');
      return result;
    }
  };
}

export function createAdCalendarService(dependencies: {
  repository: AdCalendarRepository;
  authorization: AdCalendarAuthorization;
}): AdCalendarService {
  const requirePermission = async (claims: AccessTokenClaims, permission: 'admin:ads.view' | 'admin:ads.schedule'): Promise<void> => {
    if (claims.role !== 'admin' || claims.status !== 'verified' || !await dependencies.authorization.authorize(claims.sub, permission)) {
      throw new AdSettingsServiceError('FORBIDDEN');
    }
  };

  return {
    async list(claims, input) {
      await requirePermission(claims, 'admin:ads.view');
      const query = adCalendarQuerySchema.parse(input);
      const result = await dependencies.repository.listCalendar(query);
      return adCalendarListDataSchema.parse({ items: result.items, page: query.page, limit: query.limit, total: result.total });
    },
    async schedule(claims, requestId, input) {
      await requirePermission(claims, 'admin:ads.schedule');
      const parsed = adScheduleRequestSchema.parse(input);
      return dependencies.repository.schedule(requestId, parsed.expectedVersion);
    }
  };
}

const id = () => randomBytes(12).toString('hex');
const authorized = (claims: AccessTokenClaims) => claims.role === 'admin' && claims.status === 'verified';
const egyptLocal = (value: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: AD_EGYPT_TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(value));
  const result = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${result.year}-${result.month}-${result.day}T${result.hour}:${result.minute}:${result.second}`;
};

const BANNER_TRANSITIONS: Record<AdBanner['status'], AdBanner['status'][]> = {
  draft: ['scheduled', 'archived'],
  scheduled: ['active', 'ended', 'archived'],
  active: ['ended', 'archived'],
  ended: ['archived'],
  archived: []
};

const isBannerLiveState = (status: AdBanner['status']): boolean => status === 'scheduled' || status === 'active';

export function createAdSettingsService(seed: {
  placements?: AdPlacement[];
  settings?: AdSettings;
  banners?: AdBanner[];
  bannerMedia?: AdBannerMedia[];
  now?: () => Date;
  requestRepository?: AdRequestRepository;
  quoteRepository?: AdQuoteRepository;
  authorization?: { authorize(adminId: string, permission: 'admin:ads.price'): Promise<boolean> };
  bannerAuthorization?: { authorize(adminId: string, permission: 'admin:banners.view' | 'admin:banners.manage'): Promise<boolean> };
  bannerRepository?: AdBannerRepository;
  hasActivePlacement?: (placementKey: string) => Promise<boolean> | boolean;
} = {}) {
  const placements = new Map((seed.placements ?? []).map(item => [item.id, item]));
  const requests = new Map<string, AdRequest>();
  const quotes = new Map<string, AdQuote>();
  const banners = new Map((seed.banners ?? []).map(item => [item.id, item]));
  const bannerMedia = new Map((seed.bannerMedia ?? []).map(item => [item.id, item]));
  let settings = seed.settings ?? adSettingsSchema.parse({ enabled: false, maxActiveBanners: 100, defaultDisplaySeconds: 10, allowedSurfaces: ['homepage'], version: 0, updatedBy: '000000000000000000000000', updatedAt: new Date(0).toISOString() });
  const clock = seed.now ?? (() => new Date());
  const now = () => clock().toISOString();
  const requireAdmin = (claims: AccessTokenClaims) => {
    if (!authorized(claims)) throw new AdSettingsServiceError('FORBIDDEN');
  };
  const requireBannerPermission = async (claims: AccessTokenClaims, permission: 'admin:banners.view' | 'admin:banners.manage') => {
    requireAdmin(claims);
    if (seed.bannerAuthorization && !await seed.bannerAuthorization.authorize(claims.sub, permission)) {
      throw new AdBannerServiceError('FORBIDDEN');
    }
  };
  const requireQuotePermission = async (claims: AccessTokenClaims) => {
    requireAdmin(claims);
    if (seed.authorization && !await seed.authorization.authorize(claims.sub, 'admin:ads.price')) {
      throw new AdSettingsServiceError('FORBIDDEN');
    }
  };
  const placementByKey = (key: string): AdPlacement => {
    const placement = [...placements.values()].find(item => item.key === key);
    if (!placement) throw new AdBannerServiceError('NOT_FOUND');
    return placement;
  };
  const bannerById = (bannerId: string): AdBanner => {
    const banner = banners.get(bannerId);
    if (!banner) throw new AdBannerServiceError('NOT_FOUND');
    return banner;
  };
  const mediaById = (mediaId: string): AdBannerMedia => {
    const media = bannerMedia.get(mediaId);
    if (!media || !media.active) throw new AdBannerServiceError('NOT_FOUND');
    return media;
  };
  const checkMediaLink = (banner: AdBanner, mediaId: string | undefined): AdBannerMedia | undefined => {
    if (!mediaId) return undefined;
    const media = mediaById(mediaId);
    if (media.bannerId !== banner.id) throw new AdBannerServiceError('NOT_FOUND');
    return media;
  };
  const checkLiveRequirements = (banner: AdBanner, placement: AdPlacement, media: AdBannerMedia | undefined) => {
    if (!media) throw new AdBannerServiceError('BANNER_MEDIA_REQUIRED');
    if (placement.targetUrlRequired && !banner.targetUrl) throw new AdBannerServiceError('BANNER_TARGET_REQUIRED');
    if (!placement.active || (banner.status === 'active' && (!settings.enabled || !settings.allowedSurfaces.includes(placement.surface)))) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    const startsAt = new Date(banner.startAt).getTime();
    const endsAt = new Date(banner.endAt).getTime();
    const currentAt = clock().getTime();
    if (banner.status === 'scheduled' && currentAt >= startsAt) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    if (banner.status === 'active' && (currentAt < startsAt || currentAt >= endsAt)) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    if (banner.status === 'ended' && currentAt < endsAt) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    if (isBannerLiveState(banner.status)) {
      const overlap = [...banners.values()].some(item => item.id !== banner.id && item.placementKey === banner.placementKey && isBannerLiveState(item.status) && startsAt < new Date(item.endAt).getTime() && endsAt > new Date(item.startAt).getTime());
      if (overlap) throw new AdBannerServiceError('PLACEMENT_CONFLICT');
    }
  };
  const validateBannerForStatus = (banner: AdBanner): AdBannerMedia | undefined => {
    const placement = placementByKey(banner.placementKey);
    const media = checkMediaLink(banner, banner.mediaId);
    if (isBannerLiveState(banner.status)) checkLiveRequirements(banner, placement, media);
    if (banner.status === 'active' && [...banners.values()].filter(item => item.status === 'active' && item.id !== banner.id).length >= settings.maxActiveBanners) throw new AdBannerServiceError('BANNER_CAPACITY');
    return media;
  };
  const decideQuote = async (claims: AccessTokenClaims, quoteId: string, input: unknown): Promise<AdQuote> => {
    const quote = quotes.get(quoteId);
    if (!quote) throw new AdSettingsServiceError('NOT_FOUND');
    const parsed = adQuoteDecisionSchema.parse(input);
    if (parsed.action === 'accept') {
      if (claims.role !== 'provider' || claims.status !== 'verified' || quote.providerId !== claims.sub) throw new AdSettingsServiceError('FORBIDDEN');
      if (quote.status === 'accepted') return quote;
      if (quote.status !== 'issued' || new Date(quote.validUntil) <= clock()) throw new AdSettingsServiceError('VERSION_CONFLICT');
    } else {
      requireAdmin(claims);
      if (quote.status !== 'issued') throw new AdSettingsServiceError('VERSION_CONFLICT');
    }
    if (parsed.expectedVersion !== quote.version) throw new AdSettingsServiceError('VERSION_CONFLICT');
    const status = parsed.action === 'accept' ? 'accepted' : parsed.action === 'reject' ? 'rejected' : 'cancelled';
    const stamp = now();
    const updated = adQuoteSchema.parse({ ...quote, status, version: quote.version + 1, decisionHistory: [...quote.decisionHistory, { action: status, actorId: claims.sub, actorRole: parsed.action === 'accept' ? 'provider' : 'admin', reason: parsed.reason, version: quote.version + 1, createdAt: stamp }], updatedAt: stamp });
    quotes.set(quote.id, updated);
    if (status === 'accepted') {
      const request = requests.get(quote.requestId);
      if (request?.status === 'quote_sent') requests.set(request.id, adRequestSchema.parse({ ...request, status: 'waiting_payment', version: request.version + 1, updatedAt: stamp }));
    }
    return updated;
  };
  const publicProjection = (banner: AdBanner, media: AdBannerMedia, locale: SupportedLocale) => adBannerPublicSchema.parse({
    id: banner.id,
    placementKey: banner.placementKey,
    title: banner.title,
    ...(banner.altText ? { altText: banner.altText } : {}),
    resolvedTitle: resolveLocalizedText(banner.title, locale),
    ...(banner.altText ? { resolvedAltText: resolveLocalizedText(banner.altText, locale) } : {}),
    imageUrl: media.url,
    ...(banner.targetUrl ? { targetUrl: banner.targetUrl } : {}),
    startAt: banner.startAt,
    endAt: banner.endAt,
    sortOrder: banner.sortOrder,
    status: 'active'
  });

  return {
    async createPlacement(claims: AccessTokenClaims, input: unknown) {
      requireAdmin(claims);
      const parsed = adPlacementCreateSchema.parse(input);
      if ([...placements.values()].some(item => item.key === parsed.key)) throw new AdSettingsServiceError('DUPLICATE');
      const placement = adPlacementSchema.parse({ id: id(), ...parsed, version: 0, updatedBy: claims.sub, updatedAt: now() });
      placements.set(placement.id, placement);
      return placement;
    },
    async updatePlacement(claims: AccessTokenClaims, placementId: string, input: unknown) {
      requireAdmin(claims);
      const current = placements.get(placementId);
      if (!current) throw new AdSettingsServiceError('NOT_FOUND');
      const patch = adPlacementPatchSchema.parse(input);
      if (patch.key && patch.key !== current.key && [...placements.values()].some(item => item.id !== placementId && item.key === patch.key)) throw new AdSettingsServiceError('DUPLICATE');
      const placement = adPlacementSchema.parse({ ...current, ...patch, version: current.version + 1, updatedBy: claims.sub, updatedAt: now() });
      placements.set(placementId, placement);
      return placement;
    },
    async listPlacements(claims: AccessTokenClaims, input: unknown) {
      requireAdmin(claims);
      const query = adPlacementListQuerySchema.parse(input);
      const values = [...placements.values()].filter(item => (!query.surface || item.surface === query.surface) && (query.active === undefined || item.active === query.active)).sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
      return { items: values.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: values.length };
    },
    async updateSettings(claims: AccessTokenClaims, input: unknown) {
      requireAdmin(claims);
      const parsed = adSettingsPatchSchema.parse(input);
      if (parsed.expectedVersion !== settings.version) throw new AdSettingsServiceError('VERSION_CONFLICT');
      settings = adSettingsSchema.parse({ ...settings, ...parsed.patch, version: settings.version + 1, updatedBy: claims.sub, updatedAt: now() });
      return settings;
    },
    async getSettings(claims: AccessTokenClaims) {
      requireAdmin(claims);
      return settings;
    },
    async createRequest(claims: AccessTokenClaims, input: unknown) {
      if (claims.role !== 'provider' || claims.status !== 'verified') throw new AdSettingsServiceError('FORBIDDEN');
      const parsed = adRequestCreateSchema.parse(input);
      const placementAvailable = seed.hasActivePlacement
        ? await seed.hasActivePlacement(parsed.placementKey)
        : [...placements.values()].some(item => item.key === parsed.placementKey && item.active);
      if (!placementAvailable) throw new AdSettingsServiceError('NOT_FOUND');
      if (seed.requestRepository) return seed.requestRepository.createProviderRequest(claims.sub, parsed, clock());
      const stamp = now();
      const request = adRequestSchema.parse({ id: id(), providerId: claims.sub, ...parsed, status: 'draft', version: 0, createdAt: stamp, updatedAt: stamp });
      requests.set(request.id, request);
      return request;
    },
    async listRequests(claims: AccessTokenClaims) {
      if (!authorized(claims) && !(claims.role === 'provider' && claims.status === 'verified')) throw new AdSettingsServiceError('FORBIDDEN');
      return [...requests.values()].filter(item => claims.role === 'admin' || item.providerId === claims.sub).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async transitionRequest(claims: AccessTokenClaims, requestId: string, input: unknown) {
      const request = requests.get(requestId);
      if (!request) throw new AdSettingsServiceError('NOT_FOUND');
      if (claims.role === 'provider' && request.providerId !== claims.sub) throw new AdSettingsServiceError('FORBIDDEN');
      if (claims.role !== 'admin' && claims.role !== 'provider') throw new AdSettingsServiceError('FORBIDDEN');
      const parsed = adRequestTransitionSchema.parse(input);
      if (parsed.expectedVersion !== request.version) throw new AdSettingsServiceError('VERSION_CONFLICT');
      const allowed: Record<AdRequest['status'], AdRequest['status'][]> = { draft: ['review', 'cancelled'], review: ['waiting_pricing', 'rejected', 'cancelled'], waiting_pricing: ['quote_sent', 'cancelled'], quote_sent: ['waiting_payment', 'expired'], waiting_payment: ['scheduled', 'expired'], scheduled: ['active', 'cancelled'], active: ['ended'], ended: [], rejected: [], cancelled: [], expired: [] };
      if (!allowed[request.status].includes(parsed.status)) throw new AdSettingsServiceError('VERSION_CONFLICT');
      if (['scheduled', 'active', 'ended'].includes(parsed.status)) requireAdmin(claims);
      const currentAt = clock().getTime();
      const startsAt = new Date(request.intervalStart).getTime();
      const endsAt = new Date(request.intervalEnd).getTime();
      if ((parsed.status === 'scheduled' || parsed.status === 'active') && currentAt >= endsAt) throw new AdSettingsServiceError('VERSION_CONFLICT');
      if (parsed.status === 'active' && (currentAt < startsAt || currentAt >= endsAt)) throw new AdSettingsServiceError('VERSION_CONFLICT');
      if ((parsed.status === 'scheduled' || parsed.status === 'active') && [...requests.values()].some(item => item.id !== request.id && item.placementKey === request.placementKey && ['scheduled', 'active'].includes(item.status) && startsAt < new Date(item.intervalEnd).getTime() && endsAt > new Date(item.intervalStart).getTime())) throw new AdSettingsServiceError('PLACEMENT_CONFLICT');
      if (parsed.status === 'ended' && currentAt < endsAt) throw new AdSettingsServiceError('VERSION_CONFLICT');
      const updated = adRequestSchema.parse({ ...request, status: parsed.status, version: request.version + 1, updatedAt: now() });
      requests.set(request.id, updated);
      return updated;
    },
    async listCalendar(claims: AccessTokenClaims, input: unknown): Promise<{ items: AdCalendarEvent[]; page: number; limit: number; total: number }> {
      requireAdmin(claims);
      const query = adCalendarQuerySchema.parse(input);
      const from = query.from ? new Date(query.from).getTime() : Number.NEGATIVE_INFINITY;
      const to = query.to ? new Date(query.to).getTime() : Number.POSITIVE_INFINITY;
      const events = [...requests.values()].filter(item => ['scheduled', 'active', 'ended'].includes(item.status)).filter(item => !query.placementKey || item.placementKey === query.placementKey).filter(item => !query.status || item.status === query.status).filter(item => new Date(item.intervalEnd).getTime() > from && new Date(item.intervalStart).getTime() < to).sort((a, b) => a.intervalStart.localeCompare(b.intervalStart) || a.placementKey.localeCompare(b.placementKey)).map(item => adCalendarEventSchema.parse({ requestId: item.id, placementKey: item.placementKey, providerId: item.providerId, status: item.status, startsAt: item.intervalStart, endsAt: item.intervalEnd, timezone: AD_EGYPT_TIME_ZONE, localStart: egyptLocal(item.intervalStart), localEnd: egyptLocal(item.intervalEnd), version: item.version }));
      return { items: events.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: events.length };
    },
    async issueQuote(claims: AccessTokenClaims, input: unknown) {
      await requireQuotePermission(claims);
      const parsed = adQuoteIssueSchema.parse(input);
      if (seed.quoteRepository) return seed.quoteRepository.issueAdminQuote(claims.sub, parsed, clock());
      const request = requests.get(parsed.requestId);
      if (!request) throw new AdSettingsServiceError('NOT_FOUND');
      if (request.status !== 'waiting_pricing') throw new AdSettingsServiceError('VERSION_CONFLICT');
      const totalMinor = parsed.lineItems.reduce((total, item) => {
        const line = item.quantity * item.unitAmountMinor;
        if (!Number.isSafeInteger(line) || !Number.isSafeInteger(total + line)) throw new AdSettingsServiceError('VERSION_CONFLICT');
        return total + line;
      }, 0);
      if (new Date(parsed.validUntil) <= clock()) throw new AdSettingsServiceError('VERSION_CONFLICT');
      const stamp = now();
      const quote = adQuoteSchema.parse({ id: id(), ...parsed, providerId: request.providerId, totalMinor, status: 'issued', issuerId: claims.sub, version: 0, decisionHistory: [{ action: 'issued', actorId: claims.sub, actorRole: 'admin', version: 0, createdAt: stamp }], createdAt: stamp, updatedAt: stamp });
      quotes.set(quote.id, quote);
      requests.set(request.id, adRequestSchema.parse({ ...request, status: 'quote_sent', version: request.version + 1, updatedAt: stamp }));
      return quote;
    },
    async acceptQuote(claims: AccessTokenClaims, requestId: string, input: unknown) {
      if (claims.role !== 'provider' || claims.status !== 'verified') throw new AdSettingsServiceError('FORBIDDEN');
      const parsed = adQuoteDecisionSchema.parse(input);
      if (parsed.action !== 'accept') throw new AdSettingsServiceError('VERSION_CONFLICT');
      if (seed.quoteRepository) return seed.quoteRepository.acceptProviderQuote(claims.sub, requestId, parsed, clock());
      const quote = [...quotes.values()].find(item => item.requestId === requestId && item.providerId === claims.sub);
      if (!quote) throw new AdSettingsServiceError('NOT_FOUND');
      return decideQuote(claims, quote.id, parsed);
    },
    async decideQuote(claims: AccessTokenClaims, quoteId: string, input: unknown) {
      return decideQuote(claims, quoteId, input);
    },
    async createBanner(claims: AccessTokenClaims, input: unknown) {
      const parsed = adBannerCreateSchema.parse(input);
      await requireBannerPermission(claims, 'admin:banners.manage');
      if (seed.bannerRepository) return seed.bannerRepository.createBanner(claims.sub, parsed, clock());
      placementByKey(parsed.placementKey);
      if ([...banners.values()].some(item => item.placementKey === parsed.placementKey && item.sortOrder === parsed.sortOrder && item.status !== 'archived')) throw new AdBannerServiceError('DUPLICATE');
      const stamp = now();
      const banner = adBannerSchema.parse({ id: id(), ...parsed, status: 'draft', version: 0, createdBy: claims.sub, updatedBy: claims.sub, createdAt: stamp, updatedAt: stamp });
      banners.set(banner.id, banner);
      return banner;
    },
    async listBanners(claims: AccessTokenClaims, input: unknown) {
      const query = adBannerListQuerySchema.parse(input);
      await requireBannerPermission(claims, 'admin:banners.view');
      if (seed.bannerRepository) return seed.bannerRepository.listBanners(query);
      const values = [...banners.values()].filter(item => (!query.placementKey || item.placementKey === query.placementKey) && (!query.status || item.status === query.status)).sort((a, b) => a.placementKey.localeCompare(b.placementKey) || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
      return { items: values.slice((query.page - 1) * query.limit, query.page * query.limit), page: query.page, limit: query.limit, total: values.length };
    },
    async updateBanner(claims: AccessTokenClaims, bannerId: string, input: unknown) {
      const parsed = adBannerPatchSchema.parse(input);
      await requireBannerPermission(claims, 'admin:banners.manage');
      if (seed.bannerRepository) return seed.bannerRepository.updateBanner(claims.sub, bannerId, parsed, clock());
      const current = bannerById(bannerId);
      if (parsed.expectedVersion !== current.version) throw new AdBannerServiceError('VERSION_CONFLICT');
      const { expectedVersion: _expectedVersion, reason: _reason, ...changes } = parsed;
      void _expectedVersion;
      void _reason;
      const nextInput: Record<string, unknown> = { ...current, ...changes, updatedBy: claims.sub, updatedAt: now(), version: current.version + 1 };
      if (changes.altText === null) delete nextInput.altText;
      if (changes.mediaId === null) delete nextInput.mediaId;
      if (changes.targetUrl === null) delete nextInput.targetUrl;
      const next = adBannerSchema.parse(nextInput);
      const currentStatus = current.status;
      if (next.status !== currentStatus && !BANNER_TRANSITIONS[currentStatus].includes(next.status)) throw new AdBannerServiceError('BANNER_INVALID_STATE');
      if (next.status === currentStatus && next.version !== current.version + 1) throw new AdBannerServiceError('VERSION_CONFLICT');
      validateBannerForStatus(next);
      banners.set(next.id, next);
      return next;
    },
    async previewBanner(claims: AccessTokenClaims, bannerId: string) {
      await requireBannerPermission(claims, 'admin:banners.view');
      if (seed.bannerRepository) return seed.bannerRepository.previewBanner(bannerId);
      const banner = bannerById(bannerId);
      const media = banner.mediaId ? bannerMedia.get(banner.mediaId) : undefined;
      return adBannerPreviewSchema.parse({ banner, ...(media?.active ? { media } : {}), preview: true });
    },
    async createBannerMedia(claims: AccessTokenClaims, bannerId: string, input: unknown) {
      const parsed = adBannerMediaCreateSchema.parse(input);
      await requireBannerPermission(claims, 'admin:banners.manage');
      if (seed.bannerRepository) return seed.bannerRepository.createBannerMedia(claims.sub, bannerId, parsed, clock());
      bannerById(bannerId);
      const stamp = now();
      const media = adBannerMediaSchema.parse({ id: id(), bannerId, ...parsed, active: true, version: 0, createdBy: claims.sub, createdAt: stamp, updatedAt: stamp });
      bannerMedia.set(media.id, media);
      return media;
    },
    async listBannerMedia(claims: AccessTokenClaims, bannerId: string) {
      await requireBannerPermission(claims, 'admin:banners.view');
      if (seed.bannerRepository) return seed.bannerRepository.listBannerMedia(bannerId);
      bannerById(bannerId);
      return [...bannerMedia.values()].filter(item => item.bannerId === bannerId);
    },
    async updateBannerMedia(claims: AccessTokenClaims, mediaId: string, input: unknown) {
      const parsed = adBannerMediaPatchSchema.parse(input);
      await requireBannerPermission(claims, 'admin:banners.manage');
      if (seed.bannerRepository) return seed.bannerRepository.updateBannerMedia(claims.sub, mediaId, parsed, clock());
      const current = mediaById(mediaId);
      if (parsed.expectedVersion !== current.version) throw new AdBannerServiceError('VERSION_CONFLICT');
      const { expectedVersion: _expectedVersion, reason: _reason, ...changes } = parsed;
      void _expectedVersion;
      void _reason;
      const updated = adBannerMediaSchema.parse({ ...current, ...changes, version: current.version + 1, updatedAt: now() });
      bannerMedia.set(updated.id, updated);
      return updated;
    },
    async deleteBannerMedia(claims: AccessTokenClaims, mediaId: string, input?: unknown) {
      const parsedInput = input === undefined ? undefined : adBannerMediaDeleteSchema.parse(input);
      await requireBannerPermission(claims, 'admin:banners.manage');
      if (seed.bannerRepository) return seed.bannerRepository.deleteBannerMedia(claims.sub, mediaId, parsedInput, clock());
      const current = mediaById(mediaId);
      if ([...banners.values()].some(item => item.mediaId === mediaId)) throw new AdBannerServiceError('MEDIA_IN_USE');
      if (parsedInput && parsedInput.expectedVersion !== current.version) throw new AdBannerServiceError('VERSION_CONFLICT');
      const deleted = adBannerMediaSchema.parse({ ...current, active: false, version: current.version + 1, updatedAt: now() });
      bannerMedia.set(deleted.id, deleted);
      return deleted;
    },
    async reorderBanners(claims: AccessTokenClaims, inputOrPlacement: unknown, maybeInput?: unknown) {
      const input = maybeInput === undefined ? inputOrPlacement : { ...(maybeInput as Record<string, unknown>), placementKey: inputOrPlacement };
      const parsed = adBannerOrderSchema.parse(input);
      await requireBannerPermission(claims, 'admin:banners.manage');
      if (seed.bannerRepository) return seed.bannerRepository.reorderBanners(claims.sub, parsed, clock());
      const selected = parsed.items.map(item => bannerById(item.bannerId));
      if (selected.some(item => item.placementKey !== parsed.placementKey)) throw new AdBannerServiceError('NOT_FOUND');
      const stamp = now();
      const updated = selected.map((banner, index) => {
        const item = parsed.items[index];
        if (!item) throw new AdBannerServiceError('NOT_FOUND');
        if (item.expectedVersion !== undefined && item.expectedVersion !== banner.version) throw new AdBannerServiceError('VERSION_CONFLICT');
        const next = adBannerSchema.parse({ ...banner, sortOrder: item.sortOrder, version: banner.version + 1, updatedBy: claims.sub, updatedAt: stamp });
        banners.set(next.id, next);
        return next;
      });
      return updated.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    },
    async listPublicBanners(surfaceOrLocale: string, localeOrSurface: string, at: Date = clock()) {
      const surfaces = new Set(['homepage', 'search', 'property_detail', 'project_detail', 'community']);
      const locales = new Set(['ar', 'en']);
      const surface = surfaces.has(surfaceOrLocale) ? surfaceOrLocale : localeOrSurface;
      const locale = (surfaces.has(surfaceOrLocale) ? localeOrSurface : surfaceOrLocale) as SupportedLocale;
      if (!surfaces.has(surface) || !locales.has(locale)) throw new AdBannerServiceError('NOT_FOUND');
      const parsedLocale = supportedLocaleSchema.parse(locale);
      if (!settings.enabled || !settings.allowedSurfaces.includes(surface as AdPlacement['surface'])) return [];
      const currentAt = at.getTime();
      const values = [...banners.values()].filter(item => item.status === 'active' && currentAt >= new Date(item.startAt).getTime() && currentAt < new Date(item.endAt).getTime()).filter(item => {
        const placement = [...placements.values()].find(candidate => candidate.key === item.placementKey);
        if (!placement || !placement.active || placement.surface !== surface || !placement.allowedLocales.includes(parsedLocale)) return false;
        const media = item.mediaId ? bannerMedia.get(item.mediaId) : undefined;
        if (!media?.active) return false;
        if (placement.targetUrlRequired && !item.targetUrl) return false;
        return true;
      }).sort((a, b) => {
        const placementA = placementByKey(a.placementKey);
        const placementB = placementByKey(b.placementKey);
        return placementA.sortOrder - placementB.sortOrder || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
      }).slice(0, settings.maxActiveBanners);
      return values.map(item => publicProjection(item, bannerMedia.get(item.mediaId!)!, parsedLocale));
    },
    async getPublicBanners(surface: string, locale: SupportedLocale, at?: Date) {
      return this.listPublicBanners(surface, locale, at);
    },
    async removeBannerMedia(claims: AccessTokenClaims, mediaId: string, input?: unknown) {
      return this.deleteBannerMedia(claims, mediaId, input);
    }
  };
}
