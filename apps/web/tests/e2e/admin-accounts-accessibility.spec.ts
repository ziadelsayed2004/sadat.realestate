import { expect, test } from '@playwright/test';
import { localeForProject, routeAdminAccounts } from './admin-accounts.fixtures';

const accessibilityRoutes = [
  { path: '/admin/users', screen: 'ADM-02' },
  { path: '/admin/property-seekers', screen: 'ADM-03' },
  { path: '/admin/providers', screen: 'ADM-04' },
  { path: '/admin/verification', screen: 'ADM-05' }
] as const;

test.describe('ADM-02 through ADM-05 admin account accessibility', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'ADM-02, ADM-03, ADM-04, ADM-05' });
    testInfo.annotations.push({ type: 'design-source', description: 'Approved local admin exports under docs/design_sources/final_screens/admin/; external Drive/Figma references recorded in the task evidence.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminAccounts(page);
  });

  test('exposes landmarks, tables, labels, keyboard focus, direction, and safe projections', async ({ page }) => {
    const locale = localeForProject(test.info().project.name);
    for (const routeCase of accessibilityRoutes) {
      await page.goto(`${routeCase.path}?lang=${encodeURIComponent(locale)}`);
      await expect(page.locator(`[data-screen-id="${routeCase.screen}"]`)).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('.admin-dashboard__navigation')).toHaveAttribute('aria-label', /.+/u);
      await expect(page.getByRole('search')).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('columnheader')).not.toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

      await page.keyboard.press('Tab');
      await expect(page.locator('.a11y-skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main-content')).toBeFocused();
      await page.locator('#admin-accounts-search').focus();
      await expect(page.locator('#admin-accounts-search')).toBeFocused();
    }
  });

  test('does not render admin landmarks for a non-admin session', async ({ page }) => {
    const locale = localeForProject(test.info().project.name);
    await page.unroute('**/api/v1/auth/refresh');
    await routeAdminAccounts(page, 'seeker', 'non-admin.accounts.a11y');
    await page.goto(`/admin/verification?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="forbidden"]')).toBeVisible();
    await expect(page.locator('[data-screen-id]')).toHaveCount(0);
  });
});
