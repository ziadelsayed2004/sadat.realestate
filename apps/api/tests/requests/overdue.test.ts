import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestRepository, createRequestService, type RequestRecord } from '../../src/modules/requests/service.js';

const admin = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '3123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;

test('filters overdue requests before pagination and preserves the full matching total', async () => {
  const now = new Date('2026-09-05T10:00:00Z');
  const rows: RequestRecord[] = Array.from({ length: 8 }, (_, index) => ({
    id: (index + 1).toString(16).padStart(24, '0'), type: 'contact', source: 'seeker', status: index === 1 ? 'closed' : 'new', payload: { message: 'Local overdue fixture' },
    dueAt: new Date(now.getTime() + (index === 0 ? 3600000 : -3600000)),
    version: 0, createdAt: new Date(now.getTime() - index * 1000), updatedAt: now
  }));
  const service = createRequestService({ repository: createInMemoryRequestRepository(rows), now: () => now });
  for (let page = 1; page <= 3; page++) {
    const result = await service.overdue(admin, { page, limit: 2 });
    assert.equal(result.total, 6);
    assert.deepEqual(result.items.map(item => item.request.id), rows.slice(page * 2, page * 2 + 2).map(item => item.id));
    assert.ok(result.items.every(item => item.overdueBySeconds === 3600));
  }
  const beyond = await service.overdue(admin, { page: 4, limit: 2 });
  assert.equal(beyond.total, 6);
  assert.deepEqual(beyond.items, []);
  assert.equal((await service.overdue(admin, { status: 'closed' })).total, 0);
  assert.equal((await service.list(admin, { page: 1, limit: 2 })).total, 8);
  await assert.rejects(() => service.overdue({ ...admin, role: 'provider' }, {}), /REQUEST_FORBIDDEN/);
});
test('derives bounded overdue requests from server-owned due dates and excludes terminal states', async () => {
  const now = new Date('2026-08-14T10:00:00.000Z');
  const base = { type: 'contact' as const, source: 'seeker' as const, seekerId: '0123456789abcdef01234567', creatorId: '0123456789abcdef01234567', payload: { message: 'hello' }, version: 0, createdAt: now, updatedAt: now };
  const overdue = { ...base, id: '4123456789abcdef01234567', status: 'under_review' as const, dueAt: new Date('2026-08-13T10:00:00.000Z') } satisfies RequestRecord;
  const closed = { ...base, id: '5123456789abcdef01234567', status: 'closed' as const, dueAt: new Date('2026-08-13T10:00:00.000Z') } satisfies RequestRecord;
  const service = createRequestService({ repository: createInMemoryRequestRepository([overdue, closed]), now: () => now });
  const result = await service.overdue(admin, { page: 1, limit: 20 });
  assert.equal(result.total, 1); assert.equal(result.items[0].request.id, overdue.id); assert.equal(result.items[0].overdueBySeconds, 86_400);
});
