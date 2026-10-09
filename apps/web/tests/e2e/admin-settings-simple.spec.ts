import { expect, test } from '@playwright/test';
import { routeAdminSettingsApis } from './admin-settings.fixtures.ts';

test('explains the original and saved names, preserves drafts and uses simple settings choices', async ({ page }, testInfo) => {
  const ar = testInfo.project.name.endsWith('-ar');
  const locale = ar ? 'ar' : 'en';
  await routeAdminSettingsApis(page);
  let values = { platform_name: { ar: 'اسم محفوظ سابقًا', en: 'Previously saved name' }, short_name: { en: 'Saved short name' }, currency: 'EGP', timezone: 'Africa/Cairo', default_locale: 'ar', approved_extra: 'preserve-me' };
  let version = 4;
  const writes: Array<{ expectedVersion: number; values: typeof values }> = [];
  await page.route('**/api/v1/admin/settings/platform', async route => {
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON() as { expectedVersion: number; values: typeof values };
      writes.push(input);
      values = input.values;
      version += 1;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { namespace: 'platform', schemaVersion: 1, values, version, updatedBy: 'cccccccccccccccccccccccc', updatedAt: '2026-10-09T08:00:00.000Z' }, meta: { requestId: 'settings-simple-qa' } }) });
  });
  await page.goto(`/admin/settings?lang=${locale}`);
  await expect(page.getByTestId('saved-platform-name-en')).toHaveText('Previously saved name');
  await expect(page.getByRole('heading', { name: ar ? 'الاسم الأساسي للموقع' : 'Original website name' })).toBeVisible();
  await page.locator('#admin-settings-platform_name-en').fill('Unsaved draft');
  await expect(page.getByTestId('saved-platform-name-en')).toHaveText('Previously saved name');
  await page.getByRole('button', { name: ar ? 'إلغاء تعديلاتي' : 'Discard my edits' }).click();
  await expect(page.locator('#admin-settings-platform_name-en')).toHaveValue('Previously saved name');
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: ar ? 'استخدام الاسم الأساسي' : 'Use original name' }).click();
  await expect(page.locator('#admin-settings-platform_name-ar')).toHaveValue('عقارات السادات');
  await expect(page.locator('#admin-settings-platform_name-en')).toHaveValue('Sadat Real Estate');
  await expect(page.locator('#admin-settings-currency')).toBeHidden();
  await page.getByText(ar ? 'خيارات إضافية' : 'Additional options', { exact: true }).click();
  await page.locator('#admin-settings-currency').selectOption('USD');
  await page.locator('#admin-settings-timezone').selectOption('Africa/Cairo');
  await page.locator('#admin-settings-default_locale').selectOption('en');
  await page.getByLabel(ar ? 'سبب التغيير' : 'Change reason').fill('Restore original platform name');
  await page.getByRole('button', { name: ar ? 'حفظ التغييرات' : 'Save changes' }).click();
  await expect(page.getByTestId('saved-platform-name-en')).toHaveText('Sadat Real Estate');
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ expectedVersion: 4, values: { approved_extra: 'preserve-me', short_name: { en: 'Saved short name' }, currency: 'USD', default_locale: 'en' } });
  await expect(page.getByRole('link', { name: ar ? 'عنوان الموقع في نتائج البحث' : 'Website title in search results' })).toHaveAttribute('href', `/admin/settings/seo?lang=${locale}`);
  await expect(page.getByRole('link', { name: ar ? 'سجل التعديلات السابقة' : 'Previous changes' })).toHaveAttribute('href', `/admin/audit-logs?lang=${locale}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByText(ar ? 'خيارات إضافية' : 'Additional options', { exact: true }).click();
  await page.getByRole('heading', { name: ar ? 'الاسم الأساسي للموقع' : 'Original website name' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('settings-simple.png'), fullPage: true });
});
