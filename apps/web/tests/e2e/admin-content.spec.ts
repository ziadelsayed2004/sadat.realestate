import { expect, test } from '@playwright/test';
import { adminArticleCategoryFixture, adminArticleFixture, adminArticleId } from './admin-content.fixtures.ts';

function localeForContent(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

async function routeAdminContentApis(page: import('@playwright/test').Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({ status: allow ? 200 : 401, contentType: 'application/json', body: JSON.stringify(allow ? { data: { accessToken: 'admin.content.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-content-refresh' } } : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-content-refresh-denied' } }) }));
  await page.route('**/api/v1/admin/articles**', async route => {
    const method = route.request().method();
    const body = method === 'POST' ? { ...adminArticleFixture('pending_review'), availableActions: ['publish', 'return_to_draft'] } : method === 'PATCH' ? adminArticleFixture() : adminArticleFixture();
    await route.fulfill({ status: method === 'GET' ? 200 : 201, contentType: 'application/json', body: JSON.stringify(method === 'GET' ? { data: { items: [adminArticleFixture()] }, meta: { requestId: 'admin-content-list', page: 1, limit: 20, total: 1 } } : { data: body, meta: { requestId: 'admin-content-mutation' } }) });
  });
  await page.route('**/api/v1/admin/article-categories**', async route => {
    const method = route.request().method();
    const body = method === 'DELETE' ? { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', deleted: true } : adminArticleCategoryFixture();
    await route.fulfill({ status: method === 'GET' ? 200 : 201, contentType: 'application/json', body: JSON.stringify(method === 'GET' ? { data: { items: [adminArticleCategoryFixture()] }, meta: { requestId: 'admin-category-list', page: 1, limit: 20, total: 1 } } : { data: body, meta: { requestId: 'admin-category-mutation' } }) });
  });
}

test.describe('ADM-25 and ADM-26 article management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-25 and ADM-26 local final exports; Figma prototype node 6017:61879; desktop scope.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminContentApis(page);
  });

  test('renders the article projection, uses server actions, and keeps internal fields out of the UI', async ({ page }) => {
    const locale = localeForContent();
    await page.goto(`/admin/articles?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-25"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.getByTestId(`admin-article-${adminArticleId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/authorId|internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    await page.getByRole('button', { name: /submit for review|إرسال للمراجعة|提交审核/iu }).click();
    await page.getByLabel(/change reason|سبب التغيير|变更原因/iu).fill('Submit article for review');
    await page.getByRole('button', { name: /save|حفظ|保存/iu }).last().click();
  });

  test('renders category management and creation controls', async ({ page }) => {
    const locale = localeForContent();
    await page.goto(`/admin/article-categories?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-26"]')).toBeVisible();
    await expect(page.getByTestId('admin-category-bbbbbbbbbbbbbbbbbbbbbbbb')).toBeVisible();
    await page.getByRole('button', { name: /add category|إضافة تصنيف|添加分类/iu }).click();
    await expect(page.getByTestId('admin-category-editor')).toBeVisible();
    await expect(page.getByLabel(/category name|اسم التصنيف|分类名称/iu)).toHaveCount(3);
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminContentApis(page, false);
    await page.goto('/admin/articles?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
