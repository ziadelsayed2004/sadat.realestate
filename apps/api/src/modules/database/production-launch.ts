import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Types, type ClientSession, type Connection } from 'mongoose';
import { parseRuntimeEnvironment } from '../config/environment.js';
import { createDatabaseConnection, type DatabaseConnection } from './connection.js';
import { parseDatabaseEnvironment } from './environment.js';

export const PRODUCTION_LAUNCH_CONFIRMATION = 'PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN';
export const PRODUCTION_BACKUP_ROOT = '/var/backups/elsadatrealestate';

const preservedCollections = new Map<string, string | null>([
  ['users', '_id'],
  ['admin_profiles', 'userId'],
  ['admin_credentials', 'userId'],
  ['admin_bootstrap', 'userId'],
  ['admin_accounts', 'userId'],
  ['database_migrations', null]
]);

export type ProductionLaunchMode = 'plan' | 'apply';

export interface ProductionLaunchEnvironment {
  mode: ProductionLaunchMode;
  keepAdminEmail: string;
  backupDirectory?: string;
}

export interface ProductionLaunchCollectionCount {
  collection: string;
  before: number;
  deleted: number;
  after: number;
}

export interface ProductionLaunchResult {
  status: 'planned' | 'applied';
  keptAdminId: string;
  usersBefore: number;
  usersAfter: number;
  syntheticAfter: number;
  collections: ProductionLaunchCollectionCount[];
}

export class ProductionLaunchError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ProductionLaunchError';
  }
}

type NativeDatabase = NonNullable<Connection['db']>;

function normalizedEmail(value: string | undefined): string {
  const email = value?.trim().normalize('NFKC').toLocaleLowerCase('en-US');
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_KEEP_ADMIN_EMAIL_INVALID');
  }
  return email;
}

export function parseProductionLaunchEnvironment(
  source: Record<string, string | undefined>,
  mode: ProductionLaunchMode
): ProductionLaunchEnvironment {
  if (parseRuntimeEnvironment(source).appEnvironment !== 'production') {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_REQUIRES_PRODUCTION_ENVIRONMENT');
  }
  const keepAdminEmail = normalizedEmail(source.KEEP_ADMIN_EMAIL);
  if (mode === 'plan') return { mode, keepAdminEmail };
  if (source.PRODUCTION_LAUNCH_CONFIRM !== PRODUCTION_LAUNCH_CONFIRMATION) {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_CONFIRMATION_REQUIRED');
  }
  const backupDirectory = source.PRODUCTION_LAUNCH_BACKUP_DIR?.trim();
  if (!backupDirectory) throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_REQUIRED');
  return { mode, keepAdminEmail, backupDirectory };
}

function safeCollectionName(name: string): boolean {
  return name.length > 0 && !name.startsWith('system.');
}

export function purgeFilter(collection: string, adminId: Types.ObjectId): Record<string, unknown> | null {
  const reference = preservedCollections.get(collection);
  if (reference === null) return null;
  if (reference) return { [reference]: { $ne: adminId } };
  return {};
}

async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function verifyProductionBackup(
  directory: string,
  backupRoot = PRODUCTION_BACKUP_ROOT
): Promise<string> {
  const absoluteRoot = await realpath(backupRoot).catch(() => {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_ROOT_MISSING');
  });
  const absoluteDirectory = await realpath(directory).catch(() => {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_MISSING');
  });
  if (absoluteDirectory === absoluteRoot || !absoluteDirectory.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_OUTSIDE_ROOT');
  }
  if (!(await lstat(absoluteDirectory)).isDirectory()) {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_INVALID');
  }
  const required = ['mongodb.archive.gz', 'private-files.tar.gz'] as const;
  const checksums = await readFile(path.join(absoluteDirectory, 'SHA256SUMS'), 'utf8').catch(() => {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_CHECKSUMS_MISSING');
  });
  for (const filename of required) {
    const artifact = path.join(absoluteDirectory, filename);
    const metadata = await stat(artifact).catch(() => {
      throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_ARTIFACT_MISSING');
    });
    if (!metadata.isFile() || metadata.size === 0) {
      throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_ARTIFACT_INVALID');
    }
    const expected = checksums.split(/\r?\n/u).map(line => line.trim().split(/\s+/u))
      .find(parts => parts.at(-1)?.replace(/^\*/u, '') === filename)?.[0];
    if (!expected || !/^[0-9a-f]{64}$/u.test(expected) || await sha256(artifact) !== expected) {
      throw new ProductionLaunchError('PRODUCTION_LAUNCH_BACKUP_CHECKSUM_INVALID');
    }
  }
  return absoluteDirectory;
}

