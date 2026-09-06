import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAdminRepository,
  nonSyntheticAdministratorExists,
  type AdminBootstrapStore,
  type CreateFirstSuperAdminInput
} from '../../src/modules/admin/repository.js';
import type { ClientSession } from 'mongoose';

const input: CreateFirstSuperAdminInput = {
  email: 'admin@example.com',
  locale: 'ar',
  passwordHash: '$argon2id$synthetic',
  now: new Date('2026-08-13T18:00:00.000Z')
};

function store(overrides: Partial<AdminBootstrapStore> = {}): AdminBootstrapStore {
  return {
    async bootstrapExists() { return false; },
    async administratorExists() { return false; },
    async create() { return { adminId: '0123456789abcdef01234567' }; },
    ...overrides
  };
}

test('creates the first administrator inside the supplied transaction boundary', async () => {
  let transactions = 0;
  let createdInput: CreateFirstSuperAdminInput | undefined;
  const repository = createAdminRepository(async (operation) => {
    transactions += 1;
    return operation(store({
      async create(value) {
        createdInput = value;
        return { adminId: '0123456789abcdef01234567' };
      }
    }));
  });
  assert.deepEqual(await repository.createFirstSuperAdmin(input), {
    kind: 'created', adminId: '0123456789abcdef01234567'
  });
  assert.equal(transactions, 1);
  assert.equal(createdInput?.passwordHash, input.passwordHash);
});

test('refuses bootstrap when a guard or any administrator already exists', async () => {
  let writes = 0;
  const cases: Array<[Partial<AdminBootstrapStore>, string]> = [
    [{ async bootstrapExists() { return true; } }, 'already_bootstrapped'],
    [{ async administratorExists() { return true; } }, 'administrator_exists']
  ];
  for (const [overrides, expected] of cases) {
    const repository = createAdminRepository(async (operation) => operation(store({
      ...overrides,
      async create() {
        writes += 1;
        return { adminId: '0123456789abcdef01234567' };
      }
    })));
    assert.equal((await repository.createFirstSuperAdmin(input)).kind, expected);
  }
  assert.equal(writes, 0);
});

test('classifies the unique-key loser as a concurrent bootstrap conflict', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: 11000 });
  const repository = createAdminRepository(async () => { throw duplicate; });
  assert.deepEqual(await repository.createFirstSuperAdmin(input), { kind: 'concurrent_conflict' });
});

test('does not hide non-duplicate persistence failures', async () => {
  const repository = createAdminRepository(async () => { throw new Error('transaction unavailable'); });
  await assert.rejects(repository.createFirstSuperAdmin(input), /transaction unavailable/);
});

test('checks the native identity collection so synthetic demo administrators do not block bootstrap', async () => {
  let receivedFilter: unknown;
  let receivedOptions: unknown;
  const users = {
    async findOne(filter: unknown, options: unknown) {
      receivedFilter = filter;
      receivedOptions = options;
      return null;
    }
  };
  const session = { id: 'bootstrap-session' };

  assert.equal(await nonSyntheticAdministratorExists(
    users as Parameters<typeof nonSyntheticAdministratorExists>[0],
    session as unknown as ClientSession
  ), false);
  assert.deepEqual(receivedFilter, { roleType: 'admin', synthetic: { $ne: true } });
  assert.deepEqual(receivedOptions, { session, projection: { _id: 1 } });
});
