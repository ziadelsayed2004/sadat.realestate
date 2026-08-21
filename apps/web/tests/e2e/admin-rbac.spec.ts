import { expect, test } from '@playwright/test';
import { adminId, roleId, routeAdminRbacApis } from './admin-rbac.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test.describe('ADM-59 through ADM-64 administrator users and roles', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
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

  test('sends the implemented create-admin payload without credentials or invented fields', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/admin-users/new?lang=${encodeURIComponent(locale)}`);
    await page.getByLabel(/display name|الاسم الظاهر|显示名称/iu).fill('New Operations Admin');
    await page.getByLabel(/email|البريد|电子邮箱/iu).fill('new.operations@example.com');
    const requestPromise = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/admin/admin-users'));
    await page.getByRole('button', { name: /save changes|حفظ التغييرات|保存更改/iu }).click();
    const request = await requestPromise;
    expect(request.postDataJSON()).toEqual({ email: 'new.operations@example.com', displayName: 'New Operations Admin', accessLevel: 'standard_admin' });
  });

  test('renders View Only state without role mutation controls', async ({ page }) => {
    await routeAdminRbacApis(page, { manage: false });
    await page.goto('/admin/roles?lang=en');
    await expect(page.locator('[data-screen-id="ADM-63"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create role' })).toHaveCount(0);
    await expect(page.getByText('No actions are available for this account.')).toBeVisible();
  });
});
