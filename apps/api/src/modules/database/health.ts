import { Router, type Response } from 'express';
import type { DatabaseReadiness } from './connection.js';

export interface HealthResponse {
  status: 'ok';
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  checks: { mongodb: 'ready' | 'not_ready' };
}

export const OPERATIONAL_ROUTE_DEFINITIONS = [
  { method: 'GET', path: '/health', operationId: 'getHealth' },
  { method: 'GET', path: '/ready', operationId: 'getReadiness' }
] as const;

function sendReadiness(response: Response, ready: boolean): void {
  const body: ReadinessResponse = ready
    ? { status: 'ready', checks: { mongodb: 'ready' } }
    : { status: 'not_ready', checks: { mongodb: 'not_ready' } };
  response.status(ready ? 200 : 503).json(body);
}

export function createOperationalRouter(database: DatabaseReadiness): Router {
  const router = Router();
  router.get('/health', (_request, response: Response<HealthResponse>) => {
    response.status(200).json({ status: 'ok' });
  });
  router.get('/ready', async (_request, response: Response<ReadinessResponse>) => {
    try {
      sendReadiness(response, await database.isReady());
    } catch {
      sendReadiness(response, false);
    }
  });
  return router;
}
