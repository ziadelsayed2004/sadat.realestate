import { expect, test } from '@playwright/test';
import { adminProjectFixture } from './admin-projects.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-12 and ADM-13 match the approved desktop visual baseline', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  const locale = localeForProject();
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'admin.projects.visual', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-projects-visual-refresh' } }) }));
  await page.route('**/api/v1/admin/projects**', async route => {
    const body = route.request().method() === 'POST'
      ? { data: { ...adminProjectFixture(), status: 'approved', availableActions: ['publish'] }, meta: { requestId: 'admin-projects-visual-review' } }
      : { data: { items: [adminProjectFixture()] }, meta: { requestId: 'admin-projects-visual-list', page: 1, limit: 20, total: 1 } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto(`/admin/projects?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-screen-id="ADM-12"]')).toBeVisible();
  await expect(page).toHaveScreenshot(`admin-projects-${locale}-list.png`, { fullPage: true });
  await page.getByRole('button', { name: /review|مراجعة|审核/iu }).click();
  await expect(page.locator('[data-screen-id="ADM-13"]')).toBeVisible();
  await expect(page).toHaveScreenshot(`admin-projects-${locale}-review.png`, { fullPage: true });
});
