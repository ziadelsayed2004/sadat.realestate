import { expect, test } from '@playwright/test';
import { adminIssueId, adminRequestId, adminViewingId, localeForAdminRequests, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test('ADM-18 through ADM-24 match the approved desktop visual baseline', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminRequestApis(page);
  const locale = localeForAdminRequests(test.info().project.name);
  const routes = [
    ['all', '/admin/requests', 'ADM-18'],
    ['customer', '/admin/customer-requests', 'ADM-19'],
    ['overdue', '/admin/overdue-requests', 'ADM-20'],
    ['contact', '/admin/contact-requests', 'ADM-21'],
    ['viewing', '/admin/viewing-requests', 'ADM-22'],
    ['search', '/admin/search-requests', 'ADM-23'],
    ['issues', '/admin/request-issues', 'ADM-24']
  ] as const;
  for (const [name, pathname, screenId] of routes) {
    await page.goto(`${pathname}?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator(`[data-screen-id="${screenId}"]`).first()).toBeVisible();
    if (name === 'viewing') await expect(page.getByTestId(`admin-viewing-${adminViewingId}`)).toBeVisible();
    else if (name === 'issues') await expect(page.getByTestId(`admin-issue-${adminIssueId}`)).toBeVisible();
    else await expect(page.getByTestId(`admin-request-${adminRequestId}`)).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-requests-${locale}-${name}.png`, { fullPage: true, maxDiffPixels: 300 });
  }
});
