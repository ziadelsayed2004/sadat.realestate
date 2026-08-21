import { expect, test } from '@playwright/test';
import { adminProjectFixture, adminProjectId } from './admin-projects.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

async function routeAdminApis(page: import('@playwright/test').Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: allow ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(allow ? { data: { accessToken: 'admin.projects.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-projects-refresh' } } : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-projects-refresh-denied' } })
    });
  });
  await page.route('**/api/v1/admin/projects**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.projects.qa');
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...adminProjectFixture(), status: 'approved', availableActions: ['publish'] }, meta: { requestId: 'admin-project-review' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [adminProjectFixture()] }, meta: { requestId: 'admin-project-list', page: 1, limit: 20, total: 1 } }) });
  });
}

test.describe('ADM-12 and ADM-13 project management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-12 and ADM-13 local final exports; Figma node 6017:61879' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminApis(page);
  });

  test('renders the list and review flow with locale direction, safe projection, and server actions', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/projects?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-12"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`admin-project-${adminProjectId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    await page.getByRole('button', { name: /review|مراجعة|审核/iu }).click();
    await expect(page.locator('[data-screen-id="ADM-13"]')).toBeVisible();
    await page.getByLabel(/reason|سبب|原因/u).fill('Approved after review');
    await page.getByRole('button', { name: /save action|حفظ الإجراء|保存操作/iu }).click();
    await expect(page.getByText(/Action saved|تم حفظ الإجراء|操作已保存/u)).toBeVisible();
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminApis(page, false);
    await page.goto('/admin/projects?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
