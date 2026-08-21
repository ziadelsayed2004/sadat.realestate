import { expect, test } from '@playwright/test';

function localeForContent(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('article administration exposes landmarks, labels, focus, and direction', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'admin.content.a11y', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-content-a11y-refresh' } }) }));
  await page.route('**/api/v1/admin/articles**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'buying-in-sadat', title: { en: 'Buying in Sadat' }, body: { en: 'Article body' }, authorId: 'cccccccccccccccccccccccc', status: 'draft', version: 3, createdAt: '2026-08-10T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z', availableActions: ['update', 'submit'] }] }, meta: { requestId: 'admin-content-a11y-list', page: 1, limit: 20, total: 1 } }) }));
  await page.route('**/api/v1/admin/article-categories**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'buying-tips', name: { en: 'Buying tips' }, description: { en: 'Guides' }, displayOrder: 1, active: true, version: 2, createdAt: '2026-08-10T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z', availableActions: ['update', 'delete'] }] }, meta: { requestId: 'admin-content-a11y-categories', page: 1, limit: 20, total: 1 } }) }));
  const locale = localeForContent();
  await page.goto(`/admin/articles?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('.admin-dashboard__navigation[aria-label]')).toBeVisible();
  await expect(page.locator('form[role="search"]')).toHaveAttribute('aria-label', /.+/u);
  await expect(page.locator('label[for="admin-article-search"]')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
});
