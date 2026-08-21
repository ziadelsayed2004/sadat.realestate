import { expect, test } from '@playwright/test';
import { adminId, roleId, routeAdminRbacApis } from './admin-rbac.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-59 through ADM-64 render stable Admin Desktop visual baselines', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  test.info().annotations.push({ type: 'design-source', description: 'Implementation visual baselines are checked against the Admin design-system/sibling-frame substitute patterns; ADM-54 waiver is not applicable to ADM-59 through ADM-64.' });
  await routeAdminRbacApis(page);
  const locale = localeForProject();
  const routes = [
    ['/admin/admin-users', 'ADM-59', 'admin-rbac-users'],
    ['/admin/admin-users/new', 'ADM-60', 'admin-rbac-user-create'],
    [`/admin/admin-users/${adminId}`, 'ADM-62', 'admin-rbac-user-detail'],
    ['/admin/roles', 'ADM-63', 'admin-rbac-roles'],
    [`/admin/roles/${roleId}`, 'ADM-64', 'admin-rbac-role-detail']
  ] as const;
  for (const [path, screenId, name] of routes) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"][data-device-scope="desktop"][data-state="success"]`)).toBeVisible();
    await expect(page).toHaveScreenshot(`${name}-${locale}.png`, { fullPage: true, maxDiffPixels: 300 });
  }
});
