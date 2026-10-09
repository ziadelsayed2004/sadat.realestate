import { expect, test } from '@playwright/test';
import { routeAdminNotificationsAuditApis } from './admin-notifications-audit.fixtures.ts';

test('offers clear audit choices and keeps technical filters optional at every width', async ({ page }, testInfo) => {
  const ar = testInfo.project.name.endsWith('-ar');
  const locale = ar ? 'ar' : 'en';
  await routeAdminNotificationsAuditApis(page);
  await page.goto(`/admin/audit-logs?lang=${locale}`);
  await expect(page.getByRole('heading', { name: ar ? 'سجل الإجراءات' : 'Action log', exact: true })).toBeVisible();
  const section = page.locator('#admin-audit-targetType');
  const action = page.locator('#admin-audit-actionGroup');
  await expect(section).toBeVisible();
  await expect(action).toBeVisible();
  await expect(page.locator('#admin-audit-actorId')).toBeHidden();
  await section.selectOption('property');
  await action.selectOption('update');
  const requested = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/admin/audit-logs') && url.searchParams.get('actionGroup') === 'update' && url.searchParams.get('targetType') === 'property';
  });
  await page.getByRole('button', { name: ar ? 'عرض النتائج' : 'Show results' }).click();
  await requested;
  await expect(page.getByRole('table').getByText(ar ? 'تعديل' : 'Update', { exact: true })).toBeVisible();
  await page.getByText(ar ? 'بحث متقدم بالمعرّفات' : 'Advanced search by ID', { exact: true }).click();
  await expect(page.locator('#admin-audit-actorId')).toBeVisible();
  await page.locator('#admin-audit-actorId').fill('invalid');
  await page.getByRole('button', { name: ar ? 'عرض النتائج' : 'Show results' }).click();
  await expect(page.getByRole('alert')).toContainText('24');
  await page.getByRole('button', { name: ar ? 'إلغاء الفلاتر' : 'Reset filters' }).click();
  await expect(section).toHaveValue('');
  await expect(action).toHaveValue('');
  await expect(page.locator('#admin-audit-actorId')).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByText(ar ? 'بحث متقدم بالمعرّفات' : 'Advanced search by ID', { exact: true }).click();
  await page.getByRole('heading', { name: ar ? 'سجل الإجراءات' : 'Action log', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('audit-simple-filters.png'), fullPage: true });
});
