import express, { type Express } from 'express';
import { createOperationalRouter } from './modules/database/health.js';
import type { DatabaseReadiness } from './modules/database/connection.js';
import {
  createSecurityErrorHandler,
  createSecurityMiddleware,
  resolveSecurityOptions,
  type SecurityOptions
} from './modules/security/middleware.js';
import {
  createRequestObservabilityMiddleware,
  type ObservabilityOptions
} from './modules/observability/middleware.js';

export interface AppDependencies {
  database: DatabaseReadiness;
  security?: SecurityOptions;
  observability?: ObservabilityOptions;
}

/**
 * Creates the operational application shell. Product routes and later middleware
 * remain owned by their dependency-ready tasks.
 */
export function createApp(dependencies: AppDependencies): Express {
  if (!dependencies?.database || typeof dependencies.database.isReady !== 'function') {
    throw new Error('Database readiness dependency is required');
  }
  const app = express();
  const security = resolveSecurityOptions(dependencies.security);
  app.set('trust proxy', security.trustProxy);
  app.use(createRequestObservabilityMiddleware(dependencies.observability));
  for (const middleware of createSecurityMiddleware(security)) app.use(middleware);
  app.use(createOperationalRouter(dependencies.database));
  app.use(createSecurityErrorHandler());
  return app;
}
