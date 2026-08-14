import { z } from 'zod';

export const PROPERTY_QUERY_PATTERNS = [
  'provider_list',
  'admin_list',
  'public_project',
  'public_location',
  'nearby',
  'localized_search'
] as const;
export const propertyQueryPatternSchema = z.enum(PROPERTY_QUERY_PATTERNS);
export const propertyQueryPlanSchema = z.object({
  pattern: propertyQueryPatternSchema,
  page: z.number().int().positive().max(100_000),
  limit: z.number().int().positive().max(100),
  skip: z.number().int().nonnegative(),
  hint: z.string().min(1).max(100),
  sort: z.record(z.string(), z.number().int().refine(value => value === 1 || value === -1)).optional()
}).strict();
export const propertyExplainSummarySchema = z.object({
  winningIndex: z.string().min(1).optional(),
  totalKeysExamined: z.number().int().nonnegative(),
  totalDocsExamined: z.number().int().nonnegative(),
  nReturned: z.number().int().nonnegative()
}).strict();
export type PropertyQueryPattern = z.infer<typeof propertyQueryPatternSchema>;
export type PropertyQueryPlan = z.infer<typeof propertyQueryPlanSchema>;
export type PropertyExplainSummary = z.infer<typeof propertyExplainSummarySchema>;