async function findKeptAdmin(db: NativeDatabase, email: string, session?: ClientSession): Promise<Types.ObjectId> {
  const sessionOptions = session ? { session } : {};
  const users = await db.collection('users').find(
    { normalizedEmail: email },
    { ...sessionOptions, projection: { _id: 1, roleType: 1, status: 1, synthetic: 1 } }
  ).limit(2).toArray();
  if (users.length !== 1) throw new ProductionLaunchError('PRODUCTION_LAUNCH_ADMIN_NOT_UNIQUE');
  const admin = users[0]!;
  if (admin.roleType !== 'admin' || admin.status !== 'verified' || admin.synthetic === true) {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_ADMIN_NOT_ELIGIBLE');
  }
  const adminId = new Types.ObjectId(String(admin._id));
  const [profiles, credentials, bootstraps] = await Promise.all([
    db.collection('admin_profiles').countDocuments({ userId: adminId }, { ...sessionOptions, limit: 2 }),
    db.collection('admin_credentials').countDocuments({ userId: adminId }, { ...sessionOptions, limit: 2 }),
    db.collection('admin_bootstrap').countDocuments(
      { userId: adminId, accessLevel: 'super_admin' },
      { ...sessionOptions, limit: 2 }
    )
  ]);
  if (profiles !== 1 || credentials !== 1 || bootstraps !== 1) {
    throw new ProductionLaunchError('PRODUCTION_LAUNCH_ADMIN_GUARANTEES_MISSING');
  }
  return adminId;
}

async function collectionNames(db: NativeDatabase): Promise<string[]> {
  const rows = await db.listCollections({}, { nameOnly: false }).toArray();
  return rows.filter(row => row.type === 'collection').map(row => row.name)
    .filter(safeCollectionName).sort((a, b) => a.localeCompare(b, 'en'));
}

async function inventory(
  db: NativeDatabase,
  names: readonly string[],
  adminId: Types.ObjectId,
  session?: ClientSession
): Promise<Array<{ collection: string; before: number }>> {
  const sessionOptions = session ? { session } : {};
  return Promise.all(names.map(async collection => {
    const filter = purgeFilter(collection, adminId);
    return {
      collection,
      before: filter === null ? 0 : await db.collection(collection).countDocuments(filter, sessionOptions)
    };
  }));
}

async function assertResidue(db: NativeDatabase, names: readonly string[], adminId: Types.ObjectId, session: ClientSession) {
  const users = await db.collection('users').countDocuments({}, { session });
  const kept = await db.collection('users').countDocuments({ _id: adminId }, { session });
  if (users !== 1 || kept !== 1) throw new ProductionLaunchError('PRODUCTION_LAUNCH_USER_RESIDUE');
  for (const name of names) {
    const filter = purgeFilter(name, adminId);
    if (filter !== null && await db.collection(name).countDocuments(filter, { session, limit: 1 }) !== 0) {
      throw new ProductionLaunchError('PRODUCTION_LAUNCH_COLLECTION_RESIDUE');
    }
  }
  const synthetic = await Promise.all(names.map(name => db.collection(name).countDocuments(
    { synthetic: true },
    { session, limit: 1 }
  )));
  if (synthetic.some(count => count > 0)) throw new ProductionLaunchError('PRODUCTION_LAUNCH_SYNTHETIC_RESIDUE');
}

