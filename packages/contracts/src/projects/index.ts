import { z } from 'zod';
import { localizedTextSchema } from '../localization/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const PROJECT_STATUSES = ['draft', 'pending_review', 'needs_changes', 'approved', 'published', 'rejected', 'hidden', 'archived'] as const;
export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const projectObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const projectSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const projectReasonSchema = z.string().trim().min(5).max(500).refine(v => !/[\u0000-\u001f\u007f]/.test(v), { message: 'Project reason must not contain control characters' });
export const projectCreateSchema = z.object({
  name: localizedTextSchema,
  slug: projectSlugSchema,
  description: localizedTextSchema.optional(),
  locationId: projectObjectIdSchema.optional(),
  organizationId: projectObjectIdSchema.optional(),
  website: z.url().max(2048).optional(),
  reason: projectReasonSchema
}).strict();
export const projectPatchSchema = z.object({
  version: z.number().int().nonnegative(),
  name: localizedTextSchema.optional(),
  slug: projectSlugSchema.optional(),
  description: localizedTextSchema.nullable().optional(),
  locationId: projectObjectIdSchema.nullable().optional(),
  organizationId: projectObjectIdSchema.nullable().optional(),
  website: z.url().max(2048).nullable().optional(),
  reason: projectReasonSchema
}).strict().refine(v => Object.keys(v).some(k => !['version', 'reason'].includes(k)), { message: 'At least one project field must be changed' });
export const projectSubmitRequestSchema = z.object({ version: z.number().int().nonnegative(), reason: projectReasonSchema }).strict();
export const PROJECT_REVIEW_ACTIONS = ['needs_changes', 'approve', 'reject', 'publish'] as const;
export const projectReviewActionSchema = z.enum(PROJECT_REVIEW_ACTIONS);
export const projectReviewRequestSchema = z.object({ version: z.number().int().nonnegative(), action: projectReviewActionSchema, reason: projectReasonSchema }).strict();
const positiveQuery = (fallback: number, max: number) => z.preprocess(v => v === undefined ? fallback : Number(v), z.number().int().positive().max(max));
export const projectListQuerySchema = z.object({
  status: projectStatusSchema.optional(), search: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(['updatedAt', 'name', 'slug']).default('updatedAt'), direction: z.enum(['asc', 'desc']).default('desc'),
  page: positiveQuery(1, 100000), limit: positiveQuery(20, 100)
}).strict();
export const projectIdParamsSchema = z.object({ projectId: projectObjectIdSchema }).strict();
export const projectDataSchema = z.object({
  id: projectObjectIdSchema, providerId: projectObjectIdSchema, name: localizedTextSchema, slug: projectSlugSchema,
  description: localizedTextSchema.optional(), locationId: projectObjectIdSchema.optional(), organizationId: projectObjectIdSchema.optional(),
  website: z.url().max(2048).optional(), status: projectStatusSchema, version: z.number().int().nonnegative(),
  submittedAt: z.string().datetime({ offset: true }).optional(), reviewedBy: projectObjectIdSchema.optional(), reviewedAt: z.string().datetime({ offset: true }).optional(), reviewReason: projectReasonSchema.optional(), publishedAt: z.string().datetime({ offset: true }).optional(),
  createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
  availableActions: z.array(z.enum(['update', 'submit', 'needs_changes', 'approve', 'reject', 'publish'])).max(6)
}).strict();
export const projectListDataSchema = z.object({ items: z.array(projectDataSchema) }).strict();
export const projectPublicDeveloperSchema = z.object({ id: projectObjectIdSchema, slug: projectSlugSchema, name: localizedTextSchema }).strict();
export const projectPublicPropertySchema = z.object({ id: projectObjectIdSchema, slug: projectSlugSchema, name: localizedTextSchema, active: z.boolean().default(true), status: z.literal('published') }).strict();
export const projectPublicDataSchema = z.object({ id: projectObjectIdSchema, slug: projectSlugSchema, name: localizedTextSchema, description: localizedTextSchema.optional(), website: z.url().max(2048).optional(), developer: projectPublicDeveloperSchema.nullable(), linkedPublishedProperties: z.array(projectPublicPropertySchema).max(1000) }).strict();
export const projectSuccessEnvelopeSchema = successEnvelopeSchema(projectDataSchema);
export const projectListSuccessEnvelopeSchema = successEnvelopeSchema(projectListDataSchema);
export type ProjectStatus = z.infer<typeof projectStatusSchema>; export type ProjectCreate = z.infer<typeof projectCreateSchema>; export type ProjectPatch = z.infer<typeof projectPatchSchema>; export type ProjectSubmitRequest = z.infer<typeof projectSubmitRequestSchema>; export type ProjectReviewAction = z.infer<typeof projectReviewActionSchema>; export type ProjectReviewRequest = z.infer<typeof projectReviewRequestSchema>; export type ProjectListQuery = z.infer<typeof projectListQuerySchema>; export type ProjectData = z.infer<typeof projectDataSchema>; export type ProjectListData = z.infer<typeof projectListDataSchema>; export type ProjectPublicDeveloper = z.infer<typeof projectPublicDeveloperSchema>; export type ProjectPublicProperty = z.infer<typeof projectPublicPropertySchema>; export type ProjectPublicData = z.infer<typeof projectPublicDataSchema>;
