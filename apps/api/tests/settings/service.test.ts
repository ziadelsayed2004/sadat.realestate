import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { SettingsServiceError, createSettingsService, type SettingsRepository } from '../../src/modules/settings/service.js';
import type { AdminSettingsData } from '@sadat-realestate/contracts';

const adminClaims: AccessTokenClaims = {
  iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: 'abcdefabcdefabcdefabcdef',
  role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test'
};
const initial: AdminSettingsData = {
  namespace: 'properties', schemaVersion: 1, values: { max_images: 20, allow_drafts: true }, version: 0,
  updatedBy: adminClaims.sub, updatedAt: '2026-08-01T00:00:00.000Z'
};

function repository(): SettingsRepository {
  const records = new Map<string, AdminSettingsData>();
  return {
    async find(namespace) { return records.get(namespace); },
    async upsert(input) {
      const current = records.get(input.namespace);
      if (current && current.version !== input.expectedVersion) return { kind: 'version_conflict' as const };
      const next: AdminSettingsData = {
        namespace: input.namespace,
        schemaVersion: input.data.schemaVersion,
        values: input.data.values,
        version: current ? current.version + 1 : 0,
        updatedBy: input.actorId,
        updatedAt: input.now
      };
      records.set(input.namespace, next);
      return { kind: current ? 'updated' as const : 'created' as const, setting: next };
    }
  };
}

test('creates, reads, updates, and audits a strict versioned settings namespace', async () => {
  const events: unknown[] = [];
  const service = createSettingsService({
    authorization: { async authorize() { return true; } },
    repository: repository(),
    audit: { async record(input) { events.push(input); return 'audit-id'; } },
    now: () => new Date('2026-08-02T00:00:00.000Z')
  });
  const created = await service.update(adminClaims, 'properties', { schemaVersion: 1, values: { max_images: 20, allow_drafts: true }, expectedVersion: 0, reason: 'Create settings' }, { requestId: 'request-1', traceId: '0123456789abcdef0123456789abcdef' });
  assert.equal(created.version, 0);
  assert.deepEqual(created.values, { max_images: 20, allow_drafts: true });
  assert.equal((await service.get(adminClaims, 'properties')).namespace, 'properties');
  assert.equal(events.length, 1);
  const updated = await service.update(adminClaims, 'properties', { schemaVersion: 1, values: { max_images: 30 }, expectedVersion: 0, reason: 'Adjust settings' }, { requestId: 'request-2', traceId: 'fedcba9876543210fedcba9876543210' });
  assert.equal(updated.values.max_images, 30);
  assert.equal(updated.version, 1);
  assert.equal(events.length, 2);
});

test('rejects unauthorized, stale, schema-mismatched, unknown, and secret-bearing settings mutations', async () => {
  const service = createSettingsService({
    authorization: { async authorize(_id, permission) { return permission === 'admin:settings.view'; } },
    repository: { async find() { return initial; }, async upsert() { return { kind: 'version_conflict' as const }; } },
    audit: { async record() { return 'audit-id'; } }
  });
  await assert.rejects(() => service.update({ ...adminClaims, role: 'provider' } as AccessTokenClaims, 'properties', { schemaVersion: 1, values: {}, expectedVersion: 0, reason: 'No write' }, { requestId: 'request-1', traceId: '0123456789abcdef0123456789abcdef' }), (error: unknown) => error instanceof SettingsServiceError && error.code === 'SETTINGS_FORBIDDEN');
  await assert.rejects(() => service.update(adminClaims, 'properties', { schemaVersion: 1, values: {}, expectedVersion: 0, reason: 'No write' }, { requestId: 'request-1', traceId: '0123456789abcdef0123456789abcdef' }), (error: unknown) => error instanceof SettingsServiceError && error.code === 'SETTINGS_FORBIDDEN');
  const permissive = createSettingsService({ authorization: { async authorize() { return true; } }, repository: { async find() { return initial; }, async upsert() { return { kind: 'version_conflict' as const }; } }, audit: { async record() { return 'audit-id'; } } });
  await assert.rejects(() => permissive.update(adminClaims, 'properties', { schemaVersion: 2, values: {}, expectedVersion: 0, reason: 'Change schema' }, { requestId: 'request-1', traceId: '0123456789abcdef0123456789abcdef' }), (error: unknown) => error instanceof SettingsServiceError && error.code === 'SETTINGS_SCHEMA_VERSION_CONFLICT');
  await assert.rejects(() => permissive.update(adminClaims, 'properties', { schemaVersion: 1, values: { api_key: 'secret' }, expectedVersion: 0, reason: 'Unsafe value' }, { requestId: 'request-1', traceId: '0123456789abcdef0123456789abcdef' }), /credentials|secrets|invalid/i);
  await assert.rejects(() => permissive.update(adminClaims, 'properties', { schemaVersion: 1, values: {}, expectedVersion: 4, reason: 'Stale' }, { requestId: 'request-1', traceId: '0123456789abcdef0123456789abcdef' }), (error: unknown) => error instanceof SettingsServiceError && error.code === 'SETTINGS_VERSION_CONFLICT');
  await assert.rejects(() => permissive.get(adminClaims, 'unknown'), /Invalid option|invalid_value/i);
});

test('returns unavailable for a missing namespace without fabricating settings', async () => {
  const service = createSettingsService({ authorization: { async authorize() { return true; } }, repository: { async find() { return undefined; }, async upsert() { return { kind: 'version_conflict' as const }; } }, audit: { async record() { return 'audit-id'; } } });
  await assert.rejects(() => service.get(adminClaims, 'display'), (error: unknown) => error instanceof SettingsServiceError && error.code === 'SETTINGS_NOT_FOUND');
});
