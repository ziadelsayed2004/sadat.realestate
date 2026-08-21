import { expect, test } from '@playwright/test';
import { routeAdminHomeApis } from './admin-home.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('Admin homepage routes expose landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminHomeApis(page);
  const locale = localeForProject();
  for (const [path, screenId] of [['/admin/banners', 'ADM-46'], ['/admin/banners/new', 'ADM-47'], ['/admin/content/tips', 'ADM-48'], ['/admin/content/homepage', 'ADM-49']] as const) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.admin-home__tabs[aria-label]')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }
});
