import path from 'node:path';
import { realpathSync } from 'node:fs';
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

export function isAdminBootstrapEntrypoint(
  moduleUrl: string,
  entrypoint: string | undefined,
  canonicalize: (value: string) => string = realpathSync
): boolean {
  if (!entrypoint) return false;
  const modulePath = fileURLToPath(moduleUrl);
  const entrypointPath = path.resolve(entrypoint);
  try {
    return canonicalize(modulePath) === canonicalize(entrypointPath);
  } catch {
    return modulePath === entrypointPath;
  }
}

function safeFailureCode(error: unknown): string {
  if (error instanceof AdminServiceError) return error.code;
  if (error instanceof Error && error.name === 'ZodError') return 'ADMIN_BOOTSTRAP_INPUT_INVALID';
  return 'ADMIN_BOOTSTRAP_FAILED';
}

if (isAdminBootstrapEntrypoint(import.meta.url, process.argv[1])) {
  runAdminBootstrapCommand().then((result) => {
    process.stdout.write(`ADMIN_BOOTSTRAP_OK adminId=${result.adminId}\n`);
  }).catch((error: unknown) => {
    // A completed first-admin guard is the expected result of an idempotent
    // local-runtime restart. Keep all other bootstrap failures fatal so a
    // pre-existing untracked administrator can never be mistaken for a valid
    // first Super Admin.
    if (error instanceof AdminServiceError && error.code === 'ADMIN_BOOTSTRAP_ALREADY_COMPLETED') {
      process.stdout.write(`${error.code}\n`);
      return;
    }
    process.stderr.write(`Admin bootstrap failed safely (${safeFailureCode(error)}).\n`);
    process.exitCode = 1;
  });
}
