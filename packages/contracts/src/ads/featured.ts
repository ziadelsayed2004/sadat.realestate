import { z } from 'zod';
import { localizedTextSchema } from '../localization/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';
const id = z.string().regex(/^[a-f0-9]{24}$/);
export const featuredDestinationSchema = z.object({ kind: z.enum(['property', 'project', 'organization']), id }).strict();
export const featuredCreativeSchema = z.object({
  advertiserProviderId: id.optional(), destination: featuredDestinationSchema.optional(),
  highlight: localizedTextSchema.optional(), installment: localizedTextSchema.optional(),
  eyebrow: localizedTextSchema.optional(), ctaLabel: localizedTextSchema.optional()
}).strict();
export const featuredOptionsSchema = z.object({
  canManage: z.boolean().default(false),
  advertisers: z.array(z.object({ id, name: localizedTextSchema, imageUrl: z.string().max(2048).optional(), verified: z.boolean() }).strict()).max(100),
  destinations: z.array(featuredDestinationSchema.extend({ name: localizedTextSchema, href: z.string().regex(/^\/(?!\/)/).max(2048) }).strict()).max(300)
}).strict();
export const featuredOptionsSuccessEnvelopeSchema = successEnvelopeSchema(featuredOptionsSchema);
export type FeaturedCreative = z.infer<typeof featuredCreativeSchema>;
export type FeaturedOptions = z.infer<typeof featuredOptionsSchema>;
