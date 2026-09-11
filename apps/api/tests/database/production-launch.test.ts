import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Types, type Connection } from 'mongoose';
import {
  parseProductionLaunchEnvironment,
  PRODUCTION_LAUNCH_CONFIRMATION,
  purgeFilter,
  purgeProductionDatabase,
  runProductionLaunchCommand,
  verifyProductionBackup
} from '../../src/modules/database/production-launch.js';

test('command guards fail before opening a database connection', async () => {
  let connections = 0;
  const factory = () => { connections += 1; throw new Error('UNEXPECTED_CONNECTION'); };
  const source = { ...environment(), MONGODB_URI: 'mongodb://127.0.0.1:27017/isolated_test' };
  await assert.rejects(runProductionLaunchCommand('apply', { ...source, PRODUCTION_LAUNCH_CONFIRM: 'wrong' }, factory), /CONFIRMATION_REQUIRED/);
  await assert.rejects(runProductionLaunchCommand('apply', source, factory, async () => { throw new Error('INVALID_BACKUP'); }), /INVALID_BACKUP/);
  await assert.rejects(runProductionLaunchCommand('apply', { ...source, KEEP_ADMIN_EMAIL: '' }, factory), /EMAIL_INVALID/);
  assert.equal(connections, 0);
});

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    APP_ENV: 'production', API_HOST: '127.0.0.1', API_PORT: '3000',
    KEEP_ADMIN_EMAIL: 'root@example.com',
    PRODUCTION_LAUNCH_CONFIRM: PRODUCTION_LAUNCH_CONFIRMATION,
    PRODUCTION_LAUNCH_BACKUP_DIR: '/var/backups/elsadatrealestate/verified',
    ...overrides
  };
}

function equalValue(left: unknown, right: unknown): boolean {
  if (left instanceof Types.ObjectId || right instanceof Types.ObjectId) return String(left) === String(right);
  return left === right;
}

function matches(document: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return (expected as Record<string, unknown>[]).some(item => matches(document, item));
    if (expected && typeof expected === 'object' && '$exists' in expected) return (key in document) === (expected as { $exists: boolean }).$exists;
    if (expected && typeof expected === 'object' && '$ne' in expected) {
      return !equalValue(document[key], (expected as { $ne: unknown }).$ne);
    }
    return equalValue(document[key], expected);
  });
}

function fakeConnection(seed: Record<string, Array<Record<string, unknown>>>) {
  const data = new Map(Object.entries(seed).map(([name, rows]) => [name, rows.map(row => ({ ...row }))]));
  const db = {
    listCollections() {
      return { async toArray() { return [...data.keys()].map(name => ({ name, type: 'collection' })); } };
    },
    collection(name: string) {
      const rows = data.get(name) ?? [];
      if (!data.has(name)) data.set(name, rows);
      return {
        find(filter: Record<string, unknown>) {
          const found = rows.filter(row => matches(row, filter));
          return { async toArray() { return found; }, limit() { return { async toArray() { return found; } }; } };
        },
        async countDocuments(filter: Record<string, unknown>) { return rows.filter(row => matches(row, filter)).length; },
        async deleteMany(filter: Record<string, unknown>) {
          const kept = rows.filter(row => !matches(row, filter));
          const deletedCount = rows.length - kept.length;
          data.set(name, kept);
          return { deletedCount };
        }
      };
    }
  };
  const connection = {
    db,
    async transaction<T>(operation: (session: object) => Promise<T>) { return operation({}); }
  } as unknown as Connection;
  return { connection, data };
}

