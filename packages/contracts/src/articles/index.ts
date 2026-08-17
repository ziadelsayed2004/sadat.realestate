import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';
import { localizedTextSchema, supportedLocaleSchema } from '../localization/index.js';

export const articleIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const articleSlugSchema = z.string().trim().min(2).max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const articleStatusSchema = z.enum(['draft', 'pending_review', 'published', 'archived']);
export const articleAvailableActionSchema = z.enum([
  'update',
  'submit',
  'publish',
  'return_to_draft',
  'archive',
  'restore'
]);
export const articleCategoryAvailableActionSchema = z.enum(['update', 'delete']);

const mutationReasonSchema = z.string().trim().min(5).max(1_000)
  .regex(/^[^\u0000-\u001f\u007f]+$/u);
const boundedQueryNumber = (fallback: number, maximum: number) => z.preprocess(
  (value) => value === undefined ? fallback : Number(value),
  z.number().int().positive().max(maximum)
);
const queryBooleanSchema = z.preprocess(
  (value) => value === 'true' ? true : value === 'false' ? false : value,
  z.boolean().optional()
);

export const articleCategoryDataSchema = z.object({
  id: articleIdSchema,
  slug: articleSlugSchema,
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  displayOrder: z.number().int().nonnegative().max(10_000),
  active: z.boolean(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  availableActions: z.array(articleCategoryAvailableActionSchema).max(2)
}).strict();

// Compatibility alias used by the original service-level implementation.
export const articleCategorySchema = articleCategoryDataSchema;

export const articleCategoryCreateSchema = z.object({
  slug: articleSlugSchema,
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  displayOrder: z.number().int().nonnegative().max(10_000).default(0),
  active: z.boolean().default(true),
  reason: mutationReasonSchema
}).strict();

export const articleCategoryPatchSchema = z.object({
  version: z.number().int().nonnegative(),
  slug: articleSlugSchema.optional(),
  name: localizedTextSchema.optional(),
  description: localizedTextSchema.nullable().optional(),
  displayOrder: z.number().int().nonnegative().max(10_000).optional(),
  active: z.boolean().optional(),
  reason: mutationReasonSchema
}).strict().refine(
  (value) => Object.keys(value).some((key) => !['version', 'reason'].includes(key)),
  { message: 'At least one mutable category field is required' }
);

export const articleCategoryDeleteSchema = z.object({
  version: z.number().int().nonnegative(),
  reason: mutationReasonSchema
}).strict();

export const articleCategoryParamsSchema = z.object({ categoryId: articleIdSchema }).strict();
export const articleCategoryListQuerySchema = z.object({
  active: queryBooleanSchema,
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['displayOrder', 'slug', 'createdAt']).default('displayOrder'),
  direction: z.enum(['asc', 'desc']).default('asc'),
  page: boundedQueryNumber(1, 100_000),
  limit: boundedQueryNumber(20, 100)
}).strict();

export const articlePublicCategorySchema = articleCategoryDataSchema.pick({
  id: true,
  slug: true,
  name: true,
  description: true
}).strict();
export const articlePublicCategoryListQuerySchema = z.object({
  locale: supportedLocaleSchema.default('ar')
}).strict();
export const articleCategoryListDataSchema = z.object({
  items: z.array(articleCategoryDataSchema).max(100)
}).strict();
export const articlePublicCategoryListDataSchema = z.array(articlePublicCategorySchema).max(100);
export const articleCategoryDeleteDataSchema = z.object({
  id: articleIdSchema,
  deleted: z.literal(true)
}).strict();

