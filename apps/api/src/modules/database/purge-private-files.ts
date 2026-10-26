import { lstat, readdir, realpath, rmdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProductionLaunchEnvironment, purgeProductionDatabase, resolvedProductionLaunchSource, verifyProductionBackup } from './production-launch.js';
import { parseDatabaseEnvironment } from './environment.js';
import { createDatabaseConnection } from './connection.js';

/** Remove orphan bytes only; retained configuration photos keep their files. */
export async function purgeUnreferencedPrivateFiles(root: string, retainedKeys: readonly string[]) {
  const base = await realpath(root);
  if (base === path.parse(base).root || (await lstat(root)).isSymbolicLink()) throw new Error('PRIVATE_ROOT_INVALID');
  const retained = new Set(retainedKeys.map(key => {
    const target = path.resolve(base, key);
    if (!key || path.isAbsolute(key) || !target.startsWith(base + path.sep)) throw new Error('PRIVATE_KEY_OUTSIDE_ROOT');
    return target;
  }));
  const files: string[] = [], directories: string[] = [];
  async function inspect(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('PRIVATE_SYMLINK_REQUIRES_REVIEW');
      if (entry.isDirectory()) { directories.push(target); await inspect(target); }
      else if (entry.isFile() && !retained.has(target)) files.push(target);
    }
  }
  await inspect(base);
  for (const file of files) await unlink(file);
  for (const directory of directories.reverse()) if ((await readdir(directory)).length === 0) await rmdir(directory);
  return { deleted: files.length, retained: retained.size };
}

async function main() {
  const source = await resolvedProductionLaunchSource(process.env);
  const environment = parseProductionLaunchEnvironment(source, 'apply');
  await verifyProductionBackup(environment.backupDirectory!);
  const root = await realpath(source.PRIVATE_STORAGE_LOCAL_ROOT || '/var/lib/elsadatrealestate/private');
  if (root !== '/var/lib/elsadatrealestate/private') throw new Error('PRODUCTION_PRIVATE_ROOT_INVALID');
  const database = createDatabaseConnection(parseDatabaseEnvironment(source), 'production');
  try {
    await database.connect();
    const db = database.nativeConnection.db!;
    const plan = await purgeProductionDatabase(database.nativeConnection, { mode: 'plan', keepAdminEmail: environment.keepAdminEmail });
    if (plan.usersBefore !== 1 || plan.collections.some(row => row.candidates !== 0)) throw new Error('PRODUCTION_DATABASE_NOT_RESET');
    const keys: string[] = [];
    for (const collection of await db.listCollections().toArray()) {
      const rows = await db.collection(collection.name).find({ storageKey: { $type: 'string' } }, { projection: { storageKey: 1 } }).toArray();
      keys.push(...rows.map(row => String(row.storageKey)));
    }
    const result = await purgeUnreferencedPrivateFiles(root, keys);
    process.stdout.write(`PRODUCTION_PRIVATE_FILES_PURGED deleted=${result.deleted} retained=${result.retained}\n`);
  } finally { await database.disconnect(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main().catch(() => { process.stderr.write('PRODUCTION_PRIVATE_FILES_PURGE_FAILED\n'); process.exitCode = 1; });