test('launch parsing defaults to a non-destructive plan and guards apply', () => {
  assert.deepEqual(parseProductionLaunchEnvironment(environment(), 'plan'), {
    mode: 'plan', keepAdminEmail: 'root@example.com'
  });
  assert.throws(
    () => parseProductionLaunchEnvironment(environment({ PRODUCTION_LAUNCH_CONFIRM: 'wrong' }), 'apply'),
    /PRODUCTION_LAUNCH_CONFIRMATION_REQUIRED/
  );
  assert.throws(
    () => parseProductionLaunchEnvironment(environment({ KEEP_ADMIN_EMAIL: 'missing' }), 'apply'),
    /PRODUCTION_LAUNCH_KEEP_ADMIN_EMAIL_INVALID/
  );
  assert.throws(
    () => parseProductionLaunchEnvironment({ ...environment(), APP_ENV: 'uat' }, 'apply'),
    /PRODUCTION_LAUNCH_REQUIRES_PRODUCTION_ENVIRONMENT/
  );
});

test('purge policy preserves administrator identity, real reference records and migrations', () => {
  const adminId = new Types.ObjectId();
  assert.deepEqual(purgeFilter('users', adminId), { _id: { $ne: adminId } });
  assert.deepEqual(purgeFilter('admin_credentials', adminId), { userId: { $ne: adminId } });
  assert.equal(purgeFilter('database_migrations', adminId), null);
  assert.deepEqual(purgeFilter('properties', adminId), {});
  assert.throws(() => purgeFilter('unreviewed_records', adminId), /UNREVIEWED_COLLECTION/);
});

test('apply removes every business record and other account while preserving the verified bootstrap admin', async () => {
  const rootId = new Types.ObjectId();
  const seekerId = new Types.ObjectId();
  const otherAdminId = new Types.ObjectId();
  const { connection, data } = fakeConnection({
    users: [
      { _id: rootId, normalizedEmail: 'root@example.com', roleType: 'admin', status: 'verified' },
      { _id: seekerId, normalizedEmail: 'seeker@example.com', roleType: 'seeker', status: 'verified', synthetic: true },
      { _id: otherAdminId, normalizedEmail: 'other@example.com', roleType: 'admin', status: 'verified' }
    ],
    admin_profiles: [{ userId: rootId }, { userId: otherAdminId }],
    admin_credentials: [{ userId: rootId, passwordHash: 'secret-hash' }, { userId: otherAdminId }],
    admin_bootstrap: [{ userId: rootId, accessLevel: 'super_admin' }],
    admin_accounts: [{ userId: rootId, accessLevel: 'super_admin' }, { userId: otherAdminId }],
    database_migrations: [{ id: 'migration-1' }],
    sessions: [{ userId: rootId }, { userId: seekerId }],
    properties: [{ _id: new Types.ObjectId(), status: 'published' }],
    roles: [{ _id: new Types.ObjectId(), synthetic: true }, { _id: new Types.ObjectId(), name: 'Real role' }],
    admin_settings: [{ namespace: 'platform', values: { enabled: true } }, { namespace: 'demo', seedKey: 'old-demo' }]
  });

  const result = await purgeProductionDatabase(connection, {
    mode: 'apply', keepAdminEmail: 'root@example.com', backupDirectory: '/verified'
  });
  assert.equal(result.status, 'applied');
  assert.equal(result.usersBefore, 3);
  assert.equal(result.usersAfter, 1);
  assert.equal(result.syntheticAfter, 0);
  assert.deepEqual(data.get('users')?.map(row => String(row._id)), [rootId.toHexString()]);
  assert.equal(data.get('admin_credentials')?.length, 1);
  assert.equal(data.get('admin_profiles')?.length, 1);
  assert.equal(data.get('admin_bootstrap')?.length, 1);
  assert.equal(data.get('admin_accounts')?.length, 1);
  assert.equal(data.get('database_migrations')?.length, 1);
  assert.equal(data.get('sessions')?.length, 0);
  assert.equal(data.get('properties')?.length, 0);
  assert.equal(data.get('roles')?.length, 1);
  assert.equal(data.get('admin_settings')?.length, 1);
  assert.deepEqual(data.get('admin_settings')?.[0]?.values, { enabled: true });
  assert.deepEqual(result.collections.find(row => row.collection === 'users'), { collection: 'users', before: 3, candidates: 2, deleted: 2, after: 1 });
  assert.equal(result.collections.find(row => row.collection === 'database_migrations')?.after, 1);
  const again = await purgeProductionDatabase(connection, { mode: 'apply', keepAdminEmail: 'root@example.com', backupDirectory: '/verified' });
  assert.equal(again.usersAfter, 1);
  assert.equal(again.collections.reduce((sum, row) => sum + row.deleted, 0), 0);
});

