import { expect, test } from '@playwright/test';
import { adminId, roleId, routeAdminRbacApis } from './admin-rbac.fixtures.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

const routes = [
  ['/admin/admin-users', 'ADM-59', 'admin-rbac-users'],
  ['/admin/admin-users/new', 'ADM-60', 'admin-rbac-user-create'],
  [`/admin/admin-users/${adminId}?accessLevel=super_admin`, 'ADM-61', 'admin-rbac-user-detail-super-admin'],
  [`/admin/admin-users/${adminId}`, 'ADM-62', 'admin-rbac-user-detail'],
  ['/admin/roles', 'ADM-63', 'admin-rbac-roles'],
  [`/admin/roles/${roleId}`, 'ADM-64', 'admin-rbac-role-detail']
] as const;

for (const [path, screenId, name] of routes) {
  test(`${screenId} renders a stable Admin Desktop visual baseline`, async ({ page }) => {
    test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    test.info().annotations.push({ type: 'design-source', description: 'Implementation visual baselines are checked against the Admin design-system/sibling-frame substitute patterns; ADM-54 waiver is not applicable to ADM-59 through ADM-64.' });
    await routeAdminRbacApis(page);
    const locale = localeForProject();
    const separator = path.includes('?') ? '&' : '?';
    await page.goto(`${path}${separator}lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"][data-device-scope="desktop"][data-state="success"]`)).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`${name}-${locale}.png`, { fullPage: true, maxDiffPixels: 300 });
  });
}
