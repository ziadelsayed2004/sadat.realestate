import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_TEAM_CATEGORIES, cmsAdminTeamMemberSchema } from '@sadat-real-estate/contracts';
import { getAdminCmsCopy } from '../../src/features/admin_content/copy.ts';
import { adminCmsContentFor } from './admin-cms-content.fixtures.ts';
const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV0sAAAAASUVORK5CYII=', 'base64');
const envelope = (data: unknown) => JSON.stringify({ data, meta: { requestId: 'owner-team-qa' } });
async function authenticate(page: Page) {
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'owner.team.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id, roleType: 'admin', status: 'verified' } }) }));
}

test('creates a department, assigns a member and filters the public team with a filled photo frame', async ({ page }, info) => {
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
  if (info.project.name.startsWith('desktop')) {
    const search = page.locator('#admin-section-search');
    await search.fill(locale === 'ar' ? 'المقالات' : 'Articles');
    const articles = page.locator('#admin-section-search-results').getByRole('link', { name: locale === 'ar' ? 'المقالات' : 'Articles', exact: true });
    await expect(articles).toHaveAttribute('href', `/admin/articles?lang=${locale}`);
    await search.press('Enter'); await expect(articles).toBeFocused();
    await page.locator('.admin-section-search').screenshot({ path: info.outputPath('admin-section-search.png') });
    await articles.click(); await expect(page).toHaveURL(new RegExp(`/admin/articles\\?lang=${locale}`));
    await page.goto(`/admin/content/team?lang=${locale}`);
  }
  await page.getByRole('button', { name: copy.edit, exact: true }).click();
  const editor = page.getByTestId('admin-cms-team-editor');
  await editor.getByLabel(locale === 'ar' ? 'قسم الفريق' : 'Team department').selectOption('sales');
  const manager = page.getByTestId('team-categories-manager');
  await editor.getByRole('button', { name: locale === 'ar' ? 'إضافة أو تعديل قسم' : 'Add or edit a department' }).click();
  await expect(manager).toHaveAttribute('open', '');
  await expect(manager.locator('input[type=checkbox]')).toHaveCSS('width', '18px');
  await manager.screenshot({ path: info.outputPath('team-department-manager.png') });
  await expect(editor.getByLabel(locale === 'ar' ? 'قسم الفريق' : 'Team department')).toHaveValue('sales');
  await manager.getByLabel(locale === 'ar' ? 'اسم القسم بالعربية' : 'Arabic department name', { exact: true }).fill('التسويق'); await manager.getByLabel(locale === 'ar' ? 'اسم القسم بالإنجليزية (اختياري)' : 'English department name (optional)', { exact: true }).fill('Marketing');
  await manager.getByLabel(locale === 'ar' ? 'سبب إضافة أو تعديل القسم' : 'Department change reason').fill('Create marketing department');
  await manager.getByRole('button', { name: locale === 'ar' ? 'حفظ القسم' : 'Save department' }).click();
  await expect(manager.getByRole('status')).toBeVisible();
  await editor.getByLabel(locale === 'ar' ? 'قسم الفريق' : 'Team department').selectOption('marketing');
  await editor.locator('#admin-cms-team-category').locator('..').locator('..').screenshot({ path: info.outputPath('team-department-field.png') });
  await editor.getByLabel(copy.reason, { exact: true }).fill('Assign member to marketing'); await editor.getByRole('button', { name: copy.save }).click();
  await expect(editor).toHaveCount(0); expect(selected).toBe('marketing');
  await page.getByRole('button', { name: copy.edit, exact: true }).click();
  await expect(editor.getByLabel(locale === 'ar' ? 'قسم الفريق' : 'Team department')).toHaveValue('marketing');
  await expect(editor.locator('input[type=checkbox]')).toHaveCSS('width', '18px');
  await expect(editor.getByLabel(locale === 'ar' ? 'AR المسمى الوظيفي' : 'AR Job title')).toBeVisible();
  await editor.screenshot({ path: info.outputPath('team-member-editor.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto(`/team?lang=${locale}`); await page.getByRole('button', { name: locale === 'ar' ? 'التسويق' : 'Marketing', exact: true }).click();
  await expect(page.locator('[data-team-category="marketing"]')).toHaveCount(1);
  await expect(page.locator('[data-team-category="marketing"] .public-team__department')).toHaveText(locale === 'ar' ? 'التسويق' : 'Marketing');
  await expect(page.locator('[data-team-category="marketing"] .public-team__role')).toHaveText(locale === 'ar' ? 'مدير' : 'Director');
  expect(await page.locator('[data-team-category="marketing"]').evaluate(card => {
    const bottom = card.getBoundingClientRect().bottom;
    return [...card.querySelectorAll('.public-team__card-body > *')].every(child => child.getBoundingClientRect().bottom <= bottom);
  })).toBe(true);
  await expect(page.locator('.public-team__photo')).toHaveCSS('object-fit', 'cover');
  await page.getByRole('button', { name: locale === 'ar' ? 'إدارة' : 'Management', exact: true }).click(); await expect(page.locator('.public-team__card')).toHaveCount(0);
  await page.getByRole('button', { name: locale === 'ar' ? 'التسويق' : 'Marketing', exact: true }).click();
  await page.locator('h1').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('custom-team-category.png'), fullPage: true });
});
