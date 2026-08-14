import { z } from 'zod';
import { normalizedEmailSchema } from '../auth/index.js';

export const ADMIN_ACCESS_LEVELS = ['super_admin', 'standard_admin'] as const;
export const FIRST_SUPER_ADMIN_BOOTSTRAP_KEY = 'first-super-admin' as const;
export const FIRST_SUPER_ADMIN_CONFIRMATION = 'CREATE_FIRST_SUPER_ADMIN' as const;

export const adminAccessLevelSchema = z.enum(ADMIN_ACCESS_LEVELS);

export const adminBootstrapInputSchema = z.object({
  email: normalizedEmailSchema,
  password: z
    .string()
    .min(12)
    .max(128)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
      message: 'Password must not contain control characters'
    }),
  locale: z.enum(['ar', 'en', 'zh-CN']).default('ar'),
  confirmation: z.literal(FIRST_SUPER_ADMIN_CONFIRMATION)
}).strict();

export const adminBootstrapDataSchema = z.object({
  adminId: z.string().regex(/^[a-f0-9]{24}$/),
  email: normalizedEmailSchema,
  accessLevel: z.literal('super_admin'),
  status: z.literal('verified'),
  bootstrappedAt: z.string().datetime({ offset: true })
}).strict();

export type AdminAccessLevel = z.infer<typeof adminAccessLevelSchema>;
export type AdminBootstrapInput = z.infer<typeof adminBootstrapInputSchema>;
export type AdminBootstrapData = z.infer<typeof adminBootstrapDataSchema>;
