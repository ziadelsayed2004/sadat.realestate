import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRuntimeEnvironment } from '../config/environment.js';
import { createDatabaseConnection } from './connection.js';
import { parseDatabaseEnvironment } from './environment.js';
import {
  FIGMA_PUBLIC_CATALOGUE_SEED_STEP,
  FIGMA_PUBLIC_CONTENT_SEED_STEP,
  FIGMA_PUBLIC_INTERACTIONS_SEED_STEP,
  SYNTHETIC_SHOWCASE_SEED_STEP,
  type DevelopmentSeedStep
} from './seed.js';

const CONFIRMATION = 'INSTALL_PUBLISHED_SHOWCASE';
const steps: readonly DevelopmentSeedStep[] = [
  SYNTHETIC_SHOWCASE_SEED_STEP,
  FIGMA_PUBLIC_CONTENT_SEED_STEP,
  FIGMA_PUBLIC_CATALOGUE_SEED_STEP,
  FIGMA_PUBLIC_INTERACTIONS_SEED_STEP
];

export async function runProductionShowcase(
  source: Record<string, string | undefined> = process.env
): Promise<number> {
  const runtime = parseRuntimeEnvironment(source);
  if (runtime.appEnvironment !== 'production' || source.PRODUCTION_SHOWCASE_CONFIRM !== CONFIRMATION) {
    throw new Error('PRODUCTION_SHOWCASE_CONFIRMATION_REQUIRED');
  }

  const database = createDatabaseConnection(parseDatabaseEnvironment(source), runtime.appEnvironment);
  try {
    await database.connect();
    const connection = database.nativeConnection;
    if (!connection.db) throw new Error('DATABASE_NOT_READY');
    const ledger = connection.db.collection<{ id: string; appliedAt: Date }>('_production_showcase_runs');
    await ledger.createIndex({ id: 1 }, { unique: true });
    let applied = 0;
    for (const step of steps) {
      if (await ledger.findOne({ id: step.id })) continue;
      await step.run(connection);
      await ledger.updateOne({ id: step.id }, { $setOnInsert: { id: step.id, appliedAt: new Date() } }, { upsert: true });
      applied += 1;
    }
    return applied;
  } finally {
    await database.disconnect();
  }
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

if (isEntrypoint()) {
  runProductionShowcase().then(applied => {
    process.stdout.write(`PRODUCTION_SHOWCASE_READY applied=${applied}\n`);
  }).catch(() => {
    process.stderr.write('Production showcase failed safely; no connection details were emitted.\n');
    process.exitCode = 1;
  });
}
