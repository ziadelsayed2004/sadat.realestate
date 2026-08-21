import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  adminUserDataSchema,
  RBAC_PERMISSIONS,
  rbacRoleListDataSchema,
  rbacRoleDataSchema,
  type AdminUserListData,
  type RbacRoleListData
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { AdminRbac, loadAdminRbacUsers, updateAdminRbacRole, type AdminRbacSource } from '../src/features/admin_rbac/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const adminSession = { status: 'authenticated' as const, role: 'admin' as const };
const userId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const roleId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function user(overrides: Partial<ReturnType<typeof adminUserDataSchema.parse>> = {}) {
  return adminUserDataSchema.parse({
    id: userId,
    email: 'admin@example.com',
    displayName: 'Operations Admin',
    accessLevel: 'standard_admin',
    status: 'active',
    version: 3,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    availableActions: ['update', 'disable'],
    ...overrides
  });
}

function userList(items = [user()]): AdminUserListData {
  return { items, page: 1, limit: 20, total: items.length };
}

function roles(overrides: Partial<RbacRoleListData> = {}): RbacRoleListData {
  const role = rbacRoleDataSchema.parse({
    id: roleId,
    name: 'Operations reviewer',
    description: 'Reviews operational records',
    accessMode: 'custom',
    permissions: ['admin:overview.view', 'admin:staff.view'],
    active: true,
    version: 2,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    availableActions: ['update']
  });
  return rbacRoleListDataSchema.parse({
    items: [role],
    permissionCatalog: [...RBAC_PERMISSIONS],
    effectivePermissions: ['admin:roles.view', 'admin:roles.manage', 'admin:staff.view', 'admin:staff.manage'],
    ...overrides
  });
}

function source(overrides: Partial<AdminRbacSource> = {}): AdminRbacSource {
  return {
    loadUsers: vi.fn(async () => userList()),
    loadUser: vi.fn(async () => user()),
    createUser: vi.fn(async () => user()),
    updateUser: vi.fn(async () => user({ version: 4 })),
    loadRoles: vi.fn(async () => roles()),
    createRole: vi.fn(async () => roles().items[0]!),
    updateRole: vi.fn(async () => roles().items[0]!),
    ...overrides
  };
}

describe('frontend_075 Administrator Users and Roles', () => {
  it.each([
    ['ar', '/admin/admin-users', 'ADM-59'],
    ['en', '/admin/admin-users/new', 'ADM-60'],
    ['ar', `/admin/admin-users/${userId}`, 'ADM-62'],
    ['en', '/admin/roles', 'ADM-63'],
    ['zh-CN', `/admin/roles/${roleId}`, 'ADM-64']
  ] as const)('renders %s %s with the approved screen marker', async (locale, path, screenId) => {
    const result = renderWithLocale(<AdminRbac url={path} locale={locale} session={adminSession} source={source()} />, { locale });
    await waitFor(() => expect(result.container.querySelector(`[data-screen-id="${screenId}"]`)).not.toBeNull());
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    result.unmount();
  });

  it('uses the implemented admin-user route and query contract', async () => {
    const requests: Array<{ url: string; headers?: HeadersInit }> = [];
    const apiClient = { request: vi.fn(async (path: string, init: { query?: Record<string, unknown>; headers?: HeadersInit }) => {
      requests.push({ url: `${path}?${new URLSearchParams(Object.entries(init.query ?? {}).map(([key, value]) => [key, String(value)]))}`, ...(init.headers === undefined ? {} : { headers: init.headers }) });
      return { data: { data: userList(), meta: { requestId: 'admin-rbac-test' } }, requestId: 'admin-rbac-test', status: 200, headers: new Headers() };
    }) };
    await loadAdminRbacUsers({ status: 'active', page: 2, limit: 10 }, { apiClient: apiClient as never, authorization: { getAuthorizationHeader: () => 'Bearer test' } });
    expect(requests[0]?.url).toContain('/admin/admin-users?');
    expect(requests[0]?.url).toContain('status=active');
    expect(requests[0]?.url).toContain('page=2');
    expect(requests[0]?.headers).toEqual({ authorization: 'Bearer test' });
  });

  it('rejects unknown role update fields before the API call', async () => {
    await expect(updateAdminRbacRole(roleId, { version: 2, reason: 'Update role', active: true, unexpected: true })).rejects.toThrow();
  });

  it('requires a reason and uses the server available actions for an administrator mutation', async () => {
    const updateUser = vi.fn(async () => user({ displayName: 'Updated Admin', version: 4 }));
    renderWithLocale(<AdminRbac url={`/admin/admin-users/${userId}`} locale="en" session={adminSession} source={source({ updateUser })} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByLabelText('Display name')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Updated Admin' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form')!);
    expect(updateUser).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('A change reason is required.');
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Update approved administrator' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form')!);
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(userId, expect.objectContaining({ expectedVersion: 3, reason: 'Update approved administrator' })));
  });

  it('renders a permission-safe View Only role without mutation controls', async () => {
    const viewOnly = roles({ effectivePermissions: ['admin:roles.view'], items: [rbacRoleDataSchema.parse({ ...roles().items[0], accessMode: 'view_only', permissions: ['admin:overview.view'], availableActions: [] })] });
    renderWithLocale(<AdminRbac url="/admin/roles" locale="en" session={adminSession} source={source({ loadRoles: vi.fn(async () => viewOnly) })} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Roles and permissions' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Create role' })).toBeNull();
    expect(screen.getByText('No actions are available for this account.')).toBeInTheDocument();
  });
});
