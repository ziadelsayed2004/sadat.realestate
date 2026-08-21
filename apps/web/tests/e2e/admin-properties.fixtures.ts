import type { Page } from '@playwright/test';

export const adminPropertyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminPropertyCandidateId = 'dddddddddddddddddddddddd';
export const adminPropertyReportId = 'eeeeeeeeeeeeeeeeeeeeeeee';

export function adminPropertyFixture() {
  return {
    id: adminPropertyId,
    kind: 'property',
    name: { ar: 'فيلا النيل', en: 'Nile Villa', 'zh-CN': '尼罗别墅' },
    slug: 'nile-villa',
    transactionType: 'sale',
    source: { providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb', sourceType: 'developer_company', organizationId: 'cccccccccccccccccccccccc' },
    status: 'pending_review',
    active: true,
    version: 3,
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    availableActions: ['approve', 'reject', 'hide']
  };
}

export function adminPropertyReportsFixture() {
  return {
    items: [{
      id: adminPropertyReportId,
      propertyId: adminPropertyId,
      reporterId: 'ffffffffffffffffffffffff',
      reason: 'duplicate',
      details: 'The listing appears to duplicate another property.',
      status: 'open',
      version: 2,
      createdAt: '2026-08-17T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z'
    }],
    page: 1,
    limit: 20,
    total: 1
  };
}

export function localeForAdminProperties(projectName: string): 'ar' | 'en' | 'zh-CN' {
  return projectName.endsWith('-zh') ? 'zh-CN' : projectName.endsWith('-en') ? 'en' : 'ar';
}

export async function routeAdminPropertyApis(page: Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: allow ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(allow
        ? { data: { accessToken: 'admin.properties.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: '999999999999999999999999', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-properties-refresh' } }
        : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-properties-refresh-denied' } })
    });
  });

  await page.route('**/api/v1/admin/properties**', async route => {
    const request = route.request();
    expectAuthorization(request.headers().authorization);
    const url = request.url();
    if (request.method() === 'POST') {
      const body = url.includes('/visibility')
        ? { ...adminPropertyFixture(), status: 'hidden', active: false, availableActions: ['restore'] }
        : { ...adminPropertyFixture(), status: 'approved', availableActions: ['publish'] };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: body, meta: { requestId: 'admin-property-mutation' } }) });
      return;
    }
    if (url.includes('/possible-duplicates')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { propertyId: adminPropertyId, items: [{ candidateId: adminPropertyCandidateId, signals: ['same_slug', 'same_location_transaction'], explanation: 'The slug and transaction location match.' }], total: 1 }, meta: { requestId: 'admin-property-duplicates' } })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [adminPropertyFixture()] }, meta: { requestId: 'admin-property-list', page: 1, limit: 20, total: 1 } }) });
  });

  await page.route('**/api/v1/admin/property-reports**', async route => {
    expectAuthorization(route.request().headers().authorization);
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...adminPropertyReportsFixture().items[0], status: 'resolved', resolutionReason: 'Reviewed duplicate evidence', version: 3 }, meta: { requestId: 'admin-property-report-resolution' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: adminPropertyReportsFixture(), meta: { requestId: 'admin-property-reports' } }) });
  });
}

function expectAuthorization(value: string | undefined): void {
  if (value !== 'Bearer admin.properties.qa') throw new Error(`Unexpected authorization header: ${value ?? 'missing'}`);
}
