import { expect, test } from '@playwright/test';
import { adminUserFixture, routeAdminAccounts } from './admin-accounts.fixtures';

test('account deletion identifies the target, requires confirmation, cancels safely and refreshes the list', async ({ page }) => {
  const ar = test.info().project.name.endsWith('-ar');
  const locale = ar ? 'ar' : 'en';
  await routeAdminAccounts(page);
  const user = { ...adminUserFixture(), id: 'c'.repeat(24), canManage: true };
  let deleted = false;
  let requests = 0;
  await page.route('**/api/v1/admin/users**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.accounts.e2e');
    if (route.request().method() === 'DELETE') {
      expect(new URL(route.request().url()).pathname).toBe(`/api/v1/admin/users/${user.id}`);
      expect(route.request().postDataJSON()).toEqual({ version: 2, reason: 'Duplicate account', confirmed: true });
      requests += 1; deleted = true;
      await route.fulfill({ json: { data: { id: user.id, deleted: true }, meta: { requestId: 'delete-account' } } });
    } else await route.fulfill({ json: { data: { items: deleted ? [] : [user], page: 1, limit: 20, total: deleted ? 0 : 1 }, meta: { requestId: 'account-list' } } });
  });
  await page.goto(`/admin/users?lang=${locale}`);
  const remove = page.getByRole('button', { name: ar ? 'حذف الحساب' : 'Delete account', exact: true });
  await remove.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(user.displayName);
  await expect(dialog).toContainText(user.email);
  const confirm = dialog.getByRole('button', { name: ar ? 'تأكيد الحذف' : 'Confirm deletion', exact: true });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('button', { name: ar ? 'إغلاق' : 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(remove).toBeFocused();
  await remove.click();
  await dialog.getByRole('button', { name: ar ? 'إلغاء' : 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(requests).toBe(0);
  await remove.click();
  await dialog.locator('textarea').fill('Duplicate account');
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await expect(confirm).toBeEnabled();
  await dialog.screenshot({ path: test.info().outputPath(`account-delete-${locale}.png`) });
  await confirm.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: ar ? 'تم حذف الحساب وإلغاء وصوله.' : 'Account deleted and access revoked.' })).toBeVisible();
  await expect(page.locator(`[data-testid="admin-user-${user.id}"]`)).toHaveCount(0);
  expect(requests).toBe(1);
});

test('view-only accounts do not expose deletion actions', async ({ page }) => {
  await routeAdminAccounts(page);
  await page.route('**/api/v1/admin/users**', route => route.fulfill({ json: { data: { items: [{ ...adminUserFixture(), canManage: false }], page: 1, limit: 20, total: 1 }, meta: { requestId: 'read-only' } } }));
  await page.goto(`/admin/users?lang=${test.info().project.name.endsWith('-ar') ? 'ar' : 'en'}`);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Delete account|حذف الحساب/u })).toHaveCount(0);
});
