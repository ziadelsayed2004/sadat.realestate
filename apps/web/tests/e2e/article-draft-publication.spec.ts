import { expect, test } from '@playwright/test';
import { articleCreateSchema, articlePatchSchema, articleTransitionRequestSchema } from '@sadat-real-estate/contracts';
import { adminArticleCategoryFixture, adminArticleFixture, adminArticleId } from './admin-content.fixtures.ts';
import { getAdminContentCopy } from '../../src/features/admin_content/copy.ts';

test('saves a first empty draft, reopens it, completes it and follows the review and publication filters', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  const copy = getAdminContentCopy(locale);
  const envelope = (data: unknown, meta: Record<string, unknown> = {}) => ({ data, meta: { requestId: 'draft-publication-qa', ...meta } });
  let article: Record<string, unknown> | undefined;
  let creates = 0;
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: 'draft.publication.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: adminArticleId, roleType: 'admin', status: 'verified' } }) }));
  await page.route('**/api/v1/admin/article-categories**', route => route.fulfill({ json: envelope({ items: [adminArticleCategoryFixture()] }, { page: 1, limit: 20, total: 1 }) }));
  await page.route('**/api/v1/admin/articles**', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      const query = new URL(request.url()).searchParams;
      const items = article && (!query.get('status') || query.get('status') === article.status) && (!query.get('search') || String(article.slug).includes(query.get('search')!)) ? [article] : [];
      await route.fulfill({ json: envelope({ items }, { page: 1, limit: 20, total: items.length }) });
      return;
    }
    if (request.url().includes('/transitions')) {
      const input = articleTransitionRequestSchema.parse(request.postDataJSON());
      expect(input.version).toBe(article!.version);
      const body = article!.body as Record<string, string>;
      if (!Object.values(body).some(value => value.trim())) {
        await route.fulfill({ status: 409, json: { error: { code: 'ARTICLE_TRANSITION_INVALID', messageKey: 'errors.invalidInput', details: [], requestId: 'unfinished-article' } } });
        return;
      }
      article = { ...article, version: Number(article!.version) + 1, status: input.status, availableActions: input.status === 'pending_review' ? ['publish', 'return_to_draft', 'delete'] : ['update', 'archive', 'delete'] };
    } else if (request.method() === 'POST') {
      const input = articleCreateSchema.parse(request.postDataJSON());
      expect(input.body).toEqual({ [locale]: '' });
      creates++;
      article = { ...adminArticleFixture(), ...input, version: 0 };
      delete article.reason;
    } else {
      const input = articlePatchSchema.parse(request.postDataJSON());
      expect(input.version).toBe(article!.version);
      article = { ...article, ...input, version: Number(article!.version) + 1 };
      delete article.reason;
      if (article.coverAssetId === null) delete article.coverAssetId;
    }
    await route.fulfill({ json: envelope(article) });
  });
  await page.goto(`/admin/articles?lang=${locale}`);
  await page.getByRole('button', { name: copy.createArticle, exact: true }).click();
  const editor = page.getByTestId('admin-article-editor');
  const title = ar ? 'مسودة جديدة' : 'A new draft';
  await editor.getByLabel(`${locale.toUpperCase()} ${copy.title}`, { exact: true }).fill(title);
  await editor.locator('#admin-article-reason').fill('Save unfinished\nfirst article');
  await editor.getByRole('button', { name: ar ? 'حفظ مسودة' : 'Save draft', exact: true }).click();
  const card = page.getByTestId(`admin-article-${adminArticleId}`);
  await expect(card).toContainText(title);
  await expect(page.locator('#admin-article-status')).toHaveValue('draft');
  await expect(page.getByRole('status')).toContainText(ar ? 'تم حفظ المقال كمسودة' : 'Article saved as a draft');
  expect(creates).toBe(1);
  await page.reload();
  await card.getByRole('button', { name: copy.action.submit, exact: true }).click();
  const action = page.getByTestId('admin-article-transition');
  await action.locator('#admin-article-action-reason').fill('Submit unfinished article');
  await action.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(action.getByRole('alert')).toContainText(ar ? 'أكمل محتوى المقال' : 'Complete the body');
  await action.getByRole('button', { name: copy.cancel, exact: true }).click();
  await card.getByRole('button', { name: copy.edit, exact: true }).click();
  await editor.getByLabel(`${locale.toUpperCase()} ${copy.body}`, { exact: true }).fill(ar ? 'المحتوى اكتمل بلغة واحدة\nفقرة ثانية' : 'Completed in one language\nA second paragraph');
  await editor.locator('#admin-article-reason').fill('Complete saved draft');
  await editor.getByRole('button', { name: ar ? 'حفظ مسودة' : 'Save draft', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await card.getByRole('button', { name: copy.action.submit, exact: true }).click();
  await action.locator('#admin-article-action-reason').fill('Submit completed article');
  await action.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(page.locator('#admin-article-status')).toHaveValue('pending_review');
  await expect(card.getByRole('button', { name: copy.action.publish, exact: true })).toBeVisible();
  await card.getByRole('button', { name: copy.action.return_to_draft, exact: true }).click();
  await expect(action.locator('#admin-article-action')).toHaveValue('return_to_draft');
  await action.getByRole('button', { name: copy.cancel, exact: true }).click();
  await card.getByRole('button', { name: copy.action.publish, exact: true }).click();
  await expect(action.locator('#admin-article-action')).toHaveValue('publish');
  await action.locator('#admin-article-action-reason').fill('Publish reviewed article');
  await action.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(page.locator('#admin-article-status')).toHaveValue('published');
  await expect(card).toContainText(copy.status.published);
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute('href', `/articles/buying-in-sadat?lang=${locale}`);
  await page.getByRole('heading', { level: 1 }).click();
  await page.screenshot({ path: info.outputPath('published-article.png'), fullPage: true });
});
