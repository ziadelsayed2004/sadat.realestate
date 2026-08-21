import { expect, type Page } from '@playwright/test';

export const adminCommissionPolicyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminCommissionAccountId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
export const adminCommissionExceptionId = 'cccccccccccccccccccccccc';
export const adminCommissionConfirmationId = 'dddddddddddddddddddddddd';
export const adminCommissionChangeId = 'eeeeeeeeeeeeeeeeeeeeeeee';
export const adminCommissionActorId = 'ffffffffffffffffffffffff';
const traceId = '0123456789abcdef0123456789abcdef';

function success(data: unknown, requestId: string, meta: Record<string, unknown> = {}) {
  return { data, meta: { requestId, ...meta } };
}

export function commissionPolicyFixture() {
  return {
    id: adminCommissionPolicyId,
    key: 'default.sale',
    label: 'Default sale commission',
    kind: 'percentage',
    scope: { kind: 'default' },
    percentageBps: 250,
    effectiveFrom: '2026-08-20T09:00:00.000Z',
    status: 'active',
    version: 2,
    createdBy: adminCommissionActorId,
    updatedBy: adminCommissionActorId,
    createdAt: '2026-08-18T09:00:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z'
  };
}

export function commissionAccountFixture() {
  return {
    accountId: adminCommissionAccountId,
    source: 'policy',
    effectiveAt: '2026-08-20T09:00:00.000Z',
    policyId: adminCommissionPolicyId,
    policyVersion: 2,
    kind: 'percentage',
    percentageBps: 250,
    currency: undefined
  };
}

export function commissionOverrideFixture() {
  return {
    id: '111111111111111111111111',
    accountId: adminCommissionAccountId,
    kind: 'percentage',
    percentageBps: 300,
    effectiveFrom: '2026-08-21T09:00:00.000Z',
    status: 'active',
    version: 1,
    source: 'account_override',
    createdBy: adminCommissionActorId,
    updatedBy: adminCommissionActorId,
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z'
  };
}

export function commissionExceptionFixture() {
  return {
    id: adminCommissionExceptionId,
    accountId: adminCommissionAccountId,
    kind: 'percentage',
    percentageBps: 150,
    reason: 'Approved partner exception',
    effectiveFrom: '2026-08-20T09:00:00.000Z',
    status: 'draft',
    source: 'exception',
    lastMutationReason: 'Approved partner exception',
    version: 1,
    createdBy: adminCommissionActorId,
    updatedBy: adminCommissionActorId,
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z'
  };
}

export function commissionConfirmationFixture() {
  return {
    id: adminCommissionConfirmationId,
    accountId: adminCommissionAccountId,
    source: 'policy',
    sourceRecordId: adminCommissionPolicyId,
    policyVersion: 2,
    policyId: adminCommissionPolicyId,
    effectiveAt: '2026-08-20T09:00:00.000Z',
    status: 'acknowledged',
    acknowledgedAt: '2026-08-20T09:00:00.000Z',
    acknowledgedBy: adminCommissionActorId,
    version: 1,
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-20T09:00:00.000Z'
  };
}

export function commissionChangeFixture() {
  return {
    id: adminCommissionChangeId,
    targetType: 'commission_policy',
    targetId: adminCommissionPolicyId,
    actorType: 'admin',
    actorId: adminCommissionActorId,
    action: 'commission_policy.created',
    reason: 'Approved commission policy',
    before: {},
    after: { status: 'active', version: 2 },
    effectiveFrom: '2026-08-20T09:00:00.000Z',
    requestId: 'admin-commission-change',
    traceId,
    createdAt: '2026-08-20T09:00:00.000Z'
  };
}

export async function routeAdminCommissionApis(page: Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: allow ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(allow
        ? success({ accessToken: 'admin.commission.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: adminCommissionActorId, roleType: 'admin', status: 'verified' } }, 'admin-commission-refresh')
        : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-commission-refresh-denied' } })
    });
  });

  await page.route('**/api/v1/admin/commission-policies**', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(commissionPolicyFixture(), 'admin-commission-policy-create')) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [commissionPolicyFixture()], page: 1, limit: 20, total: 1 }, 'admin-commission-policies', { page: 1, limit: 20, total: 1 })) });
  });

  await page.route('**/api/v1/admin/account-commissions/**', async route => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(commissionOverrideFixture(), 'admin-commission-account-override')) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(commissionAccountFixture(), 'admin-commission-account')) });
  });

  await page.route('**/api/v1/admin/commission-exceptions**', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(commissionExceptionFixture(), 'admin-commission-exception-create')) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [commissionExceptionFixture()], page: 1, limit: 20, total: 1 }, 'admin-commission-exceptions', { page: 1, limit: 20, total: 1 })) });
  });

  await page.route('**/api/v1/admin/commission-confirmations**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [commissionConfirmationFixture()], page: 1, limit: 20, total: 1 }, 'admin-commission-confirmations', { page: 1, limit: 20, total: 1 })) });
  });

  await page.route('**/api/v1/admin/commission-change-log**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success({ items: [commissionChangeFixture()], page: 1, limit: 25, total: 1 }, 'admin-commission-change-log', { page: 1, limit: 25, total: 1 })) });
  });
}

export function expectNoPrivateCommissionFields(page: Page): Promise<void> {
  return expect(page.locator('body')).not.toContainText(/storageKey|privateUrl|internalNotes|assignedTo|auditData|accessToken|refreshToken|bankVerified|universal commission/u);
}
