import { expect, test } from '@playwright/test';
import { cmsAdminAboutBlockPutSchema, cmsAdminContentDataSchema } from '@sadat-real-estate/contracts';
import { adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

test('saves bilingual About statistics, reloads them and shows the selected cards to visitors', async ({ page }) => {
  const lang = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const data = cmsAdminContentDataSchema.parse(adminCmsContentFor('about'));
  if (data.namespace !== 'about') throw new Error('Expected About fixture');
  let item = { ...data.items[0]!, key: 'about_intro' };
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ accessToken: 'cms.about_stats.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'stats-auth')) }));
  await page.route('**/api/v1/admin/content/about', async route => {
    if (route.request().method() === 'PUT') {
      const body = cmsAdminAboutBlockPutSchema.parse(route.request().postDataJSON());
      if (!('id' in body) || !body.id) throw new Error('Expected existing block update');
      expect(body.version).toBe(item.version);
      expect(body.reason).toBe('Update verified platform numbers');
      item = { ...item, ...(body.stats !== undefined ? { stats: body.stats } : {}), version: item.version + 1 };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ namespace: 'about', items: [item] }, 'stats-current')) });
  });
  await page.route('**/api/v1/public/about', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ items: [{ key: item.key, title: item.title, body: item.body, order: item.order, stats: item.stats }] }, 'stats-public')) }));
  const open = () => page.getByRole('button', { name: lang === 'ar' ? 'تعديل أرقام من نحن' : 'Edit About statistics' }).click();
  await page.goto(`/admin/content/about?lang=${lang}`);
  await open();
  const fields = page.getByTestId('admin-about-statistics');
  const valueLabel = lang === 'ar' ? 'قيمة البطاقة 1' : 'Card 1 value';
  await fields.getByLabel(valueLabel, { exact: true }).fill('2,500+');
  await fields.getByLabel(lang === 'ar' ? 'عنوان البطاقة 1 بالعربية' : 'Card 1 Arabic label', { exact: true }).fill('عقارات معتمدة');
  await fields.getByLabel(lang === 'ar' ? 'عنوان البطاقة 1 بالإنجليزية' : 'Card 1 English label', { exact: true }).fill('Verified properties');
  await fields.getByLabel(lang === 'ar' ? 'إظهار البطاقة 2' : 'Show card 2', { exact: true }).uncheck();
  await page.locator('#admin-cms-about-reason').fill('Update verified platform numbers');
  await page.getByTestId('admin-cms-about-editor').locator('button[type="submit"]').click();
  await expect(page.getByTestId('admin-cms-about-editor')).not.toBeVisible();
  await page.reload(); await open();
  await expect(fields.getByLabel(valueLabel, { exact: true })).toHaveValue('2,500+');
  await expect(fields.getByLabel(lang === 'ar' ? 'إظهار البطاقة 2' : 'Show card 2', { exact: true })).not.toBeChecked();
  await page.screenshot({ path: test.info().outputPath('about-statistics-editor.png'), fullPage: true });
  await page.goto(`/about?lang=${lang}`);
  const cards = page.locator('.public-about__stat-grid article');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toContainText('2,500+');
  await expect(cards.first()).toContainText(lang === 'ar' ? 'عقارات معتمدة' : 'Verified properties');
  await expect(cards.first().locator('bdi')).toHaveAttribute('dir', 'ltr');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => document.fonts.ready); await cards.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('about-statistics.png'), fullPage: true });
});
