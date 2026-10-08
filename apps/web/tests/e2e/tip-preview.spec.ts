import { expect, test } from '@playwright/test';
import { adminHomeTipFixture, adminHomeTipId, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';

test('previews saved and unsaved tip translations, then displays the same published card on the homepage', async ({ page }, info) => {
  const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  const title = { ar: 'اتأكد من أوراق العقار قبل الشراء', en: 'Check property documents before buying' };
  const body = { ar: 'راجع عقد الملكية والتراخيص.\nقارن السعر بعقارات نفس المنطقة.', en: 'Check the title deed and permits.\nCompare the price with nearby properties.' };
  let stored = { ...adminHomeTipFixture(), status: 'draft', active: false };
  let writes = 0;
  await routeAdminHomeApis(page);
  await routePublicHomepageApi(page);
  await page.route('**/api/v1/admin/content/tips', async route => {
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON(); writes += 1;
      expect(input.id).toBe(adminHomeTipId);
      expect(input.version).toBe(stored.version);
      delete input.reason;
      stored = { ...stored, ...input, version: stored.version + 1 };
    }
    await route.fulfill({ json: { data: { namespace: 'tips', items: [stored] }, meta: { requestId: 'tip-preview-qa' } } });
  });
  await page.route('**/api/v1/public/home**', route => {
    const response = publicHomepageFixture();
    response.data.content = response.data.content.filter(item => item.type !== 'tip');
    if (stored.status === 'published' && stored.active) response.data.content.push({ key: stored.key, type: 'tip', title: stored.title, body: stored.body, order: stored.order });
    return route.fulfill({ json: response });
  });
  await page.goto(`/admin/content/tips?lang=${locale}`);
  const row = page.getByTestId(`admin-home-tips-${adminHomeTipId}`);
  await row.getByRole('button', { name: ar ? 'معاينة' : 'Preview', exact: true }).click();
  const preview = page.getByRole('complementary', { name: ar ? 'معاينة المحتوى' : 'Content preview' });
  await expect(preview.locator('.public-tip-card')).toContainText(stored.title[locale]);
  await expect(preview).toContainText(ar ? 'مش ظاهرة للزوار بالحالة الحالية' : 'Not visible to visitors in its current state');
  expect(writes).toBe(0);
  await preview.getByRole('button', { name: ar ? 'إغلاق المعاينة' : 'Close preview' }).click();
  await expect(preview).toHaveCount(0);
  await row.getByRole('button', { name: ar ? 'تعديل' : 'Edit', exact: true }).click();
  const editor = page.getByTestId('admin-home-tips-editor');
  await editor.locator('#admin-home-tips-title-ar').fill(title.ar);
  await editor.locator('#admin-home-tips-title-en').fill(title.en);
  await editor.locator('#admin-home-tips-body-ar').fill(body.ar);
  await editor.locator('#admin-home-tips-body-en').fill(body.en);
  const language = preview.getByLabel(ar ? 'لغة المعاينة' : 'Preview language');
  await language.selectOption('ar');
  await expect(preview.locator('.public-tip-card h3')).toHaveText(title.ar);
  await expect(preview.locator('.public-tip-card p')).toHaveText(body.ar);
  await expect(preview.locator('[lang=ar]')).toHaveAttribute('dir', 'rtl');
  await language.selectOption('en');
  await expect(preview.locator('.public-tip-card p')).toHaveText(body.en);
  await editor.locator('#admin-home-tips-body-en').fill('');
  await expect(preview.locator('.public-tip-card p')).toHaveText(body.ar);
  await editor.locator('#admin-home-tips-body-en').fill(body.en);
  await language.selectOption(locale);
  expect(writes).toBe(0);
  if (page.viewportSize()!.width > 1000) {
    const formBounds = await editor.locator('form').boundingBox(); const previewBounds = await preview.boundingBox();
    expect(previewBounds!.y < formBounds!.y + formBounds!.height && formBounds!.y < previewBounds!.y + previewBounds!.height).toBe(true);
    expect(formBounds!.x + formBounds!.width <= previewBounds!.x || previewBounds!.x + previewBounds!.width <= formBounds!.x).toBe(true);
  }
  await editor.screenshot({ path: info.outputPath('live-tip-preview.png') });
  await editor.locator('#admin-home-tips-status').selectOption('published');
  await editor.locator('#admin-home-tips-active').check();
  await editor.locator('#admin-home-tips-reason').fill('Publish the owner-reviewed tip');
  await editor.locator('button[type=submit]').click();
  await expect(editor).toHaveCount(0);
  expect(writes).toBe(1);
  await row.getByRole('button', { name: ar ? 'معاينة' : 'Preview', exact: true }).click();
  await expect(preview.locator('.public-tip-card h3')).toHaveText(title[locale]);
  await expect(preview.locator('.public-tip-card p')).toHaveText(body[locale]);
  await page.goto(`/?lang=${locale}`);
  await expect(page.locator('#site-intro')).toBeHidden();
  const publicCard = page.locator('.public-homepage__section--tip .public-tip-card');
  await expect(publicCard).toHaveCount(1);
  await expect(publicCard.locator('h3')).toHaveText(title[locale]);
  await expect(publicCard.locator('p')).toHaveText(body[locale]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await publicCard.screenshot({ path: info.outputPath('published-tip.png') });
});
