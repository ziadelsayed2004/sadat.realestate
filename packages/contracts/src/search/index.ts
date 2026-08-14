import { z } from 'zod';
import { propertyKindSchema, propertyObjectIdSchema, propertyTransactionTypeSchema } from '../properties/index.js';
import { publicHomepagePropertySchema } from '../public/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const positiveQuery = (fallback: number, maximum: number) => z.preprocess((value) => value === undefined ? fallback : Number(value), z.number().int().positive().max(maximum));
const nonNegativeQuery = (maximum: number) => z.preprocess((value) => value === undefined ? undefined : Number(value), z.number().finite().nonnegative().max(maximum)).optional();
export const publicPropertySearchQuerySchema = z.object({
  kind: propertyKindSchema.optional(),
  transactionType: propertyTransactionTypeSchema.optional(),
  projectId: propertyObjectIdSchema.optional(),
  locationId: propertyObjectIdSchema.optional(),
  search: z.string().trim().min(1).max(80).regex(/^[^\u0000-\u001f\u007f]+$/u).optional(),
  minPrice: nonNegativeQuery(1_000_000_000_000_000),
  maxPrice: nonNegativeQuery(1_000_000_000_000_000),
  bedrooms: z.preprocess((value) => value === undefined ? undefined : Number(value), z.number().int().nonnegative().max(100)).optional(),
  sort: z.enum(['publishedAt', 'price', 'name', 'slug']).default('publishedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  page: positiveQuery(1, 100_000),
  limit: positiveQuery(20, 100)
}).strict().superRefine((value, context) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) context.addIssue({ code: 'custom', path: ['maxPrice'], message: 'Maximum price must be greater than or equal to minimum price' });
});

export const publicPropertyListDataSchema = z.object({
  items: z.array(publicHomepagePropertySchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  total: z.number().int().nonnegative()
}).strict();
export const publicPropertyListSuccessEnvelopeSchema = successEnvelopeSchema(publicPropertyListDataSchema);
export const publicPropertyListItemSchema = publicHomepagePropertySchema;

export type PublicPropertySearchQuery = z.infer<typeof publicPropertySearchQuerySchema>;
export type PublicPropertyListData = z.infer<typeof publicPropertyListDataSchema>;
export type PublicPropertyListItem = z.infer<typeof publicPropertyListItemSchema>;
