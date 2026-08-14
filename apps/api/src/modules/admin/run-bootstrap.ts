import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adminBootstrapInputSchema,
  type AdminBootstrapData
} from '@sadat-real-estate/contracts';
import { parseRuntimeEnvironment } from '../config/environment.js';
import { createDatabaseConnection, type DatabaseConnection } from '../database/connection.js';
import { parseDatabaseEnvironment, type DatabaseEnvironment } from '../database/environment.js';
import type { AppEnvironment } from '../config/environment.js';
import { createAdminBootstrapRuntime } from './runtime.js';
import { AdminServiceError } from './service.js';

export type AdminBootstrapConnectionFactory = (
  environment: DatabaseEnvironment,
  appEnvironment: AppEnvironment
) => DatabaseConnection;

export function parseAdminBootstrapEnvironment(
  source: Record<string, string | undefined>
) {
  return adminBootstrapInputSchema.parse({
    email: source.ADMIN_BOOTSTRAP_EMAIL,
    password: source.ADMIN_BOOTSTRAP_PASSWORD,
    locale: source.ADMIN_BOOTSTRAP_LOCALE || 'ar',
    confirmation: source.ADMIN_BOOTSTRAP_CONFIRMATION
  });
}

export async function runAdminBootstrapCommand(
  source: Record<string, string | undefined> = process.env,
  connectionFactory: AdminBootstrapConnectionFactory = createDatabaseConnection,
  runtimeFactory = createAdminBootstrapRuntime
): Promise<AdminBootstrapData> {
  const runtimeEnvironment = parseRuntimeEnvironment(source);
  const databaseEnvironment = parseDatabaseEnvironment(source);
  const input = parseAdminBootstrapEnvironment(source);
  const database = connectionFactory(databaseEnvironment, runtimeEnvironment.appEnvironment);
  try {
    await database.connect();
    return await runtimeFactory(database.nativeConnection).bootstrap(input);
  } finally {
    await database.disconnect();
  }
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

function safeFailureCode(error: unknown): string {
  if (error instanceof AdminServiceError) return error.code;
  if (error instanceof Error && error.name === 'ZodError') return 'ADMIN_BOOTSTRAP_INPUT_INVALID';
  return 'ADMIN_BOOTSTRAP_FAILED';
}

if (isEntrypoint()) {
  runAdminBootstrapCommand().then((result) => {
    process.stdout.write(`ADMIN_BOOTSTRAP_OK adminId=${result.adminId}\n`);
  }).catch((error: unknown) => {
    process.stderr.write(`Admin bootstrap failed safely (${safeFailureCode(error)}).\n`);
    process.exitCode = 1;
  });
}
