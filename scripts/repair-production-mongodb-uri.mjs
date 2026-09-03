import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEnvironmentFile } from './environment-file.mjs';

const confirmation = 'REBUILD_MONGODB_URI_FROM_APP_CREDENTIALS';
const configuredFile = process.env.PRODUCTION_ENV_FILE?.trim();

if (process.env.PRODUCTION_MONGODB_URI_REPAIR_CONFIRM !== confirmation) {
  process.stderr.write('PRODUCTION_MONGODB_URI_REPAIR_CONFIRMATION_REQUIRED\n');
  process.exitCode = 1;
} else if (!configuredFile) {
  process.stderr.write('PRODUCTION_ENV_FILE_REQUIRED\n');
  process.exitCode = 1;
} else {
  try {
    const file = path.resolve(configuredFile);
    const contents = await readFile(file, 'utf8');
    const environment = parseEnvironmentFile(contents);
    const username = environment.MONGO_APP_USERNAME;
    const password = environment.MONGO_APP_PASSWORD;
    if (!username || !password) throw new Error('MONGO_APP_CREDENTIALS_REQUIRED');

    const uri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}`
      + '@127.0.0.1:27017/sadat?authSource=sadat&replicaSet=rs0&directConnection=true';
    const lines = contents.split(/\r?\n/u);
    let replaced = false;
    const updated = lines.map(line => {
      if (!line.trim().startsWith('MONGODB_URI=')) return line;
      replaced = true;
      return `MONGODB_URI="${uri}"`;
    });
    if (!replaced) updated.push(`MONGODB_URI="${uri}"`);
    await writeFile(file, updated.join('\n'), { encoding: 'utf8', mode: 0o640 });
    process.stdout.write('PRODUCTION_MONGODB_URI_REPAIRED secrets=redacted\n');
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message)
      ? error.message
      : 'ENVIRONMENT_FILE_UNREADABLE_OR_INVALID';
    process.stderr.write(`PRODUCTION_MONGODB_URI_REPAIR_FAILED ${code}\n`);
    process.exitCode = 1;
  }
}
