import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestRepository, createRequestService, type RequestRecord } from '../../src/modules/requests/service.js';

const admin = { iss: 'sadat-real-estate-api', aud: 'sadat-realestate', sub: '3123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'admin', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const provider = { ...admin, role: 'provider' } as AccessTokenClaims;
const row = { id: '4123456789abcdef01234567', type: 'provider_customer' as const, source: 'provider' as const, providerId: provider.sub, creatorId: provider.sub, status: 'new' as const, payload: { firstName: 'Mona', lastName: 'Hassan', phone: '+201000000000' }, version: 0, createdAt: new Date('2026-08-14T10:00:00.000Z'), updatedAt: new Date('2026-08-14T10:00:00.000Z') } satisfies RequestRecord;

test('admin request operations support filtered visibility, assignment, and RBAC', async () => {
  const service = createRequestService({ repository: createInMemoryRequestRepository([row]) });
  assert.equal((await service.list(admin, { page: 1, limit: 20, status: 'new' })).total, 1);
  const assigned = await service.assign(admin, row.id, { assigneeId: '5123456789abcdef01234567', expectedVersion: 0, reason: 'Route to CRM owner' });
  assert.equal(assigned.assignedTo, '5123456789abcdef01234567');
  await assert.rejects(() => service.assign(provider, row.id, { assigneeId: '5123456789abcdef01234567', expectedVersion: 1, reason: 'no' }), error => (error as { code?: string }).code === 'REQUEST_FORBIDDEN');
  const reviewed = await service.transition(admin, row.id, { transition: 'start_review', expectedVersion: 1 });
  assert.equal(reviewed.status, 'under_review');
});
