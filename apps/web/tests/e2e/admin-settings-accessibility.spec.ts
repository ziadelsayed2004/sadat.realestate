import { expect, test } from '@playwright/test';
import { routeAdminSettingsApis } from './admin-settings.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-50 through ADM-58 settings expose landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminSettingsApis(page);
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
    await expect(page.locator('.admin-settings__tabs[aria-label]')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }
});
