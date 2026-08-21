import { expect, test } from '@playwright/test';
import { adminHomeBannerId, adminHomeSectionId, adminHomeTipId, routeAdminHomeApis } from './admin-home.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test.describe('ADM-46 through ADM-49 homepage administration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-46 docs/design_sources/final_screens/admin/ADM-46.png; ADM-47 ADM-47.png; ADM-48 ADM-48.png; ADM-49 ADM-49.png; approved desktop scope, Drive folders and Figma prototype node 6017:61879.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminHomeApis(page);
  });

  test('renders each approved route with locale direction and safe projections', async ({ page }) => {
    const locale = localeForProject();
    const routes = [
      ['/admin/banners', 'ADM-46', `admin-home-banner-${adminHomeBannerId}`],
      ['/admin/banners/new', 'ADM-47', 'admin-home-banner-editor'],
      ['/admin/content/tips', 'ADM-48', `admin-home-tips-${adminHomeTipId}`],
      ['/admin/content/homepage', 'ADM-49', `admin-home-homepage-${adminHomeSectionId}`]
    ] as const;
    for (const [path, screenId, testId] of routes) {
      await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|assignedTo|auditData/u);
    }
  });

  test('requires localized title and creates a banner through the implemented routes', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/banners/new?lang=${encodeURIComponent(locale)}`);
    await page.locator('#admin-home-banner-title-en').fill('New homepage banner');
    await page.locator('#admin-home-banner-start').fill('2026-08-20T10:00');
    await page.locator('#admin-home-banner-end').fill('2026-09-20T10:00');
    const create = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/admin/banners'));
    await page.getByRole('button', { name: /save|حفظ|保存/iu }).click();
    await create;
    await expect(page.getByRole('status')).toContainText(/saved|تم الحفظ|已保存/iu);
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminHomeApis(page, false);
    await page.goto('/admin/content/tips?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
