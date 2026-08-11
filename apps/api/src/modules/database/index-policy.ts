import type { AppEnvironment } from '../config/environment.js';

export type IndexMode = 'automatic-development' | 'deployment-managed';

export interface DatabaseIndexPolicy {
  autoIndex: boolean;
  mode: IndexMode;
}

export function resolveDatabaseIndexPolicy(environment: AppEnvironment): DatabaseIndexPolicy {
  if (environment === 'local' || environment === 'test') {
    return { autoIndex: true, mode: 'automatic-development' };
  }
  return { autoIndex: false, mode: 'deployment-managed' };
}
