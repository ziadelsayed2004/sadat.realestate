import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createInMemoryRequestRepository, createRequestService, type RequestRecord } from '../../src/modules/requests/service.js';

const seeker = { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims;
const otherSeeker = { ...seeker, sub: '1123456789abcdef01234567' } as AccessTokenClaims;
const base = { source: 'seeker' as const, type: 'contact' as const, payload: { message: 'Please call me' }, version: 0, createdAt: new Date('2026-08-13T10:00:00.000Z'), updatedAt: new Date('2026-08-13T10:00:00.000Z') };

test('seeker request projections include lifecycle state but exclude assignments and internal SLA data', async () => {
  const own = { ...base, id: '4123456789abcdef01234567', seekerId: seeker.sub, creatorId: seeker.sub, status: 'under_review' as const, assignedTo: '2123456789abcdef01234567', dueAt: new Date('2026-08-15T10:00:00.000Z') } satisfies RequestRecord;
  const contacted = { ...base, id: '5123456789abcdef01234567', seekerId: seeker.sub, creatorId: seeker.sub, status: 'contacted' as const } satisfies RequestRecord;
  const other = { ...base, id: '6123456789abcdef01234567', seekerId: otherSeeker.sub, creatorId: otherSeeker.sub, status: 'under_review' as const } satisfies RequestRecord;
  const service = createRequestService({ repository: createInMemoryRequestRepository([own, contacted, other]) });
  const result = await service.list(seeker, { page: 1, limit: 20 });
  assert.equal(result.total, 2);
  assert.deepEqual(result.items.map(item => item.status), ['contacted', 'under_review']);
  assert.equal('assignedTo' in result.items[0], false);
  assert.equal('dueAt' in result.items[0], false);
  assert.equal('creatorId' in result.items[0], false);
  await assert.rejects(() => service.get(otherSeeker, own.id), error => (error as { code?: string }).code === 'REQUEST_NOT_FOUND');
});
