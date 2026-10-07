import { expect, test } from '@playwright/test';
import { adminId, roleId, routeAdminRbacApis } from './admin-rbac.fixtures.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test.describe('ADM-59 through ADM-64 administrator users and roles', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-59 through ADM-64 use approved local Admin Desktop exports under docs/design_sources/final_screens/admin.' });
    await routeAdminRbacApis(page);
  });

  test('renders user, create, role list, and role detail routes with safe projections', async ({ page }) => {
    const locale = localeForProject();
    const routes = [
      ['/admin/admin-users', 'ADM-59'],
      ['/admin/admin-users/new', 'ADM-60'],
      [`/admin/admin-users/${adminId}`, 'ADM-62'],
      ['/admin/roles', 'ADM-63'],
      [`/admin/roles/${roleId}`, 'ADM-64']
    ] as const;
    for (const [path, screenId] of routes) {
      await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
      await expect(page.locator(`[data-screen-id="${screenId}"][data-device-scope="desktop"][data-state="success"]`)).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|privateUrl|auditData|internalNotes/u);
    }
  });

  test('creates an employee with a password and a selected role', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/admin-users/new?lang=${encodeURIComponent(locale)}`);
    await page.getByLabel(/display name|الاسم الظاهر|显示名称/iu).fill('New Operations Admin');
    await page.getByLabel(/email|البريد|电子邮箱/iu).fill('new.operations@example.com');
    await page.getByLabel(/Password \(required\)|كلمة المرور \(مطلوبة\)/iu).fill('SyntheticAdmin123!');
    await page.getByRole('checkbox', { name: /Operations reviewer/ }).check();
    if (test.info().project.name === 'mobile-ar') await page.locator('.admin-rbac__form-panel').screenshot({ path: '.local/staff-create-mobile.png' });
    const requestPromise = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/admin/admin-users'));
    await page.getByRole('button', { name: /save changes|حفظ التغييرات|保存更改/iu }).click();
    const request = await requestPromise;
    expect(request.postDataJSON()).toEqual({ email: 'new.operations@example.com', displayName: 'New Operations Admin', accessLevel: 'standard_admin', password: 'SyntheticAdmin123!', roleIds: [roleId] });
    await expect(page.getByLabel(/Password \(required\)|كلمة المرور \(مطلوبة\)/iu)).toHaveValue('');
  });

  test('selects all permissions and assigns the role to an employee by name and email', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/roles/${roleId}?lang=${locale}`);
    await page.getByRole('button', { name: /^(Select all|تحديد الكل)$/ }).click();
    const permissions = page.locator('.admin-rbac__permissions input[type=checkbox]');
    expect(await permissions.count()).toBeGreaterThan(20);
    for (const checkbox of await permissions.all()) await expect(checkbox).toBeChecked();
    await page.getByRole('combobox', { name: /^(Employee|الموظف)$/ }).selectOption(adminId);
    await page.getByLabel(/Assignment reason|سبب إسناد المنصب/).fill('Assign approved office employee');
    if (test.info().project.name === 'mobile-ar') await page.locator('.admin-rbac__form-panel').last().screenshot({ path: '.local/staff-role-mobile.png' });
    const requestPromise = page.waitForRequest(request => request.method() === 'PATCH' && request.url().includes(`/admin/admin-users/${adminId}`));
    await page.getByRole('button', { name: /Assign employee to role|ربط الموظف بالمنصب/ }).click();
    expect((await requestPromise).postDataJSON()).toEqual({ expectedVersion: 3, reason: 'Assign approved office employee', roleIds: [roleId] });
    await expect(page.getByRole('link', { name: /Add employee with this role|إضافة موظف بهذا المنصب/ })).toHaveAttribute('href', `/admin/admin-users/new?roleId=${roleId}&lang=${locale}`);
  });

  test('renders View Only state without role mutation controls', async ({ page }) => {
    await routeAdminRbacApis(page, { manage: false });
    await page.goto('/admin/roles?lang=en');
    await expect(page.locator('[data-screen-id="ADM-63"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create role' })).toHaveCount(0);
    await expect(page.getByText('No actions are available for this account.')).toBeVisible();
  });
});
