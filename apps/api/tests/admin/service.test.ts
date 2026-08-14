import assert from 'node:assert/strict';
import test from 'node:test';
import { FIRST_SUPER_ADMIN_CONFIRMATION } from '@sadat-real-estate/contracts';
import type { PasswordHasher } from '../../src/modules/auth/crypto.js';
import type { AdminRepository } from '../../src/modules/admin/repository.js';
import {
  AdminServiceError,
  createAdminBootstrapService
} from '../../src/modules/admin/service.js';

const validInput = {
  email: ' First.Admin@Example.COM ',
  password: 'long synthetic password',
  locale: 'en' as const,
  confirmation: FIRST_SUPER_ADMIN_CONFIRMATION
};

function passwordHasher(): PasswordHasher {
  return {
    async hash(value) { return `$argon2id$hashed:${value.length}`; },
    async verify() { return false; }
  };
}

function repository(
  kind: 'created' | 'already_bootstrapped' | 'administrator_exists' | 'concurrent_conflict' = 'created'
): AdminRepository {
  return {
    async createFirstSuperAdmin(input) {
      assert.equal(input.email, 'first.admin@example.com');
      assert.equal(input.passwordHash, '$argon2id$hashed:23');
      return kind === 'created'
        ? { kind, adminId: '0123456789abcdef01234567' }
        : { kind };
    }
  };
}

test('hashes the password and returns a safe first-Super-Admin projection', async () => {
  const service = createAdminBootstrapService({
    repository: repository(),
    passwordHasher: passwordHasher(),
    now: () => new Date('2026-08-13T18:00:00.000Z')
  });
  const result = await service.bootstrap(validInput);
  assert.deepEqual(result, {
    adminId: '0123456789abcdef01234567',
    email: 'first.admin@example.com',
    accessLevel: 'super_admin',
    status: 'verified',
    bootstrappedAt: '2026-08-13T18:00:00.000Z'
  });
  assert.doesNotMatch(JSON.stringify(result), /password|argon2/);
});

test('maps existing and concurrent state to stable errors without credential data', async () => {
  const expected = {
    already_bootstrapped: 'ADMIN_BOOTSTRAP_ALREADY_COMPLETED',
    administrator_exists: 'ADMINISTRATOR_ALREADY_EXISTS',
    concurrent_conflict: 'ADMIN_BOOTSTRAP_CONFLICT'
  } as const;
  for (const [kind, code] of Object.entries(expected) as Array<[keyof typeof expected, string]>) {
    const service = createAdminBootstrapService({
      repository: repository(kind),
      passwordHasher: passwordHasher()
    });
    await assert.rejects(
      service.bootstrap(validInput),
      (error: unknown) => error instanceof AdminServiceError
        && error.code === code
        && !error.message.includes(validInput.password)
    );
  }
});

test('validates confirmation and password before hashing or persistence', async () => {
  let hashed = false;
  let persisted = false;
  const service = createAdminBootstrapService({
    repository: {
      async createFirstSuperAdmin() {
        persisted = true;
        return { kind: 'administrator_exists' };
      }
    },
    passwordHasher: {
      async hash() { hashed = true; return '$argon2id$unused'; },
      async verify() { return false; }
    }
  });
  await assert.rejects(service.bootstrap({ ...validInput, password: 'short' }));
  assert.equal(hashed, false);
  assert.equal(persisted, false);
});