test('plan and failed eligibility checks never delete data', async () => {
  const rootId = new Types.ObjectId();
  const seed = {
    users: [{ _id: rootId, normalizedEmail: 'root@example.com', roleType: 'admin', status: 'verified' }],
    admin_profiles: [{ userId: rootId }],
    admin_credentials: [{ userId: rootId }],
    admin_bootstrap: [{ userId: rootId, accessLevel: 'super_admin' }],
    properties: [{ _id: new Types.ObjectId() }]
  };
  const planned = fakeConnection(seed);
  const plan = await purgeProductionDatabase(planned.connection, { mode: 'plan', keepAdminEmail: 'root@example.com' });
  assert.equal(plan.status, 'planned');
  assert.equal(planned.data.get('properties')?.length, 1);

  const invalid = fakeConnection({ ...seed, admin_bootstrap: [] });
  await assert.rejects(
    purgeProductionDatabase(invalid.connection, { mode: 'apply', keepAdminEmail: 'root@example.com', backupDirectory: '/verified' }),
    /PRODUCTION_LAUNCH_ADMIN_GUARANTEES_MISSING/
  );
  assert.equal(invalid.data.get('properties')?.length, 1);

  const wrongEmail = fakeConnection(seed);
  await assert.rejects(
    purgeProductionDatabase(wrongEmail.connection, { mode: 'apply', keepAdminEmail: 'other@example.com', backupDirectory: '/verified' }),
    /PRODUCTION_LAUNCH_ADMIN_NOT_UNIQUE/
  );
  assert.equal(wrongEmail.data.get('properties')?.length, 1);

  for (const overrides of [{ roleType: 'provider' }, { status: 'suspended' }, { synthetic: true }]) {
    const ineligible = fakeConnection({ ...seed, users: [{ ...seed.users[0], ...overrides }] });
    await assert.rejects(purgeProductionDatabase(ineligible.connection, { mode: 'apply', keepAdminEmail: 'root@example.com' }), /ADMIN_NOT_ELIGIBLE/);
    assert.equal(ineligible.data.get('properties')?.length, 1);
  }
  const duplicate = fakeConnection({ ...seed, users: [seed.users[0]!, { ...seed.users[0], _id: new Types.ObjectId() }] });
  await assert.rejects(purgeProductionDatabase(duplicate.connection, { mode: 'apply', keepAdminEmail: 'root@example.com' }), /ADMIN_NOT_UNIQUE/);
  assert.equal(duplicate.data.get('properties')?.length, 1);
});

test('backup verification requires non-empty artifacts with matching checksums inside the backup root', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'sadat-launch-'));
  try {
    const backup = path.join(temporary, '20260911T120000Z');
    await mkdir(backup);
    const artifacts = {
      'mongodb.archive.gz': Buffer.from('mongo-backup'),
      'private-files.tar.gz': Buffer.from('private-backup')
    };
    for (const [name, value] of Object.entries(artifacts)) await writeFile(path.join(backup, name), value);
    const checksums = Object.entries(artifacts).map(([name, value]) => `${createHash('sha256').update(value).digest('hex')}  ${name}`).join('\n');
    await writeFile(path.join(backup, 'SHA256SUMS'), `${checksums}\n`);
    assert.equal(await verifyProductionBackup(backup, temporary), await realpathForTest(backup));
    await writeFile(path.join(backup, 'mongodb.archive.gz'), 'tampered');
    await assert.rejects(verifyProductionBackup(backup, temporary), /PRODUCTION_LAUNCH_BACKUP_CHECKSUM_INVALID/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

async function realpathForTest(value: string): Promise<string> {
  const { realpath } = await import('node:fs/promises');
  return realpath(value);
}
