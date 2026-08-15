import { z } from 'zod';

export const HANDOFF_CONTRACT_VERSION = 'v1' as const;
export const HANDOFF_COVERAGE_STATES = ['implemented', 'partial', 'unmapped'] as const;
export const HANDOFF_UNRESOLVED_KINDS = ['missing_runtime_endpoint', 'service_boundary', 'external_prerequisite'] as const;

const operationIdSchema = z.string().regex(/^[a-z][a-zA-Z0-9]+$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const handoffOperationSchema = z.object({
  operationId: operationIdSchema,
  method: z.enum(['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE']),
  path: z.string().regex(/^\/(?!\/)[^\s]{1,511}$/),
  status: z.literal('implemented')
}).strict();

export const handoffScreenSchema = z.object({
  id: z.string().regex(/^[A-Z][A-Z0-9+-]{1,20}$/),
  surface: z.enum(['public', 'auth', 'seeker', 'provider', 'admin']),
  englishName: z.string().trim().min(1).max(200),
  endpointOperationIds: z.array(operationIdSchema).max(30),
  coverage: z.enum(HANDOFF_COVERAGE_STATES),
  notes: z.array(z.string().trim().min(1).max(500)).max(10)
}).strict();

export const handoffGeneratedClientSchema = z.object({
  language: z.literal('typescript'),
  source: z.literal('openapi'),
  basePath: z.literal('/api/v1'),
  operationIds: z.array(operationIdSchema).min(1),
  typeSource: z.string().min(1).max(500_000)
}).strict();

export const handoffUnresolvedSchema = z.object({
  kind: z.enum(HANDOFF_UNRESOLVED_KINDS),
  message: z.string().trim().min(1).max(500)
}).strict();

export const contractFreezeSchema = z.object({
  version: z.literal(HANDOFF_CONTRACT_VERSION),
  generatedAt: z.string().datetime({ offset: true }),
  sourceHashes: z.object({
    openapiSha256: sha256Schema,
    runtimeInventorySha256: sha256Schema
  }).strict(),
  operations: z.array(handoffOperationSchema).min(1),
  screens: z.array(handoffScreenSchema).length(131),
  generatedClient: handoffGeneratedClientSchema,
  unresolved: z.array(handoffUnresolvedSchema).max(100)
}).strict();

export type HandoffCoverageState = (typeof HANDOFF_COVERAGE_STATES)[number];
export type HandoffOperation = z.infer<typeof handoffOperationSchema>;
export type HandoffScreen = z.infer<typeof handoffScreenSchema>;
export type HandoffGeneratedClient = z.infer<typeof handoffGeneratedClientSchema>;
export type HandoffUnresolved = z.infer<typeof handoffUnresolvedSchema>;
export type ContractFreeze = z.infer<typeof contractFreezeSchema>;

