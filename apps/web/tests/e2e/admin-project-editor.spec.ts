import { expect, test } from '@playwright/test';
import { adminProjectFixture } from './admin-projects.fixtures.ts';

test('opens a published project, previews edits without saving and retains edit access after saving and reloading', async ({ page }, info) => {
  const ar = !info.project.name.endsWith('-en');
  let project = { ...adminProjectFixture(), status: 'published', publicPath: '/developers/qa-developer#project-nile-heights', availableActions: ['update'] };
  let writes = 0;
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'project-edit-qa' } });
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: 'project.admin.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'c'.repeat(24), roleType: 'admin', status: 'verified' } }) }));
  await page.route('**/api/v1/admin/projects**', async route => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer project.admin.qa');
    const path = new URL(request.url()).pathname;
    if (request.method() === 'PATCH') {
      const input = request.postDataJSON();
      expect(input.version).toBe(project.version);
      expect(input.reason).toBe('Administrative project edit');
      expect(input.status).toBeUndefined();
      expect(input.providerId).toBeUndefined();
      writes++;
      project = { ...project, name: input.name, description: input.description, slug: input.slug, version: project.version + 1 };
    }
    await route.fulfill({ json: envelope(path.endsWith(project.id) ? project : { items: [project] }) });
  });
  await page.goto(`/admin/projects?lang=${ar ? 'ar' : 'en'}`);
  const row = page.getByTestId(`admin-project-${project.id}`);
  await expect(row.getByRole('link', { name: ar ? 'عرض التفاصيل' : 'View details', exact: true })).toBeVisible();
  await expect(row.getByRole('link', { name: ar ? 'عرض في الموقع' : 'View on site' })).toHaveAttribute('href', `/developers/qa-developer?lang=${ar ? 'ar' : 'en'}#project-nile-heights`);
  await row.getByRole('link', { name: ar ? 'تعديل' : 'Edit', exact: true }).click();
  const editor = page.locator('#project-edit');
  await expect(editor).toBeVisible();
  await editor.getByLabel(`${ar ? 'اسم المشروع AR' : 'Project name EN'}`).fill('Updated project');
  await editor.getByLabel(`${ar ? 'وصف المشروع AR' : 'Project description EN'}`).fill('Previewed description');
  await editor.getByRole('button', { name: ar ? 'معاينة قبل الحفظ' : 'Preview before saving' }).click();
  await expect(editor.getByRole('article', { name: ar ? 'معاينة المشروع' : 'Project preview' })).toContainText('Updated project');
  expect(writes).toBe(0);
  await editor.getByRole('button', { name: ar ? 'حفظ التعديلات' : 'Save changes' }).click();
  await expect(editor.getByRole('status')).toHaveText(ar ? 'تم حفظ المشروع.' : 'Project saved.');
  await expect(editor.getByRole('article')).toHaveCount(0);
  expect(writes).toBe(1);
  expect(project.status).toBe('published');
  await page.reload();
  await expect(editor.getByLabel(`${ar ? 'اسم المشروع AR' : 'Project name EN'}`)).toHaveValue('Updated project');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await editor.screenshot({ path: info.outputPath('admin-project-editor.png') });
});
