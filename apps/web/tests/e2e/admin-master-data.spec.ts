import { expect, test } from '@playwright/test';
import { localeForMasterDataProject, routeAdminMasterData } from './admin-master-data.fixtures';

const routes = [
  { path: '/admin/property-categories', screen: 'ADM-09', snapshot: 'admin-master-data-categories' },
  { path: '/admin/locations', screen: 'ADM-10', snapshot: 'admin-master-data-locations' },
  { path: '/admin/features', screen: 'ADM-11', snapshot: 'admin-master-data-features' }
] as const;

test.describe('ADM-09 through ADM-11 admin master data', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'ADM-09, ADM-10, ADM-11' });
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-09.png SHA-256 52ae46a190459829731d603b7bb6aa8f9bdd17c7231c7c80404fb5cfc805f73e; ADM-10.png SHA-256 061894c2847d6e6e460c256d63ebec480f5982d3a241b362d9e283251eeb0b86; ADM-11.png SHA-256 f6eb4f8312ee363f0ac4bd3e6936dbada91b47bf7f11d7c5fc238af7d6f9f6fa; approved local exports under docs/design_sources/final_screens/admin/; Drive and Figma references recorded in frontend_063 evidence.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminMasterData(page);
  });

  test('covers all master-data screens with locale direction, server projections, focus, and visual evidence', async ({ page }) => {
    const locale = localeForMasterDataProject(test.info().project.name);
    for (const routeCase of routes) {
      const response = await page.goto(`${routeCase.path}?lang=${encodeURIComponent(locale)}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator(`[data-screen-id="${routeCase.screen}"]`)).toBeVisible();
      await expect(page.locator(`[data-screen-id="${routeCase.screen}"]`)).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('.admin-dashboard__navigation')).toHaveAttribute('aria-label', /.+/u);
      await expect(page.locator('.admin-master-data__tabs a[data-active="true"]')).toHaveCount(1);
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

      await page.locator('.a11y-skip-link').focus();
      await expect(page.locator('.a11y-skip-link')).toBeFocused();
      await page.locator('.admin-dashboard__navigation a').nth(1).focus();
      await expect(page.locator('.admin-dashboard__navigation a').nth(1)).toBeFocused();

      await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
      await expect(page).toHaveScreenshot(`${routeCase.snapshot}-${locale}.png`, { fullPage: true });
    }
  });

  test('submits a strict category mutation through the implemented route', async ({ page }) => {
    const locale = localeForMasterDataProject(test.info().project.name);
    await page.goto(`/admin/property-categories?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-09"]')).toBeVisible();
    await page.getByRole('button', { name: /Add item|إضافة عنصر|添加项目/u }).first().click();
    await page.locator('#admin-master-data-slug').fill('projects');
    await page.locator('#admin-master-data-name-en').fill('Projects');
    await page.locator('#admin-master-data-order').fill('2');
    await page.locator('#admin-master-data-reason').fill('Approved category');
    const request = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/admin/property-categories'));
    await page.getByRole('button', { name: /Save|حفظ|保存/u }).click();
    const mutation = await request;
    expect(mutation.headers().authorization).toBe('Bearer admin.master-data.e2e');
    expect(JSON.parse(mutation.postData() ?? '{}')).toMatchObject({ kind: 'category', slug: 'projects', order: 2, reason: 'Approved category' });
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('fails closed for a non-admin session', async ({ page }) => {
    const locale = localeForMasterDataProject(test.info().project.name);
    await page.unroute('**/api/v1/auth/refresh');
    await routeAdminMasterData(page, 'seeker', 'non-admin.master-data.e2e');
    await page.goto(`/admin/features?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="forbidden"]')).toBeVisible();
    await expect(page.locator('[data-screen-id]')).toHaveCount(0);
  });
});
