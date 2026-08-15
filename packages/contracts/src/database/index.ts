import { z } from 'zod';

const safeIdentifier = z.string().trim().min(1).max(160).regex(/^[a-zA-Z][a-zA-Z0-9_.:-]*$/u);
const safeDescription = z.string().trim().min(1).max(240).regex(/^[^\u0000-\u001f\u007f]+$/u);
const utcDate = z.string().datetime({ offset: true });

export const DATABASE_MIGRATION_STATUSES = ['planned', 'applied', 'blocked', 'failed'] as const;
export const DATABASE_BACKUP_STATUSES = ['planned', 'running', 'blocked', 'restored', 'verified', 'failed'] as const;
export const DATABASE_INDEX_ROLLOUT_STATUSES = ['planned', 'applied', 'blocked', 'failed'] as const;
export const DATABASE_INDEX_KEY_VALUES = [1, -1, 'text', '2dsphere', 'hashed'] as const;

export const databaseMigrationStatusSchema = z.enum(DATABASE_MIGRATION_STATUSES);
export const databaseBackupStatusSchema = z.enum(DATABASE_BACKUP_STATUSES);
export const databaseIndexRolloutStatusSchema = z.enum(DATABASE_INDEX_ROLLOUT_STATUSES);
export const databaseIndexKeyValueSchema = z.union([
  z.literal(1),
  z.literal(-1),
  z.literal('text'),
  z.literal('2dsphere'),
  z.literal('hashed')
]);

export const databaseMigrationSchema = z.object({
  id: safeIdentifier,
  version: z.number().int().positive().max(100_000),
  checksum: z.string().regex(/^[a-f0-9]{64}$/iu),
  description: safeDescription
}).strict();

export const databaseMigrationRecordSchema = databaseMigrationSchema.extend({
  appliedAt: utcDate
}).strict();

export const databaseBackupArtifactSchema = z.object({
  backupId: safeIdentifier,
  source: z.enum(['mongo_dump', 'snapshot', 'provider']),
  createdAt: utcDate,
  expiresAt: utcDate.optional(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/iu).optional(),
  collectionCount: z.number().int().nonnegative().max(100_000).optional()
}).strict();

export const databaseBackupDrillResultSchema = z.object({
  status: databaseBackupStatusSchema,
  backupId: safeIdentifier.optional(),
  restoreTarget: safeIdentifier.optional(),
  startedAt: utcDate,
  completedAt: utcDate.optional(),
  reason: safeDescription.optional()
}).strict();

export const databaseIndexDefinitionSchema = z.object({
  collection: safeIdentifier,
  name: safeIdentifier,
  key: z.record(z.string().trim().min(1).max(160), databaseIndexKeyValueSchema),
  options: z.object({
    unique: z.boolean().optional(),
    sparse: z.boolean().optional(),
    background: z.boolean().optional()
  }).strict().optional()
}).strict();

export const databaseIndexRolloutResultSchema = z.object({
  status: databaseIndexRolloutStatusSchema,
  mode: z.enum(['automatic-development', 'deployment-managed']),
  created: z.array(safeIdentifier).max(10_000),
  alreadyPresent: z.array(safeIdentifier).max(10_000),
  reason: safeDescription.optional()
}).strict();

export type DatabaseMigrationStatus = z.infer<typeof databaseMigrationStatusSchema>;
export type DatabaseMigration = z.infer<typeof databaseMigrationSchema>;
export type DatabaseMigrationRecord = z.infer<typeof databaseMigrationRecordSchema>;
export type DatabaseBackupStatus = z.infer<typeof databaseBackupStatusSchema>;
export type DatabaseBackupArtifact = z.infer<typeof databaseBackupArtifactSchema>;
export type DatabaseBackupDrillResult = z.infer<typeof databaseBackupDrillResultSchema>;
export type DatabaseIndexDefinition = z.infer<typeof databaseIndexDefinitionSchema>;
export type DatabaseIndexRolloutResult = z.infer<typeof databaseIndexRolloutResultSchema>;
