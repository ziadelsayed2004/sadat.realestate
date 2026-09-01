import { expect, test } from '@playwright/test';

function localeForContent(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-25 and ADM-26 match the approved desktop visual baselines', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  const locale = localeForContent();
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'admin.content.visual', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-content-visual-refresh' } }) }));
  await page.route('**/api/v1/admin/articles**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'buying-in-sadat', title: { ar: 'دليل الشراء', en: 'Buying in Sadat',}, body: { ar: 'محتوى المقال', en: 'Article body',}, authorId: 'cccccccccccccccccccccccc', status: 'draft', version: 3, createdAt: '2026-08-10T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z', availableActions: ['update', 'submit'] }] }, meta: { requestId: 'admin-content-visual-list', page: 1, limit: 20, total: 1 } }) }));
  await page.route('**/api/v1/admin/article-categories**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'buying-tips', name: { ar: 'نصائح الشراء', en: 'Buying tips',}, description: { ar: 'إرشادات', en: 'Guides',}, displayOrder: 1, active: true, version: 2, createdAt: '2026-08-10T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z', availableActions: ['update', 'delete'] }] }, meta: { requestId: 'admin-content-visual-categories', page: 1, limit: 20, total: 1 } }) }));
  await page.goto(`/admin/articles?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-screen-id="ADM-25"]')).toBeVisible();
  await expect(page).toHaveScreenshot(`admin-content-${locale}-articles.png`, { fullPage: true, maxDiffPixels: 300 });
  await page.goto(`/admin/article-categories?lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-screen-id="ADM-26"]')).toBeVisible();
  await expect(page).toHaveScreenshot(`admin-content-${locale}-categories.png`, { fullPage: true, maxDiffPixels: 300 });
});
