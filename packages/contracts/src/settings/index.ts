import{z}from'zod';import{localizedTextSchema}from'../localization/index.js';import{successEnvelopeSchema}from'../contracts/envelopes.js';
const safeKey=z.string().regex(/^[a-z][a-z0-9_]{1,63}$/);const reason=z.string().trim().min(3).max(500);const url=z.url().max(2048);const status=z.enum(['draft','published','inactive']);
export const seoSettingsSchema=z.object({title:localizedTextSchema,description:localizedTextSchema,canonicalUrl:url,robots:z.enum(['index,follow','noindex,nofollow','noindex,follow','index,nofollow']),status:status.default('draft'),reason}).strict();
export const seoSettingsPatchSchema=z.object({version:z.number().int().nonnegative(),title:localizedTextSchema.optional(),description:localizedTextSchema.optional(),canonicalUrl:url.optional(),robots:seoSettingsSchema.shape.robots.optional(),status:status.optional(),reason}).strict().refine(v=>Object.keys(v).some(k=>!['version','reason'].includes(k)),{message:'An SEO setting change is required'});
export const privacyPolicySchema=z.object({key:safeKey,title:localizedTextSchema,body:localizedTextSchema,status:status.default('draft'),effectiveAt:z.string().datetime({offset:true}).nullable().default(null),reason}).strict();
export const privacyPolicyPatchSchema=z.object({version:z.number().int().nonnegative(),title:localizedTextSchema.optional(),body:localizedTextSchema.optional(),status:status.optional(),effectiveAt:z.string().datetime({offset:true}).nullable().optional(),reason}).strict().refine(v=>Object.keys(v).some(k=>!['version','reason'].includes(k)),{message:'A privacy policy change is required'});
export const publicSeoSettingsSchema=z.object({title:localizedTextSchema,description:localizedTextSchema,canonicalUrl:url,robots:seoSettingsSchema.shape.robots}).strict();export const publicPrivacyPolicySchema=z.object({key:safeKey,title:localizedTextSchema,body:localizedTextSchema,effectiveAt:z.string().datetime({offset:true}).nullable()}).strict();
export type SeoSettings=z.infer<typeof seoSettingsSchema>;export type SeoSettingsPatch=z.infer<typeof seoSettingsPatchSchema>;export type PrivacyPolicy=z.infer<typeof privacyPolicySchema>;export type PrivacyPolicyPatch=z.infer<typeof privacyPolicyPatchSchema>;

export const ADMIN_SETTINGS_NAMESPACES = [
  'platform', 'contact', 'social', 'properties', 'requests', 'advertising', 'seo', 'privacy-security', 'display'
] as const;
export const adminSettingsNamespaceSchema = z.enum(ADMIN_SETTINGS_NAMESPACES);
const adminSettingsObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const adminSettingsKeySchema = z.string().trim().min(1).max(64).regex(/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/);
const adminSettingsTextSchema = z.string().trim().max(5_000).refine(
  value => !/[\u0000-\u001f\u007f]/.test(value),
  { message: 'Settings text must not contain control characters' }
);
const adminSettingsAtomSchema = z.union([
  adminSettingsTextSchema,
  z.number().finite().min(-100_000_000).max(100_000_000),
  z.boolean(),
  localizedTextSchema,
  z.array(adminSettingsTextSchema).max(100)
]);
export const adminSettingsValuesSchema = z.record(adminSettingsKeySchema, adminSettingsAtomSchema)
  .refine(value => Object.keys(value).length <= 100, { message: 'A settings namespace may contain at most 100 values' });
const settingsSecretPattern = /(?:password|secret|token|credential|private[_-]?key|api[_-]?key)/i;
function rejectSettingsSecrets(value: { values?: unknown }, context: z.RefinementCtx): void {
  if (settingsSecretPattern.test(JSON.stringify(value.values ?? ''))) {
    context.addIssue({ code: 'custom', path: ['values'], message: 'Settings cannot contain credentials or secrets' });
  }
}
export const adminSettingsUpdateSchema = z.object({
  schemaVersion: z.number().int().positive().max(100),
  values: adminSettingsValuesSchema,
  expectedVersion: z.number().int().nonnegative(),
  reason
}).strict().superRefine(rejectSettingsSecrets);
export const adminSettingsDataSchema = z.object({
  namespace: adminSettingsNamespaceSchema,
  schemaVersion: z.number().int().positive().max(100),
  values: adminSettingsValuesSchema,
  version: z.number().int().nonnegative(),
  updatedBy: adminSettingsObjectIdSchema,
  updatedAt: z.string().datetime({ offset: true })
}).strict();
export const adminSettingsNamespaceParamsSchema = z.object({ namespace: adminSettingsNamespaceSchema }).strict();
export const adminSettingsSuccessEnvelopeSchema = successEnvelopeSchema(adminSettingsDataSchema);
export type AdminSettingsNamespace = z.infer<typeof adminSettingsNamespaceSchema>;
export type AdminSettingsValues = z.infer<typeof adminSettingsValuesSchema>;
export type AdminSettingsUpdate = z.infer<typeof adminSettingsUpdateSchema>;
export type AdminSettingsData = z.infer<typeof adminSettingsDataSchema>;
