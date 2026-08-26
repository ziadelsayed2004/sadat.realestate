import { z } from 'zod';
import { localizedTextSchema } from '../localization/index.js';
import { propertyObjectIdSchema } from '../properties/index.js';
import { publicPropertyRelatedPropertySchema } from '../public/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const publicPropertyCompareRequestSchema = z.object({
  propertyIds: z.array(propertyObjectIdSchema).min(1).max(2).refine((values) => new Set(values).size === values.length, { message: 'At most two unique property IDs are allowed' })
}).strict();
export const PUBLIC_PROPERTY_COMPARISON_FIELDS = [
  'kind',
  'transactionType',
  'sourceName',
  'sourceType',
  'project',
  'developer',
  'publicCode',
  'price',
  'installment',
  'area',
  'bedrooms',
  'bathrooms',
  'floor',
  'deliveryStatus',
  'locationName'
] as const;
export const publicPropertyComparisonFieldSchema = z.enum(PUBLIC_PROPERTY_COMPARISON_FIELDS);
export const publicPropertyComparisonItemSchema = publicPropertyRelatedPropertySchema.extend({
  propertyTypeName: localizedTextSchema.optional()
}).strict();
export const publicPropertyComparisonDataSchema = z.object({
  items: z.array(publicPropertyComparisonItemSchema).min(1).max(2),
  fields: z.array(publicPropertyComparisonFieldSchema).length(PUBLIC_PROPERTY_COMPARISON_FIELDS.length)
}).strict();
export const publicPropertyComparisonSuccessEnvelopeSchema = successEnvelopeSchema(publicPropertyComparisonDataSchema);
export type PublicPropertyCompareRequest = z.infer<typeof publicPropertyCompareRequestSchema>;
export type PublicPropertyComparisonData = z.infer<typeof publicPropertyComparisonDataSchema>;
export type PublicPropertyComparisonField = z.infer<typeof publicPropertyComparisonFieldSchema>;
