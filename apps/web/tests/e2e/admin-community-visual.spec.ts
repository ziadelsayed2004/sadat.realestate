import { expect, test } from '@playwright/test';
import { routeAdminCommunityApis } from './admin-community.fixtures.ts';

function localeForCommunity(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
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
    await expect(page).toHaveScreenshot(`admin-community-${locale}-${name}.png`, { fullPage: true });
  }
});
