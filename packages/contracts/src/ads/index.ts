import { z } from 'zod';
import { localizedTextSchema, supportedLocaleSchema } from '../localization/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const id = z.string().regex(/^[a-f0-9]{24}$/);
const placementKey = z.string().trim().min(2).max(80).regex(/^[a-z][a-z0-9_.-]*$/);
const surface = z.enum(['homepage', 'search', 'property_detail', 'project_detail', 'community']);
const positiveInt = (max: number) => z.number().int().positive().max(max);

export const adPlacementSchema = z.object({
  id,
  key: placementKey,
  surface,
  label: localizedTextSchema,
  width: positiveInt(5000),
  height: positiveInt(5000),
  active: z.boolean(),
  sortOrder: z.number().int().nonnegative().max(10_000),
  allowedLocales: z.array(supportedLocaleSchema).min(1).max(3),
  targetUrlRequired: z.boolean(),
  version: z.number().int().nonnegative(),
  updatedBy: id,
  updatedAt: z.string().datetime({ offset: true })
}).strict();
export const adPlacementCreateSchema = adPlacementSchema.omit({ id: true, version: true, updatedBy: true, updatedAt: true }).strict();
export const adPlacementPatchSchema = adPlacementCreateSchema.partial().strict();
export const adSettingsSchema = z.object({
  enabled: z.boolean(),
  maxActiveBanners: positiveInt(1000),
  defaultDisplaySeconds: positiveInt(86_400),
  allowedSurfaces: z.array(surface).min(1).max(5),
  version: z.number().int().nonnegative(),
  updatedBy: id,
  updatedAt: z.string().datetime({ offset: true })
}).strict();
export const adSettingsPatchSchema = z.object({
  patch: adSettingsSchema.omit({ version: true, updatedBy: true, updatedAt: true }).partial().strict(),
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500)
}).strict();
export const adPlacementListQuerySchema = z.object({ surface: surface.optional(), active: z.preprocess(value => value === undefined ? undefined : value === 'true' ? true : value === 'false' ? false : value, z.boolean().optional()), page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)), limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100)) }).strict();
export type AdPlacement = z.infer<typeof adPlacementSchema>;
export type AdPlacementCreate = z.infer<typeof adPlacementCreateSchema>;
export type AdSettings = z.infer<typeof adSettingsSchema>;
export type AdSettingsPatch = z.infer<typeof adSettingsPatchSchema>;
export const adRequestStatusSchema = z.enum(['draft', 'review', 'waiting_pricing', 'quote_sent', 'waiting_payment', 'scheduled', 'active', 'ended', 'rejected', 'cancelled', 'expired']);
export const adRequestSchema = z.object({ id, providerId: id, placementKey, purpose: z.string().trim().min(2).max(500), intervalStart: z.string().datetime({ offset: true }), intervalEnd: z.string().datetime({ offset: true }), status: adRequestStatusSchema, version: z.number().int().nonnegative(), createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }) }).strict();
export const adRequestCreateSchema = adRequestSchema.pick({ placementKey: true, purpose: true, intervalStart: true, intervalEnd: true }).strict().superRefine((value, ctx) => { if (new Date(value.intervalEnd) <= new Date(value.intervalStart)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['intervalEnd'], message: 'intervalEnd must be after intervalStart' }); });
export const adRequestTransitionSchema = z.object({ status: adRequestStatusSchema, expectedVersion: z.number().int().nonnegative(), reason: z.string().trim().min(2).max(500).optional() }).strict().superRefine((value, ctx) => { if (['rejected', 'cancelled', 'expired'].includes(value.status) && !value.reason) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'reason is required' }); });
export const adScheduleRequestSchema = z.object({ expectedVersion: z.number().int().nonnegative() }).strict();
export const adRequestIdParamsSchema = z.object({ adRequestId: id }).strict();
export type AdRequest = z.infer<typeof adRequestSchema>; export type AdRequestCreate = z.infer<typeof adRequestCreateSchema>; export type AdScheduleRequest = z.infer<typeof adScheduleRequestSchema>;
export const AD_EGYPT_TIME_ZONE = 'Africa/Cairo' as const;
export const adCalendarStatusSchema = z.enum(['scheduled', 'active', 'ended']);
export const adCalendarQuerySchema = z.object({ placementKey: placementKey.optional(), status: adCalendarStatusSchema.optional(), from: z.string().datetime({ offset: true }).optional(), to: z.string().datetime({ offset: true }).optional(), page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)), limit: z.preprocess(value => value === undefined ? 50 : Number(value), z.number().int().positive().max(100)) }).strict().superRefine((value, ctx) => { if (value.from && value.to && new Date(value.to) <= new Date(value.from)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'to must be after from' }); });
export const adCalendarEventSchema = z.object({ requestId: id, placementKey, providerId: id, status: adCalendarStatusSchema, startsAt: z.string().datetime({ offset: true }), endsAt: z.string().datetime({ offset: true }), timezone: z.literal(AD_EGYPT_TIME_ZONE), localStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/), localEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/), version: z.number().int().nonnegative() }).strict();
export const adCalendarListDataSchema = z.object({ items: z.array(adCalendarEventSchema).max(100), page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative() }).strict();
export const adCalendarListSuccessEnvelopeSchema = successEnvelopeSchema(adCalendarListDataSchema);
export type AdCalendarQuery = z.infer<typeof adCalendarQuerySchema>; export type AdCalendarEvent = z.infer<typeof adCalendarEventSchema>; export type AdCalendarListData = z.infer<typeof adCalendarListDataSchema>;
const moneyMinor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const adQuoteStatusSchema = z.enum(['issued', 'accepted', 'rejected', 'cancelled', 'expired']);
export const adQuoteLineItemSchema = z.object({ description: z.string().trim().min(2).max(300), quantity: z.number().int().positive().max(1_000_000), unitAmountMinor: moneyMinor }).strict();
export const adQuoteIssueSchema = z.object({ requestId: id, currency: z.string().regex(/^[A-Z]{3}$/), lineItems: z.array(adQuoteLineItemSchema).min(1).max(50), validUntil: z.string().datetime({ offset: true }), terms: z.string().trim().min(2).max(2_000), notes: z.string().trim().max(2_000).optional() }).strict();
export const adQuoteDecisionSchema = z.object({ action: z.enum(['accept', 'reject', 'cancel']), expectedVersion: z.number().int().nonnegative(), reason: z.string().trim().min(2).max(500).optional() }).strict().superRefine((value, ctx) => { if (['reject', 'cancel'].includes(value.action) && !value.reason) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'reason is required' }); });
export const adQuoteDecisionHistorySchema = z.object({ action: adQuoteStatusSchema, actorId: id, actorRole: z.enum(['admin', 'provider']), reason: z.string().trim().min(2).max(500).optional(), version: z.number().int().nonnegative(), createdAt: z.string().datetime({ offset: true }) }).strict();
export const adQuoteSchema = z.object({ id, requestId: id, providerId: id, currency: z.string().regex(/^[A-Z]{3}$/), lineItems: z.array(adQuoteLineItemSchema), totalMinor: moneyMinor, validUntil: z.string().datetime({ offset: true }), terms: z.string().trim().min(2).max(2_000), notes: z.string().trim().max(2_000).optional(), status: adQuoteStatusSchema, issuerId: id, version: z.number().int().nonnegative(), decisionHistory: z.array(adQuoteDecisionHistorySchema).min(1).max(100), createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }) }).strict();
export type AdQuoteIssue = z.infer<typeof adQuoteIssueSchema>;
export type AdQuoteDecision = z.infer<typeof adQuoteDecisionSchema>;
export type AdQuote = z.infer<typeof adQuoteSchema>;
export type AdQuoteDecisionHistory = z.infer<typeof adQuoteDecisionHistorySchema>;
export const adAdminRequestSchema = z.object({ request: adRequestSchema, quote: adQuoteSchema.optional() }).strict();
const adAdminRequestPage = z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000));
const adAdminRequestLimit = z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100));
export const adAdminRequestListQuerySchema = z.object({
  status: adRequestStatusSchema.optional(),
  providerId: id.optional(),
  page: adAdminRequestPage,
  limit: adAdminRequestLimit
}).strict();
export const adAdminRequestListDataSchema = z.object({
  items: z.array(adAdminRequestSchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const adAdminRequestSuccessEnvelopeSchema = successEnvelopeSchema(adAdminRequestSchema);
export const adAdminRequestListSuccessEnvelopeSchema = successEnvelopeSchema(adAdminRequestListDataSchema);
export type AdAdminRequest = z.infer<typeof adAdminRequestSchema>;
export type AdAdminRequestListQuery = z.infer<typeof adAdminRequestListQuerySchema>;
export type AdAdminRequestListData = z.infer<typeof adAdminRequestListDataSchema>;

export const AD_BANNER_STATUSES = ['draft', 'scheduled', 'active', 'ended', 'archived'] as const;
export const AD_BANNER_MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const adBannerStatusSchema = z.enum(AD_BANNER_STATUSES);
export const adBannerMediaMimeSchema = z.enum(AD_BANNER_MEDIA_MIME_TYPES);
const publicHttpsUrl = z.string().url().max(2_048).refine(value => new URL(value).protocol === 'https:', { message: 'Only HTTPS media and target URLs are accepted' });
const bannerDateRange = (value: { startAt?: string | undefined; endAt?: string | undefined }, ctx: z.RefinementCtx) => {
  if (value.startAt && value.endAt && new Date(value.endAt) <= new Date(value.startAt)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'endAt must be after startAt' });
};

export const adBannerMediaSchema = z.object({
  id,
  bannerId: id,
  url: publicHttpsUrl,
  mime: adBannerMediaMimeSchema,
  width: positiveInt(20_000),
  height: positiveInt(20_000),
  active: z.boolean(),
  version: z.number().int().nonnegative(),
  createdBy: id,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
}).strict();
export const adBannerMediaCreateSchema = adBannerMediaSchema.omit({ id: true, bannerId: true, version: true, active: true, createdBy: true, createdAt: true, updatedAt: true }).strict();
export const adBannerMediaPatchSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
  url: publicHttpsUrl.optional(),
  mime: adBannerMediaMimeSchema.optional(),
  width: positiveInt(20_000).optional(),
  height: positiveInt(20_000).optional()
}).strict().refine(value => Object.keys(value).some(key => !['expectedVersion', 'reason'].includes(key)), { message: 'At least one media field must be changed' });
export const adBannerMediaDeleteSchema = z.object({ expectedVersion: z.number().int().nonnegative(), reason: z.string().trim().min(2).max(500) }).strict();

