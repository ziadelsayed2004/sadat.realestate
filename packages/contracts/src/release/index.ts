import { z } from 'zod';

export const RELEASE_READINESS_VERSION = 'backend-readiness-v1' as const;
export const RELEASE_CHECK_STATUSES = ['passed', 'blocked', 'failed'] as const;
export const RELEASE_READINESS_OUTCOMES = ['ready', 'conditional', 'blocked'] as const;

export const releaseCheckStatusSchema = z.enum(RELEASE_CHECK_STATUSES);
export const releaseReadinessOutcomeSchema = z.enum(RELEASE_READINESS_OUTCOMES);
export const releaseCheckSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_.-]{2,80}$/),
  command: z.string().trim().min(1).max(500),
  status: releaseCheckStatusSchema,
  notes: z.string().trim().min(1).max(1000)
}).strict();
export const releasePrerequisiteSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_.-]{2,80}$/),
  status: z.literal('blocked'),
  ownerAction: z.string().trim().min(1).max(1000)
}).strict();
export const releaseReadinessSchema = z.object({
  version: z.literal(RELEASE_READINESS_VERSION),
  generatedAt: z.string().datetime({ offset: true }),
  outcome: releaseReadinessOutcomeSchema,
  checks: z.array(releaseCheckSchema).min(1),
  prerequisites: z.array(releasePrerequisiteSchema).max(50),
  frontendStarted: z.literal(false)
}).strict();

export type ReleaseCheckStatus = (typeof RELEASE_CHECK_STATUSES)[number];
export type ReleaseReadinessOutcome = (typeof RELEASE_READINESS_OUTCOMES)[number];
export type ReleaseCheck = z.infer<typeof releaseCheckSchema>;
export type ReleasePrerequisite = z.infer<typeof releasePrerequisiteSchema>;
export type ReleaseReadiness = z.infer<typeof releaseReadinessSchema>;

