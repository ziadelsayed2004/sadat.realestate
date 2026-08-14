import { z } from 'zod';
import { propertyObjectIdSchema } from '../properties/index.js';
import { publicHomepagePropertySchema } from '../public/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const publicPropertyCompareRequestSchema = z.object({
  propertyIds: z.array(propertyObjectIdSchema).min(1).max(2).refine((values) => new Set(values).size === values.length, { message: 'At most two unique property IDs are allowed' })
}).strict();
export const PUBLIC_PROPERTY_COMPARISON_FIELDS = ['name', 'transactionType', 'price', 'area', 'layout'] as const;
export const publicPropertyComparisonFieldSchema = z.enum(PUBLIC_PROPERTY_COMPARISON_FIELDS);
export const publicPropertyComparisonDataSchema = z.object({
  items: z.array(publicHomepagePropertySchema).min(1).max(2),
  fields: z.array(publicPropertyComparisonFieldSchema).length(PUBLIC_PROPERTY_COMPARISON_FIELDS.length)
}).strict();
export const publicPropertyComparisonSuccessEnvelopeSchema = successEnvelopeSchema(publicPropertyComparisonDataSchema);
export type PublicPropertyCompareRequest = z.infer<typeof publicPropertyCompareRequestSchema>;
export type PublicPropertyComparisonData = z.infer<typeof publicPropertyComparisonDataSchema>;
export type PublicPropertyComparisonField = z.infer<typeof publicPropertyComparisonFieldSchema>;
