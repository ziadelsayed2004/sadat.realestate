import { z } from 'zod';

const safeIdentifier = z.string().trim().min(1).max(80).regex(/^[a-zA-Z][a-zA-Z0-9_.:-]*$/u);

export const DEPLOYMENT_HEALTH_PATH = '/health' as const;
export const DEPLOYMENT_READINESS_PATH = '/ready' as const;
export const DEPLOYMENT_IMAGE_STAGES = ['dependencies', 'build', 'runtime'] as const;

export const deploymentManifestSchema = z.object({
  nodeMajor: z.literal(24),
  nonRootUser: safeIdentifier.refine((value) => value !== 'root', 'deployment runtime must not run as root'),
  healthPath: z.literal(DEPLOYMENT_HEALTH_PATH),
  readinessPath: z.literal(DEPLOYMENT_READINESS_PATH),
  shutdownGraceMs: z.number().int().positive().max(120_000),
  imageStages: z.array(z.enum(DEPLOYMENT_IMAGE_STAGES)).length(3),
  composeServices: z.array(safeIdentifier).min(2).max(8)
}).strict();

export type DeploymentManifest = z.infer<typeof deploymentManifestSchema>;
