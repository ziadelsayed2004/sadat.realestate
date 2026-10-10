import { expect, test } from '@playwright/test';
import { adminProjectFixture } from './admin-projects.fixtures.ts';

test('archives a published project after an explicit reason and confirmation without administrative creation', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), locale = ar ? 'ar' : 'en';
  let project = { ...adminProjectFixture(), status: 'published', publicPath: '/developers/qa-developer#project-nile-heights', availableActions: ['archive', 'update'] };
  let writes = 0;
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'project-archive-qa' } });
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: 'project.admin.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'c'.repeat(24), roleType: 'admin', status: 'verified' } }) }));
  await page.route('**/api/v1/admin/projects**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    expect(request.headers().authorization).toBe('Bearer project.admin.qa');
    if (request.method() === 'POST') {
      expect(path).toBe(`/api/v1/admin/projects/${project.id}/review`);
      expect(request.postDataJSON()).toEqual({ version: 3, action: 'archive', reason: 'Remove displayed project' });
      writes++;
      project = { ...project, status: 'archived', publicPath: '', version: 4, availableActions: [] };
    }
    const { publicPath, ...stored } = project;
    const data = publicPath ? { ...stored, publicPath } : stored;
    await route.fulfill({ json: envelope(path.endsWith(project.id) || request.method() === 'POST' ? data : { items: [data] }) });
  });
  await page.goto(`/admin/projects?lang=${locale}`);
  const row = page.getByTestId(`admin-project-${project.id}`);
  const label = ar ? 'حذف من العرض (أرشفة)' : 'Remove from display (archive)';
  const archive = row.getByRole('link', { name: label });
  await row.scrollIntoViewIfNeeded();
  await expect(archive).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await archive.click();
  await expect(page.getByRole('radio', { name: label })).toBeChecked();
  const confirm = page.getByRole('button', { name: ar ? 'تأكيد الأرشفة' : 'Confirm archive' });
  await confirm.click();
  expect(writes).toBe(0);
  await expect(page.locator('.admin-projects__feedback')).toBeVisible();
  await page.getByLabel(ar ? 'سبب الإجراء' : 'Action reason').fill('Remove displayed project');
  await page.locator('#project-actions').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('archive-project-confirmation.png'), fullPage: true });
  await confirm.click();
  await expect(page.locator('.admin-projects__detail-card [data-status="archived"]')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('link', { name: ar ? 'عرض في الموقع' : 'View on site' })).toHaveCount(0);
  await expect(page.locator('#project-edit')).toHaveCount(0);
  expect(writes).toBe(1);
  await page.reload();
  await expect(page.locator('.admin-projects__detail-card [data-status="archived"]')).toBeVisible();
  expect(writes).toBe(1);
});
