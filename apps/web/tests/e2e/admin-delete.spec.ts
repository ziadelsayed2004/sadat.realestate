import { expect, test } from '@playwright/test';
import { adminId, routeAdminRbacApis } from './admin-rbac.fixtures.ts';

test('administrator deletion confirms identity, cancels safely and removes the account after API success', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  await routeAdminRbacApis(page);
  let removed = false;
  let mutations = 0;
  await page.route('**/api/v1/admin/admin-users**', async route => {
    if (route.request().method() === 'DELETE') {
      mutations++;
      expect(route.request().postDataJSON()).toEqual({ expectedVersion: 3 });
      removed = true;
      return route.fulfill({ json: { data: { id: adminId, deleted: true, version: 4 }, meta: { requestId: 'delete-admin-browser' } } });
    }
    return route.fulfill({ json: { data: { items: removed ? [] : [{ id: adminId, email: 'operations@example.com', displayName: 'Operations Admin', accessLevel: 'standard_admin', status: 'active', version: 3, createdAt: '2026-08-20T08:00:00.000Z', updatedAt: '2026-08-20T08:00:00.000Z', availableActions: ['update', 'disable', 'delete'] }], page: 1, limit: 20, total: removed ? 0 : 1 }, meta: { requestId: 'admin-delete-list' } } });
  });
  await page.goto(`/admin/admin-users?lang=${locale}`);
  const button = page.getByRole('button', { name: `${ar ? 'حذف' : 'Delete'} Operations Admin` });
  await button.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('operations@example.com');
  await expect(dialog).toContainText(ar ? 'يظل سجل إجراءاته محفوظًا' : 'Its activity history is retained');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(mutations).toBe(0);
  await button.click();
  if (test.info().project.name === 'mobile-ar') await dialog.screenshot({ path: '.tmp/admin-delete-mobile-ar.png' });
  await dialog.getByRole('button', { name: ar ? 'تأكيد الحذف' : 'Confirm delete' }).click();
  await expect(dialog).toBeHidden();
  await expect(button).toHaveCount(0);
  await expect(page.getByText(ar ? 'تم حذف حساب الإدارة وإيقاف دخوله.' : 'Administrator deleted and access revoked.')).toBeVisible();
  expect(mutations).toBe(1);
});
