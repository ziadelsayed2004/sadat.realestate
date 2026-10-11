import { expect, test } from '@playwright/test';
import { adminUserFixture, routeAdminAccounts } from './admin-accounts.fixtures';

test('seekers have a distinct page with aligned filters and All users includes both account types', async ({ page }) => {
  const ar = test.info().project.name.endsWith('-ar');
  const locale = ar ? 'ar' : 'en';
  await routeAdminAccounts(page);
  const seeker = adminUserFixture();
  const provider = { ...seeker, id: 'cccccccccccccccccccccccc', roleType: 'provider', displayName: 'Provider Account' };
  const seen: Array<{ role: string | null; status: string | null; page: string | null }> = [];
  await page.route('**/api/v1/admin/users**', route => {
    const query = new URL(route.request().url()).searchParams;
    const role = query.get('roleType');
    const status = query.get('status');
    seen.push({ role, status, page: query.get('page') });
    const empty = status === 'suspended';
    const summary = role === 'seeker' ? { total: 30, seekers: 30, providers: 0, verified: 28, pending: 1, restricted: 1 }
      : { total: 45, seekers: 30, providers: 15, verified: 40, pending: 3, restricted: 2 };
    return route.fulfill({ json: { data: { items: empty ? [] : role === 'seeker' ? [seeker] : [seeker, provider], page: Number(query.get('page') ?? 1), limit: 20, total: empty ? 0 : summary.total, summary }, meta: { requestId: 'seeker-page' } } });
  });
  await page.goto(`/admin/property-seekers?lang=${locale}`);
  await expect(page.getByRole('heading', { name: ar ? 'الباحثون عن عقار' : 'Property seekers', level: 1 })).toBeVisible();
  await expect(page.locator('.admin-dashboard__navigation a[aria-current="page"]')).toHaveAttribute('href', `/admin/property-seekers?lang=${locale}`);
  await expect(page.locator('#admin-accounts-role')).toHaveCount(0);
  await expect(page.getByTestId('admin-accounts-total').locator('strong')).toHaveText('30');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: ar ? 'التالي' : 'Next', exact: true }).click();
  await expect.poll(() => seen.at(-1)).toMatchObject({ role: 'seeker', page: '2' });
  await page.locator('#admin-accounts-status').selectOption('suspended');
  await expect(page.getByRole('heading', { name: ar ? 'لا يوجد باحثون عن عقار' : 'No property seekers' })).toBeVisible();
  expect(seen.at(-1)).toEqual({ role: 'seeker', status: 'suspended', page: '1' });
  await expect(page.getByTestId('admin-accounts-total').locator('strong')).toHaveText('30');
  await page.getByRole('button', { name: ar ? 'مسح' : 'Clear', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(seen.at(-1)).toEqual({ role: 'seeker', status: null, page: '1' });

  const assertAligned = async () => {
    if (!test.info().project.name.startsWith('desktop')) return;
    const controls = await page.locator('.admin-accounts__filters input, .admin-accounts__filters select, .admin-accounts__filters button').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { y: rect.y, height: rect.height };
    }));
    expect(Math.max(...controls.map(rect => rect.y)) - Math.min(...controls.map(rect => rect.y))).toBeLessThanOrEqual(1);
    for (const rect of controls) expect(rect.height).toBe(44);
  };
  await assertAligned();
  await page.locator('.admin-accounts__main').screenshot({ path: test.info().outputPath('property-seekers.png') });
  await page.locator('.admin-accounts__heading-actions').getByRole('link', { name: ar ? 'جميع المستخدمين' : 'All users', exact: true }).click();
  await expect(page.getByRole('heading', { name: ar ? 'جميع المستخدمين' : 'All users', level: 1 })).toBeVisible();
  await expect(page.locator('.admin-dashboard__navigation a[aria-current="page"]')).toHaveAttribute('href', `/admin/users?lang=${locale}`);
  await expect(page.locator('tbody tr')).toHaveCount(2);
  expect(seen.at(-1)).toEqual({ role: null, status: null, page: '1' });
  await assertAligned();
  await expect(page.locator('#admin-accounts-role')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.admin-accounts__main').screenshot({ path: test.info().outputPath('all-users-filters.png') });
});
