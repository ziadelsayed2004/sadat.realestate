import { expect, test } from '@playwright/test';
import { routeAdminAdsApis } from './admin-ads.fixtures.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

const routes = [
  ['/admin/ads/requests', 'ADM-33'],
  ['/admin/ads/payment-proofs/pending', 'ADM-34'],
  ['/admin/ads/payment-proofs/approved', 'ADM-35'],
  ['/admin/ads/calendar', 'ADM-36'],
  ['/admin/ads/payments/pending-review', 'ADM-37'],
  ['/admin/ads/financial-review', 'ADM-38']
] as const;

test('admin advertising routes expose landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminAdsApis(page);
  const locale = localeForProject();
  for (const [path, screenId] of routes) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
    await expect(page.locator('.admin-ads__tabs[aria-label]')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }
  await page.goto(`/admin/ads/requests?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('form[role="search"]')).toHaveAttribute('aria-label', /.+/u);
  await expect(page.locator('label[for="admin-ads-provider"]')).toBeVisible();
  await expect(page.locator('label[for="admin-ads-request-status"]')).toBeVisible();
  await page.goto(`/admin/ads/payments/pending-review?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#admin-ads-review-reason')).toBeVisible();
  await expect(page.locator('label[for="admin-ads-review-reason"]')).toBeVisible();
});
