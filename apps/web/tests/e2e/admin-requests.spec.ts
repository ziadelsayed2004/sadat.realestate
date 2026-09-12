import { expect, test } from '@playwright/test';
import { adminIssueId, adminRequestId, adminViewingId, localeForAdminRequests, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test.describe('ADM-18 through ADM-24 request administration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-18 exact recovered Figma node 6017:69276 / page 6017:4356; ADM-19 through ADM-24 local final exports' });
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

  test('keeps the recovered ADM-18 shell measurements with the approved locale direction', async ({ page }) => {
    const locale = localeForAdminRequests(test.info().project.name);
    await page.setViewportSize({ width: 1577, height: 944 });
    await page.goto(`/admin/requests?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-18"]')).toBeVisible();
    const geometry = await page.evaluate(() => {
      const rectangle = (selector: string) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      };
      return {
        viewport: { width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth },
        header: rectangle('.route-shell__header'),
        sidebar: rectangle('.admin-dashboard__navigation'),
        filters: rectangle('.admin-requests__filters--compact'),
        exportButton: rectangle('.admin-requests__export .ui-button'),
        firstBadge: rectangle('.admin-requests__table--requests tbody .admin-requests__badge'),
        tableWrap: rectangle('.admin-requests__table-wrap'),
        actionButton: rectangle('.admin-requests__table--requests tbody td:last-child .ui-button')
      };
    });
    expect(geometry.viewport).toEqual({ width: 1577, scrollWidth: 1577 });
    expect(geometry.header).toMatchObject({ x: 0, y: 0, width: 1577, height: 64 });
    expect(geometry.sidebar).toMatchObject({ x: locale === 'ar' ? 1321 : 0, y: 64, width: 256, height: 880 });
    expect(geometry.filters.height).toBe(72);
    expect(geometry.exportButton).toMatchObject({ width: 117, height: 38 });
    expect(geometry.firstBadge.height).toBe(22);
    expect(geometry.actionButton.height).toBe(28);
    expect(geometry.actionButton.width).toBeCloseTo(locale === 'ar' ? 96.421875 : 96, 2);
    expect(geometry.actionButton.x).toBeGreaterThanOrEqual(geometry.tableWrap.x);
    expect(geometry.actionButton.x + geometry.actionButton.width).toBeLessThanOrEqual(geometry.tableWrap.x + geometry.tableWrap.width);
    await expect(page.locator('.admin-requests__table--requests tbody tr').first().locator('td').nth(6)).toContainText(locale === 'ar' ? '15 يناير 2024' : 'January 15, 2024');
    await expect(page.locator('.admin-requests__pagination')).toHaveCount(0);
  });

  test('requires an audit reason before submitting an available action', async ({ page }) => {
    const locale = localeForAdminRequests(test.info().project.name);
    await page.goto(`/admin/requests?lang=${encodeURIComponent(locale)}`);
    await page.getByTestId(`admin-request-${adminRequestId}`).getByRole('button').click();
    await expect(page.getByTestId('admin-request-detail')).toBeVisible();
    const save = page.getByRole('button', { name: /save transition|حفظ الانتقال|保存转换/iu });
    await save.click();
    await expect(page.getByText(/Choose an action and provide a reason|اختر إجراءً وأدخل سببًا|请选择操作并填写原因/iu)).toBeVisible();
    await page.getByRole('textbox', { name: /transition reason|سبب الانتقال|转换原因/iu }).fill('Verified by the moderation operator');
    const mutation = page.waitForRequest(request => request.method() === 'POST' && request.url().includes(`/api/v1/admin/requests/${adminRequestId}/transition`));
    await save.click();
    const request = await mutation;
    expect(request.postDataJSON()).toMatchObject({ reason: 'Verified by the moderation operator', expectedVersion: 2 });
    await expect(page.getByText(/Transition saved|تم حفظ الانتقال|转换已保存/u)).toBeVisible();
  });

  test('applies an empty status and restores all requests without a page refresh', async ({ page }) => {
    const locale = localeForAdminRequests(test.info().project.name);
    await page.goto(`/admin/requests?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-testid^="admin-request-"]')).toHaveCount(6);
    const navigationCount = await page.evaluate(() => performance.getEntriesByType('navigation').length);
    await page.locator('.admin-requests__quick-status').getByRole('button', { name: locale === 'ar' ? 'مغلق' : 'Closed', exact: true }).click();
    await expect(page.locator('[data-state="empty"]')).toBeVisible();
    await page.locator('.admin-requests__quick-status').getByRole('button', { name: locale === 'ar' ? 'الكل' : 'All', exact: true }).click();
    await expect(page.locator('[data-testid^="admin-request-"]')).toHaveCount(6);
    await expect.poll(() => page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(navigationCount);
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminRequestApis(page, false);
    await page.goto('/admin/requests?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
