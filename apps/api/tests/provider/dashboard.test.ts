import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js';
import { createProviderDashboardService } from '../../src/modules/provider/dashboard.js';

const claims: AccessTokenClaims = {
  iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: '0123456789abcdef01234567',
  sid: 'abcdefabcdefabcdefabcdef', role: 'provider', status: 'verified', iat: 1, exp: 9_999_999_999, jti: 'dashboard'
};
const application = { applicationId: 'abcdefabcdefabcdefabcdef', providerType: 'individual_broker' as const, status: 'approved' as const, version: 2, availableActions: ['open_dashboard' as const] };
const property = { id: '2123456789abcdef01234567', kind: 'property' as const, name: { ar: 'عقار' }, slug: 'property', transactionType: 'sale' as const, source: { providerId: claims.sub, sourceType: 'individual_broker' as const }, status: 'published' as const, active: true, version: 3, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', availableActions: [] };

test('provider dashboard aggregates owner-scoped KPIs and recent properties', async () => {
  const totals: Record<string, number> = { all: 7, published: 3, pending_review: 1, needs_changes: 1, draft: 2 };
  const service = createProviderDashboardService({
    application: { async getStatus() { return application; } },
    properties: { async list(_claims, input) { const status = (input as { status?: string }).status ?? 'all'; return { data: { items: status === 'all' ? [property] : [] }, page: 1, limit: 5, total: totals[status] ?? 0 }; } },
    requests: { async list() { return { items: [], page: 1, limit: 1, total: 4 }; } },
    viewings: { async list() { return { items: [], page: 1, limit: 1, total: 2 }; } }
  });
  const result = await service.read(claims);
  assert.deepEqual(result.properties, { total: 7, published: 3, pendingReview: 1, needsChanges: 1, drafts: 2, recent: [property] });
  assert.deepEqual(result.activity, { customerRequests: 4, bookedViewings: 2 });
});

test('provider dashboard exposes zero business metrics before approval without querying owned data', async () => {
  let queried = false;
  const service = createProviderDashboardService({
    application: { async getStatus() { return { ...application, status: 'pending_review' as const, availableActions: ['view_status' as const] }; } },
    properties: { async list() { queried = true; throw new Error('must not query'); } },
    requests: { async list() { queried = true; throw new Error('must not query'); } },
    viewings: { async list() { queried = true; throw new Error('must not query'); } }
  });
  const result = await service.read(claims);
  assert.equal(result.properties.total, 0);
  assert.equal(result.activity.customerRequests, 0);
  assert.equal(queried, false);
});
