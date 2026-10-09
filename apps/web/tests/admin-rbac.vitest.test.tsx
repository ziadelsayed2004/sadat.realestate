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
import { ApiClientError } from '../src/features/contracts/index.ts';

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
    ['en', '/admin/roles', 'ADM-63'],] as const)('renders %s %s with the approved screen marker', async (locale, path, screenId) => {
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

describe('employee role workflow', () => {
  it.each(['ar', 'en'] as const)('explains a duplicate email and preserves the employee form for correction in %s', async locale => {
    const createUser = vi.fn().mockRejectedValueOnce(new ApiClientError('errors.conflict', { code: 'HTTP_ERROR', status: 409, apiError: { code: 'ADMINISTRATOR_EMAIL_CONFLICT', messageKey: 'errors.conflict', details: [], requestId: 'duplicate-email' } })).mockResolvedValueOnce(user({ email: 'new.employee@example.com' }));
    const backend = source({ createUser });
    renderWithLocale(<AdminRbac url={`/admin/admin-users/new?roleId=${roleId}`} locale={locale} session={adminSession} source={backend} />, { locale });
    const ar = locale === 'ar';
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Operations reviewer/ })).toBeChecked());
    const name = screen.getByLabelText(ar ? 'الاسم الظاهر' : 'Display name');
    const email = screen.getByLabelText(ar ? 'البريد الإلكتروني' : 'Email');
    const password = screen.getByLabelText(ar ? 'كلمة المرور (مطلوبة)' : 'Password (required)');
    const save = screen.getByRole('button', { name: ar ? 'حفظ التغييرات' : 'Save changes' });
    fireEvent.change(name, { target: { value: 'New Employee' } });
    fireEvent.change(email, { target: { value: 'admin@example.com' } });
    fireEvent.change(password, { target: { value: 'SyntheticAdmin123!' } });
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(ar ? 'الإيميل ده مستخدم بالفعل' : 'This email is already used'));
    expect(screen.getByRole('alert')).not.toHaveTextContent('errors.conflict');
    expect(name).toHaveValue('New Employee');
    expect(password).toHaveValue('SyntheticAdmin123!');
    expect(screen.getByRole('checkbox', { name: /Operations reviewer/ })).toBeChecked();
    expect(backend.updateUser).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: ar ? 'البحث عن الحساب الإداري بهذا الإيميل' : 'Find an administrator with this email' })).toHaveAttribute('href', `/admin/admin-users?search=admin%40example.com&lang=${locale}`);
    fireEvent.change(email, { target: { value: 'new.employee@example.com' } });
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole('link', { name: ar ? 'فتح حساب الموظف' : 'Open employee account' })).toBeInTheDocument());
    expect(createUser).toHaveBeenCalledTimes(2);
    expect(password).toHaveValue('');
  });
  it('opens duplicate-account search without creating or modifying any account', async () => {
    const backend = source();
    renderWithLocale(<AdminRbac url="/admin/admin-users?search=admin%40example.com" locale="en" session={adminSession} source={backend} />, { locale: 'en' });
    await waitFor(() => expect(backend.loadUsers).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'admin@example.com' }, expect.any(AbortSignal)));
    expect(backend.createUser).not.toHaveBeenCalled();
    expect(backend.updateUser).not.toHaveBeenCalled();
  });
  it('creates a named employee with a password and the role selected from the role page', async () => {
    const createUser = vi.fn(async () => user({ email: 'new@example.com' }));
    renderWithLocale(<AdminRbac url={`/admin/admin-users/new?roleId=${roleId}`} locale="en" session={adminSession} source={source({ createUser })} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Operations reviewer/ })).toBeChecked());
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'New Employee' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password (required)'), { target: { value: 'SyntheticAdmin123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(createUser).toHaveBeenCalledWith({ displayName: 'New Employee', email: 'new@example.com', password: 'SyntheticAdmin123!', accessLevel: 'standard_admin', roleIds: [roleId] }));
    await waitFor(() => expect(screen.getByLabelText('Password (required)')).toHaveValue(''));
    expect(screen.getByRole('link', { name: 'Open employee account' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('new@example.com');
    expect(screen.getByRole('link', { name: 'Employee login link' })).toHaveAttribute('href', '/auth/login?lang=en');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'edited@example.com' } });
    expect(screen.getByRole('status')).toHaveTextContent('new@example.com');
  });
  it('selects all allowed permissions, excludes edits in View Only, and assigns an existing employee', async () => {
    const updateUser = vi.fn(async () => user({ roleIds: [roleId], version: 4 }));
    renderWithLocale(<AdminRbac url={`/admin/roles/${roleId}`} locale="en" session={adminSession} source={source({ updateUser })} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Select all' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getAllByRole('checkbox').filter(item => item instanceof HTMLInputElement && item.checked)).toHaveLength(RBAC_PERMISSIONS.length + 1);
    fireEvent.change(screen.getByLabelText('Access mode'), { target: { value: 'view_only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getAllByRole('checkbox').filter(item => item instanceof HTMLInputElement && item.checked)).toHaveLength(RBAC_PERMISSIONS.filter(item => item.endsWith('.view')).length + 1);
    await waitFor(() => expect(screen.getByRole('option', { name: /Operations Admin — admin@example.com/ })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Employee'), { target: { value: userId } });
    fireEvent.change(screen.getByLabelText('Assignment reason'), { target: { value: 'Approved staff role' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign employee to role' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(userId, { expectedVersion: 3, reason: 'Approved staff role', roleIds: [roleId] }));
  });
});
