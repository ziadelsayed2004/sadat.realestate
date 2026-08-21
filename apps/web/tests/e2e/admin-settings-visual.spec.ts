import { expect, test } from '@playwright/test';
import { routeAdminSettingsApis } from './admin-settings.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-50 through ADM-58 render the Admin Desktop settings visual regression matrix', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  test.info().annotations.push({ type: 'design-source', description: 'ADM-50 through ADM-53 and ADM-55 through ADM-58 use checked-in Admin Desktop exports under docs/design_sources/final_screens/admin. ADM-54 is rendered for implementation regression only because its approved source remains an inaccessible external group reference with no local export.' });
  await routeAdminSettingsApis(page);
  const locale = localeForProject();
  const routes = [
    ['platform', '/admin/settings/platform', 'ADM-50'],
    ['contact', '/admin/settings/contact', 'ADM-51'],
    ['social', '/admin/settings/social', 'ADM-52'],
    ['properties', '/admin/settings/properties', 'ADM-53'],
    ['requests', '/admin/settings/requests', 'ADM-54'],
    ['advertising', '/admin/settings/advertising', 'ADM-55'],
    ['seo', '/admin/settings/seo', 'ADM-56'],
    ['privacy-security', '/admin/settings/privacy-security', 'ADM-57'],
    ['display', '/admin/settings/display', 'ADM-58']
  ] as const;
  for (const [name, path, screenId] of routes) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
    if (screenId !== 'ADM-54') await expect(page).toHaveScreenshot(`admin-settings-${locale}-${name}.png`, { fullPage: true });
  }
});
