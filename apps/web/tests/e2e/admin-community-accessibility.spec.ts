import { expect, test } from '@playwright/test';
import { adminCommunityPostId, routeAdminCommunityApis } from './admin-community.fixtures.ts';

function localeForCommunity(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('community administration exposes landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminCommunityApis(page);
  const locale = localeForCommunity();
  await page.goto(`/admin/community?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
  await expect(page.locator('form[role="search"]')).toHaveAttribute('aria-label', /.+/u);
  await expect(page.locator('label[for="admin-community-search"]')).toBeVisible();
  await expect(page.getByTestId(`admin-community-post-${adminCommunityPostId}`)).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
});
