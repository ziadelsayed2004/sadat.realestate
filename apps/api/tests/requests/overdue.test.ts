import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestRepository, createRequestService, type RequestRecord } from '../../src/modules/requests/service.js';

const admin = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '3123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
test('derives bounded overdue requests from server-owned due dates and excludes terminal states', async () => {
  const now = new Date('2026-08-14T10:00:00.000Z');
  const base = { type: 'contact' as const, source: 'seeker' as const, seekerId: '0123456789abcdef01234567', creatorId: '0123456789abcdef01234567', payload: { message: 'hello' }, version: 0, createdAt: now, updatedAt: now };
  const overdue = { ...base, id: '4123456789abcdef01234567', status: 'under_review' as const, dueAt: new Date('2026-08-13T10:00:00.000Z') } satisfies RequestRecord;
  const closed = { ...base, id: '5123456789abcdef01234567', status: 'closed' as const, dueAt: new Date('2026-08-13T10:00:00.000Z') } satisfies RequestRecord;
  const service = createRequestService({ repository: createInMemoryRequestRepository([overdue, closed]), now: () => now });
  const result = await service.overdue(admin, { page: 1, limit: 20 });
  assert.equal(result.total, 1); assert.equal(result.items[0].request.id, overdue.id); assert.equal(result.items[0].overdueBySeconds, 86_400);
});