export const articleDataSchema = z.object({
  id: articleIdSchema,
  categoryId: articleIdSchema,
  slug: articleSlugSchema,
  title: localizedTextSchema,
  body: localizedTextSchema,
  seoTitle: localizedTextSchema.optional(),
  seoDescription: localizedTextSchema.optional(),
  coverAssetId: articleIdSchema.optional(),
  authorId: articleIdSchema,
  status: articleStatusSchema,
  publishedAt: z.string().datetime({ offset: true }).optional(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  availableActions: z.array(articleAvailableActionSchema).max(3)
}).strict();

// Compatibility alias used by the original service-level implementation.
export const articleSchema = articleDataSchema;

export const articleCreateSchema = z.object({
  categoryId: articleIdSchema,
  slug: articleSlugSchema,
  title: localizedTextSchema,
  body: localizedTextSchema,
  seoTitle: localizedTextSchema.optional(),
  seoDescription: localizedTextSchema.optional(),
  coverAssetId: articleIdSchema.optional(),
  reason: mutationReasonSchema
}).strict();

export const articlePatchSchema = z.object({
  version: z.number().int().nonnegative(),
  categoryId: articleIdSchema.optional(),
  slug: articleSlugSchema.optional(),
  title: localizedTextSchema.optional(),
  body: localizedTextSchema.optional(),
  seoTitle: localizedTextSchema.nullable().optional(),
  seoDescription: localizedTextSchema.nullable().optional(),
  coverAssetId: articleIdSchema.nullable().optional(),
  reason: mutationReasonSchema
}).strict().refine(
  (value) => Object.keys(value).some((key) => !['version', 'reason'].includes(key)),
  { message: 'At least one mutable article field is required' }
);

export const articleTransitionRequestSchema = z.object({
  status: articleStatusSchema,
  version: z.number().int().nonnegative(),
  reason: mutationReasonSchema
}).strict();
export const articleParamsSchema = z.object({ articleId: articleIdSchema }).strict();

export const articleAdminListQuerySchema = z.object({
  status: articleStatusSchema.optional(),
  categoryId: articleIdSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['updatedAt', 'publishedAt', 'slug']).default('updatedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  page: boundedQueryNumber(1, 100_000),
  limit: boundedQueryNumber(20, 100)
}).strict();

export const articlePublicSchema = articleDataSchema.pick({
  id: true,
  categoryId: true,
  slug: true,
  title: true,
  body: true,
  seoTitle: true,
  seoDescription: true,
  coverAssetId: true,
  publishedAt: true
}).extend({
  category: articlePublicCategorySchema.optional()
}).strict();

export const articleListQuerySchema = z.object({
  locale: supportedLocaleSchema.default('ar'),
  page: boundedQueryNumber(1, 100_000),
  limit: boundedQueryNumber(20, 100),
  categoryId: articleIdSchema.optional()
}).strict();

export const articleAdminListDataSchema = z.object({
  items: z.array(articleDataSchema).max(100)
}).strict();
export const articlePublicListDataSchema = z.array(articlePublicSchema).max(100);

export const articleCategorySuccessEnvelopeSchema = successEnvelopeSchema(articleCategoryDataSchema);
export const articleCategoryListSuccessEnvelopeSchema = successEnvelopeSchema(articleCategoryListDataSchema);
export const articleCategoryDeleteSuccessEnvelopeSchema = successEnvelopeSchema(articleCategoryDeleteDataSchema);
export const articlePublicCategoryListSuccessEnvelopeSchema = successEnvelopeSchema(articlePublicCategoryListDataSchema);
export const articleSuccessEnvelopeSchema = successEnvelopeSchema(articleDataSchema);
export const articleAdminListSuccessEnvelopeSchema = successEnvelopeSchema(articleAdminListDataSchema);
export const articlePublicListSuccessEnvelopeSchema = successEnvelopeSchema(articlePublicListDataSchema);
export const articlePublicSuccessEnvelopeSchema = successEnvelopeSchema(articlePublicSchema);

export type ArticleStatus = z.infer<typeof articleStatusSchema>;
export type ArticleAvailableAction = z.infer<typeof articleAvailableActionSchema>;
export type ArticleCategoryAvailableAction = z.infer<typeof articleCategoryAvailableActionSchema>;
export type ArticleCategory = z.infer<typeof articleCategoryDataSchema>;
export type ArticleCategoryCreate = z.infer<typeof articleCategoryCreateSchema>;
export type ArticleCategoryPatch = z.infer<typeof articleCategoryPatchSchema>;
export type ArticleCategoryDelete = z.infer<typeof articleCategoryDeleteSchema>;
export type ArticleCategoryListQuery = z.infer<typeof articleCategoryListQuerySchema>;
export type ArticleCategoryListData = z.infer<typeof articleCategoryListDataSchema>;
export type ArticlePublicCategory = z.infer<typeof articlePublicCategorySchema>;
export type ArticlePublicCategoryListQuery = z.infer<typeof articlePublicCategoryListQuerySchema>;
export type ArticlePublicCategoryListData = z.infer<typeof articlePublicCategoryListDataSchema>;
export type Article = z.infer<typeof articleDataSchema>;
export type ArticleCreate = z.infer<typeof articleCreateSchema>;
export type ArticlePatch = z.infer<typeof articlePatchSchema>;
export type ArticleTransitionRequest = z.infer<typeof articleTransitionRequestSchema>;
export type ArticleAdminListQuery = z.infer<typeof articleAdminListQuerySchema>;
export type ArticleAdminListData = z.infer<typeof articleAdminListDataSchema>;
export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;
export type ArticlePublic = z.infer<typeof articlePublicSchema>;
export type ArticlePublicListData = z.infer<typeof articlePublicListDataSchema>;
