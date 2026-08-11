import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { parseRuntimeEnvironment } from './modules/config/environment.js';
import { parseDatabaseEnvironment, DatabaseEnvironmentValidationError } from './modules/database/environment.js';
import { createDatabaseConnection } from './modules/database/connection.js';
import type { AppDependencies } from './app.js';

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
  const database = createDatabaseConnection(databaseEnvironment, runtimeEnvironment.appEnvironment);
  await database.connect();
  const server = createApiServer({ database });
  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await stopApiServer(server);
      await database.disconnect();
      process.exitCode = 0;
    } catch (error) {
      process.stderr.write('API server shutdown failed safely.\n');
      process.exitCode = 1;
    }
  };

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
