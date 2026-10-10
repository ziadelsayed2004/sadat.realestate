import { z } from 'zod';
import { accountPasswordSchema, normalizedEmailSchema } from '../auth/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const ADMIN_ACCESS_LEVELS = ['super_admin', 'standard_admin'] as const;
export const FIRST_SUPER_ADMIN_BOOTSTRAP_KEY = 'first-super-admin' as const;
export const FIRST_SUPER_ADMIN_CONFIRMATION = 'CREATE_FIRST_SUPER_ADMIN' as const;

export const adminAccessLevelSchema = z.enum(ADMIN_ACCESS_LEVELS);

export const adminBootstrapInputSchema = z.object({
  email: normalizedEmailSchema,
  password: accountPasswordSchema,
  locale: z.enum(['ar', 'en']).default('ar'),
  confirmation: z.literal(FIRST_SUPER_ADMIN_CONFIRMATION)
}).strict();

export const adminBootstrapDataSchema = z.object({
  adminId: z.string().regex(/^[a-f0-9]{24}$/),
  email: normalizedEmailSchema,
  accessLevel: z.literal('super_admin'),
  status: z.literal('verified'),
  bootstrappedAt: z.string().datetime({ offset: true })
}).strict();

export type AdminAccessLevel = z.infer<typeof adminAccessLevelSchema>;
export type AdminBootstrapInput = z.infer<typeof adminBootstrapInputSchema>;
export type AdminBootstrapData = z.infer<typeof adminBootstrapDataSchema>;

const adminOverviewDateSchema = z.string().datetime({ offset: true });
const adminOverviewMetricSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const adminOverviewQuerySchema = z.object({
  from: adminOverviewDateSchema,
  to: adminOverviewDateSchema
}).strict().superRefine((value, context) => {
  const from = new Date(value.from).getTime();
  const to = new Date(value.to).getTime();
  if (from >= to) context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'to must be after from' });
  if (to - from > 366 * 24 * 60 * 60 * 1_000) context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Overview range cannot exceed 366 days' });
});

/** Only adapter-supplied, documented KPI aggregations are exposed. */
export const adminOverviewMetricsSchema = z.object({
  users: adminOverviewMetricSchema,
  seekers: adminOverviewMetricSchema,
  providers: adminOverviewMetricSchema,
  verifiedProviders: adminOverviewMetricSchema,
  publishedProperties: adminOverviewMetricSchema,
  openRequests: adminOverviewMetricSchema,
  pendingReviews: adminOverviewMetricSchema,
  adRequests: adminOverviewMetricSchema.optional(),
  paymentProofs: adminOverviewMetricSchema.optional(),
  activeAds: adminOverviewMetricSchema.optional(),
  approvedAdPaymentsMinor: adminOverviewMetricSchema.optional(),
  publishedArticles: adminOverviewMetricSchema.optional(),
  communityPosts: adminOverviewMetricSchema.optional(),
  communityComments: adminOverviewMetricSchema.optional(),
  contentReports: adminOverviewMetricSchema.optional()
}).strict();

export const adminOverviewDataSchema = z.object({
  range: adminOverviewQuerySchema,
  metrics: adminOverviewMetricsSchema,
  generatedAt: adminOverviewDateSchema
}).strict();
export const adminOverviewSuccessEnvelopeSchema = z.object({
  data: adminOverviewDataSchema,
  meta: z.object({ requestId: z.string().min(1).max(128) }).passthrough()
}).strict();

export type AdminOverviewQuery = z.infer<typeof adminOverviewQuerySchema>;
export type AdminOverviewMetrics = z.infer<typeof adminOverviewMetricsSchema>;
export type AdminOverviewData = z.infer<typeof adminOverviewDataSchema>;

export const ADMIN_USER_STATUSES = ['active', 'disabled'] as const;
export const ADMIN_USER_AVAILABLE_ACTIONS = ['update', 'disable', 'enable', 'delete'] as const;
export const adminUserStatusSchema = z.enum(ADMIN_USER_STATUSES);
export const adminUserAvailableActionSchema = z.enum(ADMIN_USER_AVAILABLE_ACTIONS);
const adminUserDisplayNameSchema = z.string().trim().min(2).max(160).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), { message: 'Display name must not contain control characters' });
const adminUserObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const adminRoleIdsSchema = z.array(adminUserObjectIdSchema).min(1).max(10).refine(ids => new Set(ids).size === ids.length, { message: 'Roles must be unique' });
const adminUserDateSchema = z.string().datetime({ offset: true });
export const adminUserIdParamsSchema = z.object({
  adminId: adminUserObjectIdSchema
}).strict();

