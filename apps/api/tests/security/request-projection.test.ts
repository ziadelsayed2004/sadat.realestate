import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestRepository, createRequestService, type RequestRecord } from '../../src/modules/requests/service.js';

const seeker = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
test('seeker projections exclude assignment, SLA, and internal notes', async () => {
  const row = { id: '4123456789abcdef01234567', type: 'contact' as const, source: 'seeker' as const, seekerId: seeker.sub, status: 'under_review' as const, payload: { message: 'hello' }, assignedTo: '2123456789abcdef01234567', dueAt: new Date('2026-08-15T10:00:00.000Z'), internalNotes: [{ id: '5123456789abcdef01234567', body: 'private', authorId: '3123456789abcdef01234567', createdAt: new Date() }], version: 0, createdAt: new Date(), updatedAt: new Date() } satisfies RequestRecord;
  const service = createRequestService({ repository: createInMemoryRequestRepository([row]) });
  const result = await service.get(seeker, row.id);
  assert.equal('assignedTo' in result, false); assert.equal('dueAt' in result, false); assert.equal('internalNotes' in result, false);
});
