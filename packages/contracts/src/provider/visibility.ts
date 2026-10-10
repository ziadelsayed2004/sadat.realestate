import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const publicIdentitySubscriptionSchema = z.object({
  providerId: z.string().regex(/^[a-f0-9]{24}$/),
  status: z.enum(['inactive', 'active']),
  startAt: z.string().datetime().optional(), endAt: z.string().datetime().optional(),
  paymentConfirmed: z.boolean(), version: z.number().int().nonnegative(),
  visible: z.boolean(), canManage: z.boolean()
}).strict();
export const publicIdentitySubscriptionPutSchema = z.object({
  status: z.enum(['inactive', 'active']),
  startAt: z.string().datetime().optional(), endAt: z.string().datetime().optional(),
  paymentConfirmed: z.boolean(), expectedVersion: z.number().int().nonnegative()
}).strict().superRefine((value, ctx) => {
  if (value.status === 'active' && (!value.paymentConfirmed || !value.startAt || !value.endAt || new Date(value.endAt) <= new Date(value.startAt))) {
    ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'Activation requires confirmed external payment and an increasing date range' });
  }
});
export const publicIdentitySubscriptionSuccessEnvelopeSchema = successEnvelopeSchema(publicIdentitySubscriptionSchema);
export type PublicIdentitySubscription = z.infer<typeof publicIdentitySubscriptionSchema>;
export type PublicIdentitySubscriptionPut = z.infer<typeof publicIdentitySubscriptionPutSchema>;
