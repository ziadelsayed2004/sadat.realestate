import { z } from 'zod';
import { localizedTextSchema } from '../localization/index.js';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

const positiveQuery = (fallback: number, max: number) => z.preprocess(
  value => value === undefined ? fallback : Number(value),
  z.number().int().positive().max(max)
);

export const notificationIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
export const notificationTypeSchema = z.string().trim().min(2).max(64).regex(/^[a-z][a-z0-9_.-]*$/);
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

export type NotificationData = z.infer<typeof notificationDataSchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type NotificationListData = z.infer<typeof notificationListDataSchema>;
export type NotificationReadData = z.infer<typeof notificationReadDataSchema>;
export type NotificationReadAllData = z.infer<typeof notificationReadAllDataSchema>;
