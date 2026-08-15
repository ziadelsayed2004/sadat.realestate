import {
  databaseBackupArtifactSchema,
  databaseBackupDrillResultSchema,
  type DatabaseBackupArtifact,
  type DatabaseBackupDrillResult
} from '@sadat-realestate/contracts';
import type { AppEnvironment } from '../config/environment.js';

export interface BackupProvider {
  createBackup(input: { environment: AppEnvironment; createdAt: Date }): Promise<DatabaseBackupArtifact>;
  restoreBackup(input: { artifact: DatabaseBackupArtifact; restoreTarget: string }): Promise<void>;
  verifyRestore(input: { artifact: DatabaseBackupArtifact; restoreTarget: string }): Promise<boolean>;
}

export interface BackupRestoreDrillOptions {
  readonly environment: AppEnvironment;
  readonly restoreTarget: string;
  readonly mode?: 'plan' | 'execute';
  readonly confirm?: boolean;
  readonly now?: Date;
  readonly provider?: BackupProvider;
}

export class BackupRestoreDrillError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'BackupRestoreDrillError';
    this.code = code;
  }
}

function safeTarget(value: string): string {
  const target = value.trim();
  if (!/^isolated-[a-zA-Z0-9_.:-]{1,152}$/u.test(target)) {
    throw new BackupRestoreDrillError('BACKUP_RESTORE_TARGET_INVALID', 'Restore target must be an opaque isolated identifier');
  }
  return target;
}

function iso(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new BackupRestoreDrillError('BACKUP_TIME_INVALID', 'Backup timestamp is invalid');
  return value.toISOString();
}

export function planBackupRestoreDrill(options: Pick<BackupRestoreDrillOptions, 'environment' | 'restoreTarget' | 'now'>): DatabaseBackupDrillResult {
  const startedAt = options.now ?? new Date();
  return databaseBackupDrillResultSchema.parse({
    status: 'planned',
    restoreTarget: safeTarget(options.restoreTarget),
    startedAt: iso(startedAt)
  });
}

export async function executeBackupRestoreDrill(options: BackupRestoreDrillOptions): Promise<DatabaseBackupDrillResult> {
  const startedAt = options.now ?? new Date();
  const restoreTarget = safeTarget(options.restoreTarget);
  if (options.mode !== 'execute') return planBackupRestoreDrill({ environment: options.environment, restoreTarget, now: startedAt });
  if (options.confirm !== true) {
    throw new BackupRestoreDrillError('BACKUP_CONFIRMATION_REQUIRED', 'Executing a backup/restore drill requires explicit confirmation');
  }
  if (!options.provider) {
    return databaseBackupDrillResultSchema.parse({
      status: 'blocked',
      restoreTarget,
      startedAt: iso(startedAt),
      reason: 'BACKUP_PROVIDER_UNAVAILABLE'
    });
  }

  try {
    const artifact = databaseBackupArtifactSchema.parse(await options.provider.createBackup({ environment: options.environment, createdAt: startedAt }));
    await options.provider.restoreBackup({ artifact, restoreTarget });
    const verified = await options.provider.verifyRestore({ artifact, restoreTarget });
    const completedAt = iso(new Date());
    if (!verified) {
      return databaseBackupDrillResultSchema.parse({
        status: 'failed',
        backupId: artifact.backupId,
        restoreTarget,
        startedAt: iso(startedAt),
        completedAt,
        reason: 'BACKUP_RESTORE_VERIFICATION_FAILED'
      });
    }
    return databaseBackupDrillResultSchema.parse({
      status: 'verified',
      backupId: artifact.backupId,
      restoreTarget,
      startedAt: iso(startedAt),
      completedAt
    });
  } catch {
    return databaseBackupDrillResultSchema.parse({
      status: 'failed',
      restoreTarget,
      startedAt: iso(startedAt),
      completedAt: iso(new Date()),
      reason: 'BACKUP_PROVIDER_FAILED'
    });
  }
}
