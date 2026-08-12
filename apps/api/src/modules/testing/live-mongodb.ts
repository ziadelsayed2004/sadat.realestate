import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseConnection } from '../database/connection.js';
import { parseDatabaseEnvironment, type DatabaseEnvironment } from '../database/environment.js';

export class LiveTestPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LiveTestPrerequisiteError';
  }
}

export function resolveLiveMongoEnvironment(
  source: Record<string, string | undefined>
): DatabaseEnvironment {
  if (source.APP_ENV !== 'test') {
    throw new LiveTestPrerequisiteError('APP_ENV=test is required for isolated live integration checks.');
  }
  const uri = source.TEST_MONGODB_URI?.trim();
  if (!uri) {
    throw new LiveTestPrerequisiteError('isolated TEST_MONGODB_URI is not configured.');
  }
  return parseDatabaseEnvironment({ MONGODB_URI: uri });
}

export async function runLiveMongoReadinessCheck(
  source: Record<string, string | undefined> = process.env
): Promise<{ topology: 'replica_set' | 'standalone'; ready: true }> {
  const environment = resolveLiveMongoEnvironment(source);
  const database = createDatabaseConnection(environment, 'test');
  try {
    await database.connect();
    if (!(await database.isReady()) || !database.nativeConnection.db) {
      throw new Error('MongoDB did not become ready for the isolated integration check.');
    }
    const hello = await database.nativeConnection.db.admin().command({ hello: 1 }) as { setName?: unknown };
    return { topology: typeof hello.setName === 'string' ? 'replica_set' : 'standalone', ready: true };
  } finally {
    await database.disconnect();
  }
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

if (isEntrypoint()) {
  runLiveMongoReadinessCheck().then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }).catch((error: unknown) => {
    if (error instanceof LiveTestPrerequisiteError) {
      process.stderr.write(`Blocked — prerequisites unavailable: ${error.message}\n`);
      process.exitCode = 2;
      return;
    }
    process.stderr.write('Live MongoDB integration check failed safely; connection details were not emitted.\n');
    process.exitCode = 1;
  });
}

