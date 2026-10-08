import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_TEAM_CATEGORIES, cmsAdminTeamMemberSchema } from '@sadat-real-estate/contracts';
import { getAdminContentCopy, getAdminCmsCopy } from '../../src/features/admin_content/copy.ts';
import { adminCmsContentFor } from './admin-cms-content.fixtures.ts';

const id = 'aaaaaaaaaaaaaaaaaaaaaaaa'; const categoryId = 'bbbbbbbbbbbbbbbbbbbbbbbb'; const assetId = 'dddddddddddddddddddddddd';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV0sAAAAASUVORK5CYII=', 'base64');
const stamp = '2026-10-08T10:00:00Z';
const envelope = (data: unknown, meta: Record<string, unknown> = {}) => JSON.stringify({ data, meta: { requestId: 'owner-content-qa', ...meta } });
async function authenticate(page: Page) {
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'owner.content.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id, roleType: 'admin', status: 'verified' } }) }));
}

test('saves an unfinished article with an uploaded cover, reopens it and previews the completed draft', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar'; const copy = getAdminContentCopy(locale);
  await authenticate(page);
  const category = { id: categoryId, slug: 'news', name: { ar: 'أخبار', en: 'News' }, displayOrder: 0, active: true, version: 0, createdAt: stamp, updatedAt: stamp, availableActions: ['update'] };
  let article: Record<string, unknown> | undefined; const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/article-categories**', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [category] }, { page: 1, limit: 20, total: 1 }) }));
  await page.route('**/api/v1/admin/articles**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/photos')) {
      await route.fulfill(url.pathname.endsWith('/photos') ? { status: 201, contentType: 'application/json', body: envelope({ id: assetId, imageUrl: `/api/v1/public/article-photos/${assetId}` }) } : { status: 200, contentType: 'image/png', body: png }); return;
    }
    if (route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: article ? [article] : [] }, { page: 1, limit: 20, total: article ? 1 : 0 }) }); return; }
    const input = route.request().postDataJSON() as Record<string, unknown>; bodies.push(input);
    article = { ...article, ...input, id, slug: 'owner-draft', categoryId, authorId: id, status: 'draft', version: bodies.length - 1, createdAt: stamp, updatedAt: stamp, availableActions: ['update', 'submit'] };
    delete article.reason;
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(article) });
  });
  await page.goto(`/admin/articles?lang=${locale}`);
  await page.getByRole('button', { name: copy.createArticle, exact: true }).click();
  const editor = page.getByTestId('admin-article-editor');
  await editor.getByLabel(`AR ${copy.title}`, { exact: true }).fill('مسودة من المالك');
  await editor.getByLabel(`EN ${copy.title}`, { exact: true }).fill('Owner draft');
  await editor.locator('input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
  await expect(editor.locator('.admin-article-images img')).toHaveCount(1);
  await editor.getByLabel(copy.reason, { exact: true }).fill('Save unfinished article');
  await editor.getByRole('button', { name: locale === 'ar' ? 'حفظ مسودة' : 'Save draft' }).click();
  await expect(editor).toHaveCount(0); expect(bodies[0]?.coverAssetId).toBe(assetId);
  expect(Object.values(bodies[0]?.body as Record<string, string>).every(text => text === '')).toBe(true);
  await page.reload(); await page.getByRole('button', { name: copy.edit, exact: true }).click();
  await expect(editor.locator('.admin-article-images img')).toHaveAttribute('src', /^blob:/);
  await editor.getByLabel(`AR ${copy.body}`, { exact: true }).fill('محتوى المقال بعد العودة');
  await editor.getByLabel(`EN ${copy.body}`, { exact: true }).fill('Completed article body');
  await editor.getByRole('button', { name: locale === 'ar' ? 'معاينة المقال' : 'Preview article' }).click();
  await expect(page.getByTestId('admin-article-preview')).toContainText(locale === 'ar' ? 'محتوى المقال بعد العودة' : 'Completed article body');
  await expect(page.getByTestId('admin-article-preview').locator('img')).toHaveCSS('object-fit', 'contain');
  await page.screenshot({ path: info.outputPath('article-draft-preview.png'), fullPage: true });
});

test('creates a department, assigns a member and filters the public team with a full portrait', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar'; const copy = getAdminCmsCopy(locale);
  await authenticate(page);
  const fixture = adminCmsContentFor('team'); let member = cmsAdminTeamMemberSchema.parse({ ...fixture.items[0], category: 'management', imageUrl: '/qa-portrait.png' });
  let categories = [...DEFAULT_TEAM_CATEGORIES]; let selected: unknown;
  await page.route('**/qa-portrait.png', route => route.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await page.route('**/api/v1/admin/content/team/categories', async route => {
    if (route.request().method() === 'PUT') { const input = route.request().postDataJSON(); delete input.reason; categories = [...categories, { key: 'marketing', ...input, version: 1 }]; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: categories }) });
  });
  await page.route('**/api/v1/admin/content/team', async route => {
    if (route.request().method() === 'PUT') { const input = route.request().postDataJSON(); selected = input.category; member = { ...member, ...input, version: member.version + 1 }; delete (member as Record<string, unknown>).reason; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ namespace: 'team', items: [member] }) });
  });
  await page.route('**/api/v1/public/team', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ categories, items: [{ key: member.key, category: member.category, name: member.name, title: member.title, role: member.title, order: member.order, imageUrl: member.imageUrl }] }) }));
  await page.goto(`/admin/content/team?lang=${locale}`);
  const manager = page.getByTestId('team-categories-manager'); await manager.locator('summary').click();
  await manager.getByLabel(locale === 'ar' ? 'اسم التصنيف بالعربية' : 'Arabic category name', { exact: true }).fill('التسويق'); await manager.getByLabel(locale === 'ar' ? 'اسم التصنيف بالإنجليزية (اختياري)' : 'English category name (optional)', { exact: true }).fill('Marketing');
  await manager.getByLabel(locale === 'ar' ? 'سبب تعديل التصنيف' : 'Category change reason').fill('Create marketing department');
  await manager.getByRole('button', { name: locale === 'ar' ? 'حفظ التصنيف' : 'Save category' }).click();
  await expect(manager.getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: copy.edit, exact: true }).click(); const editor = page.getByTestId('admin-cms-team-editor');
  await editor.getByLabel(locale === 'ar' ? 'تصنيف الفريق' : 'Team category').selectOption('marketing');
  await editor.getByLabel(copy.reason, { exact: true }).fill('Assign member to marketing'); await editor.getByRole('button', { name: copy.save }).click();
  await expect(editor).toHaveCount(0); expect(selected).toBe('marketing');
  await page.goto(`/team?lang=${locale}`); await page.getByRole('button', { name: locale === 'ar' ? 'التسويق' : 'Marketing', exact: true }).click();
  await expect(page.locator('[data-team-category="marketing"]')).toHaveCount(1);
  await expect(page.locator('.public-team__photo')).toHaveCSS('object-fit', 'contain');
  await page.getByRole('button', { name: locale === 'ar' ? 'إدارة' : 'Management', exact: true }).click(); await expect(page.locator('.public-team__card')).toHaveCount(0);
  await page.getByRole('button', { name: locale === 'ar' ? 'التسويق' : 'Marketing', exact: true }).click();
  await page.screenshot({ path: info.outputPath('custom-team-category.png'), fullPage: true });
});
