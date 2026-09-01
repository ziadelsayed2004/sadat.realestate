import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRuntimeEnvironment } from '../config/environment.js';
import { parseDatabaseEnvironment } from './environment.js';
import { createDatabaseConnection } from './connection.js';
import {
  createLocaleBackup,
  restoreLocaleBackup,
  runLocaleMigration,
  type BackupResult,
  type LocaleMigrationResult,
  type RestoreResult
} from './locale-migration.js';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && path.resolve(entrypoint) === fileURLToPath(import.meta.url));
}

export async function runLocaleMigrationCommand(source: Record<string, string | undefined> = process.env): Promise<void> {
  const runtime = parseRuntimeEnvironment(source);
  const databaseEnvironment = parseDatabaseEnvironment(source);
  const database = createDatabaseConnection(databaseEnvironment, runtime.appEnvironment);
  const mode = process.argv.includes('--apply') ? 'apply' : 'dry-run';
  const backupPath = argument('backup');
  const restoreDatabase = argument('restore-db');
  const rollbackDatabase = argument('rollback-db');
  let backup: BackupResult | undefined;
  let restore: RestoreResult | undefined;
  let rollback: RestoreResult | undefined;
  let result: LocaleMigrationResult;
  try {
    await database.connect();
    if (mode === 'apply') {
      if (!backupPath || !restoreDatabase) throw new Error('An external backup path and fresh restore database are required before apply');
      backup = await createLocaleBackup(database.nativeConnection, backupPath, argument('backup-id') ?? 'backend151-cli-backup', runtime.appEnvironment);
      restore = await restoreLocaleBackup(database.nativeConnection, backupPath, restoreDatabase, runtime.appEnvironment);
      if (restore.status !== 'verified') throw new Error('Fresh restore verification failed before apply');
    }
    result = await runLocaleMigration(database.nativeConnection, {
      environment: runtime.appEnvironment,
      mode,
      confirm: process.argv.includes('--confirm')
    });
    if (rollbackDatabase && backupPath) rollback = await restoreLocaleBackup(database.nativeConnection, backupPath, rollbackDatabase, runtime.appEnvironment);
  } finally {
    await database.disconnect();
  }
  process.stdout.write(`${JSON.stringify({ result, backup, restore, rollback }, null, 2)}\n`);
}

if (isEntrypoint()) {
  runLocaleMigrationCommand().catch(() => {
    process.stderr.write('Locale migration failed safely; no connection details or document values were emitted.\n');
    process.exitCode = 1;
  });
}
