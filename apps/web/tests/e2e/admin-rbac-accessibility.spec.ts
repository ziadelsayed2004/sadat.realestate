import { expect, test } from '@playwright/test';
import { adminId, routeAdminRbacApis } from './admin-rbac.fixtures.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-59 through ADM-64 expose labeled controls, landmarks, and keyboard focus', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await routeAdminRbacApis(page);
  const locale = localeForProject();
  await page.goto(`/admin/admin-users?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('.admin-rbac__tabs[aria-label]')).toBeVisible();
  await expect(page.locator('table caption')).toContainText(/administrator|المسؤول|مستخدمو الإدارة|管理员/iu);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');

  await page.goto(`/admin/admin-users/${adminId}?lang=${encodeURIComponent(locale)}`);
  await expect(page.getByLabel(/change reason|سبب التغيير|更改原因/iu)).toBeVisible();
  await expect(page.getByRole('button', { name: /save changes|حفظ التغييرات|保存更改/iu })).toBeVisible();
});