export const adminUserListQuerySchema = z.object({
  search: z.string().trim().min(1).max(160).optional(),
  status: adminUserStatusSchema.optional(),
  accessLevel: adminAccessLevelSchema.optional(),
  page: z.preprocess((value) => value === undefined ? 1 : Number(value), z.number().int().positive().max(100_000)),
  limit: z.preprocess((value) => value === undefined ? 20 : Number(value), z.number().int().positive().max(100))
}).strict();

export const adminUserCreateSchema = z.object({
  email: normalizedEmailSchema,
  displayName: adminUserDisplayNameSchema,
  accessLevel: adminAccessLevelSchema,
  password: accountPasswordSchema.optional(),
  roleIds: adminRoleIdsSchema.optional()
}).strict();

export const adminUserDeleteSchema = z.object({
  expectedVersion: z.number().int().nonnegative()
}).strict();
export const adminUserDeleteDataSchema = z.object({
  id: adminUserObjectIdSchema,
  deleted: z.literal(true),
  version: z.number().int().positive()
}).strict();
export const adminUserDeleteSuccessEnvelopeSchema = successEnvelopeSchema(adminUserDeleteDataSchema);
export type AdminUserDelete = z.infer<typeof adminUserDeleteSchema>;
export type AdminUserDeleteData = z.infer<typeof adminUserDeleteDataSchema>;

export const adminUserPatchSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(3).max(500).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), { message: 'Reason must not contain control characters' }),
  email: normalizedEmailSchema.optional(),
  displayName: adminUserDisplayNameSchema.optional(),
  password: accountPasswordSchema.optional(),
  roleIds: adminRoleIdsSchema.optional(),
  accessLevel: adminAccessLevelSchema.optional(),
  status: adminUserStatusSchema.optional()
}).strict().refine((value) => Object.keys(value).some((key) => !['expectedVersion', 'reason'].includes(key)), { message: 'At least one administrator field must be changed' });

export const adminPresenceSchema = z.object({
  online: z.boolean(),
  lastActiveAt: adminUserDateSchema.nullable()
}).strict();
export const adminAccountPresenceDataSchema = z.object({
  id: adminUserObjectIdSchema,
  displayName: adminUserDisplayNameSchema
}).strict();
export const adminAccountPresenceSuccessEnvelopeSchema = successEnvelopeSchema(adminAccountPresenceDataSchema);
export type AdminPresence = z.infer<typeof adminPresenceSchema>;
export type AdminAccountPresenceData = z.infer<typeof adminAccountPresenceDataSchema>;

export const adminUserDataSchema = z.object({
  presence: adminPresenceSchema.optional(),
  roleIds: z.array(adminUserObjectIdSchema).max(10).optional(),
  id: adminUserObjectIdSchema,
  email: normalizedEmailSchema,
  displayName: adminUserDisplayNameSchema,
  accessLevel: adminAccessLevelSchema,
  status: adminUserStatusSchema,
  version: z.number().int().nonnegative(),
  createdAt: adminUserDateSchema,
  updatedAt: adminUserDateSchema,
  disabledAt: adminUserDateSchema.optional(),
  availableActions: z.array(adminUserAvailableActionSchema).max(3)
}).strict().superRefine((value, context) => {
  if (value.status === 'active' && value.disabledAt !== undefined) context.addIssue({ code: z.ZodIssueCode.custom, path: ['disabledAt'], message: 'Active administrators cannot have disabledAt' });
  if (value.status === 'disabled' && value.disabledAt === undefined) context.addIssue({ code: z.ZodIssueCode.custom, path: ['disabledAt'], message: 'Disabled administrators require disabledAt' });
});

export const adminUserListDataSchema = z.object({
  items: z.array(adminUserDataSchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const adminUserSuccessEnvelopeSchema = successEnvelopeSchema(adminUserDataSchema);
export const adminUserListSuccessEnvelopeSchema = successEnvelopeSchema(adminUserListDataSchema);

export type AdminUserStatus = z.infer<typeof adminUserStatusSchema>;
export type AdminUserAvailableAction = z.infer<typeof adminUserAvailableActionSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserCreate = z.infer<typeof adminUserCreateSchema>;
export type AdminUserPatch = z.infer<typeof adminUserPatchSchema>;
export type AdminUserData = z.infer<typeof adminUserDataSchema>;
export type AdminUserListData = z.infer<typeof adminUserListDataSchema>;
