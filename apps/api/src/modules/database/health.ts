import { Router, type Response } from 'express';
import type { DatabaseReadiness } from './connection.js';

export interface HealthResponse {
  status: 'ok';
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  checks: {
    mongodb: 'ready' | 'not_ready';
    otp?: 'ready' | 'not_ready';
    privateDocuments?: 'ready' | 'not_ready';
  };
}

export interface DependencyReadiness {
  isReady(): boolean | Promise<boolean>;
}

export const OPERATIONAL_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/health', operationId: 'getHealth' },
  { method: 'GET', path: '/ready', operationId: 'getReadiness' }
] as const;

async function readinessState(dependency: DependencyReadiness): Promise<'ready' | 'not_ready'> {
  try {
    return await dependency.isReady() ? 'ready' : 'not_ready';
  } catch {
    return 'not_ready';
  }
}

export function createOperationalRouter(
  database: DatabaseReadiness,
  otp?: DependencyReadiness,
  privateDocuments?: DependencyReadiness
): Router {
  const router = Router();
  router.get('/health', (_request, response: Response<HealthResponse>) => {
    response.status(200).json({ status: 'ok' });
  });
  router.get('/ready', async (_request, response: Response<ReadinessResponse>) => {
    const [mongodb, otpState, privateDocumentsState] = await Promise.all([
      readinessState(database),
      otp ? readinessState(otp) : Promise.resolve(undefined),
      privateDocuments ? readinessState(privateDocuments) : Promise.resolve(undefined)
    ]);
    const checks: ReadinessResponse['checks'] = {
      mongodb,
      ...(otpState ? { otp: otpState } : {}),
      ...(privateDocumentsState ? { privateDocuments: privateDocumentsState } : {})
    };
    const ready = Object.values(checks).every((state) => state === 'ready');
    response.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      checks
    });
  });
  return router;
}
