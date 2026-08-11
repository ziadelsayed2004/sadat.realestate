import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRuntimeEnvironment } from '../config/environment.js';
import { parseDatabaseEnvironment, type DatabaseEnvironment } from './environment.js';
import { createDatabaseConnection, type DatabaseConnection } from './connection.js';
import { assertDevelopmentSeedAllowed, runDevelopmentSeed } from './seed.js';
import type { AppEnvironment } from '../config/environment.js';

export type SeedConnectionFactory = (
  environment: DatabaseEnvironment,
  appEnvironment: AppEnvironment
) => DatabaseConnection;

export async function runSeedCommand(
  source: Record<string, string | undefined> = process.env,
  connectionFactory: SeedConnectionFactory = createDatabaseConnection
): Promise<number> {
  const runtime = parseRuntimeEnvironment(source);
  assertDevelopmentSeedAllowed(runtime.appEnvironment);
  const databaseEnvironment = parseDatabaseEnvironment(source);
  const database = connectionFactory(databaseEnvironment, runtime.appEnvironment);
  try {
    await database.connect();
    return await runDevelopmentSeed(runtime.appEnvironment, database.nativeConnection);
  } finally {
    await database.disconnect();
  }
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

if (isEntrypoint()) {
  runSeedCommand().then((applied) => {
    process.stdout.write(`DEVELOPMENT_SEED_OK applied=${applied}\n`);
  }).catch(() => {
    process.stderr.write('Development seed failed safely; no connection details were emitted.\n');
    process.exitCode = 1;
  });
}
