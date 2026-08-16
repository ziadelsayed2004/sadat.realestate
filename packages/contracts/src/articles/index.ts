import { z } from 'zod';
import { localizedTextSchema, supportedLocaleSchema } from '../localization/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const id = z.string().regex(/^[a-f0-9]{24}$/); export const articleSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const articleCategorySchema = z.object({ id, slug: articleSlugSchema, name: localizedTextSchema, description: localizedTextSchema.optional(), displayOrder: z.number().int().nonnegative().max(10_000), active: z.boolean() }).strict();
export const articleCategoryCreateSchema = articleCategorySchema.omit({ id: true }).strict();
export const articleCategoryPatchSchema = articleCategoryCreateSchema.partial().strict();
export const articleStatusSchema = z.enum(['draft', 'pending_review', 'published', 'archived']);
export const articleSchema = z.object({ id, categoryId: id, slug: articleSlugSchema, title: localizedTextSchema, body: localizedTextSchema, seoTitle: localizedTextSchema.optional(), seoDescription: localizedTextSchema.optional(), coverAssetId: id.optional(), authorId: id, status: articleStatusSchema, publishedAt: z.string().datetime({ offset: true }).optional(), updatedAt: z.string().datetime({ offset: true }) }).strict();
export const articleCreateSchema = articleSchema.omit({ id: true, status: true, publishedAt: true, updatedAt: true }).strict();
export const articlePatchSchema = articleCreateSchema.partial().strict();
export const articlePublicSchema = articleSchema.pick({ id: true, categoryId: true, slug: true, title: true, body: true, seoTitle: true, seoDescription: true, coverAssetId: true, publishedAt: true }).strict();
export const articleListQuerySchema = z.object({ locale: supportedLocaleSchema.default('ar'), page: z.number().int().positive().max(100_000).default(1), limit: z.number().int().positive().max(100).default(20), categoryId: id.optional() }).strict();
export const articlePublicListDataSchema = z.array(articlePublicSchema).max(100);
export const articlePublicListSuccessEnvelopeSchema = successEnvelopeSchema(articlePublicListDataSchema);
export const articlePublicSuccessEnvelopeSchema = successEnvelopeSchema(articlePublicSchema);
export type ArticleCategory = z.infer<typeof articleCategorySchema>; export type ArticleCategoryCreate = z.infer<typeof articleCategoryCreateSchema>; export type Article = z.infer<typeof articleSchema>; export type ArticleCreate = z.infer<typeof articleCreateSchema>; export type ArticleListQuery = z.infer<typeof articleListQuerySchema>; export type ArticlePublic = z.infer<typeof articlePublicSchema>; export type ArticlePublicListData = z.infer<typeof articlePublicListDataSchema>;
