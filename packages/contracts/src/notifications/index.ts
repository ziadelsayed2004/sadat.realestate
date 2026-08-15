import { z } from 'zod';
import { localizedTextSchema } from '../localization/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const positiveQuery = (fallback: number, max: number) => z.preprocess(
  value => value === undefined ? fallback : Number(value),
  z.number().int().positive().max(max)
);

export const notificationIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const notificationTypeSchema = z.string().trim().min(2).max(64).regex(/^[a-z][a-z0-9_.-]*$/);
export const NOTIFICATION_AUDIENCES = ['seeker', 'provider', 'admin'] as const;
export const notificationAudienceSchema = z.enum(NOTIFICATION_AUDIENCES);
/**
 * A source may require a separate RBAC permission in addition to the
 * authenticated admin role.  The permission is metadata only and is never
 * returned in a public notification projection.
 */
export const notificationPermissionSchema = z.string().trim().min(3).max(96)
  .regex(/^admin:[a-z][a-z0-9-]*\.(?:view|manage)$/);
export const notificationLinkSchema = z.string().trim().max(512)
  .regex(/^\/(?!\/)[^\u0000-\u0020\u007f]{0,511}$/)
  .refine(value => !/(?:token|secret|password|credential)=/i.test(value), { message: 'Notification links cannot contain credentials' });
export const notificationListQuerySchema = z.object({
  page: positiveQuery(1, 100_000),
  limit: positiveQuery(20, 100),
  unreadOnly: z.preprocess(value => value === undefined ? false : value === 'true' ? true : value === 'false' ? false : value, z.boolean()),
  type: notificationTypeSchema.optional()
}).strict();
export const notificationDataSchema = z.object({
  id: notificationIdSchema,
  type: notificationTypeSchema,
  title: localizedTextSchema,
  message: localizedTextSchema.optional(),
  link: notificationLinkSchema.optional(),
  readAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true })
}).strict();
export const notificationListDataSchema = z.object({
  items: z.array(notificationDataSchema).max(100),
  unreadCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  total: z.number().int().nonnegative()
}).strict();
export const notificationReadDataSchema = z.object({
  id: notificationIdSchema,
  readAt: z.string().datetime({ offset: true })
}).strict();
export const notificationReadAllDataSchema = z.object({ updatedCount: z.number().int().nonnegative() }).strict();
export const notificationListSuccessEnvelopeSchema = successEnvelopeSchema(notificationListDataSchema);
export const notificationReadSuccessEnvelopeSchema = successEnvelopeSchema(notificationReadDataSchema);
export const notificationReadAllSuccessEnvelopeSchema = successEnvelopeSchema(notificationReadAllDataSchema);

// Admin notifications deliberately reuse the same bounded, localized and
// credential-free projection as seeker notifications.  Separate names keep
// the audience-specific API contract explicit without creating a second data
// shape that could drift from the recipient-owned projection.
export const adminNotificationListQuerySchema = notificationListQuerySchema;
export const adminNotificationListDataSchema = notificationListDataSchema;
export const adminNotificationReadDataSchema = notificationReadDataSchema;
export const adminNotificationReadAllDataSchema = notificationReadAllDataSchema;
export const adminNotificationListSuccessEnvelopeSchema = notificationListSuccessEnvelopeSchema;
export const adminNotificationReadSuccessEnvelopeSchema = notificationReadSuccessEnvelopeSchema;
export const adminNotificationReadAllSuccessEnvelopeSchema = notificationReadAllSuccessEnvelopeSchema;

export type NotificationData = z.infer<typeof notificationDataSchema>;
export type NotificationAudience = z.infer<typeof notificationAudienceSchema>;
export type NotificationPermission = z.infer<typeof notificationPermissionSchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type NotificationListData = z.infer<typeof notificationListDataSchema>;
export type NotificationReadData = z.infer<typeof notificationReadDataSchema>;
export type NotificationReadAllData = z.infer<typeof notificationReadAllDataSchema>;
