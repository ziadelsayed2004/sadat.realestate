import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createSeekerOverviewService, SeekerOverviewServiceError } from '../../src/modules/seeker/overview.js';

const claims = { role: 'seeker', status: 'verified', sub: '0123456789abcdef01234567' } as AccessTokenClaims;
test('returns strict real-data summary and safe empty state', async () => {
  const service = createSeekerOverviewService({ repository: { async summary() { return { requests: 0, viewings: 0, savedProperties: 0, notifications: 0, unreadNotifications: 0 }; } } });
  assert.deepEqual(await service.get(claims), { requests: 0, viewings: 0, savedProperties: 0, notifications: 0, unreadNotifications: 0 });
  await assert.rejects(() => service.get({ ...claims, role: 'provider' } as AccessTokenClaims), SeekerOverviewServiceError);
  await assert.rejects(() => service.get({ ...claims, status: 'suspended' } as AccessTokenClaims), SeekerOverviewServiceError);
});