export const adBannerSchema = z.object({
  id,
  placementKey,
  title: localizedTextSchema,
  altText: localizedTextSchema.optional(),
  mediaId: id.optional(),
  targetUrl: publicHttpsUrl.optional(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  status: adBannerStatusSchema,
  sortOrder: z.number().int().nonnegative().max(100_000),
  version: z.number().int().nonnegative(),
  createdBy: id,
  updatedBy: id,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
}).strict().superRefine((value, ctx) => bannerDateRange(value, ctx));
export const adBannerCreateSchema = z.object({
  placementKey,
  title: localizedTextSchema,
  altText: localizedTextSchema.optional(),
  mediaId: id.optional(),
  targetUrl: publicHttpsUrl.optional(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  sortOrder: z.number().int().nonnegative().max(100_000).default(0)
}).strict().superRefine((value, ctx) => bannerDateRange(value, ctx));
export const adBannerPatchSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
  placementKey: placementKey.optional(),
  title: localizedTextSchema.optional(),
  altText: localizedTextSchema.nullable().optional(),
  mediaId: id.nullable().optional(),
  targetUrl: publicHttpsUrl.nullable().optional(),
  startAt: z.string().datetime({ offset: true }).optional(),
  endAt: z.string().datetime({ offset: true }).optional(),
  status: adBannerStatusSchema.optional(),
  sortOrder: z.number().int().nonnegative().max(100_000).optional()
}).strict().superRefine((value, ctx) => {
  bannerDateRange(value, ctx);
  if (Object.keys(value).every(key => ['expectedVersion', 'reason'].includes(key))) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one banner field must be changed' });
});
export const adBannerListQuerySchema = z.object({
  placementKey: placementKey.optional(),
  status: adBannerStatusSchema.optional(),
  page: z.preprocess(value => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess(value => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict();
export const adBannerIdParamsSchema = z.object({ bannerId: id }).strict();
export const adBannerMediaIdParamsSchema = z.object({ mediaId: id }).strict();
export const adBannerListDataSchema = z.object({
  items: z.array(adBannerSchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const adBannerListSuccessEnvelopeSchema = successEnvelopeSchema(adBannerListDataSchema);
export const adBannerSuccessEnvelopeSchema = successEnvelopeSchema(adBannerSchema);
export const adBannerMediaListDataSchema = z.object({ items: z.array(adBannerMediaSchema).max(100) }).strict();
export const adBannerMediaListSuccessEnvelopeSchema = successEnvelopeSchema(adBannerMediaListDataSchema);
export const adBannerMediaSuccessEnvelopeSchema = successEnvelopeSchema(adBannerMediaSchema);
export const adBannerOrderSuccessEnvelopeSchema = successEnvelopeSchema(z.array(adBannerSchema).max(100));
export const adBannerOrderSchema = z.object({
  placementKey: placementKey,
  items: z.array(z.object({ bannerId: id, sortOrder: z.number().int().nonnegative().max(100_000), expectedVersion: z.number().int().nonnegative().optional() }).strict()).min(1).max(100),
  reason: z.string().trim().min(2).max(500)
}).strict().superRefine((value, ctx) => {
  const ids = value.items.map(item => item.bannerId);
  const orders = value.items.map(item => item.sortOrder);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Banner IDs must be unique' });
  if (new Set(orders).size !== orders.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Sort orders must be unique' });
});
export const adBannerPreviewSchema = z.object({
  banner: adBannerSchema,
  media: adBannerMediaSchema.optional(),
  preview: z.literal(true)
}).strict();
export const adBannerPreviewSuccessEnvelopeSchema = successEnvelopeSchema(adBannerPreviewSchema);
export const adBannerPublicSchema = z.object({
  id,
  placementKey,
  title: localizedTextSchema,
  altText: localizedTextSchema.optional(),
  resolvedTitle: z.string(),
  resolvedAltText: z.string().optional(),
  imageUrl: publicHttpsUrl,
  targetUrl: publicHttpsUrl.optional(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  sortOrder: z.number().int().nonnegative().max(100_000),
  status: z.literal('active')
}).strict();
export type AdBannerStatus = z.infer<typeof adBannerStatusSchema>;
export type AdBannerMediaMime = z.infer<typeof adBannerMediaMimeSchema>;
export type AdBannerMedia = z.infer<typeof adBannerMediaSchema>;
export type AdBannerMediaCreate = z.infer<typeof adBannerMediaCreateSchema>;
export type AdBannerMediaDelete = z.infer<typeof adBannerMediaDeleteSchema>;
export type AdBannerMediaPatch = z.infer<typeof adBannerMediaPatchSchema>;
export type AdBanner = z.infer<typeof adBannerSchema>;
export type AdBannerCreate = z.infer<typeof adBannerCreateSchema>;
export type AdBannerPatch = z.infer<typeof adBannerPatchSchema>;
export type AdBannerListQuery = z.infer<typeof adBannerListQuerySchema>;
export type AdBannerListData = z.infer<typeof adBannerListDataSchema>;
export type AdBannerOrder = z.infer<typeof adBannerOrderSchema>;
export type AdBannerPreview = z.infer<typeof adBannerPreviewSchema>;
export type AdBannerPublic = z.infer<typeof adBannerPublicSchema>;
