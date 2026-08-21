import { expect, type Page, type Route } from '@playwright/test';

export type AdminReportsLocale = 'ar' | 'en' | 'zh-CN';
export type AdminReportsSessionRole = 'admin' | 'seeker';

export const ADMIN_REPORT_ID = 'ffffffffffffffffffffffff';
export const ADMIN_REPORT_ACCOUNT_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

export function localeForReportsProject(projectName: string): AdminReportsLocale {
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function reportFixture(status: 'open' | 'resolved' = 'open') {
  return {
    id: ADMIN_REPORT_ID,
    accountId: ADMIN_REPORT_ACCOUNT_ID,
    accountRoleType: 'seeker',
    reporterId: 'cccccccccccccccccccccccc',
    reason: 'Repeated policy violations',
    details: 'The account has received multiple reports.',
    relatedReports: 2,
    status,
    ...(status === 'resolved' ? { resolutionReason: 'Reviewed with evidence' } : {}),
    version: status === 'resolved' ? 2 : 1,
    createdAt: '2026-08-17T08:00:00.000Z',
    updatedAt: status === 'resolved' ? '2026-08-19T08:00:00.000Z' : '2026-08-18T08:00:00.000Z'
  };
}

function accountFixture() {
  return {
    id: ADMIN_REPORT_ACCOUNT_ID,
    roleType: 'seeker',
    status: 'verified',
    email: 'seeker@example.test',
    phone: '+201000000001',
    locale: 'en',
    displayName: 'Amina Seeker',
    version: 2,
    statusChangedAt: '2026-08-18T08:00:00.000Z',
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-18T08:00:00.000Z',
    availableActions: ['restrict', 'suspend']
  };
}

function assertAdminRequest(route: Route, token: string, method: string): void {
  expect(route.request().method()).toBe(method);
  expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
}

export async function routeAdminAccountReports(page: Page, role: AdminReportsSessionRole = 'admin', token = 'admin.account-reports.e2e'): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { accessToken: token, tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'eeeeeeeeeeeeeeeeeeeeeeee', roleType: role, status: 'verified' } },
        meta: { requestId: 'admin-account-reports-refresh' }
      })
    });
  });

  await page.route('**/api/v1/admin/account-reports**', async route => {
    const request = route.request();
    assertAdminRequest(route, token, request.method());
    if (request.method() === 'POST') {
      const body = JSON.parse(request.postData() ?? '{}') as { action?: string };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: reportFixture(body.action === 'resolve' ? 'resolved' : 'resolved'), meta: { requestId: 'admin-account-reports-resolve' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [reportFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-account-reports-list' } }) });
  });

  await page.route(`**/api/v1/admin/users/${ADMIN_REPORT_ACCOUNT_ID}`, async route => {
    assertAdminRequest(route, token, 'GET');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: accountFixture(), meta: { requestId: 'admin-account-reports-account' } }) });
  });

  await page.route(`**/api/v1/admin/users/${ADMIN_REPORT_ACCOUNT_ID}/transitions`, async route => {
    assertAdminRequest(route, token, 'POST');
    const body = JSON.parse(route.request().postData() ?? '{}') as { action?: string; reason?: string };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { transitionId: 'dddddddddddddddddddddddd', userId: ADMIN_REPORT_ACCOUNT_ID, roleType: 'seeker', action: body.action ?? 'restrict', fromStatus: 'verified', status: 'restricted', reason: body.reason ?? 'Restriction reason', version: 3, changedAt: '2026-08-19T08:00:00.000Z', availableActions: ['verify'] }, meta: { requestId: 'admin-account-reports-transition' } })
    });
  });
}
