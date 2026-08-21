import { expect, test } from '@playwright/test';
import { adminCmsAboutId, adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

function localeForAdminCms(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

async function routeAdminCmsApis(page: import('@playwright/test').Page, allow = true): Promise<void> {
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(adminCmsEnvelope(adminCmsContentFor(namespace), method === 'GET' ? `admin-cms-${namespace}-list` : `admin-cms-${namespace}-update`))
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
});
