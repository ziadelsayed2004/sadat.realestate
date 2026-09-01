import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test('admin project routes expose landmarks, labels, focusable actions, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'admin.projects.a11y', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-projects-a11y-refresh' } }) }));
  await page.route('**/api/v1/admin/projects**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: { en: 'Nile Heights' }, slug: 'nile-heights', status: 'pending_review', version: 3, updatedAt: '2026-08-18T10:00:00.000Z', availableActions: ['approve'] }] }, meta: { requestId: 'admin-projects-a11y-list', page: 1, limit: 20, total: 1 } }) }));
  const locale = localeForProject();
  await page.goto(`/admin/projects?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
  await expect(page.locator('form[role="search"]')).toHaveAttribute('aria-label', /.+/u);
  await expect(page.locator('label[for="admin-projects-search"]')).toBeVisible();
  await expect(page.locator('label[for="admin-projects-status"]')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
});
