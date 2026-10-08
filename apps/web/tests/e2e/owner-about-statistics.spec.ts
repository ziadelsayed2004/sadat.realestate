import { expect, test } from '@playwright/test';
import { DEFAULT_ABOUT_STATS, cmsAdminAboutBlockSchema } from '@sadat-real-estate/contracts';
import { adminCmsContentFor } from './admin-cms-content.fixtures.ts';
import { getAdminCmsCopy } from '../../src/features/admin_content/copy.ts';

const envelope = (data: unknown) => JSON.stringify({ data, meta: { requestId: 'about-statistics-qa' } });
test('explains About values, previews edits and links to their published position', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const copy = getAdminCmsCopy(locale);
  let block = cmsAdminAboutBlockSchema.parse({ ...adminCmsContentFor('about').items[0], key: 'about_intro', stats: DEFAULT_ABOUT_STATS });
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'about.statistics.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }) }));
  await page.route('**/api/v1/admin/content/about', async route => {
    if (route.request().method() === 'PUT') { const input = route.request().postDataJSON(); delete input.reason; block = cmsAdminAboutBlockSchema.parse({ ...block, ...input, version: block.version + 1 }); }
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ namespace: 'about', items: [block] }) });
  });
  await page.route('**/api/v1/public/about', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ key: block.key, title: block.title, body: block.body, order: block.order, stats: block.stats }] }) }));
  await page.goto(`/admin/content/about?lang=${locale}`);
  await page.getByRole('button', { name: locale === 'ar' ? 'تعديل أرقام من نحن' : 'Edit About statistics' }).click();
  const editor = page.getByTestId('admin-cms-about-editor');
  const preview = page.getByTestId('admin-about-statistics-preview');
  await editor.getByLabel(locale === 'ar' ? 'قيمة البطاقة 4' : 'Card 4 value', { exact: true }).fill('342,088');
  await expect(preview).toContainText('342,088');
  await editor.getByLabel(locale === 'ar' ? 'إظهار البطاقة 2' : 'Show card 2', { exact: true }).uncheck();
  await expect(preview.locator('article')).toHaveCount(3);
  await expect(editor.getByRole('link', { name: locale === 'ar' ? 'شاهد مكان البطاقات في الموقع' : 'View the cards on the website' })).toHaveAttribute('href', `/about?lang=${locale}#about-statistics`);
  await page.getByTestId('admin-about-statistics').screenshot({ path: info.outputPath('about-values-with-preview.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await editor.getByLabel(copy.reason, { exact: true }).fill('Clarify confirmed resident figure');
  await editor.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.goto(`/about?lang=${locale}#about-statistics`);
  const publicStats = page.locator('#about-statistics');
  await expect(publicStats.locator('article')).toHaveCount(3);
  await expect(publicStats).toContainText('342,088');
  await publicStats.screenshot({ path: info.outputPath('about-published-statistics.png') });
});
