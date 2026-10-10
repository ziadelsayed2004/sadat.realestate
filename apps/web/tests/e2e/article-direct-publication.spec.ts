import { expect, test } from '@playwright/test';
import { articleCreateSchema, articlePatchSchema, articleTransitionRequestSchema, type Article } from '@sadat-real-estate/contracts';
import { adminArticleCategoryFixture, adminArticleFixture, adminArticleId } from './admin-content.fixtures.ts';
import { getAdminContentCopy } from '../../src/features/admin_content/copy.ts';

test('publishes from the editor, keeps failed publication as the same draft and displays the public article', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  const copy = getAdminContentCopy(locale);
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'direct-publication', page: 1, limit: 20, total: article ? 1 : 0 } });
  let article: Article | undefined;
  let creates = 0;
  let publications = 0;
  const patches: number[] = [];
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: 'direct.publication.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: adminArticleId, roleType: 'admin', status: 'verified' } }) }));
  await page.route('**/api/v1/admin/article-categories**', route => route.fulfill({ json: envelope({ items: [adminArticleCategoryFixture()] }) }));
  await page.route('**/api/v1/admin/articles**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer direct.publication.qa');
    if (route.request().method() === 'GET') return route.fulfill({ json: envelope({ items: article ? [article] : [] }) });
    const data = route.request().postDataJSON();
    if (route.request().url().includes('/transitions')) {
      const input = articleTransitionRequestSchema.parse(data);
      expect(input.status).toBe('published'); expect(input.version).toBe(article!.version);
      publications++;
      if (publications === 1) return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.unavailable', details: [], requestId: 'publish-failed' } } });
      article = { ...article!, status: 'published', version: article!.version + 1, availableActions: ['update', 'archive', 'delete'] };
    } else if (route.request().method() === 'POST') {
      const input = articleCreateSchema.parse(data);
      creates++;
      article = { ...adminArticleFixture(), status: 'draft', title: input.title, body: input.body, version: 0, availableActions: ['update', 'publish', 'delete'] };
    } else {
      const input = articlePatchSchema.parse(data);
      expect(input.version).toBe(article!.version);
      patches.push(input.version);
      article = { ...article!, title: input.title!, body: input.body!, version: article!.version + 1 };
    }
    await route.fulfill({ json: envelope(article) });
  });
  await page.route('**/api/v1/public/articles/buying-in-sadat**', route => route.fulfill({ json: envelope({ id: article!.id, categoryId: article!.categoryId, slug: article!.slug, title: article!.title, body: article!.body, publishedAt: '2026-10-10T09:00:00.000Z' }) }));
  await page.goto(`/admin/articles?lang=${locale}`);
  await page.getByRole('button', { name: copy.createArticle, exact: true }).click();
  const editor = page.getByTestId('admin-article-editor');
  const publish = editor.getByRole('button', { name: ar ? 'حفظ ونشر المقال' : 'Save and publish article', exact: true });
  const title = ar ? 'مقال منشور مباشرة' : 'An article published directly';
  await editor.getByLabel(`${locale.toUpperCase()} ${copy.title}`, { exact: true }).fill(title);
  await editor.locator('#admin-article-reason').fill('Publish completed article');
  await publish.click();
  await expect(editor.getByRole('alert')).toContainText(ar ? 'اكتب محتوى المقال' : 'Enter article content');
  expect(creates).toBe(0);
  const bodyInput = editor.locator(`[id="${copy.body}-${locale}"]`);
  await bodyInput.fill('x'.repeat(20_001));
  await publish.click();
  await expect(editor.getByRole('alert')).toContainText('20000');
  await expect(bodyInput).toHaveValue('x'.repeat(20_001));
  expect(creates).toBe(0);
  const body = ar ? 'الفقرة الأولى\n\nالفقرة الثانية\tمعلومة إضافية' : 'First paragraph\n\nSecond paragraph\tAdditional information';
  await bodyInput.fill(body + '\u0000');
  await publish.click();
  await expect(editor.getByRole('alert')).toContainText(ar ? 'تم حفظ المقال كمسودة' : 'saved as a draft');
  expect(creates).toBe(1); expect(article!.body).toEqual({ [locale]: body });
  await expect(bodyInput).toHaveValue(body + '\u0000');
  await expect(publish).toBeEnabled();
  await expect(page.getByRole('button', { name: copy.action.submit, exact: true })).toHaveCount(0);
  const layout = await editor.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return { width: element.clientWidth, scroll: element.scrollWidth, overflowing: [...element.querySelectorAll('*')].filter(child => {
      const childBounds = child.getBoundingClientRect(); return childBounds.left < bounds.left - 1 || childBounds.right > bounds.right + 1;
    }).map(child => ({ tag: child.tagName, class: child.className, width: child.getBoundingClientRect().width })) };
  });
  expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
  await editor.screenshot({ path: info.outputPath('direct-publish-editor.png') });
  await publish.click();
  await expect(editor).toHaveCount(0);
  expect(creates).toBe(1); expect(patches).toEqual([0]); expect(publications).toBe(2);
  await expect(page.locator('#admin-article-status')).toHaveValue('published');
  const notice = page.locator('.admin-article-notice');
  await expect(notice).toContainText(title);
  await notice.getByRole('link').click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText(ar ? 'الفقرة الثانية' : 'Second paragraph');
});
