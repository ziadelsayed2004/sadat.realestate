import { expect, test } from '@playwright/test';
import { routeAdminCommunityApis } from './admin-community.fixtures.ts';

function localeForCommunity(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-27 through ADM-29 match the approved desktop visual baseline', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminCommunityApis(page);
  const locale = localeForCommunity();
  const routes = [
    ['/admin/community', 'posts'],
    ['/admin/community/comments', 'comments'],
    ['/admin/community/moderation', 'reports']
  ] as const;
  for (const [path, name] of routes) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator(`[data-screen-id="${name === 'posts' ? 'ADM-27' : name === 'comments' ? 'ADM-28' : 'ADM-29'}"]`)).toBeVisible();
    await page.evaluate(async () => {
      await Promise.all(['400 16px Cairo', '600 16px Cairo', '700 16px Cairo', '800 16px Cairo'].map(font => document.fonts.load(font)));
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    await page.waitForTimeout(500);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`admin-community-${locale}-${name}.png`, { fullPage: true, maxDiffPixels: 800 });
  }
});
