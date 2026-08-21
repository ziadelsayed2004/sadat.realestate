import { expect, test } from '@playwright/test';
import { adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

function localeForAdminCms(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-30 CMS form exposes landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  test.info().annotations.push({ type: 'design-source', description: 'ADM-30 local final export docs/design_sources/final_screens/admin/ADM-30.png; Figma node 6017:61879; desktop scope.' });
  const locale = localeForAdminCms();
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ accessToken: 'admin.cms.a11y', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'admin-cms-a11y-refresh')) }));
  await page.route('**/api/v1/admin/content/**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope(adminCmsContentFor('about'), 'admin-cms-a11y-about')) }));

  await page.goto(`/admin/content/about?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
  await expect(page.locator('[data-screen-id="ADM-30"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');

  const record = page.getByTestId('admin-cms-about-aaaaaaaaaaaaaaaaaaaaaaaa');
  const recordSave = record.getByRole('button', { name: /save changes|\u062d\u0641\u0638|\u4fdd\u5b58/iu });
  await expect(recordSave).toHaveCount(1);
  await recordSave.click();
  await expect(page.getByLabel(/change reason|\u0633\u0628\u0628 \u0627\u0644\u062a\u063a\u064a\u064a\u0631|\u53d8\u66f4\u539f\u56e0/iu)).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|privateUrl|internalNotes|assignedTo|auditData/u);
});
