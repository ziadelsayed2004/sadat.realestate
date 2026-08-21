import { expect, test } from '@playwright/test';
import { routeAdminNotificationsAuditApis } from './admin-notifications-audit.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-65 and ADM-66 expose labeled landmarks and visible keyboard focus', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminNotificationsAuditApis(page);
  const locale = localeForProject();
  await page.goto(`/admin/notifications?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('[data-screen-id="ADM-65"] [role="list"][aria-label]')).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');

  await page.goto(`/admin/audit-logs?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-screen-id="ADM-66"] table caption')).toBeVisible();
  await expect(page.locator('[data-screen-id="ADM-66"] input').first()).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
});
