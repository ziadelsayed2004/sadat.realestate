import { expect, test } from '@playwright/test';
import { adminUserFixture, routeAdminAccounts } from './admin-accounts.fixtures';

test('status filters preserve global totals, recover from empty states and paginate correctly', async ({ page }) => {
  const ar = test.info().project.name.endsWith('-ar');
  const summary = { total: 45, seekers: 30, providers: 15, verified: 40, pending: 3, restricted: 2 };
  await routeAdminAccounts(page);
  const seen: string[] = [];
  await page.route('**/api/v1/admin/users**', async route => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');
    seen.push(status ?? 'all');
    const empty = status === 'suspended';
    await route.fulfill({ json: { data: {
      items: empty ? [] : [{ ...adminUserFixture(), ...(status === 'pending_review' ? { status } : {}) }], page: Number(url.searchParams.get('page') ?? 1), limit: 20,
      total: empty ? 0 : status === 'pending_review' ? 3 : status === 'verified' ? 40 : 45, summary
    }, meta: { requestId: 'account-counts' } } });
  });
  await page.goto(`/admin/users?lang=${ar ? 'ar' : 'en'}`);
  const total = page.getByTestId('admin-accounts-total');
  await expect(total.locator('strong')).toHaveText('45');
  const pending = page.getByTestId('admin-accounts-metric-5');
  await expect(pending.locator('strong')).toHaveText('3');
  await page.getByRole('button', { name: ar ? 'قيد المراجعة' : 'Pending review', exact: true }).click();
  await expect(page.getByTestId('admin-accounts-metric-1').locator('strong')).toHaveText('3');
  await expect(pending.locator('strong')).toHaveText('3');
  await expect(page.locator('tbody tr')).toContainText(ar ? 'قيد المراجعة' : 'Pending review');
  await page.getByRole('button', { name: ar ? 'موثق' : 'Verified', exact: true }).click();
  await expect(page.getByTestId('admin-accounts-metric-1').locator('strong')).toHaveText('40');
  await expect(total.locator('strong')).toHaveText('45');
  await page.getByRole('button', { name: ar ? 'موقوف' : 'Suspended', exact: true }).click();
  await expect(page.getByTestId('admin-accounts-metric-1').locator('strong')).toHaveText('0');
  await expect(total.locator('strong')).toHaveText('45');
  await expect(page.getByTestId('admin-accounts-metric-4').locator('strong')).toHaveText('40');
  await expect(page.locator('.admin-accounts__empty')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('account-empty-status.png'), fullPage: true });
  await page.getByRole('button', { name: ar ? 'الكل' : 'All', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: ar ? 'التالي' : 'Next', exact: true }).click();
  await expect(page.locator('.admin-accounts__pagination')).toContainText('2 / 3');
  await expect(total.locator('strong')).toHaveText('45');
  expect(seen).toEqual(['all', 'pending_review', 'verified', 'suspended', 'all', 'all']);
});
