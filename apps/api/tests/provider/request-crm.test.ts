import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestRepository, createRequestService, type RequestRecord } from '../../src/modules/requests/service.js';

const provider = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '2123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'provider', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const otherProvider = { ...provider, sub: '3123456789abcdef01234567' } as AccessTokenClaims;

test('provider CRM list/detail and transitions stay provider-scoped', async () => {
  const own = { id: '4123456789abcdef01234567', type: 'provider_customer' as const, source: 'provider' as const, providerId: provider.sub, creatorId: provider.sub, status: 'new' as const, payload: { firstName: 'Mona', lastName: 'Hassan', phone: '+201000000000' }, version: 0, createdAt: new Date('2026-08-14T10:00:00.000Z'), updatedAt: new Date('2026-08-14T10:00:00.000Z') } satisfies RequestRecord;
  const foreign = { ...own, id: '5123456789abcdef01234567', providerId: otherProvider.sub, creatorId: otherProvider.sub } satisfies RequestRecord;
  const service = createRequestService({ repository: createInMemoryRequestRepository([own, foreign]) });
  const listed = await service.list(provider, { page: 1, limit: 20 });
  assert.deepEqual(listed.items.map(item => item.id), [own.id]);
  await assert.rejects(() => service.get(provider, foreign.id), error => (error as { code?: string }).code === 'REQUEST_NOT_FOUND');
  const transitioned = await service.transition(provider, own.id, { transition: 'start_review', expectedVersion: 0 });
  assert.equal(transitioned.status, 'under_review');
});
