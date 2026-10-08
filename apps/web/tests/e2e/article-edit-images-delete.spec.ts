import { expect, test } from '@playwright/test';
import { adminArticleFixture, adminArticleCategoryFixture, adminArticleId } from './admin-content.fixtures.ts';
import { getAdminContentCopy } from '../../src/features/admin_content/copy.ts';

const assetId = 'dddddddddddddddddddddddd';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV0sAAAAASUVORK5CYII=', 'base64');

test('edits published articles, replaces and removes covers, and confirms permanent deletion', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  const copy = getAdminContentCopy(locale);
  const envelope = (data: unknown, meta: Record<string, unknown> = {}) => ({ data, meta: { requestId: 'article-owner-qa', ...meta } });
  let article: Record<string, unknown> | undefined = { ...adminArticleFixture('published'), imageUrl: '/qa-legacy-cover.png', availableActions: ['update', 'archive', 'delete'] };
  let deletions = 0;
  const patches: Record<string, unknown>[] = [];
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: 'article.owner.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: adminArticleId, roleType: 'admin', status: 'verified' } }) }));
  await page.route('**/qa-legacy-cover.png', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('**/api/v1/admin/article-categories**', route => route.fulfill({ json: envelope({ items: [adminArticleCategoryFixture()] }, { page: 1, limit: 20, total: 1 }) }));
  await page.route('**/api/v1/admin/articles**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.includes('/photos')) {
      await route.fulfill(request.method() === 'POST' ? { json: envelope({ id: assetId, imageUrl: `/api/v1/public/article-photos/${assetId}` }) } : { contentType: 'image/png', body: png });
    } else if (request.method() === 'PATCH') {
      const input = request.postDataJSON() as Record<string, unknown>;
      expect(input.version).toBe(article!.version);
      patches.push(input);
      article = { ...article, ...input, version: Number(article!.version) + 1 };
      delete article.reason;
      if (input.coverAssetId === null) { delete article.coverAssetId; delete article.imageUrl; }
      else article.imageUrl = `/api/v1/public/article-photos/${assetId}`;
      await route.fulfill({ json: envelope(article) });
    } else if (request.method() === 'DELETE') {
      expect(request.postDataJSON()).toEqual({ version: article!.version, reason: 'Delete obsolete article' });
      deletions++; article = undefined;
      await route.fulfill({ json: envelope({ id: adminArticleId, deleted: true }) });
    } else await route.fulfill({ json: envelope({ items: article ? [article] : [] }, { page: 1, limit: 20, total: article ? 1 : 0 }) });
  });
  await page.goto(`/admin/articles?lang=${locale}`);
  const card = page.getByTestId(`admin-article-${adminArticleId}`);
  await expect(card.locator('img')).toHaveAttribute('src', '/qa-legacy-cover.png');
  await card.getByRole('button', { name: copy.edit, exact: true }).click();
  const editor = page.getByTestId('admin-article-editor');
  const title = ar ? 'مقال معدل من الإدارة' : 'Article updated by administration';
  await editor.getByLabel(`${locale.toUpperCase()} ${copy.title}`, { exact: true }).fill(title);
  await editor.getByLabel(ar ? 'رفع أو تغيير صورة الغلاف' : 'Upload or replace cover').setInputFiles({ name: 'new-cover.png', mimeType: 'image/png', buffer: png });
  await expect(editor.locator('.admin-article-images__grid img')).toBeVisible();
  await editor.getByRole('button', { name: ar ? 'معاينة المقال' : 'Preview article' }).click();
  await expect(page.getByTestId('admin-article-preview')).toContainText(title);
  await expect(page.getByTestId('admin-article-preview').locator('img')).toBeVisible();
  await editor.locator('#admin-article-reason').fill('Replace published cover');
  await editor.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(card).toContainText(title);
  expect(patches[0]).toMatchObject({ coverAssetId: assetId, galleryAssetIds: [] });
  await expect(card.locator('img')).toHaveAttribute('src', /^blob:/u);
  await expect(card.getByRole('link', { name: ar ? 'عرض المقال' : 'View article' })).toHaveAttribute('href', `/articles/buying-in-sadat?lang=${locale}`);
  for (const button of await card.getByRole('button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  await page.getByRole('heading', { level: 1 }).click();
  await page.screenshot({ path: info.outputPath('article-actions.png'), fullPage: true });
  await card.getByRole('button', { name: copy.edit, exact: true }).click();
  await editor.locator('.admin-article-images__grid').getByRole('button', { name: ar ? 'إزالة' : 'Remove', exact: true }).click();
  await editor.locator('#admin-article-reason').fill('Remove published cover');
  await editor.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(patches[1]).toMatchObject({ coverAssetId: null });
  await expect(card.locator('img')).toHaveCount(0);
  await card.getByRole('button', { name: copy.action.delete, exact: true }).click();
  const removal = page.getByTestId('admin-article-delete');
  await removal.getByRole('button', { name: copy.cancel, exact: true }).click();
  expect(deletions).toBe(0);
  await card.getByRole('button', { name: copy.action.delete, exact: true }).click();
  await removal.getByRole('textbox').fill('Delete obsolete article');
  await removal.getByRole('button', { name: ar ? 'تأكيد حذف المقال' : 'Confirm article deletion', exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect(page.locator('[data-state="empty"]')).toBeVisible();
  expect(deletions).toBe(1);
});
