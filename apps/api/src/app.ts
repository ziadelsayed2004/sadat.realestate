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
import { createAuthRouter, type AuthRouterDependencies } from './modules/auth/router.js';
import { createSeekerRouter, type SeekerRouterDependencies } from './modules/seeker/router.js';

export interface AppDependencies {
  database: DatabaseReadiness;
  auth?: AuthRouterDependencies;
  seeker?: SeekerRouterDependencies;
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
  app.use(createOperationalRouter(dependencies.database, dependencies.auth?.otpService));
  if (dependencies.auth) app.use('/api/v1/auth', createAuthRouter(dependencies.auth));
  if (dependencies.seeker) app.use('/api/v1', createSeekerRouter(dependencies.seeker));
  app.use(createSecurityErrorHandler());
  return app;
}
