import { expect, type Page, type Route } from '@playwright/test';

export type AdminLocale = 'ar' | 'en';
export type AdminSessionRole = 'admin' | 'seeker';

export const ADMIN_USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const ADMIN_PROVIDER_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
export const ADMIN_DOCUMENT_ID = 'dddddddddddddddddddddddd';
export const ADMIN_INACTIVE_DOCUMENT_ID = 'eeeeeeeeeeeeeeeeeeeeeeee';

export function localeForProject(projectName: string): AdminLocale {
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

export function adminUserFixture() {
  return {
    id: ADMIN_USER_ID,
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
    availableActions: ['suspend', 'restrict']
  };
}

export function adminProviderFixture() {
  return {
    id: ADMIN_PROVIDER_ID,
    userId: 'cccccccccccccccccccccccc',
    providerType: 'brokerage_office',
    applicationStatus: 'pending_review',
    accountStatus: 'pending_review',
    accountVersion: 1,
    applicationVersion: 3,
    email: 'provider@example.test',
    accountOwnerFullName: 'Provider Owner',
    legalBusinessName: 'Provider Office',
    submittedAt: '2026-08-17T08:00:00.000Z',
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-18T08:00:00.000Z',
    documents: [
      {
        id: ADMIN_DOCUMENT_ID,
        applicationId: ADMIN_PROVIDER_ID,
        category: 'commercial_registration',
        originalFilename: 'registration.pdf',
        detectedMime: 'application/pdf',
        byteSize: 1024,
        version: 1,
        securityState: 'clean',
        reviewState: 'pending_review',
        uploadedAt: '2026-08-17T08:00:00.000Z',
        active: true
      },
      {
        id: ADMIN_INACTIVE_DOCUMENT_ID,
        applicationId: ADMIN_PROVIDER_ID,
        category: 'additional_supporting_document',
        originalFilename: 'unsafe-upload.pdf',
        detectedMime: 'application/pdf',
        byteSize: 2048,
        version: 1,
        securityState: 'infected',
        reviewState: 'rejected',
        uploadedAt: '2026-08-17T08:30:00.000Z',
        active: false
      }
    ],
    availableActions: ['verify', 'reject', 'needs_information', 'suspend']
  };
}

function assertAdminAuthorization(route: Route, token: string): void {
  expect(route.request().method()).toBe('GET');
  expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
}

export async function routeAdminAccounts(page: Page, role: AdminSessionRole = 'admin', token = 'admin.accounts.e2e'): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: ADMIN_USER_ID, roleType: role, status: 'verified' }
        },
        ...successMeta('admin-accounts-refresh')
      })
    });
  });

  await page.route('**/api/v1/admin/users**', async route => {
    assertAdminAuthorization(route, token);
    const pathname = new URL(route.request().url()).pathname;
    const data = pathname.endsWith(`/${ADMIN_USER_ID}`)
      ? adminUserFixture()
      : { items: [adminUserFixture()], page: 1, limit: 20, total: 1 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, ...successMeta('admin-accounts-users') }) });
  });

  await page.route('**/api/v1/admin/providers**', async route => {
    assertAdminAuthorization(route, token);
    const pathname = new URL(route.request().url()).pathname;
    const data = pathname.endsWith(`/${ADMIN_PROVIDER_ID}`)
      ? adminProviderFixture()
      : { items: [adminProviderFixture()], page: 1, limit: 20, total: 1 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, ...successMeta('admin-accounts-providers') }) });
  });

  await page.route('**/api/v1/admin/provider-documents/*/access**', async route => {
    assertAdminAuthorization(route, token);
    const url = new URL(route.request().url());
    expect(url.pathname).toBe(`/api/v1/admin/provider-documents/${ADMIN_DOCUMENT_ID}/access`);
    expect(url.searchParams.get('purpose')).toBe('document_review');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          url: `/api/v1/private/provider-documents/${ADMIN_DOCUMENT_ID}`,
          expiresAt: '2026-08-19T09:05:00.000Z',
          method: 'GET'
        },
        ...successMeta('admin-accounts-document-access')
      })
    });
  });
}
