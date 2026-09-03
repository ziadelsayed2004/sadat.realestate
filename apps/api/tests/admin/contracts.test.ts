import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminBootstrapDataSchema,
  adminBootstrapInputSchema,
  FIRST_SUPER_ADMIN_CONFIRMATION
} from '@sadat-real-estate/contracts';

test('normalizes the bootstrap email and applies the Arabic locale default', () => {
  const input = adminBootstrapInputSchema.parse({
    email: ' First.Admin@Example.COM ',
    password: 'long synthetic password',
    confirmation: FIRST_SUPER_ADMIN_CONFIRMATION
  });
  assert.equal(input.email, 'first.admin@example.com');
  assert.equal(input.locale, 'ar');
  assert.equal('passwordHash' in input, false);
});

test('rejects weak, control-character, unconfirmed, and mass-assigned bootstrap input', () => {
  const base = {
    email: 'admin@example.com',
    password: 'long synthetic password',
    confirmation: FIRST_SUPER_ADMIN_CONFIRMATION
  };
  for (const input of [
    { ...base, password: 'short7' },
    { ...base, password: 'long-password\nvalue' },
    { ...base, confirmation: 'yes' },
    { ...base, role: 'admin' }
  ]) {
    assert.equal(adminBootstrapInputSchema.safeParse(input).success, false);
  }
});

test('exports a strict safe bootstrap result without credentials or session material', () => {
  const result = adminBootstrapDataSchema.parse({
    adminId: '0123456789abcdef01234567',
    email: 'admin@example.com',
    accessLevel: 'super_admin',
    status: 'verified',
    bootstrappedAt: '2026-08-13T18:00:00.000Z'
  });
  assert.equal(result.accessLevel, 'super_admin');
  assert.equal(adminBootstrapDataSchema.safeParse({ ...result, password: 'unsafe' }).success, false);
});
