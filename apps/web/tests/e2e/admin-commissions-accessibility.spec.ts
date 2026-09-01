import { expect, test } from '@playwright/test';
import { adminCommissionAccountId, routeAdminCommissionApis } from './admin-commissions.fixtures.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

const routes = [
  ['/admin/commissions', 'ADM-39'],
  ['/admin/commissions/new', 'ADM-40'],
  ['/admin/commissions/history', 'ADM-41'],
  [`/admin/commissions/account?accountId=${adminCommissionAccountId}`, 'ADM-42'],
  ['/admin/commissions/exceptions', 'ADM-43'],
  ['/admin/commissions/exceptions/new', 'ADM-44'],
  ['/admin/commissions/confirmations', 'ADM-45']
] as const;

test('commission routes expose landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminCommissionApis(page);
  const locale = localeForProject();
  for (const [path, screenId] of routes) {
    await page.goto(`${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
    await expect(page.locator('.admin-commissions__tabs[aria-label]')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }
  await page.goto(`/admin/commissions?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('form[role="search"]')).toHaveAttribute('aria-label', /.+/u);
  await expect(page.locator('label[for="admin-commission-policies-status"]')).toBeVisible();
  await page.goto(`/admin/commissions/new?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#admin-commission-policy-key')).toHaveAttribute('required', '');
  await expect(page.locator('label[for="admin-commission-policy-effective-from"]')).toBeVisible();
  await page.goto(`/admin/commissions/exceptions/new?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#admin-commission-exception-reason')).toHaveAttribute('required', '');
  await expect(page.locator('label[for="admin-commission-exception-reason"]')).toBeVisible();
});
