import { expect, test } from '@playwright/test';
import { routeAdminRbacApis, adminId } from './admin-rbac.fixtures.ts';

test('administrator sees their name and staff online status with mobile navigation', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  await page.clock.install();
  await routeAdminRbacApis(page);
  await page.route('**/api/v1/admin/account/presence', route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({});
    return route.fulfill({ json: { data: { id: 'cccccccccccccccccccccccc', displayName: ar ? 'طارق أحمد' : 'Tarek Ahmed' }, meta: { requestId: 'own-admin-name' } } });
  });
  let online = true;
  await page.route('**/api/v1/admin/admin-users**', route => route.fulfill({ json: { data: { items: [{ id: adminId, email: 'staff@example.com', displayName: 'Staff Member', accessLevel: 'standard_admin', status: 'active', version: 1, createdAt: '2026-08-20T08:00:00Z', updatedAt: '2026-08-20T08:00:00Z', availableActions: [], presence: { online, lastActiveAt: '2026-10-10T12:00:00Z' } }], page: 1, limit: 20, total: 1 }, meta: { requestId: 'staff-presence' } } }));
  await page.goto(`/admin/admin-users?lang=${locale}`);
  await expect(page.locator('.admin-shell-header__identity-copy strong')).toHaveText(ar ? 'طارق أحمد' : 'Tarek Ahmed');
  await expect(page.locator('.admin-shell-header__identity-copy strong')).toBeVisible();
  await expect(page.getByText(ar ? '🟢 متصل الآن' : '🟢 Online now', { exact: true })).toBeVisible();
  const compact = test.info().project.name.startsWith('mobile') || test.info().project.name.startsWith('tablet');
  if (compact) await page.getByTestId('admin-sidebar-toggle').click();
  await expect(page.locator('.admin-dashboard__navigation-profile strong')).toHaveText(ar ? 'طارق أحمد' : 'Tarek Ahmed');
  await expect(page.locator('.admin-dashboard__navigation-profile strong')).toBeVisible();
  if (compact) await page.keyboard.press('Escape');
  if (test.info().project.name === 'mobile-ar') await page.screenshot({ path: '.tmp/admin-presence-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  online = false;
  await page.clock.fastForward(30_000);
  await expect(page.getByText(ar ? '🟢 متصل الآن' : '🟢 Online now', { exact: true })).toHaveCount(0);
  await expect(page.getByText(ar ? /^آخر نشاط:/ : /^Last active:/)).toBeVisible();
  await page.route('**/api/v1/admin/overview**', route => route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'overview-no-permission' } } }));
  await page.goto(`/admin?lang=${locale}`);
  await expect(page.locator('.admin-shell-header__identity-copy strong')).toHaveText(ar ? 'طارق أحمد' : 'Tarek Ahmed');
  await expect(page.locator('.admin-shell-header__identity-copy strong')).toBeVisible();
});
