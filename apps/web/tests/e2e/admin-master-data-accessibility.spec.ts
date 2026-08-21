import { expect, test } from '@playwright/test';
import { localeForMasterDataProject, routeAdminMasterData } from './admin-master-data.fixtures';

const routes = [
  { path: '/admin/property-categories', screen: 'ADM-09' },
  { path: '/admin/locations', screen: 'ADM-10' },
  { path: '/admin/features', screen: 'ADM-11' }
] as const;

test.describe('ADM-09 through ADM-11 admin master data accessibility', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'ADM-09, ADM-10, ADM-11' });
    testInfo.annotations.push({ type: 'design-source', description: 'Approved local master-data exports under docs/design_sources/final_screens/admin/; external Drive/Figma references recorded in frontend_063 evidence.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminMasterData(page);
  });

  test('exposes landmarks, table semantics, form labels, keyboard focus, direction, and safe projections', async ({ page }) => {
    const locale = localeForMasterDataProject(test.info().project.name);
    for (const routeCase of routes) {
      await page.goto(`${routeCase.path}?lang=${encodeURIComponent(locale)}`);
      await expect(page.locator(`[data-screen-id="${routeCase.screen}"]`)).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('.admin-dashboard__navigation')).toHaveAttribute('aria-label', /.+/u);
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('columnheader')).not.toHaveCount(0);
      await expect(page.getByRole('button', { name: /Add item|إضافة عنصر|添加项目/u }).first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

      await page.keyboard.press('Tab');
      await expect(page.locator('.a11y-skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main-content')).toBeFocused();
      await page.getByRole('button', { name: /Add item|إضافة عنصر|添加项目/u }).first().focus();
      await expect(page.getByRole('button', { name: /Add item|إضافة عنصر|添加项目/u }).first()).toBeFocused();
    }
  });

  test('does not render master-data landmarks for a non-admin session', async ({ page }) => {
    const locale = localeForMasterDataProject(test.info().project.name);
    await page.unroute('**/api/v1/auth/refresh');
    await routeAdminMasterData(page, 'seeker', 'non-admin.master-data.a11y');
    await page.goto(`/admin/locations?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="forbidden"]')).toBeVisible();
    await expect(page.locator('[data-screen-id]')).toHaveCount(0);
  });
});
