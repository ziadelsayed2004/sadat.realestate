import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionManagementService, SessionManagementError, type SessionManagementRepository } from '../../src/modules/auth/session-service.js';

const userId = '0123456789abcdef01234567';
const currentSessionId = '1123456789abcdef01234567';
const otherSessionId = '2123456789abcdef01234567';
const now = new Date('2026-09-10T08:00:00.000Z');

function repository(overrides: Partial<SessionManagementRepository> = {}): SessionManagementRepository {
  return {
    async listActive() {
      return [
        { id: currentSessionId, authenticationMethod: 'mfa', createdAt: new Date('2026-09-09T08:00:00.000Z'), lastUsedAt: now, expiresAt: new Date('2026-10-10T08:00:00.000Z') },
        { id: otherSessionId, authenticationMethod: 'otp', createdAt: new Date('2026-09-08T08:00:00.000Z'), expiresAt: new Date('2026-10-08T08:00:00.000Z') }
      ];
    },
    async revokeOwned() { return 'revoked'; },
    ...overrides
  };
}

const principal = { userId, sessionId: currentSessionId, roleType: 'seeker' as const };
const context = { requestId: 'request-1', traceId: '0123456789abcdef0123456789abcdef' };

test('lists only repository-projected owned sessions and marks the access-token session', async () => {
  let receivedUserId = '';
  const service = createSessionManagementService(repository({
    async listActive(value) { receivedUserId = value; return repository().listActive(value, now); }
  }), () => now);
  const result = await service.list(principal);
  assert.equal(receivedUserId, userId);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.current, true);
  assert.equal(result.items[1]?.current, false);
  assert.equal(result.items[1]?.lastUsedAt, null);
  assert.ok(!('tokenHash' in result.items[0]!));
});

test('revokes only a session scoped to the authenticated owner', async () => {
  let received: Parameters<SessionManagementRepository['revokeOwned']>[0] | undefined;
  const service = createSessionManagementService(repository({
    async revokeOwned(input) { received = input; return 'revoked'; }
  }), () => now);
  assert.deepEqual(await service.revoke(principal, otherSessionId, context), { sessionId: otherSessionId, revoked: true });
  assert.deepEqual(received, { userId, sessionId: otherSessionId, roleType: 'seeker', ...context, now });
});

test('requires standard logout for the current session and maps missing or foreign sessions safely', async () => {
  const service = createSessionManagementService(repository({ async revokeOwned() { return 'not_found'; } }), () => now);
  await assert.rejects(() => service.revoke(principal, currentSessionId, context), (error: unknown) => error instanceof SessionManagementError && error.code === 'CURRENT_SESSION_LOGOUT_REQUIRED');
  await assert.rejects(() => service.revoke(principal, otherSessionId, context), (error: unknown) => error instanceof SessionManagementError && error.code === 'SESSION_NOT_FOUND');
  await assert.rejects(() => service.revoke(principal, 'foreign-or-malformed', context));
});
