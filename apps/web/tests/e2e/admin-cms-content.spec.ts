import { expect, test } from '@playwright/test';
import { cmsAdminPopulationValueSchema } from '@sadat-real-estate/contracts';
import { adminCmsAboutId, adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

function localeForAdminCms(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

async function routeAdminCmsApis(page: import('@playwright/test').Page, allow = true): Promise<void> {
  let teamDeleted = false;
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({
    status: allow ? 200 : 401,
    contentType: 'application/json',
    body: JSON.stringify(allow
      ? adminCmsEnvelope({ accessToken: 'admin.cms.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'admin-cms-refresh')
      : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-cms-refresh-denied' } })
  }));

  await page.route('**/api/v1/admin/content/**', async route => {
    const url = new URL(route.request().url());
    const namespace = url.pathname.endsWith('/team') ? 'team' : url.pathname.endsWith('/population') ? 'population' : 'about';
    const method = route.request().method();
    if (namespace === 'team' && method === 'DELETE') teamDeleted = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(adminCmsEnvelope(namespace === 'team' && teamDeleted ? { namespace: 'team', items: [] } : adminCmsContentFor(namespace), method === 'GET' ? `admin-cms-${namespace}-list` : `admin-cms-${namespace}-update`))
    });
  });
}

test.describe('ADM-30, ADM-31, and ADM-32 CMS administration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-30 docs/design_sources/final_screens/admin/ADM-30.png (SHA 1006634669cd92a0cbef3ce1aeb6030056d25b60d5aeede44babdbf2ee87f085); ADM-31 docs/design_sources/final_screens/admin/ADM-31.png (SHA 4cf482fc25e19b905ba95eaf1fd7fb2ef550e8674f5ec0ff57500a35ee951bcf); ADM-32 docs/design_sources/final_screens/admin/ADM-32.png (SHA c64309a3586633440c3cf32211e4744a1f86bb64c1fefd8f69d0653e8ab8e81a); Figma node 6017:61879; approved desktop scope.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminCmsApis(page);
  });

  test('renders the approved About, Team, and population projections for the locale', async ({ page }) => {
    const locale = localeForAdminCms();
    await page.goto(`/admin/content/about?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-30"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.getByTestId(`admin-cms-about-${adminCmsAboutId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/authorId|internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

    await page.goto(`/admin/content/team?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-31"]')).toBeVisible();
    await expect(page.getByTestId('admin-cms-team-bbbbbbbbbbbbbbbbbbbbbbbb')).toBeVisible();

    await page.goto(`/admin/content/population-counter?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-32"]')).toBeVisible();
    await expect(page.getByTestId('admin-cms-population-editor')).toBeVisible();
  });

  test('requires a reason and preserves the server version for an About update', async ({ page }) => {
    const locale = localeForAdminCms();
    await page.goto(`/admin/content/about?lang=${encodeURIComponent(locale)}`);
    const record = page.getByTestId(`admin-cms-about-${adminCmsAboutId}`);
    const recordSave = record.getByRole('button', { name: /save changes|\u062d\u0641\u0638|\u4fdd\u5b58/iu });
    await expect(recordSave).toHaveCount(1);
    await recordSave.click();
    const editor = page.getByTestId('admin-cms-about-editor');
    await expect(editor).toBeVisible();
    const form = editor.locator('form');
    const save = form.getByRole('button', { name: /save changes|\u062d\u0641\u0638|\u4fdd\u5b58/iu });
    await expect(save).toHaveCount(1);
    await save.click();
    const reason = page.getByLabel(/change reason|\u0633\u0628\u0628 \u0627\u0644\u062a\u063a\u064a\u064a\u0631|\u53d8\u66f4\u539f\u56e0/iu);
    await expect(reason).toHaveAttribute('required', '');
    await reason.fill('Update About content');
    const updateRequest = page.waitForRequest(request => request.method() === 'PUT' && request.url().endsWith('/api/v1/admin/content/about'));
    await save.click();
    const request = await updateRequest;
    expect(request.postDataJSON()).toMatchObject({ id: adminCmsAboutId, version: 4, reason: 'Update About content' });
    await expect(editor).not.toBeVisible();
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminCmsApis(page, false);
    await page.goto('/admin/content/team?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });

  test('keeps unsaved bilingual team fields when changing the interface language', async ({ page }) => {
    await page.goto('/admin/content/team?lang=ar');
    await page.getByTestId('admin-cms-team-bbbbbbbbbbbbbbbbbbbbbbbb').getByRole('button', { name: 'تعديل' }).click();
    const editor = page.getByTestId('admin-cms-team-editor');
    await editor.locator('#admin-cms-team-name-ar').fill('اسم لم يُحفظ بعد');
    await editor.locator('#admin-cms-team-name-en').fill('Unsaved English name');
    await editor.locator('#admin-cms-team-reason').fill('تحديث بيانات الفريق');
    await page.locator('[data-locale-switch="true"]').selectOption('en', { force: true });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(editor).toBeVisible();
    await expect(editor.locator('#admin-cms-team-name-ar')).toHaveValue('اسم لم يُحفظ بعد');
    await expect(editor.locator('#admin-cms-team-name-en')).toHaveValue('Unsaved English name');
    await expect(editor.locator('#admin-cms-team-reason')).toHaveValue('تحديث بيانات الفريق');
    await page.locator('[data-locale-switch="true"]').selectOption('ar', { force: true });
    await expect(editor.locator('#admin-cms-team-name-en')).toHaveValue('Unsaved English name');
  });

  test('saves a population statement with a date and no time entry', async ({ page }) => {
    await page.goto('/admin/content/population-counter?lang=ar');
    const editor = page.getByTestId('admin-cms-population-editor');
    await expect(editor.locator('#admin-cms-population-as-of')).toHaveAttribute('type', 'date');
    await editor.locator('#admin-cms-population-as-of').fill('2026-10-04');
    await editor.locator('#admin-cms-population-reason').fill('تحديث من مصدر رسمي');
    const request = page.waitForRequest(request => request.method() === 'PUT' && request.url().endsWith('/api/v1/admin/content/population'));
    await editor.getByRole('button', { name: 'حفظ التغييرات' }).click();
    expect((await request).postDataJSON()).toMatchObject({ version: 3, asOf: '2026-10-04T00:00:00.000Z' });
    await expect(editor.getByRole('status')).toHaveText('تم حفظ عداد السكان بنجاح.');
  });

  test('explains a missing population date and saves successive edits without hiding the form', async ({ page }) => {
    const locale = localeForAdminCms();
    let current = { namespace: 'population' as const, items: [cmsAdminPopulationValueSchema.parse(adminCmsContentFor('population').items[0])] };
    const requests: Array<{ version: number; value: number }> = [];
    await page.route('**/api/v1/admin/content/population', async route => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as { version: number; value: number };
        requests.push(body);
        current = { ...current, items: [{ ...current.items[0]!, ...body, version: body.version + 1 }] };
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope(current, 'population-current')) });
    });
    await page.goto(`/admin/content/population-counter?lang=${locale}`);
    const editor = page.getByTestId('admin-cms-population-editor');
    const value = editor.locator('#admin-cms-population-value');
    const date = editor.locator('#admin-cms-population-as-of');
    const save = editor.locator('button[type="submit"]');
    await value.fill('44000'); await date.fill('');
    await editor.locator('#admin-cms-population-reason').fill('Update sourced population');
    await save.click();
    await expect(date).toHaveAttribute('aria-invalid', 'true');
    await expect(date).toBeFocused(); await expect(value).toHaveValue('44000');
    expect(requests).toHaveLength(0);
    await date.fill('2026-10-07'); await save.click();
    const success = locale === 'ar' ? 'تم حفظ عداد السكان بنجاح.' : 'Population counter saved successfully.';
    await expect(editor.getByRole('status')).toHaveText(success);
    expect(requests[0]).toMatchObject({ version: 3, value: 44000 });
    await value.fill('45000'); await save.click();
    await expect(editor.getByRole('status')).toHaveText(success);
    expect(requests[1]).toMatchObject({ version: 4, value: 45000 });
    await expect(value).toHaveValue('45000');
    await page.reload(); await expect(value).toHaveValue('45000');
  });

  test('edits and deletes a team member through explicit actions', async ({ page }) => {
    const locale = localeForAdminCms();
    await page.goto(`/admin/content/team?lang=${locale}`);
    const record = page.getByTestId('admin-cms-team-bbbbbbbbbbbbbbbbbbbbbbbb');
    await record.getByRole('button', { name: locale === 'ar' ? 'تعديل' : 'Edit', exact: true }).click();
    const editor = page.getByTestId('admin-cms-team-editor');
    await editor.locator('#admin-cms-team-name-en').fill('Updated team member');
    await editor.locator('#admin-cms-team-reason').fill('Update team profile');
    const update = page.waitForRequest(request => request.method() === 'PUT' && request.url().endsWith('/admin/content/team'));
    await editor.locator('button[type="submit"]').click();
    expect((await update).postDataJSON()).toMatchObject({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', version: 2, name: { en: 'Updated team member' } });
    await expect(editor).not.toBeVisible();
    await record.getByRole('button', { name: locale === 'ar' ? 'حذف' : 'Delete', exact: true }).click();
    const confirmation = page.getByTestId('admin-cms-team-delete');
    await confirmation.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel', exact: true }).click();
    await expect(record).toBeVisible();
    await record.getByRole('button', { name: locale === 'ar' ? 'حذف' : 'Delete', exact: true }).click();
    await confirmation.locator('textarea').fill('Member left the team');
    const deletion = page.waitForRequest(request => request.method() === 'DELETE' && request.url().endsWith('/admin/content/team'));
    await confirmation.locator('button[type="submit"]').click();
    expect((await deletion).postDataJSON()).toEqual({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', version: 2, reason: 'Member left the team' });
    await expect(record).not.toBeVisible();
    await page.reload();
    await expect(record).not.toBeVisible();
  });
});
