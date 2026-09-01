export const adminRequestId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminIssueId = 'eeeeeeeeeeeeeeeeeeeeeeee';
export const adminViewingId = 'dddddddddddddddddddddddd';

export function adminRequestFixture() {
  return {
    id: adminRequestId,
    type: 'contact',
    source: 'seeker',
    seekerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    propertyId: 'cccccccccccccccccccccccc',
    status: 'new',
    payload: { message: 'Please contact me', propertyId: 'cccccccccccccccccccccccc', locale: 'en' },
    dueAt: '2026-08-20T10:00:00.000Z',
    version: 2,
    availableActions: ['start_review', 'contact'],
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

export function adminIssueFixture() {
  return {
    id: adminIssueId,
    requestId: adminRequestId,
    category: 'incorrect_data',
    details: 'The request contains incorrect contact data.',
    status: 'open',
    version: 1,
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

export function adminViewingFixture() {
  return {
    id: adminViewingId,
    propertyId: 'cccccccccccccccccccccccc',
    seekerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    status: 'confirmed',
    requestedAt: '2026-08-21T10:00:00.000Z',
    timezone: 'Africa/Cairo',
    version: 1,
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

export function localeForAdminRequests(projectName: string): 'ar' | 'en' {
  return projectName.endsWith('-en') ? 'en' : 'ar';
}

export async function routeAdminRequestApis(page: import('@playwright/test').Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: allow ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(allow ? { data: { accessToken: 'admin.requests.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'ffffffffffffffffffffffff', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-requests-refresh' } } : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-requests-refresh-denied' } })
    });
  });
  await page.route('**/api/v1/admin/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.headers().authorization !== 'Bearer admin.requests.qa') {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-requests-missing-auth' } }) });
      return;
    }
    if (url.pathname === '/api/v1/admin/viewings') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [adminViewingFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-viewings-list' } }) });
      return;
    }
    if (url.pathname === '/api/v1/admin/request-issues') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [adminIssueFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-issues-list' } }) });
      return;
    }
    if (url.pathname.includes('/request-issues/') && request.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...adminIssueFixture(), status: 'resolved', resolutionReason: 'Reviewed and corrected' }, meta: { requestId: 'admin-issue-resolve' } }) });
      return;
    }
    if (url.pathname === '/api/v1/admin/requests/overdue') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ request: adminRequestFixture(), overdueBySeconds: 120 }], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-overdue-list' } }) });
      return;
    }
    if (request.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...adminRequestFixture(), status: 'contacted', version: 3, availableActions: [] }, meta: { requestId: 'admin-request-mutation' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [adminRequestFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-request-list' } }) });
  });
}
