import { expect, test } from '@playwright/test';
import { localeForAdminRequests, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test('request administration routes expose landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminRequestApis(page);
  const locale = localeForAdminRequests(test.info().project.name);
  for (const pathname of ['/admin/requests', '/admin/customer-requests', '/admin/overdue-requests', '/admin/contact-requests', '/admin/viewing-requests', '/admin/search-requests', '/admin/request-issues']) {
    await page.goto(`${pathname}?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
    await expect(page.locator('[data-screen-id]').first()).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  }
});
