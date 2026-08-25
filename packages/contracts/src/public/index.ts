import { z } from 'zod';
import { localizedTextSchema } from '../localization/index.js';
import { propertyAreaSchema, propertyKindSchema, propertyLayoutSchema, propertyMoneySchema, propertyObjectIdSchema, propertySlugSchema, propertyTransactionTypeSchema } from '../properties/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const publicOrderSchema = z.number().int().nonnegative().max(100_000);
const publicUrlSchema = z.url().max(2_048);

export const publicHomepageSectionSchema = z.object({
  key: z.string().trim().min(2).max(64).regex(/^[a-z][a-z0-9_]*$/),
  title: localizedTextSchema,
  body: localizedTextSchema.optional(),
  order: publicOrderSchema
}).strict();

export const publicHomepagePropertySchema = z.object({
  id: propertyObjectIdSchema,
  slug: propertySlugSchema,
  kind: propertyKindSchema,
  name: localizedTextSchema,
  transactionType: propertyTransactionTypeSchema,
  imageUrl: publicUrlSchema.optional(),
  projectId: propertyObjectIdSchema.optional(),
  description: localizedTextSchema.optional(),
  area: propertyAreaSchema.optional(),
  layout: propertyLayoutSchema.optional(),
  price: propertyMoneySchema.optional()
}).strict();

export const publicHomepageDeveloperSchema = z.object({
  id: propertyObjectIdSchema,
  slug: propertySlugSchema,
  name: localizedTextSchema,
  imageUrl: publicUrlSchema.optional(),
  description: localizedTextSchema.optional()
}).strict();

export const publicHomepageContentSchema = z.object({
  key: z.string().trim().min(2).max(64).regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum(['article', 'community', 'about', 'tip']),
  title: localizedTextSchema,
  imageUrl: publicUrlSchema.optional(),
  body: localizedTextSchema.optional(),
  order: publicOrderSchema
}).strict();

export const publicHomepageBannerSchema = z.object({
  key: z.string().trim().min(2).max(64).regex(/^[a-z][a-z0-9_]*$/),
  title: localizedTextSchema.optional(),
  imageUrl: publicUrlSchema.optional(),
  targetUrl: publicUrlSchema.optional(),
  order: publicOrderSchema
}).strict();

export const publicHomepageDataSchema = z.object({
  sections: z.array(publicHomepageSectionSchema).max(100),
  properties: z.array(publicHomepagePropertySchema).max(100),
  developers: z.array(publicHomepageDeveloperSchema).max(100),
  content: z.array(publicHomepageContentSchema).max(100),
  banners: z.array(publicHomepageBannerSchema).max(100)
}).strict();

export const publicHomepageSuccessEnvelopeSchema = successEnvelopeSchema(publicHomepageDataSchema);

export const publicPropertySourceSchema = z.object({
  sourceType: z.enum(['individual_broker', 'brokerage_office', 'developer_company']),
  organizationId: propertyObjectIdSchema.optional()
}).strict();
export const publicPropertySeoSchema = z.object({
  title: localizedTextSchema,
  description: localizedTextSchema.optional(),
  slug: propertySlugSchema
}).strict();
export const publicPropertyProjectSchema = z.object({
  id: propertyObjectIdSchema,
  slug: propertySlugSchema,
  name: localizedTextSchema,
  description: localizedTextSchema.optional()
}).strict();
export const publicPropertyMediaSchema = z.object({
  id: propertyObjectIdSchema,
  propertyId: propertyObjectIdSchema,
  kind: z.enum(['image', 'floor_plan']),
  imageUrl: publicUrlSchema.optional(),
  originalFilename: z.string().trim().min(1).max(120),
  detectedMime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024),
  sortOrder: z.number().int().nonnegative().max(1_000),
  isCover: z.boolean()
}).strict();
export const publicPropertyDetailsSchema = publicHomepagePropertySchema.extend({
  source: publicPropertySourceSchema,
  seo: publicPropertySeoSchema,
  project: publicPropertyProjectSchema.nullable(),
  media: z.array(publicPropertyMediaSchema).max(50),
  relatedProperties: z.array(publicHomepagePropertySchema).max(20)
}).strict();
export const publicPropertyDetailsSuccessEnvelopeSchema = successEnvelopeSchema(publicPropertyDetailsSchema);

export type PublicHomepageSection = z.infer<typeof publicHomepageSectionSchema>;
export type PublicPropertyDetails = z.infer<typeof publicPropertyDetailsSchema>;
export type PublicPropertyMedia = z.infer<typeof publicPropertyMediaSchema>;
export type PublicPropertyProject = z.infer<typeof publicPropertyProjectSchema>;
export type PublicPropertySeo = z.infer<typeof publicPropertySeoSchema>;
export type PublicPropertySource = z.infer<typeof publicPropertySourceSchema>;
export type PublicHomepageProperty = z.infer<typeof publicHomepagePropertySchema>;
export type PublicHomepageDeveloper = z.infer<typeof publicHomepageDeveloperSchema>;
export type PublicHomepageContent = z.infer<typeof publicHomepageContentSchema>;
export type PublicHomepageBanner = z.infer<typeof publicHomepageBannerSchema>;
export type PublicHomepageData = z.infer<typeof publicHomepageDataSchema>;
