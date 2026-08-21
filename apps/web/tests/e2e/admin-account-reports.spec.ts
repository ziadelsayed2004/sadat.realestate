import { expect, test } from '@playwright/test';
import { ADMIN_REPORT_ACCOUNT_ID, ADMIN_REPORT_ID, localeForReportsProject, routeAdminAccountReports } from './admin-account-reports.fixtures';

const routes = [
  { path: '/admin/account-reports', screen: 'ADM-06', snapshot: 'admin-account-reports-list' },
  { path: `/admin/account-reports?reportId=${ADMIN_REPORT_ID}`, screen: 'ADM-07', snapshot: 'admin-account-reports-detail' },
  { path: `/admin/account-restrictions?accountId=${ADMIN_REPORT_ACCOUNT_ID}`, screen: 'ADM-08', snapshot: 'admin-account-restrictions' }
] as const;

test.describe('F5 account reports and restrictions', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'ADM-06, ADM-07, ADM-08' });
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-06.png SHA-256 9631d0e9adc4fd897c3190c549a75a04ec17969ba933060c9f552ab893d79cbd; ADM-07.png SHA-256 01b86cdf11b66172500931c4319623965eb6bb0f31561ec8cf9ef5b1cff38956; ADM-08.png SHA-256 52c5515bfd5f53c993dd83dfecf841f829ddad26971557b8040373223a575d91; approved local admin exports with Drive/Figma references recorded in frontend_062 evidence.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminAccountReports(page);
  });

  test('covers ADM-06 through ADM-08 with locale direction, safe projections, focus, and visual evidence', async ({ page }) => {
    const locale = localeForReportsProject(test.info().project.name);
    for (const routeCase of routes) {
      const response = await page.goto(`${routeCase.path}${routeCase.path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator(`[data-screen-id="${routeCase.screen}"]`)).toBeVisible();
      await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('.admin-dashboard__navigation')).toHaveAttribute('aria-label', /.+/u);
      await expect(page.locator('.admin-dashboard__navigation a[data-active="true"]')).toHaveCount(1);
      await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

      await page.locator('.a11y-skip-link').focus();
      await expect(page.locator('.a11y-skip-link')).toBeFocused();
      await page.locator('.admin-dashboard__navigation a').nth(1).focus();
      await expect(page.locator('.admin-dashboard__navigation a').nth(1)).toBeFocused();

      await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
      await expect(page).toHaveScreenshot(`${routeCase.snapshot}-${locale}.png`, { fullPage: true });
    }
  });

  test('requires a reason and sends only server-authorized report and restriction actions', async ({ page }) => {
    const locale = localeForReportsProject(test.info().project.name);
    await page.goto(`/admin/account-reports?reportId=${ADMIN_REPORT_ID}&lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-07"]')).toBeVisible();
    const resolveRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().includes(`/api/v1/admin/account-reports/${ADMIN_REPORT_ID}/resolve`));
    await page.getByRole('button', { name: locale === 'ar' ? 'إغلاق البلاغ' : locale === 'zh-CN' ? '解决报告' : 'Resolve report' }).click();
    await expect(page.getByRole('button', { name: locale === 'ar' ? 'إغلاق البلاغ' : locale === 'zh-CN' ? '解决报告' : 'Resolve report' })).toBeVisible();
    await page.getByLabel(locale === 'ar' ? 'سبب هذا الإجراء' : locale === 'zh-CN' ? '本次操作原因' : 'Reason for this action').fill('Reviewed with evidence');
    await page.getByRole('button', { name: locale === 'ar' ? 'إغلاق البلاغ' : locale === 'zh-CN' ? '解决报告' : 'Resolve report' }).click();
    const request = await resolveRequest;
    expect(JSON.parse(request.postData() ?? '{}')).toEqual({ version: 1, action: 'resolve', reason: 'Reviewed with evidence' });
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
  });

  test('fails closed for a non-admin session', async ({ page }) => {
    const locale = localeForReportsProject(test.info().project.name);
    await page.unroute('**/api/v1/auth/refresh');
    await routeAdminAccountReports(page, 'seeker', 'non-admin.account-reports.e2e');
    await page.goto(`/admin/account-reports?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="forbidden"]')).toBeVisible();
    await expect(page.locator('[data-screen-id]')).toHaveCount(0);
  });
});
