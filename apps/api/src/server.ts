import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { parseRuntimeEnvironment } from './modules/config/environment.js';
import { parseDatabaseEnvironment, DatabaseEnvironmentValidationError } from './modules/database/environment.js';
import { createDatabaseConnection } from './modules/database/connection.js';
import type { AppDependencies } from './app.js';
import {
  AuthEnvironmentValidationError,
  parseAuthEnvironment
} from './modules/auth/environment.js';
import { createAuthRuntime } from './modules/auth/runtime.js';
import { createSeekerRuntime } from './modules/seeker/runtime.js';
import { createProviderRuntime } from './modules/provider/runtime.js';
import { parseUploadEnvironment } from './modules/uploads/environment.js';
import { createUploadRuntime } from './modules/uploads/runtime.js';
import { createRbacRuntime } from './modules/rbac/runtime.js';
import { createAccountRuntime } from './modules/accounts/runtime.js';
import {
  createAuditInfrastructure,
  createAuditRuntime
} from './modules/audit/runtime.js';
import { createLocationRuntime } from './modules/locations/runtime.js';
import { createTaxonomyRuntime } from './modules/taxonomy/runtime.js';
import { createFeatureService } from './modules/taxonomy/features.js';
import { createProjectRuntime } from './modules/projects/runtime.js';
import { createPropertyRuntime } from './modules/properties/runtime.js';
import { createPropertyMediaRuntime } from './modules/media/runtime.js';
import { createModerationRuntime } from './modules/moderation/runtime.js';
import { createPublicRuntime } from './modules/public/runtime.js';
import { createPublicSearchRuntime } from './modules/search/runtime.js';
import { createPublicCompareRuntime } from './modules/compare/runtime.js';
import { createPublicOrganizationRuntime } from './modules/organizations/runtime.js';
import { createFavoriteRuntime } from './modules/favorites/runtime.js';
import { createNotificationRuntime } from './modules/notifications/runtime.js';
import { createSettingsRuntime } from './modules/settings/runtime.js';
import { createRequestRuntime } from './modules/requests/runtime.js';
import { createViewingRuntime } from './modules/viewings/runtime.js';
import { createArticleRuntime } from './modules/articles/runtime.js';
import { createGracefulShutdown } from './modules/deployment/runtime.js';

export interface ApiListenOptions {
  host: string;
  port: number;
}

export const DEFAULT_LISTEN_OPTIONS: ApiListenOptions = {
  host: '127.0.0.1',
  port: 3000
};

export function createApiServer(dependencies: AppDependencies): Server {
  return createServer(createApp(dependencies));
}

export function startApiServer(
  server: Server,
  options: ApiListenOptions = DEFAULT_LISTEN_OPTIONS
): Promise<AddressInfo> {
  if (server.listening) return Promise.reject(new Error('API server is already listening'));

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off('error', onError);
      server.off('listening', onListening);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('API server did not expose a TCP address'));
        return;
      }
      resolve(address);
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(options.port, options.host);
  });
}

export function stopApiServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

