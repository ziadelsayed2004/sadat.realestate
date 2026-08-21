import { expect, test } from '@playwright/test';
import { routeAdminHomeApis } from './admin-home.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-46 through ADM-49 match the approved desktop visual matrix', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  test.info().annotations.push({ type: 'design-source', description: 'Local final exports docs/design_sources/final_screens/admin/ADM-46.png through ADM-49.png; Figma prototype node 6017:61879; approved Admin Desktop scope.' });
  await routeAdminHomeApis(page);
  const locale = localeForProject();
  for (const [name, path, screenId] of [['banners', '/admin/banners', 'ADM-46'], ['banner-create', '/admin/banners/new', 'ADM-47'], ['tips', '/admin/content/tips', 'ADM-48'], ['homepage', '/admin/content/homepage', 'ADM-49']] as const) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-home-${locale}-${name}.png`, { fullPage: true });
  }
});