export async function purgeProductionDatabase(
  connection: Connection,
  environment: ProductionLaunchEnvironment
): Promise<ProductionLaunchResult> {
  const db = connection.db;
  if (!db) throw new ProductionLaunchError('PRODUCTION_LAUNCH_DATABASE_NOT_READY');
  const adminId = await findKeptAdmin(db, environment.keepAdminEmail);
  const names = await collectionNames(db);
  const usersBefore = await db.collection('users').countDocuments({});
  const before = await inventory(db, names, adminId);
  const syntheticBefore = (await Promise.all(names.map(name => db.collection(name).countDocuments(
    { synthetic: true },
    { limit: 1 }
  )))).reduce((a, b) => a + b, 0);
  if (environment.mode === 'plan') {
    return {
      status: 'planned', keptAdminId: adminId.toHexString(), usersBefore,
      usersAfter: usersBefore, syntheticAfter: syntheticBefore,
      collections: before.map(row => ({ ...row, deleted: 0, after: row.before }))
    };
  }

  let report: ProductionLaunchCollectionCount[] | undefined;
  await connection.transaction(async session => {
    const transactionAdminId = await findKeptAdmin(db, environment.keepAdminEmail, session);
    if (!transactionAdminId.equals(adminId)) {
      throw new ProductionLaunchError('PRODUCTION_LAUNCH_ADMIN_CHANGED');
    }
    const rows: ProductionLaunchCollectionCount[] = [];
    for (const row of before) {
      const filter = purgeFilter(row.collection, adminId);
      if (filter === null) {
        rows.push({ ...row, deleted: 0, after: 0 });
        continue;
      }
      const result = await db.collection(row.collection).deleteMany(filter, { session });
      rows.push({ ...row, deleted: result.deletedCount, after: row.before - result.deletedCount });
    }
    await assertResidue(db, names, adminId, session);
    report = rows;
  });
  if (!report) throw new ProductionLaunchError('PRODUCTION_LAUNCH_TRANSACTION_INCOMPLETE');
  const usersAfter = await db.collection('users').countDocuments({});
  const syntheticAfter = (await Promise.all(names.map(name => db.collection(name).countDocuments({ synthetic: true })))).reduce((a, b) => a + b, 0);
  return { status: 'applied', keptAdminId: adminId.toHexString(), usersBefore, usersAfter, syntheticAfter, collections: report };
}

function parseEnvironmentFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new ProductionLaunchError('PRODUCTION_LAUNCH_ENVIRONMENT_FILE_INVALID');
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

async function resolvedSource(source: Record<string, string | undefined>) {
  if (source.MONGODB_URI) return source;
  const file = source.PRODUCTION_ENV_FILE?.trim() || '/etc/elsadatrealestate/production.env';
  return { ...source, ...parseEnvironmentFile(await readFile(file, 'utf8')) };
}

export async function runProductionLaunchCommand(
  mode: ProductionLaunchMode,
  source: Record<string, string | undefined> = process.env,
  connectionFactory: typeof createDatabaseConnection = createDatabaseConnection,
  backupVerifier: typeof verifyProductionBackup = verifyProductionBackup
): Promise<ProductionLaunchResult> {
  const environmentSource = await resolvedSource(source);
  const environment = parseProductionLaunchEnvironment(environmentSource, mode);
  if (mode === 'apply') await backupVerifier(environment.backupDirectory!);
  const runtime = parseRuntimeEnvironment(environmentSource);
  const database: DatabaseConnection = connectionFactory(parseDatabaseEnvironment(environmentSource), runtime.appEnvironment);
  try {
    await database.connect();
    return await purgeProductionDatabase(database.nativeConnection, environment);
  } finally {
    await database.disconnect();
  }
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

if (isEntrypoint()) {
  const mode = process.argv[2] === 'apply' ? 'apply' : process.argv[2] === 'plan' ? 'plan' : undefined;
  if (!mode) {
    process.stderr.write('Usage: production-launch.js <plan|apply>\n');
    process.exitCode = 2;
  } else {
    runProductionLaunchCommand(mode).then(result => {
      const deleted = result.collections.reduce((sum, row) => sum + row.deleted, 0);
      const candidates = result.collections.reduce((sum, row) => sum + row.before, 0);
      process.stdout.write(`PRODUCTION_LAUNCH_${result.status.toUpperCase()} users_before=${result.usersBefore} users_after=${result.usersAfter} candidates=${candidates} deleted=${deleted} synthetic_after=${result.syntheticAfter} collections=${result.collections.length}\n`);
    }).catch(error => {
      const code = error instanceof ProductionLaunchError ? error.code : 'PRODUCTION_LAUNCH_FAILED';
      process.stderr.write(`${code}; no credentials or connection details were emitted.\n`);
      process.exitCode = 1;
    });
  }
}