async function runEntrypoint(): Promise<void> {
  const runtimeEnvironment = parseRuntimeEnvironment(process.env);
  const databaseEnvironment = parseDatabaseEnvironment(process.env);
  const authEnvironment = parseAuthEnvironment(process.env, runtimeEnvironment.appEnvironment);
  const database = createDatabaseConnection(databaseEnvironment, runtimeEnvironment.appEnvironment);
  await database.connect();
  const auth = createAuthRuntime(database.nativeConnection, authEnvironment);
  if (!auth.accessTokens) throw new Error('Auth access-token verifier is required for product routes');
  const seeker = createSeekerRuntime(
    database.nativeConnection,
    auth.service,
    auth.accessTokens,
    auth.cookie
  );
  const provider = createProviderRuntime(
    database.nativeConnection,
    auth.service,
    auth.accessTokens,
    auth.cookie
  );
  const auditInfrastructure = createAuditInfrastructure(database.nativeConnection);
  const rbac = createRbacRuntime(
    database.nativeConnection,
    auth.accessTokens,
    auditInfrastructure.writer
  );
  const audit = createAuditRuntime(auth.accessTokens, rbac.service, auditInfrastructure);
  const uploads = createUploadRuntime(
    database.nativeConnection,
    auth.accessTokens,
    parseUploadEnvironment(process.env, runtimeEnvironment.appEnvironment),
    audit.writer
  );
  const accounts = createAccountRuntime(
    database.nativeConnection,
    auth.accessTokens,
    audit.writer,
    rbac.service
  );
  const locations = createLocationRuntime(
    database.nativeConnection,
    auth.accessTokens,
    auditInfrastructure.writer,
    rbac.service
  );
  const taxonomy = createTaxonomyRuntime(database.nativeConnection, auth.accessTokens, auditInfrastructure.writer, rbac.service);
  const features = { accessTokens: auth.accessTokens, service: createFeatureService(database.nativeConnection, auditInfrastructure.writer, rbac.service) };
  const projects = createProjectRuntime(database.nativeConnection, auth.accessTokens, audit.writer, rbac.service);
  const properties = createPropertyRuntime(database.nativeConnection, auth.accessTokens, audit.writer, rbac.service);
  const propertyMedia = createPropertyMediaRuntime(database.nativeConnection, auth.accessTokens, parseUploadEnvironment(process.env, runtimeEnvironment.appEnvironment), audit.writer);
  const moderation = createModerationRuntime(database.nativeConnection, auth.accessTokens, audit.writer, rbac.service);
  const publicHomepage = createPublicRuntime(database.nativeConnection);
  const publicSearch = createPublicSearchRuntime(database.nativeConnection);
  const publicCompare = createPublicCompareRuntime(database.nativeConnection);
  const publicOrganizations = createPublicOrganizationRuntime(database.nativeConnection);
  const favorites = createFavoriteRuntime(database.nativeConnection, auth.accessTokens);
  const notifications = createNotificationRuntime(database.nativeConnection, auth.accessTokens);
  const settings = createSettingsRuntime(database.nativeConnection, auth.accessTokens, audit.writer, rbac.service);
  const requests = createRequestRuntime(database.nativeConnection, auth.accessTokens);
  const viewings = createViewingRuntime(database.nativeConnection, auth.accessTokens);
  const articles = createArticleRuntime(
    database.nativeConnection,
    auth.accessTokens,
    audit.writer,
    rbac.service
  );
  const server = createApiServer({
    database,
    auth,
    seeker,
    provider,
    uploads,
    rbac,
    accounts,
    audit,
    locations,
    taxonomy,
    features,
    projects,
    properties,
    propertyMedia,
    moderation,
    publicHomepage,
    publicSearch,
    publicCompare,
    publicOrganizations,
    favorites,
    notifications,
    settings,
    requests,
    viewings,
    articles
  });
  const shutdown = createGracefulShutdown({
    stopServer: () => stopApiServer(server),
    disconnectDatabase: () => database.disconnect(),
    onExitCode: (code) => { process.exitCode = code; }
  });

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  try {
    await startApiServer(server, runtimeEnvironment.api);
  } catch (error) {
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
    await database.disconnect();
    throw error;
  }
}

function safeStartupMessage(error: unknown): string {
  if (error instanceof DatabaseEnvironmentValidationError) return error.message;
  if (error instanceof AuthEnvironmentValidationError) return error.message;
  return error instanceof Error && error.name === 'EnvironmentValidationError'
    ? error.message
    : 'API server failed to start safely; database details were not emitted.';
}

if (isEntrypoint()) {
  runEntrypoint().catch((error) => {
    process.stderr.write(`${safeStartupMessage(error)}\n`);
    process.exitCode = 1;
  });
}
