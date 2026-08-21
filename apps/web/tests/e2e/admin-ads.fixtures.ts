import { expect, type Page } from '@playwright/test';

export const adminAdsRequestId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminAdsProviderId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
export const adminAdsProofId = 'eeeeeeeeeeeeeeeeeeeeeeee';

export function adminAdsRequestFixture() {
  return {
    id: adminAdsRequestId,
    providerId: adminAdsProviderId,
    placementKey: 'homepage.hero',
    purpose: 'Promote an approved property campaign',
    intervalStart: '2026-08-20T09:00:00.000Z',
    intervalEnd: '2026-08-27T09:00:00.000Z',
    status: 'waiting_payment',
    version: 3,
    createdAt: '2026-08-18T09:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

export function adminAdsProofFixture(status: 'pending_review' | 'approved' = 'pending_review') {
  return {
    id: adminAdsProofId,
    adRequestId: adminAdsRequestId,
    providerId: adminAdsProviderId,
    originalFilename: 'payment-proof.pdf',
    normalizedExtension: '.pdf',
    detectedMime: 'application/pdf',
    byteSize: 128000,
    sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    version: status === 'approved' ? 3 : 2,
    securityState: 'clean',
    status,
    reviewHistory: [],
    uploadedAt: '2026-08-18T11:00:00.000Z',
    active: true,
    idempotentReplay: false
  };
}

export function adminAdsFinancialFixture() {
  return {
    requestId: adminAdsRequestId,
    providerId: adminAdsProviderId,
    placementKey: 'homepage.hero',
    requestStatus: 'waiting_payment',
    intervalStart: '2026-08-20T09:00:00.000Z',
    intervalEnd: '2026-08-27T09:00:00.000Z',
    quoteStatus: 'issued',
    quotedTotalMinor: 125000,
    quoteCurrency: 'EGP',
    paymentProofStatus: 'pending_review',
    paymentProofSecurityState: 'clean',
    paymentProofCount: 1,
    financialState: 'payment_proof_pending_review',
    scheduleStatus: undefined,
    createdAt: '2026-08-18T09:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

function success(data: unknown, requestId: string, meta: Record<string, unknown> = {}) {
  return { data, meta: { requestId, ...meta } };
}

export async function routeAdminAdsApis(page: Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: allow ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(allow
        ? success({ accessToken: 'admin.ads.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'admin-ads-refresh')
        : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-ads-refresh-denied' } })
    });
  });
  await page.route('**/api/v1/admin/ad-requests**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(adminAdsRequestFixture(), 'admin-ads-schedule')) });
      return;
    }
    const request = adminAdsRequestFixture();
    const data = { request, quote: { id: 'dddddddddddddddddddddddd', requestId: request.id, providerId: request.providerId, currency: 'EGP', lineItems: [{ description: 'Homepage placement', quantity: 1, unitAmountMinor: 125000 }], totalMinor: 125000, validUntil: '2026-08-19T09:00:00.000Z', terms: 'Manual administrative quote.', status: 'issued', issuerId: 'cccccccccccccccccccccccc', version: 1, decisionHistory: [{ action: 'issued', actorId: 'cccccccccccccccccccccccc', actorRole: 'admin', version: 1, createdAt: '2026-08-18T10:00:00.000Z' }], createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z' } };
    if (url.pathname.endsWith(`/${adminAdsRequestId}`)) await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(data, 'admin-ads-request-detail')) });
    else await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [data], page: 1, limit: 20, total: 1 }, 'admin-ads-requests', { page: 1, limit: 20, total: 1 })) });
  });
  await page.route('**/api/v1/admin/payment-proofs**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(adminAdsProofFixture('approved'), 'admin-ads-proof-review')) });
      return;
    }
    const status = url.searchParams.get('status') === 'approved' ? 'approved' : 'pending_review';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [adminAdsProofFixture(status)], page: 1, limit: 20, total: 1 }, 'admin-ads-proofs', { page: 1, limit: 20, total: 1 })) });
  });
  await page.route('**/api/v1/admin/ad-calendar**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [{ requestId: adminAdsRequestId, providerId: adminAdsProviderId, placementKey: 'homepage.hero', status: 'scheduled', startsAt: '2026-08-20T09:00:00.000Z', endsAt: '2026-08-27T09:00:00.000Z', timezone: 'Africa/Cairo', localStart: '2026-08-20T12:00:00', localEnd: '2026-08-27T12:00:00', version: 1 }], page: 1, limit: 50, total: 1 }, 'admin-ads-calendar', { page: 1, limit: 50, total: 1 })) });
  });
  await page.route('**/api/v1/admin/ad-financial-review**', async route => {
    const row = adminAdsFinancialFixture();
    const url = new URL(route.request().url());
    const data = url.pathname.endsWith('/ad-financial-review') ? { items: [row], page: 1, limit: 20, total: 1 } : row;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(data, 'admin-ads-financial', url.pathname.endsWith('/ad-financial-review') ? { page: 1, limit: 20, total: 1 } : {})) });
  });
  await page.route('**/api/v1/admin/ad-ledger**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [{ id: 'ffffffffffffffffffffffff', requestId: adminAdsRequestId, providerId: adminAdsProviderId, placementKey: 'homepage.hero', kind: 'payment_proof_uploaded', source: 'payment_proof', occurredAt: '2026-08-18T11:00:00.000Z', accountingTreatment: 'not_realized' }], page: 1, limit: 20, total: 1 }, 'admin-ads-ledger', { page: 1, limit: 20, total: 1 })) });
  });
}

export function expectNoPrivateAdminAdsFields(page: Page): Promise<void> {
  return expect(page.locator('body')).not.toContainText(/storageKey|downloadUrl|bankVerified|internalNotes|assignedTo|auditData|accessToken|refreshToken|privateUrl/u);
}
