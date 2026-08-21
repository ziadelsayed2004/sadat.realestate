import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestIssueRepository, createRequestIssueService } from '../../src/modules/moderation/request-issues.js';

const seeker = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const admin = { ...seeker, role: 'admin' } as AccessTokenClaims;
test('request issues link to requests and resolve with optimistic version and reason', async () => {
  const service = createRequestIssueService({ repository: createInMemoryRequestIssueRepository(), now: () => new Date('2026-08-14T10:00:00.000Z') });
  const issue = await service.create(seeker, { requestId: '4123456789abcdef01234567', category: 'service', details: 'No response' });
  assert.equal(issue.status, 'open');
  assert.equal((await service.list(admin)).total, 1);
  const resolved = await service.resolve(admin, issue.id, { action: 'resolve', reason: 'Assigned to support', expectedVersion: 0 });
  assert.equal(resolved.status, 'resolved');
  await assert.rejects(() => service.resolve(seeker, issue.id, { action: 'dismiss', reason: 'x', expectedVersion: 1 }), /FORBIDDEN/);
  await assert.rejects(() => service.resolve(admin, issue.id, { action: 'dismiss', reason: 'Stale resolution', expectedVersion: 0 }), /VERSION_CONFLICT/);
  await assert.rejects(() => service.resolve(admin, issue.id, { action: 'dismiss', reason: 'Second resolution', expectedVersion: 1 }), /INVALID_STATE/);
});

test('request issue administrator permissions are evaluated separately from the role', async () => {
  const service = createRequestIssueService({
    repository: createInMemoryRequestIssueRepository(),
    authorization: { async authorize(_adminId, permission) { return permission === 'admin:request-issues.view'; } }
  });
  assert.equal((await service.list(admin)).total, 0);
  const issue = await service.create(seeker, { requestId: '4123456789abcdef01234567', category: 'other', details: 'Permission boundary' });
  await assert.rejects(() => service.resolve(admin, issue.id, { action: 'resolve', reason: 'Should be denied', expectedVersion: 0 }), /FORBIDDEN/);
});
