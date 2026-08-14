import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';
import { localizedTextSchema } from '../localization/index.js';

export const LOCATION_KINDS = ['location', 'neighborhood'] as const;
export const locationKindSchema = z.enum(LOCATION_KINDS);
export const locationObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const locationSlugSchema = z.string().trim().min(2).max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const locationOrderSchema = z.number().int().nonnegative().max(1_000_000);
export const locationReasonSchema = z.string().trim().min(5).max(500)
  .regex(/^[^\u0000-\u001f\u007f]+$/);
export const locationCoordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180)
}).strict();

const hierarchyShape = {
  kind: locationKindSchema,
  parentLocationId: locationObjectIdSchema.optional()
};

function validateHierarchy(
  value: { kind: z.infer<typeof locationKindSchema>; parentLocationId?: string | undefined },
  context: z.RefinementCtx
): void {
  if (value.kind === 'neighborhood' && !value.parentLocationId) {
    context.addIssue({ code: 'custom', path: ['parentLocationId'], message: 'Neighborhood parent is required' });
  }
  if (value.kind === 'location' && value.parentLocationId) {
    context.addIssue({ code: 'custom', path: ['parentLocationId'], message: 'Top-level location cannot have a parent' });
  }
}

export const locationCreateRequestSchema = z.object({
  ...hierarchyShape,
  name: localizedTextSchema,
  slug: locationSlugSchema,
  coordinates: locationCoordinatesSchema.optional(),
  order: locationOrderSchema.default(0),
  active: z.boolean().default(true),
  reason: locationReasonSchema
}).strict().superRefine(validateHierarchy);

export const locationPatchRequestSchema = z.object({
  version: z.number().int().nonnegative(),
  name: localizedTextSchema.optional(),
  slug: locationSlugSchema.optional(),
  parentLocationId: locationObjectIdSchema.optional(),
  coordinates: locationCoordinatesSchema.nullable().optional(),
  order: locationOrderSchema.optional(),
  active: z.boolean().optional(),
  reason: locationReasonSchema
}).strict().refine((value) => Object.keys(value).some((key) => !['version', 'reason'].includes(key)), {
  message: 'At least one mutable location field is required'
});

export const locationDeleteRequestSchema = z.object({
  version: z.number().int().nonnegative(),
  reason: locationReasonSchema
}).strict();

export const locationIdParamsSchema = z.object({ locationId: locationObjectIdSchema }).strict();

const optionalBooleanQuery = z.preprocess(
  (value) => value === 'true' ? true : value === 'false' ? false : value,
  z.boolean().optional()
);
const positiveIntQuery = (fallback: number, maximum: number) => z.preprocess(
  (value) => value === undefined ? fallback : Number(value),
  z.number().int().positive().max(maximum)
);

export const locationListQuerySchema = z.object({
  kind: locationKindSchema.optional(),
  parentLocationId: locationObjectIdSchema.optional(),
  active: optionalBooleanQuery,
  search: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(['order', 'slug', 'createdAt']).default('order'),
  direction: z.enum(['asc', 'desc']).default('asc'),
  page: positiveIntQuery(1, 100_000),
  limit: positiveIntQuery(20, 100)
}).strict();

export const locationDataSchema = z.object({
  id: locationObjectIdSchema,
  kind: locationKindSchema,
  name: localizedTextSchema,
  slug: locationSlugSchema,
  parentLocationId: locationObjectIdSchema.optional(),
  coordinates: locationCoordinatesSchema.optional(),
  order: locationOrderSchema,
  active: z.boolean(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  availableActions: z.array(z.enum(['update', 'delete'])).max(2)
}).strict();

export const locationListDataSchema = z.object({ items: z.array(locationDataSchema) }).strict();
export const locationDeleteDataSchema = z.object({ id: locationObjectIdSchema, deleted: z.literal(true) }).strict();
export const locationSuccessEnvelopeSchema = successEnvelopeSchema(locationDataSchema);
export const locationListSuccessEnvelopeSchema = successEnvelopeSchema(locationListDataSchema);
export const locationDeleteSuccessEnvelopeSchema = successEnvelopeSchema(locationDeleteDataSchema);

export type LocationKind = z.infer<typeof locationKindSchema>;
export type LocationCoordinates = z.infer<typeof locationCoordinatesSchema>;
export type LocationCreateRequest = z.infer<typeof locationCreateRequestSchema>;
export type LocationPatchRequest = z.infer<typeof locationPatchRequestSchema>;
export type LocationDeleteRequest = z.infer<typeof locationDeleteRequestSchema>;
export type LocationListQuery = z.infer<typeof locationListQuerySchema>;
export type LocationData = z.infer<typeof locationDataSchema>;
export type LocationListData = z.infer<typeof locationListDataSchema>;
export type LocationDeleteData = z.infer<typeof locationDeleteDataSchema>;
