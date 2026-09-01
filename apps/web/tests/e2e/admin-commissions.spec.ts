import { expect, test } from '@playwright/test';
import { adminCommissionAccountId, expectNoPrivateCommissionFields, routeAdminCommissionApis } from './admin-commissions.fixtures.ts';

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

test.describe('ADM-39 through ADM-45 commission administration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-39..ADM-45 checked-in local final exports under docs/design_sources/final_screens/admin; per-screen Drive references in DESIGN_SOURCE_MANIFEST.json; shared Figma prototype node 6017:61879.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminCommissionApis(page);
  });

  test('renders every approved route with locale direction, desktop scope, and safe projections', async ({ page }) => {
    const locale = localeForProject();
    for (const [path, screenId] of routes) {
      await page.goto(`${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('.admin-commissions__tabs[aria-label]')).toBeVisible();
      await expectNoPrivateCommissionFields(page);
    }
  });

  test('creates an explicit policy without a universal commission value', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/commissions/new?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#admin-commission-policy-key').fill('default.sale');
    await page.locator('#admin-commission-policy-label').fill('Default sale commission');
    await page.locator('#admin-commission-policy-percentage').fill('250');
    await page.locator('#admin-commission-policy-effective-from').fill('2026-08-20T09:00');
    const requestPromise = page.waitForRequest(request => request.method() === 'POST' && request.url().includes('/api/v1/admin/commission-policies'));
    await page.locator('.admin-commissions__form button[type="submit"]').click();
    const request = await requestPromise;
    const body = request.postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({ key: 'default.sale', kind: 'percentage', percentageBps: 250, scope: { kind: 'default' } });
    expect(body).not.toHaveProperty('universalPrice');
    await expect(page.locator('.admin-commissions__feedback[data-tone="success"]')).toBeVisible();
    await expectNoPrivateCommissionFields(page);
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminCommissionApis(page, false);
    await page.goto('/admin/commissions?lang=en', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
