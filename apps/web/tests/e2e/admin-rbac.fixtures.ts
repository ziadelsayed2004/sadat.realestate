import type { Page } from '@playwright/test';
import { RBAC_PERMISSIONS } from '@sadat-real-estate/contracts';

const adminId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const roleId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function success(data: unknown, requestId: string) {
  return { data, meta: { requestId } };
}

function adminUser(availableActions: readonly string[] = ['update', 'disable'], accessLevel: 'standard_admin' | 'super_admin' = 'standard_admin') {
  return {
    id: adminId,
    email: 'operations@example.com',
    displayName: 'Operations Admin',
    accessLevel,
    status: 'active',
    version: 3,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    availableActions
  };
}

function role(availableActions: readonly string[] = ['update']) {
  return {
    id: roleId,
    name: 'Operations reviewer',
    description: 'Reviews operational records',
    accessMode: 'custom',
    permissions: ['admin:overview.view', 'admin:staff.view'],
    active: true,
    version: 2,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    availableActions
  };
}

export async function routeAdminRbacApis(page: Page, options: { readonly manage?: boolean } = {}): Promise<void> {
  const manage = options.manage ?? true;
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(success({ accessToken: 'admin-rbac.qa.session', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'admin-rbac-refresh'))
  }));
  await page.route('**/api/v1/admin/admin-users**', async route => {
    const method = route.request().method();
    const accessLevel = new URL(page.url(), 'http://sadat-real-estate.local').searchParams.get('accessLevel') === 'super_admin' ? 'super_admin' : 'standard_admin';
    const data = adminUser(manage ? ['update', 'disable'] : [], accessLevel);
    await route.fulfill({ status: method === 'POST' ? 201 : 200, contentType: 'application/json', body: JSON.stringify(success(method === 'POST' ? data : { items: [data], page: 1, limit: 20, total: 1 }, `admin-rbac-users-${method.toLowerCase()}`)) });
  });
  await page.route('**/api/v1/admin/admin-users/*', async route => {
    const method = route.request().method();
    const accessLevel = new URL(page.url(), 'http://sadat-real-estate.local').searchParams.get('accessLevel') === 'super_admin' ? 'super_admin' : 'standard_admin';
    const data = adminUser(manage ? ['update', 'disable'] : [], accessLevel);
    await route.fulfill({ status: method === 'PATCH' ? 200 : 200, contentType: 'application/json', body: JSON.stringify(success(data, `admin-rbac-user-${method.toLowerCase()}`)) });
  });
  await page.route('**/api/v1/admin/roles', async route => {
    const method = route.request().method();
    const data = role(manage ? ['update'] : []);
    await route.fulfill({ status: method === 'POST' ? 201 : 200, contentType: 'application/json', body: JSON.stringify(success({ items: [data], permissionCatalog: [...RBAC_PERMISSIONS], effectivePermissions: manage ? ['admin:roles.view', 'admin:roles.manage', 'admin:staff.view', 'admin:staff.manage'] : ['admin:roles.view'] }, `admin-rbac-roles-${method.toLowerCase()}`)) });
  });
  await page.route('**/api/v1/admin/roles/*', async route => {
    const data = role(manage ? ['update'] : []);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(success(data, 'admin-rbac-role-detail')) });
  });
}

export { adminId, roleId };
