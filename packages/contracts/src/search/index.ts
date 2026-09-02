import { z } from 'zod';
import { propertyDeliveryStatusSchema, propertyKindSchema, propertyObjectIdSchema, propertyTransactionTypeSchema } from '../properties/index.js';
import { publicHomepagePropertySchema } from '../public/index.js';
import { publicHomepageCategorySchema } from '../public/index.js';
import { localizedTextSchema } from '../localization/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const positiveQuery = (fallback: number, maximum: number) => z.preprocess((value) => value === undefined ? fallback : Number(value), z.number().int().positive().max(maximum));
const nonNegativeQuery = (maximum: number) => z.preprocess((value) => value === undefined ? undefined : Number(value), z.number().finite().nonnegative().max(maximum)).optional();
export const publicPropertySearchQuerySchema = z.object({
  kind: propertyKindSchema.optional(),
  transactionType: propertyTransactionTypeSchema.optional(),
  projectId: propertyObjectIdSchema.optional(),
  propertyCategoryId: propertyObjectIdSchema.optional(),
  propertyTypeId: propertyObjectIdSchema.optional(),
  deliveryStatus: propertyDeliveryStatusSchema.optional(),
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

export const publicPropertyListItemSchema = publicHomepagePropertySchema.extend({
  locationName: localizedTextSchema.optional(),
  sourceName: localizedTextSchema.optional(),
  sourceImageUrl: z.union([z.url().max(2_048), z.string().trim().min(2).max(2_048).regex(/^\/(?!\/)[^\s]*$/u)]).optional(),
  sourceType: z.enum(['brokerage_office', 'developer_company']).optional(),
  publicCode: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_-]+$/).optional(),
  viewCount: z.number().int().nonnegative().optional(),
  installmentAvailable: z.boolean().optional(),
  featured: z.boolean().optional(),
  deliveryStatus: propertyDeliveryStatusSchema.optional()
}).strict();

export const publicPropertyListDataSchema = z.object({
  items: z.array(publicPropertyListItemSchema).max(100),
  categories: z.array(publicHomepageCategorySchema).max(100),
  propertyTypes: z.array(publicHomepageCategorySchema).max(100),
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  total: z.number().int().nonnegative()
}).strict();
export const publicPropertyListSuccessEnvelopeSchema = successEnvelopeSchema(publicPropertyListDataSchema);

export type PublicPropertySearchQuery = z.infer<typeof publicPropertySearchQuerySchema>;
export type PublicPropertyListData = z.infer<typeof publicPropertyListDataSchema>;
export type PublicPropertyListItem = z.infer<typeof publicPropertyListItemSchema>;
