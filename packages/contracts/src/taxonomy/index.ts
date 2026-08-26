import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';
import { localizedTextSchema } from '../localization/index.js';

export const TAXONOMY_KINDS = ['category', 'type'] as const;
export const taxonomyKindSchema = z.enum(TAXONOMY_KINDS);
export const taxonomyIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const taxonomySlugSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const reason = z.string().trim().min(5).max(500).regex(/^[^\u0000-\u001f\u007f]+$/);
const hierarchy = (value: { kind: 'category' | 'type'; categoryId?: string | undefined }, context: z.RefinementCtx) => {
  if (value.kind === 'type' && !value.categoryId) context.addIssue({ code: 'custom', path: ['categoryId'], message: 'Property type category is required' });
  if (value.kind === 'category' && value.categoryId) context.addIssue({ code: 'custom', path: ['categoryId'], message: 'Category cannot have a parent category' });
};
export const taxonomyCreateSchema = z.object({
  kind: taxonomyKindSchema, categoryId: taxonomyIdSchema.optional(), name: localizedTextSchema,
  slug: taxonomySlugSchema, order: z.number().int().min(0).max(1_000_000).default(0),
  active: z.boolean().default(true), reason
}).strict().superRefine(hierarchy);
export const taxonomyPatchSchema = z.object({
  version: z.number().int().nonnegative(), categoryId: taxonomyIdSchema.optional(), name: localizedTextSchema.optional(),
  slug: taxonomySlugSchema.optional(), order: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(), reason
}).strict().refine((value) => Object.keys(value).some((key) => !['version', 'reason'].includes(key)), { message: 'At least one mutable field is required' });
export const taxonomyDeleteSchema = z.object({ version: z.number().int().nonnegative(), reason }).strict();
export const taxonomyParamsSchema = z.object({ categoryId: taxonomyIdSchema }).strict();
const numberQuery = (fallback: number, max: number) => z.preprocess((value) => value === undefined ? fallback : Number(value), z.number().int().positive().max(max));
export const taxonomyListQuerySchema = z.object({
  kind: taxonomyKindSchema.optional(), categoryId: taxonomyIdSchema.optional(),
  active: z.preprocess((value) => value === 'true' ? true : value === 'false' ? false : value, z.boolean().optional()),
  search: z.string().trim().min(1).max(80).optional(), sort: z.enum(['order', 'slug', 'createdAt']).default('order'),
  direction: z.enum(['asc', 'desc']).default('asc'), page: numberQuery(1, 100_000), limit: numberQuery(20, 100)
}).strict();
export const taxonomyDataSchema = z.object({
  id: taxonomyIdSchema, kind: taxonomyKindSchema, categoryId: taxonomyIdSchema.optional(), name: localizedTextSchema,
  slug: taxonomySlugSchema, order: z.number().int().nonnegative(), active: z.boolean(), version: z.number().int().nonnegative(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(), availableActions: z.array(z.enum(['update', 'delete'])).max(2)
}).strict();
export const taxonomyListDataSchema = z.object({ items: z.array(taxonomyDataSchema) }).strict();
export const taxonomyDeleteDataSchema = z.object({ id: taxonomyIdSchema, deleted: z.literal(true) }).strict();
export const taxonomySuccessEnvelopeSchema = successEnvelopeSchema(taxonomyDataSchema);
export const taxonomyListSuccessEnvelopeSchema = successEnvelopeSchema(taxonomyListDataSchema);
export const taxonomyDeleteSuccessEnvelopeSchema = successEnvelopeSchema(taxonomyDeleteDataSchema);
export type TaxonomyCreate = z.infer<typeof taxonomyCreateSchema>;
export type TaxonomyPatch = z.infer<typeof taxonomyPatchSchema>;
export type TaxonomyDelete = z.infer<typeof taxonomyDeleteSchema>;
export type TaxonomyQuery = z.infer<typeof taxonomyListQuerySchema>;
export type TaxonomyData = z.infer<typeof taxonomyDataSchema>;

export const FEATURE_KINDS = ['feature', 'service'] as const;
export const featureKindSchema = z.enum(FEATURE_KINDS);
export const featureGroupKeySchema = z.string().trim().min(2).max(64).regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
export const featureCreateSchema = z.object({ kind: featureKindSchema, groupKey: featureGroupKeySchema, name: localizedTextSchema, detail: localizedTextSchema.optional(), distanceLabel: localizedTextSchema.optional(), slug: taxonomySlugSchema, order: z.number().int().min(0).max(1_000_000).default(0), active: z.boolean().default(true), reason }).strict();
export const featurePatchSchema = z.object({ version: z.number().int().nonnegative(), groupKey: featureGroupKeySchema.optional(), name: localizedTextSchema.optional(), detail: localizedTextSchema.optional(), distanceLabel: localizedTextSchema.optional(), slug: taxonomySlugSchema.optional(), order: z.number().int().min(0).max(1_000_000).optional(), active: z.boolean().optional(), reason }).strict().refine(v=>Object.keys(v).some(k=>!['version','reason'].includes(k)),{message:'At least one mutable field is required'});
export const featureDeleteSchema = taxonomyDeleteSchema;
export const featureParamsSchema = z.object({ featureId: taxonomyIdSchema }).strict();
export const featureListQuerySchema = z.object({ kind: featureKindSchema.optional(), groupKey: featureGroupKeySchema.optional(), active: z.preprocess(v=>v==='true'?true:v==='false'?false:v,z.boolean().optional()), search:z.string().trim().min(1).max(80).optional(), page:numberQuery(1,100_000),limit:numberQuery(20,100) }).strict();
export const featureDataSchema = z.object({
  id: taxonomyIdSchema,
  kind: featureKindSchema,
  groupKey: featureGroupKeySchema,
  name: localizedTextSchema,
  detail: localizedTextSchema.optional(),
  distanceLabel: localizedTextSchema.optional(),
  slug: taxonomySlugSchema,
  order: z.number().int().nonnegative(),
  active: z.boolean(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  availableActions: z.array(z.enum(['update', 'delete'])).max(2)
}).strict();
export const featureListDataSchema = z.object({ items: z.array(featureDataSchema) }).strict();
export const featureDeleteDataSchema = z.object({ id: taxonomyIdSchema, deleted: z.literal(true) }).strict();
export const featureSuccessEnvelopeSchema = successEnvelopeSchema(featureDataSchema);
export const featureListSuccessEnvelopeSchema = successEnvelopeSchema(featureListDataSchema);
export const featureDeleteSuccessEnvelopeSchema = successEnvelopeSchema(featureDeleteDataSchema);
export type FeatureCreate=z.infer<typeof featureCreateSchema>;export type FeaturePatch=z.infer<typeof featurePatchSchema>;export type FeatureQuery=z.infer<typeof featureListQuerySchema>;export type FeatureData=z.infer<typeof featureDataSchema>;export type FeatureListData=z.infer<typeof featureListDataSchema>;export type FeatureDeleteData=z.infer<typeof featureDeleteDataSchema>;
