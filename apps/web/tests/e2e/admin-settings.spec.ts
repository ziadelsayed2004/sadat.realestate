import { expect, test } from '@playwright/test';
import { routeAdminSettingsApis } from './admin-settings.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test.describe('ADM-50 through ADM-58 admin settings', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-50 through ADM-53 and ADM-55 through ADM-58 use the checked-in Admin Desktop exports under docs/design_sources/final_screens/admin. ADM-54 remains an external group reference only with no local export.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminSettingsApis(page);
  });

  test('renders all implemented settings routes with locale direction and safe projections', async ({ page }) => {
    const locale = localeForProject();
    const routes = [
      ['/admin/settings/platform', 'ADM-50', 'platform'],
      ['/admin/settings/contact', 'ADM-51', 'contact'],
      ['/admin/settings/social', 'ADM-52', 'social'],
      ['/admin/settings/properties', 'ADM-53', 'properties'],
      ['/admin/settings/requests', 'ADM-54', 'requests'],
      ['/admin/settings/advertising', 'ADM-55', 'advertising'],
      ['/admin/settings/seo', 'ADM-56', 'seo'],
      ['/admin/settings/privacy-security', 'ADM-57', 'privacy-security'],
      ['/admin/settings/display', 'ADM-58', 'display']
    ] as const;
    for (const [path, screenId, namespace] of routes) {
      await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
      await expect(page.getByTestId(`admin-settings-${namespace}-form`)).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|privateUrl|auditData|internalNotes/u);
    }
  });

  test('sends a reason and current version for a multilingual update', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/settings/platform?lang=${encodeURIComponent(locale)}`);
    await page.locator('#admin-settings-platform_name-en').fill('Sadat Homes');
    await page.getByLabel(/change reason|سبب التغيير|更改原因/iu).fill('Update approved platform name');
    const update = page.waitForRequest(request => request.method() === 'PUT' && request.url().endsWith('/api/v1/admin/settings/platform'));
    await page.getByRole('button', { name: /save changes|حفظ التغييرات|保存更改/iu }).click();
    const request = await update;
    expect(request.postDataJSON()).toMatchObject({ expectedVersion: 4, schemaVersion: 1, reason: 'Update approved platform name', values: { platform_name: { en: 'Sadat Homes' } } });
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminSettingsApis(page, false);
    await page.goto('/admin/settings/requests?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
