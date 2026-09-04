import { z } from "zod";
import {
  localizedTextSchema,
  supportedLocaleSchema,
} from "../localization/index.js";
import { successEnvelopeSchema } from "../contracts/envelopes.js";
const objectId = z.string().regex(/^[a-f0-9]{24}$/);
const reason = z.string().trim().min(3).max(500);
const safeKey = z.string().regex(/^[a-z][a-z0-9_]{1,63}$/);
const url = z.url().max(2048);
const publicAssetUrl = z.string().trim().max(2048).refine(value => value.startsWith('/') || z.url().safeParse(value).success);
const teamCategory = z.enum(['management', 'sales', 'support', 'content']);
export const cmsSettingNamespaceSchema = z.enum([
  "platform",
  "contact",
  "social",
]);
export const cmsSettingStatusSchema = z.enum([
  "draft",
  "published",
  "inactive",
]);
const platformValue = z
  .object({
    kind: z.literal("platform"),
    name: localizedTextSchema,
    tagline: localizedTextSchema.optional(),
    logoAssetId: objectId.optional(),
    faviconAssetId: objectId.optional(),
    defaultLocale: supportedLocaleSchema.default("ar"),
  })
  .strict();
const contactValue = z
  .object({
    kind: z.literal("contact"),
    email: z.email().max(254).optional(),
    phone: z.string().trim().min(3).max(40).optional(),
    whatsapp: z.string().trim().min(3).max(40).optional(),
    address: localizedTextSchema.optional(),
    workingHours: localizedTextSchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).some((k) => k !== "kind"), {
    message: "Contact settings require at least one value",
  });
