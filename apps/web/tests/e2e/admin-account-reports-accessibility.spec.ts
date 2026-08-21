import { expect, test } from '@playwright/test';
import { ADMIN_REPORT_ACCOUNT_ID, ADMIN_REPORT_ID, localeForReportsProject, routeAdminAccountReports } from './admin-account-reports.fixtures';

const accessibilityRoutes = [
  { path: '/admin/account-reports', screen: 'ADM-06', list: true },
  { path: `/admin/account-reports?reportId=${ADMIN_REPORT_ID}`, screen: 'ADM-07', list: false },
  { path: `/admin/account-restrictions?accountId=${ADMIN_REPORT_ACCOUNT_ID}`, screen: 'ADM-08', list: true }
] as const;

test.describe('ADM-06 through ADM-08 account moderation accessibility', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'ADM-06, ADM-07, ADM-08' });
    testInfo.annotations.push({ type: 'design-source', description: 'Approved local exports: docs/design_sources/final_screens/admin/ADM-06.png, ADM-07.png, ADM-08.png; external Drive/Figma references are recorded in frontend_062 completion evidence.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminAccountReports(page);
  });

  test('exposes landmarks, labels, table/detail semantics, keyboard focus, direction, and safe projections', async ({ page }) => {
    const locale = localeForReportsProject(test.info().project.name);
    for (const routeCase of accessibilityRoutes) {
      await page.goto(`${routeCase.path}${routeCase.path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`);
      await expect(page.locator(`[data-screen-id="${routeCase.screen}"]`)).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('.admin-dashboard__navigation')).toHaveAttribute('aria-label', /.+/u);
      await expect(page.locator('.admin-dashboard__navigation a[data-active="true"]')).toHaveCount(1);
      if (routeCase.list) {
        await expect(page.getByRole('search')).toBeVisible();
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByRole('columnheader')).not.toHaveCount(0);
      } else {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByLabel(/reason for this action|سبب هذا الإجراء|本次操作原因/iu)).toBeVisible();
      }
      await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

      await page.keyboard.press('Tab');
      await expect(page.locator('.a11y-skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main-content')).toBeFocused();
    }
  });

  test('fails closed for a non-admin session without rendering account moderation landmarks', async ({ page }) => {
    const locale = localeForReportsProject(test.info().project.name);
    await page.unroute('**/api/v1/auth/refresh');
    await routeAdminAccountReports(page, 'seeker', 'non-admin.account-reports.a11y');
    await page.goto(`/admin/account-reports?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="forbidden"]')).toBeVisible();
    await expect(page.locator('[data-screen-id]')).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
  });
});
