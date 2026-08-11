import type { Connection } from 'mongoose';
import type { AppEnvironment } from '../config/environment.js';
import { isSeedEnvironmentAllowed } from './environment.js';

export interface DevelopmentSeedStep {
  id: string;
  run(connection: Connection): Promise<void>;
}

export class DevelopmentSeedError extends Error {
  readonly code = 'DEVELOPMENT_SEED_FORBIDDEN';

  constructor() {
    super('Synthetic seed is available only in local and UAT environments');
    this.name = 'DevelopmentSeedError';
  }
}

export const DEVELOPMENT_SEED_STEPS: readonly DevelopmentSeedStep[] = [];

export function assertDevelopmentSeedAllowed(environment: AppEnvironment): void {
  if (!isSeedEnvironmentAllowed(environment)) throw new DevelopmentSeedError();
}

export async function runDevelopmentSeed(
  environment: AppEnvironment,
  connection: Connection,
  steps: readonly DevelopmentSeedStep[] = DEVELOPMENT_SEED_STEPS
): Promise<number> {
  assertDevelopmentSeedAllowed(environment);
  if (steps.length === 0) return 0;
  if (!connection.db) throw new Error('Database connection is not ready');

  const ledger = connection.db.collection<{ id: string; appliedAt: Date }>('_development_seed_runs');
  await ledger.createIndex({ id: 1 }, { unique: true });
  let applied = 0;
  for (const step of steps) {
    const existing = await ledger.findOne({ id: step.id });
    if (existing) continue;
    await step.run(connection);
    await ledger.updateOne({ id: step.id }, { $setOnInsert: { id: step.id, appliedAt: new Date() } }, { upsert: true });
    applied += 1;
  }
  return applied;
}
