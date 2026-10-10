import { expect, test } from '@playwright/test';
import { routeAdminSettingsApis } from './admin-settings.fixtures.ts';

test('platform name survives a conflict and saves after reviewing the latest settings', async ({ page }, testInfo) => {
  const ar = testInfo.project.name.endsWith('-ar');
  const locale = ar ? 'ar' : 'en';
  await routeAdminSettingsApis(page);
  let values = { platform_name: { ar: 'الاسم المحفوظ', en: 'Saved platform name' }, primary_email: 'old-office@example.com' };
  let version = 4;
  let conflict = true;
  const versions: number[] = [];
  await page.route('**/api/v1/admin/settings/platform', async route => {
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON() as { expectedVersion: number; values: typeof values };
      versions.push(input.expectedVersion);
      if (conflict) {
        conflict = false;
        version = 5;
        values = { platform_name: { ar: 'اسم جديد من مسؤول آخر', en: 'Concurrent English name' }, primary_email: 'latest-office@example.com' };
        return route.fulfill({ status: 409, json: { error: { code: 'SETTINGS_VERSION_CONFLICT', messageKey: 'errors.settings.versionConflict', details: [], requestId: 'settings-name-conflict' } } });
      }
      expect(input.expectedVersion).toBe(version);
      values = input.values;
      version++;
    }
    return route.fulfill({ json: { data: { namespace: 'platform', schemaVersion: 1, values, version, updatedBy: 'cccccccccccccccccccccccc', updatedAt: '2026-10-10T00:00:00.000Z' }, meta: { requestId: 'settings-name-reviewed' } } });
  });
  await page.goto(`/admin/settings?lang=${locale}`);
  const name = page.locator('#admin-settings-platform_name-ar');
  await name.fill('اسم المنصة المطلوب');
  const reason = page.getByLabel(ar ? 'سبب التغيير' : 'Change reason');
  await reason.fill('Rename platform');
  const save = page.getByRole('button', { name: ar ? 'حفظ التغييرات' : 'Save changes' });
  await save.click();
  await expect(page.getByRole('heading', { name: ar ? 'تعارض في الإصدار' : 'Version conflict' })).toBeVisible();
  await expect(name).toHaveValue('اسم المنصة المطلوب');
  await expect(reason).toHaveValue('Rename platform');
  await expect(save).toBeDisabled();
  if (testInfo.project.name === 'mobile-ar') await page.screenshot({ path: '.tmp/settings-name-conflict-mobile.png', fullPage: true });
  await page.getByRole('button', { name: ar ? 'تحميل آخر نسخة مع الاحتفاظ بتعديلاتي' : 'Load latest and keep my edits' }).click();
  await expect(save).toBeEnabled();
  await expect(page.getByTestId('saved-platform-name-ar')).toHaveText('اسم جديد من مسؤول آخر');
  await expect(name).toHaveValue('اسم المنصة المطلوب');
  expect(versions).toEqual([4]);
  await save.click();
  await expect(page.getByTestId('saved-platform-name-ar')).toHaveText('اسم المنصة المطلوب');
  expect(versions).toEqual([4, 5]);
  expect(values.primary_email).toBe('latest-office@example.com');
  expect(values.platform_name.en).toBe('Concurrent English name');
  await page.reload();
  await expect(page.getByTestId('saved-platform-name-ar')).toHaveText('اسم المنصة المطلوب');
  await name.fill('اسم ثان للمنصة');
  await reason.fill('Rename again');
  await save.click();
  await expect(page.getByTestId('saved-platform-name-ar')).toHaveText('اسم ثان للمنصة');
  expect(versions).toEqual([4, 5, 6]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
