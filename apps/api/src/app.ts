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
import { createProviderRouter, type ProviderRouterDependencies } from './modules/provider/router.js';
import { createUploadRouter, type UploadRouterDependencies } from './modules/uploads/router.js';
import { createRbacRouter, type RbacRouterDependencies } from './modules/rbac/router.js';
import {
  createAccountRouter,
  type AccountRouterDependencies
} from './modules/accounts/router.js';
import { createAuditRouter, type AuditRouterDependencies } from './modules/audit/router.js';
import { createLocationRouter, type LocationRouterDependencies } from './modules/locations/router.js';
import { createTaxonomyRouter, type TaxonomyRouterDependencies } from './modules/taxonomy/router.js';
import { createFeatureRouter, type FeatureService } from './modules/taxonomy/features.js';

export interface AppDependencies {
  database: DatabaseReadiness;
  auth?: AuthRouterDependencies;
  seeker?: SeekerRouterDependencies;
  provider?: ProviderRouterDependencies;
  uploads?: UploadRouterDependencies & { readiness?: { isReady(): boolean | Promise<boolean> } };
  rbac?: RbacRouterDependencies;
  accounts?: AccountRouterDependencies;
  audit?: AuditRouterDependencies;
  locations?: LocationRouterDependencies;
  taxonomy?: TaxonomyRouterDependencies;
  features?: { service: FeatureService; accessTokens: import('./modules/auth/crypto.js').AccessTokenService };
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
  app.use(createOperationalRouter(dependencies.database, dependencies.auth?.otpService, dependencies.uploads?.readiness));
  if (dependencies.auth) app.use('/api/v1/auth', createAuthRouter(dependencies.auth));
  if (dependencies.accounts?.accessGuard) {
    app.use('/api/v1', dependencies.accounts.accessGuard);
  }
  if (dependencies.seeker) app.use('/api/v1', createSeekerRouter(dependencies.seeker));
  if (dependencies.provider) app.use('/api/v1', createProviderRouter(dependencies.provider));
  if (dependencies.uploads) app.use('/api/v1', createUploadRouter(dependencies.uploads));
  if (dependencies.rbac) app.use('/api/v1', createRbacRouter(dependencies.rbac));
  if (dependencies.accounts) app.use('/api/v1', createAccountRouter(dependencies.accounts));
  if (dependencies.audit) app.use('/api/v1', createAuditRouter(dependencies.audit));
  if (dependencies.locations) app.use('/api/v1', createLocationRouter(dependencies.locations));
  if (dependencies.taxonomy) app.use('/api/v1', createTaxonomyRouter(dependencies.taxonomy));
  if (dependencies.features) app.use('/api/v1', createFeatureRouter(dependencies.features.service, dependencies.features.accessTokens));
  app.use(createSecurityErrorHandler());
  return app;
}
