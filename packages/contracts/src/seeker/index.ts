import { z } from 'zod';
import { authSessionDataSchema, normalizedEmailSchema } from '../auth/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const seekerLocaleSchema = z.enum(['ar', 'en', 'zh-CN']);
export const registrationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const nameSchema = z.string().trim().min(1).max(80).regex(/^[^\u0000-\u001f\u007f]+$/);
const identifierSchema = z.string().trim().min(1).max(80).regex(/^[^\u0000-\u001f\u007f]+$/);

export const seekerPreferencesSchema = z.object({
  propertyTypes: z.array(identifierSchema).max(20).optional(),
  locations: z.array(identifierSchema).max(20).optional(),
  purpose: z.enum(['buy', 'rent']).optional(),
  minPrice: z.number().int().nonnegative().max(1_000_000_000_000).optional(),
  maxPrice: z.number().int().nonnegative().max(1_000_000_000_000).optional(),
  bedroomsMin: z.number().int().nonnegative().max(100).optional(),
  bedroomsMax: z.number().int().nonnegative().max(100).optional()
}).strict().superRefine((value, context) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
    context.addIssue({ code: 'custom', path: ['minPrice'], message: 'minPrice must not exceed maxPrice' });
  }
  if (value.bedroomsMin !== undefined && value.bedroomsMax !== undefined && value.bedroomsMin > value.bedroomsMax) {
    context.addIssue({ code: 'custom', path: ['bedroomsMin'], message: 'bedroomsMin must not exceed bedroomsMax' });
  }
});

export const seekerRegistrationRequestSchema = z.object({
  verificationToken: registrationTokenSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  locale: seekerLocaleSchema.optional()
}).strict();

export const seekerProfilePatchSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  locale: seekerLocaleSchema.optional()
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one profile field is required'
});

export const seekerPreferencesPatchSchema = seekerPreferencesSchema.refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one preference field is required' }
);

export const seekerProfileDataSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  roleType: z.literal('seeker'),
  status: z.enum(['draft', 'unverified', 'pending_review', 'needs_information', 'verified', 'rejected', 'restricted', 'suspended']),
  email: normalizedEmailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  locale: seekerLocaleSchema
}).strict();

export const seekerPreferencesDataSchema = z.object({
  preferences: seekerPreferencesSchema,
  updatedAt: z.string().datetime()
}).strict();

export const seekerRegistrationDataSchema = z.object({
  outcome: z.literal('registered'),
  session: authSessionDataSchema
}).strict();

export const seekerRegistrationSuccessEnvelopeSchema = successEnvelopeSchema(seekerRegistrationDataSchema);
export const seekerProfileSuccessEnvelopeSchema = successEnvelopeSchema(seekerProfileDataSchema);
export const seekerPreferencesSuccessEnvelopeSchema = successEnvelopeSchema(seekerPreferencesDataSchema);
export const seekerOverviewDataSchema = z.object({
  requests: z.number().int().nonnegative(),
  viewings: z.number().int().nonnegative(),
  savedProperties: z.number().int().nonnegative(),
  notifications: z.number().int().nonnegative(),
  unreadNotifications: z.number().int().nonnegative()
}).strict();
export const seekerOverviewSuccessEnvelopeSchema = successEnvelopeSchema(seekerOverviewDataSchema);

export type SeekerLocale = z.infer<typeof seekerLocaleSchema>;
export type SeekerPreferences = z.infer<typeof seekerPreferencesSchema>;
export type SeekerRegistrationRequest = z.infer<typeof seekerRegistrationRequestSchema>;
export type SeekerProfilePatch = z.infer<typeof seekerProfilePatchSchema>;
export type SeekerPreferencesPatch = z.infer<typeof seekerPreferencesPatchSchema>;
export type SeekerProfileData = z.infer<typeof seekerProfileDataSchema>;
export type SeekerPreferencesData = z.infer<typeof seekerPreferencesDataSchema>;
export type SeekerRegistrationData = z.infer<typeof seekerRegistrationDataSchema>;
export type SeekerOverviewData = z.infer<typeof seekerOverviewDataSchema>;