const socialValue = z
  .object({
    kind: z.literal("social"),
    links: z
      .array(
        z
          .object({
            key: safeKey,
            label: localizedTextSchema.optional(),
            url,
            active: z.boolean().default(true),
            order: z.number().int().nonnegative().default(0),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
export const cmsSettingValueSchema = z.discriminatedUnion("kind", [
  platformValue,
  contactValue,
  socialValue,
]);
export const cmsSettingCreateSchema = z
  .object({
    namespace: cmsSettingNamespaceSchema,
    key: safeKey,
    value: cmsSettingValueSchema,
    status: cmsSettingStatusSchema.default("draft"),
    reason,
  })
  .strict();
export const cmsSettingPatchSchema = z
  .object({
    version: z.number().int().nonnegative(),
    value: cmsSettingValueSchema.optional(),
    status: cmsSettingStatusSchema.optional(),
    reason,
  })
  .strict()
  .refine((v) => v.value !== undefined || v.status !== undefined, {
    message: "A setting value or status change is required",
  });
export const cmsSettingRecordSchema = z
  .object({
    id: objectId,
    namespace: cmsSettingNamespaceSchema,
    key: safeKey,
    value: cmsSettingValueSchema,
    status: cmsSettingStatusSchema,
    version: z.number().int().nonnegative(),
    updatedBy: objectId,
    updatedAt: z.string().datetime(),
  })
  .strict();
export const cmsSettingHistorySchema = z
  .object({
    settingId: objectId,
    version: z.number().int().nonnegative(),
    namespace: cmsSettingNamespaceSchema,
    key: safeKey,
    before: cmsSettingValueSchema.nullable(),
    after: cmsSettingValueSchema.nullable(),
    statusBefore: cmsSettingStatusSchema.nullable(),
    statusAfter: cmsSettingStatusSchema.nullable(),
    actorId: objectId,
    reason,
    createdAt: z.string().datetime(),
  })
  .strict();
export type CmsSettingValue = z.infer<typeof cmsSettingValueSchema>;
export type CmsSettingCreate = z.infer<typeof cmsSettingCreateSchema>;
export type CmsSettingPatch = z.infer<typeof cmsSettingPatchSchema>;
export type CmsSettingRecord = z.infer<typeof cmsSettingRecordSchema>;
export type CmsSettingHistory = z.infer<typeof cmsSettingHistorySchema>;
const order = z.number().int().nonnegative().max(100000);
export const aboutBlockCreateSchema = z
  .object({
    key: safeKey,
    title: localizedTextSchema,
    body: localizedTextSchema,
    order,
    active: z.boolean().default(true),
    status: cmsSettingStatusSchema.default("draft"),
    reason,
  })
  .strict();
export const aboutBlockPatchSchema = z
  .object({
    version: z.number().int().nonnegative(),
    title: localizedTextSchema.optional(),
    body: localizedTextSchema.optional(),
    order,
    active: z.boolean().optional(),
    status: cmsSettingStatusSchema.optional(),
    reason,
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => !["version", "reason"].includes(k)),
    { message: "An About block change is required" },
  );
export const teamMemberCreateSchema = z
  .object({
    key: safeKey,
    name: localizedTextSchema,
    title: localizedTextSchema,
    bio: localizedTextSchema.optional(),
    photoAssetId: objectId.optional(),
    imageUrl: publicAssetUrl.optional(),
    category: teamCategory.optional(),
    order,
    active: z.boolean().default(true),
    status: cmsSettingStatusSchema.default("draft"),
    reason,
  })
  .strict();
export const teamMemberPatchSchema = z
  .object({
    version: z.number().int().nonnegative(),
    name: localizedTextSchema.optional(),
    title: localizedTextSchema.optional(),
    bio: localizedTextSchema.optional(),
    photoAssetId: objectId.nullish(),
    imageUrl: publicAssetUrl.nullish(),
    category: teamCategory.optional(),
    order,
    active: z.boolean().optional(),
    status: cmsSettingStatusSchema.optional(),
    reason,
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => !["version", "reason"].includes(k)),
    { message: "A team member change is required" },
  );
export const cmsPublicContentSchema = z
  .object({
    key: safeKey,
    title: localizedTextSchema,
    body: localizedTextSchema.optional(),
    name: localizedTextSchema.optional(),
    role: localizedTextSchema.optional(),
    bio: localizedTextSchema.optional(),
    photoAssetId: objectId.optional(),
    imageUrl: publicAssetUrl.optional(),
    category: teamCategory.optional(),
    order,
  })
  .strict();
export const cmsPublicContentListDataSchema = z
  .object({ items: z.array(cmsPublicContentSchema).max(100) })
  .strict();
export const cmsPublicContentListSuccessEnvelopeSchema = successEnvelopeSchema(
  cmsPublicContentListDataSchema,
);
export type CmsPublicContent = z.infer<typeof cmsPublicContentSchema>;
export type CmsPublicContentListData = z.infer<
  typeof cmsPublicContentListDataSchema
>;
export type AboutBlockCreate = z.infer<typeof aboutBlockCreateSchema>;
export type AboutBlockPatch = z.infer<typeof aboutBlockPatchSchema>;
export type TeamMemberCreate = z.infer<typeof teamMemberCreateSchema>;
export type TeamMemberPatch = z.infer<typeof teamMemberPatchSchema>;
export const populationValueSchema = z
  .object({
    status: z.enum(["available", "unavailable", "draft"]),
    value: z.number().int().nonnegative().max(100000000).optional(),
    sourceLabel: localizedTextSchema.optional(),
    sourceUrl: z.url().max(2048).optional(),
    asOf: z.string().datetime({ offset: true }).optional(),
    reason,
  })
  .strict()
  .superRefine((v, c) => {
    if (v.status === "available") {
      if (v.value === undefined)
        c.addIssue({
          code: "custom",
          path: ["value"],
          message: "Available population needs a sourced value",
        });
      if (v.sourceLabel === undefined)
        c.addIssue({
          code: "custom",
          path: ["sourceLabel"],
          message: "Available population needs a source label",
        });
      if (v.sourceUrl === undefined)
        c.addIssue({
          code: "custom",
          path: ["sourceUrl"],
          message: "Available population needs a source URL",
        });
      if (v.asOf === undefined)
        c.addIssue({
          code: "custom",
          path: ["asOf"],
          message: "Available population needs an as-of timestamp",
        });
    }
    if (v.status !== "available" && v.value !== undefined)
      c.addIssue({
        code: "custom",
        path: ["value"],
        message: "Unavailable or draft population cannot expose a value",
      });
  });
export const tipCreateSchema = z
  .object({
    key: safeKey,
    title: localizedTextSchema,
    body: localizedTextSchema,
    order,
    active: z.boolean().default(true),
    status: cmsSettingStatusSchema.default("draft"),
    reason,
  })
  .strict();
export const tipPatchSchema = z
  .object({
    version: z.number().int().nonnegative(),
    title: localizedTextSchema.optional(),
    body: localizedTextSchema.optional(),
    order: order.optional(),
    active: z.boolean().optional(),
    status: cmsSettingStatusSchema.optional(),
    reason,
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => !["version", "reason"].includes(k)),
    { message: "A tip change is required" },
  );
export type PopulationValue = z.infer<typeof populationValueSchema>;
export type TipCreate = z.infer<typeof tipCreateSchema>;
export type TipPatch = z.infer<typeof tipPatchSchema>;
const displayKey = safeKey;
const displayOrder = z.number().int().nonnegative().max(100000);
export const homepageSectionStatusSchema = cmsSettingStatusSchema;
export const homepageSectionCreateSchema = z
  .object({
    key: safeKey,
    title: localizedTextSchema,
    body: localizedTextSchema.optional(),
    order: displayOrder,
    visible: z.boolean().default(true),
    status: homepageSectionStatusSchema.default("draft"),
    reason,
  })
  .strict();
export const homepageSectionPatchSchema = z
  .object({
    version: z.number().int().nonnegative(),
    title: localizedTextSchema.optional(),
    body: localizedTextSchema.optional(),
    order: displayOrder.optional(),
    visible: z.boolean().optional(),
    status: homepageSectionStatusSchema.optional(),
    reason,
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => !["version", "reason"].includes(k)),
    { message: "A homepage section change is required" },
  );
export const displaySettingValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("boolean"), value: z.boolean() }).strict(),
  z
    .object({
      kind: z.literal("number"),
      value: z.number().finite().min(0).max(100000000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("text"),
      value: z.string().trim().min(1).max(500),
    })
    .strict(),
]);
export const displaySettingCreateSchema = z
  .object({
    key: displayKey,
    value: displaySettingValueSchema,
    status: cmsSettingStatusSchema.default("draft"),
    reason,
  })
  .strict();
export const displaySettingPatchSchema = z
  .object({
    version: z.number().int().nonnegative(),
    value: displaySettingValueSchema.optional(),
    status: cmsSettingStatusSchema.optional(),
    reason,
  })
  .strict()
  .refine((v) => v.value !== undefined || v.status !== undefined, {
    message: "A display setting value or status change is required",
  });
export const homepageSectionPublicSchema = z
  .object({
    key: safeKey,
    title: localizedTextSchema,
    body: localizedTextSchema.optional(),
    order: displayOrder,
  })
  .strict();
export const displaySettingPublicSchema = z
  .object({ key: displayKey, value: displaySettingValueSchema })
  .strict();
export type HomepageSectionCreate = z.infer<typeof homepageSectionCreateSchema>;
export type HomepageSectionPatch = z.infer<typeof homepageSectionPatchSchema>;
export type DisplaySettingValue = z.infer<typeof displaySettingValueSchema>;
export type DisplaySettingCreate = z.infer<typeof displaySettingCreateSchema>;
export type DisplaySettingPatch = z.infer<typeof displaySettingPatchSchema>;

export const cmsAdminContentNamespaceSchema = z.enum([
  "about",
  "team",
  "population",
  "tips",
  "homepage",
  "display",
]);
export const cmsAdminContentActionSchema = z.enum([
  "update",
  "publish",
  "deactivate",
]);
const cmsAdminRecordFields = {
  id: objectId,
  version: z.number().int().nonnegative(),
  updatedBy: objectId,
  updatedAt: z.string().datetime(),
  availableActions: z.array(cmsAdminContentActionSchema),
};
export const cmsAdminAboutBlockSchema = z
  .object({
    ...cmsAdminRecordFields,
    key: safeKey,
    title: localizedTextSchema,
    body: localizedTextSchema,
    order,
    active: z.boolean(),
    status: cmsSettingStatusSchema,
  })
  .strict();
export const cmsAdminTeamMemberSchema = z
  .object({
    ...cmsAdminRecordFields,
    key: safeKey,
    name: localizedTextSchema,
    title: localizedTextSchema,
    bio: localizedTextSchema.optional(),
    photoAssetId: objectId.optional(),
    order,
    active: z.boolean(),
    status: cmsSettingStatusSchema,
  })
  .strict();
export const cmsAdminPopulationValueSchema = z
  .object({
    ...cmsAdminRecordFields,
    status: populationValueSchema.shape.status,
    value: populationValueSchema.shape.value,
    sourceLabel: populationValueSchema.shape.sourceLabel,
    sourceUrl: populationValueSchema.shape.sourceUrl,
    asOf: populationValueSchema.shape.asOf,
    reason,
  })
  .strict();
export const cmsAdminTipSchema = z
  .object({
    ...cmsAdminRecordFields,
    key: safeKey,
    title: localizedTextSchema,
    body: localizedTextSchema,
    order,
    active: z.boolean(),
    status: cmsSettingStatusSchema,
  })
  .strict();
export const cmsAdminHomepageSectionSchema = z
  .object({
    ...cmsAdminRecordFields,
    key: safeKey,
    title: localizedTextSchema,
    body: localizedTextSchema.optional(),
    order: displayOrder,
    visible: z.boolean(),
    status: homepageSectionStatusSchema,
  })
  .strict();
export const cmsAdminDisplaySettingSchema = z
  .object({
    ...cmsAdminRecordFields,
    key: displayKey,
    value: displaySettingValueSchema,
    status: cmsSettingStatusSchema,
  })
  .strict();
export const cmsAdminContentDataSchema = z.discriminatedUnion("namespace", [
  z
    .object({
      namespace: z.literal("about"),
      items: z.array(cmsAdminAboutBlockSchema).max(100),
    })
    .strict(),
  z
    .object({
      namespace: z.literal("team"),
      items: z.array(cmsAdminTeamMemberSchema).max(100),
    })
    .strict(),
  z
    .object({
      namespace: z.literal("population"),
      items: z.array(cmsAdminPopulationValueSchema).max(1),
    })
    .strict(),
  z
    .object({
      namespace: z.literal("tips"),
      items: z.array(cmsAdminTipSchema).max(100),
    })
    .strict(),
  z
    .object({
      namespace: z.literal("homepage"),
      items: z.array(cmsAdminHomepageSectionSchema).max(100),
    })
    .strict(),
  z
    .object({
      namespace: z.literal("display"),
      items: z.array(cmsAdminDisplaySettingSchema).max(100),
    })
    .strict(),
]);
export const cmsAdminContentSuccessEnvelopeSchema = successEnvelopeSchema(
  cmsAdminContentDataSchema,
);
export const cmsAdminAboutBlockPutSchema = z.union([
  aboutBlockCreateSchema,
  aboutBlockPatchSchema.extend({ id: objectId }),
]);
export const cmsAdminTeamMemberPutSchema = z.union([
  teamMemberCreateSchema,
  teamMemberPatchSchema.extend({ id: objectId }),
]);
export const cmsAdminPopulationValuePutSchema = z.intersection(
  populationValueSchema,
  z.object({ version: z.number().int().nonnegative().optional() }),
);
export const cmsAdminTipPutSchema = z.union([
  tipCreateSchema,
  tipPatchSchema.extend({ id: objectId }),
]);
export const cmsAdminHomepageSectionPutSchema = z.union([
  homepageSectionCreateSchema,
  homepageSectionPatchSchema.extend({ id: objectId }),
]);
export const cmsAdminDisplaySettingPutSchema = z.union([
  displaySettingCreateSchema,
  displaySettingPatchSchema.extend({ id: objectId }),
]);
export type CmsAdminContentNamespace = z.infer<
  typeof cmsAdminContentNamespaceSchema
>;
export type CmsAdminAboutBlock = z.infer<typeof cmsAdminAboutBlockSchema>;
export type CmsAdminTeamMember = z.infer<typeof cmsAdminTeamMemberSchema>;
export type CmsAdminPopulationValue = z.infer<
  typeof cmsAdminPopulationValueSchema
>;
export type CmsAdminTip = z.infer<typeof cmsAdminTipSchema>;
export type CmsAdminHomepageSection = z.infer<
  typeof cmsAdminHomepageSectionSchema
>;
export type CmsAdminDisplaySetting = z.infer<
  typeof cmsAdminDisplaySettingSchema
>;
export type CmsAdminContentData = z.infer<typeof cmsAdminContentDataSchema>;
export type CmsAdminAboutBlockPut = z.infer<typeof cmsAdminAboutBlockPutSchema>;
export type CmsAdminTeamMemberPut = z.infer<typeof cmsAdminTeamMemberPutSchema>;
export type CmsAdminPopulationValuePut = z.infer<
  typeof cmsAdminPopulationValuePutSchema
>;
export type CmsAdminTipPut = z.infer<typeof cmsAdminTipPutSchema>;
export type CmsAdminHomepageSectionPut = z.infer<
  typeof cmsAdminHomepageSectionPutSchema
>;
export type CmsAdminDisplaySettingPut = z.infer<
  typeof cmsAdminDisplaySettingPutSchema
>;
