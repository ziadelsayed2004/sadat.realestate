import { z } from 'zod';

export const UAT_FIXTURE_SURFACES = ['operational', 'public', 'seeker', 'provider', 'admin'] as const;
export const UAT_FIXTURE_STATES = ['loading', 'empty', 'error', 'retry', 'success', 'missing_image', 'long_text', 'expired', 'unavailable'] as const;

export const uatFixtureSurfaceSchema = z.enum(UAT_FIXTURE_SURFACES);
export const uatFixtureStateSchema = z.enum(UAT_FIXTURE_STATES);
export const uatFixtureKeySchema = z.string().regex(/^[a-z][a-z0-9_.-]{2,120}$/);

const sensitiveFixtureKey = /(?:password|passphrase|token|secret|credential|authorization|private.?key|signed.?url|access.?key)/i;

function rejectSensitivePayload(value: unknown, path: (string | number)[], ctx: z.RefinementCtx, depth = 0): void {
  if (depth > 5) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'fixture payload is too deeply nested' });
    return;
  }
  if (typeof value === 'string') {
    if (/[\u0000-\u001f\u007f]/u.test(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'fixture payload contains control characters' });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectSensitivePayload(item, [...path, index], ctx, depth + 1));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (sensitiveFixtureKey.test(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, key], message: 'fixture payload cannot contain credentials or secrets' });
    rejectSensitivePayload(item, [...path, key], ctx, depth + 1);
  }
}

const uatFixturePayloadSchema = z.record(z.string().regex(/^[a-z][a-zA-Z0-9_]{0,63}$/), z.unknown()).superRefine((value, ctx) => {
  rejectSensitivePayload(value, [], ctx);
});

export const uatFixtureSchema = z.object({
  key: uatFixtureKeySchema,
  surface: uatFixtureSurfaceSchema,
  state: uatFixtureStateSchema,
  locale: z.enum(['ar', 'en',]).optional(),
  synthetic: z.literal(true),
  payload: uatFixturePayloadSchema
}).strict();

export const uatFixtureCatalogSchema = z.object({
  version: z.literal('uat-fixtures-v1'),
  items: z.array(uatFixtureSchema).min(UAT_FIXTURE_SURFACES.length * UAT_FIXTURE_STATES.length)
}).strict();

export type UatFixtureSurface = z.infer<typeof uatFixtureSurfaceSchema>;
export type UatFixtureState = z.infer<typeof uatFixtureStateSchema>;
export type UatFixture = z.infer<typeof uatFixtureSchema>;
export type UatFixtureCatalog = z.infer<typeof uatFixtureCatalogSchema>;
