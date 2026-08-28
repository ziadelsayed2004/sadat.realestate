import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRuntimeEnvironment } from '../config/environment.js';
import { parseDatabaseEnvironment } from '../database/environment.js';
import { createDatabaseConnection } from '../database/connection.js';
import { runMigrations } from '../database/migrations.js';
import {
  EMAIL_ONLY_AUTH_MIGRATION,
  getEmailOnlyMigrationCollections,
  inspectEmailOnlyAuthMigration
} from './email-only-migration.js';

export async function runEmailOnlyMigrationCommand(
  source: Record<string, string | undefined> = process.env,
  args: readonly string[] = process.argv.slice(2)
): Promise<number> {
  const runtime = parseRuntimeEnvironment(source);
  const database = createDatabaseConnection(
    parseDatabaseEnvironment(source),
    runtime.appEnvironment
  );
  const mode = args.includes('--apply') ? 'apply' : 'plan';
  const confirm = args.includes('--confirm');

  try {
    await database.connect();
    const collections = getEmailOnlyMigrationCollections(database.nativeConnection);
    const before = await inspectEmailOnlyAuthMigration(collections);
    const result = await runMigrations(
      database.nativeConnection,
      [EMAIL_ONLY_AUTH_MIGRATION],
      { environment: runtime.appEnvironment, mode, confirm }
    );
    const after = await inspectEmailOnlyAuthMigration(collections);
    process.stdout.write(`${mode === 'apply' ? 'EMAIL_ONLY_AUTH_MIGRATION_APPLIED' : 'EMAIL_ONLY_AUTH_MIGRATION_PLANNED'} ${JSON.stringify({
      pendingMigrations: result.pending.map(({ id }) => id),
      before,
      after
    })}\n`);
    return 0;
  } finally {
    await database.disconnect();
  }
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

if (isEntrypoint()) {
  runEmailOnlyMigrationCommand().catch(() => {
    process.stderr.write('Email-only authentication migration failed safely; no connection details were emitted.\n');
    process.exitCode = 1;
  });
}
