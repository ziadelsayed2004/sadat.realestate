import { expect, test } from '@playwright/test';
import {
  ADMIN_DOCUMENT_ID,
  ADMIN_INACTIVE_DOCUMENT_ID,
  ADMIN_PROVIDER_ID,
  localeForProject,
  routeAdminAccounts
} from './admin-accounts.fixtures';

const routes = [
  { path: '/admin/users', screen: 'ADM-02', snapshot: 'admin-accounts-users' },
  { path: '/admin/property-seekers', screen: 'ADM-03', snapshot: 'admin-accounts-seekers' },
  { path: '/admin/providers', screen: 'ADM-04', snapshot: 'admin-accounts-providers' },
  { path: '/admin/verification', screen: 'ADM-05', snapshot: 'admin-accounts-verification' }
] as const;

test.describe('F5 Admin accounts and provider verification', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'ADM-02, ADM-03, ADM-04, ADM-05' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/admin/ADM-02.png (SHA-256 b0636cdce357647f5c0c681c89e78615b3a13b32031d619b8aa85b961e89be04); ADM-03.png (SHA-256 cb77e6cfaa44ba6506311051558873d9d42d88b4c808fa93ef5abdc97f2be88a); ADM-04.png (SHA-256 499572bc168ed20b8fd0ea4b8eb37e24efaa4f49a159d6b77f0fd0bee9fec2c2); ADM-05.png (SHA-256 b188e8f2fb39086f902eabb9f6f85fe18d9b9567cd5a2ebe6119887e12edee89); Drive folders and Figma references recorded in frontend_061 completion evidence.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminAccounts(page);
  });

  test('covers ADM-02 through ADM-05 with locale direction, admin access, safe projections, focus, and visual evidence', async ({ page }) => {
    const locale = localeForProject(test.info().project.name);
    for (const routeCase of routes) {
      const response = await page.goto(`${routeCase.path}?lang=${encodeURIComponent(locale)}`);
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

  test('opens only a clean active provider document through the reviewer grant', async ({ page }) => {
    const locale = localeForProject(test.info().project.name);
    await page.goto(`/admin/providers/${ADMIN_PROVIDER_ID}?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-04"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Provider Owner', level: 1 })).toBeVisible();
    await expect(page.locator(`[data-testid="admin-document-${ADMIN_DOCUMENT_ID}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="admin-document-${ADMIN_INACTIVE_DOCUMENT_ID}"] button:disabled`)).toHaveCount(1);

    const openButton = page.locator('main button:not(:disabled)');
    await expect(openButton).toHaveCount(1);
    const accessRequest = page.waitForRequest(request => request.url().includes(`/api/v1/admin/provider-documents/${ADMIN_DOCUMENT_ID}/access`));
    const popup = page.waitForEvent('popup');
    await openButton.click();
    await accessRequest;
    const openedPage = await popup;
    await expect.poll(() => openedPage.url()).toContain(`/api/v1/private/provider-documents/${ADMIN_DOCUMENT_ID}`);
    await openedPage.close();
    await expect(page.locator('body')).not.toContainText(/storageKey|privateUrl|internalNotes|auditData/u);
  });

  test('fails closed for a non-admin session', async ({ page }) => {
    const locale = localeForProject(test.info().project.name);
    await page.unroute('**/api/v1/auth/refresh');
    await routeAdminAccounts(page, 'seeker', 'non-admin.accounts.e2e');
    await page.goto(`/admin/users?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="forbidden"]')).toBeVisible();
    await expect(page.locator('[data-screen-id]')).toHaveCount(0);
  });
});
