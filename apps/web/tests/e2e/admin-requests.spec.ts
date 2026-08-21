import { expect, test } from '@playwright/test';
import { adminIssueId, adminRequestId, adminViewingId, localeForAdminRequests, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test.describe('ADM-18 through ADM-24 request administration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-18 through ADM-24 local final exports; Figma node 6017:61879 / page 6017:4356' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminRequestApis(page);
  });

  test('renders all request projections with locale direction and safe server data', async ({ page }) => {
    const locale = localeForAdminRequests(test.info().project.name);
    const routes = [
      ['/admin/requests', 'ADM-18'],
      ['/admin/customer-requests', 'ADM-19'],
      ['/admin/overdue-requests', 'ADM-20'],
      ['/admin/contact-requests', 'ADM-21'],
      ['/admin/viewing-requests', 'ADM-22'],
      ['/admin/search-requests', 'ADM-23'],
      ['/admin/request-issues', 'ADM-24']
    ] as const;
    for (const [pathname, screenId] of routes) {
      await page.goto(`${pathname}?lang=${encodeURIComponent(locale)}`);
      await expect(page.locator(`[data-screen-id="${screenId}"]`).first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
      if (screenId === 'ADM-22') await expect(page.getByTestId(`admin-viewing-${adminViewingId}`)).toBeVisible();
      else if (screenId === 'ADM-24') await expect(page.getByTestId(`admin-issue-${adminIssueId}`)).toBeVisible();
      else await expect(page.getByTestId(`admin-request-${adminRequestId}`)).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/internalNotes|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    }
  });

  test('renders request details and submits only an available action', async ({ page }) => {
    const locale = localeForAdminRequests(test.info().project.name);
    await page.goto(`/admin/requests?lang=${encodeURIComponent(locale)}`);
    await page.getByTestId(`admin-request-${adminRequestId}`).getByRole('button').click();
    await expect(page.getByTestId('admin-request-detail')).toBeVisible();
    await page.getByRole('button', { name: /save transition|حفظ الانتقال|保存转换/iu }).click();
    await expect(page.getByText(/Transition saved|تم حفظ الانتقال|转换已保存/u)).toBeVisible();
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminRequestApis(page, false);
    await page.goto('/admin/requests?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
