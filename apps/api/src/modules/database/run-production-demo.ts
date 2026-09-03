import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { parseRuntimeEnvironment } from '../config/environment.js';
import { createDatabaseConnection } from './connection.js';
import { parseDatabaseEnvironment } from './environment.js';
import { DEVELOPMENT_SEED_STEPS } from './seed.js';

const INSTALL_CONFIRMATION = 'INSTALL_FULL_LOCAL_DEMO';
const RESET_CONFIRMATION = 'DELETE_SYNTHETIC_DEMO_DATA';
const ledgerName = '_production_demo_runs';

function parseEnvironmentFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error('MALFORMED_ENVIRONMENT_LINE');
    const key = line.slice(0, separator).trim();
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key)) throw new Error('INVALID_ENVIRONMENT_KEY');
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function resolvedSource(source: Record<string, string | undefined>): Promise<Record<string, string | undefined>> {
  if (source.MONGODB_URI) return source;
  const configured = source.PRODUCTION_ENV_FILE?.trim() || '/etc/elsadatrealestate/production.env';
  const fromFile = parseEnvironmentFile(await readFile(configured, 'utf8'));
  return { ...source, ...fromFile };
}

function assertProduction(source: Record<string, string | undefined>): void {
  if (parseRuntimeEnvironment(source).appEnvironment !== 'production') {
    throw new Error('PRODUCTION_DEMO_REQUIRES_PRODUCTION_ENVIRONMENT');
  }
}

export async function installProductionDemo(
  source: Record<string, string | undefined> = process.env
): Promise<number> {
  const environment = await resolvedSource(source);
  assertProduction(environment);
  if (environment.PRODUCTION_DEMO_CONFIRM !== INSTALL_CONFIRMATION) {
    throw new Error('PRODUCTION_DEMO_INSTALL_CONFIRMATION_REQUIRED');
  }

  const runtime = parseRuntimeEnvironment(environment);
  const database = createDatabaseConnection(parseDatabaseEnvironment(environment), runtime.appEnvironment);
  try {
    await database.connect();
    const connection = database.nativeConnection;
    if (!connection.db) throw new Error('DATABASE_NOT_READY');
    const ledger = connection.db.collection<{ id: string; appliedAt: Date }>(ledgerName);
    await ledger.createIndex({ id: 1 }, { unique: true });
    let applied = 0;
    for (const step of DEVELOPMENT_SEED_STEPS) {
      if (await ledger.findOne({ id: step.id })) continue;
      await step.run(connection);
      await ledger.updateOne(
        { id: step.id },
        { $setOnInsert: { id: step.id, appliedAt: new Date() } },
        { upsert: true }
      );
      applied += 1;
    }
    return applied;
  } finally {
    await database.disconnect();
  }
}

export async function resetProductionDemo(
  source: Record<string, string | undefined> = process.env
): Promise<number> {
  const environment = await resolvedSource(source);
  assertProduction(environment);
  if (environment.PRODUCTION_DEMO_RESET_CONFIRM !== RESET_CONFIRMATION) {
    throw new Error('PRODUCTION_DEMO_RESET_CONFIRMATION_REQUIRED');
  }

  const runtime = parseRuntimeEnvironment(environment);
  const database = createDatabaseConnection(parseDatabaseEnvironment(environment), runtime.appEnvironment);
  try {
    await database.connect();
    const connection = database.nativeConnection;
    if (!connection.db) throw new Error('DATABASE_NOT_READY');
    let deleted = 0;
    const collections = await connection.db.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of collections) {
      if (name.startsWith('system.')) continue;
      const result = await connection.db.collection(name).deleteMany({ synthetic: true });
      deleted += result.deletedCount;
    }
    await connection.db.collection(ledgerName).deleteMany({});
    await connection.db.collection('_production_showcase_runs').deleteMany({});
    return deleted;
  } finally {
    await database.disconnect();
  }
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

if (isEntrypoint()) {
  const operation = process.argv[2];
  const action = operation === 'reset' ? resetProductionDemo : operation === 'install' ? installProductionDemo : undefined;
  if (!action) {
    process.stderr.write('Usage: run-production-demo.js <install|reset>\n');
    process.exitCode = 2;
  } else {
    action().then(count => {
      process.stdout.write(`PRODUCTION_DEMO_${operation === 'reset' ? 'RESET' : 'READY'} count=${count}\n`);
    }).catch(() => {
      process.stderr.write('Production demo operation failed safely; no connection details were emitted.\n');
      process.exitCode = 1;
    });
  }
}
