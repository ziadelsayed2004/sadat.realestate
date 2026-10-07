import { expect, test } from '@playwright/test';
import { cmsAdminAboutBlockPutSchema, cmsAdminContentDataSchema } from '@sadat-real-estate/contracts';
import { adminCmsAboutId, adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

function locale() { return test.info().project.name.endsWith('-en') ? 'en' : 'ar'; }

test('an administrator edits an existing About block and the visitor sees its saved title and text', async ({ page }) => {
  test.skip(!test.info().project.name.startsWith('desktop'), 'Administrator dashboard desktop workflow.');
  const lang = locale();
  const initial = cmsAdminContentDataSchema.parse(adminCmsContentFor('about'));
  if (initial.namespace !== 'about') throw new Error('Expected About fixture');
  const otherId = 'eeeeeeeeeeeeeeeeeeeeeeee';
  let items = [{ ...initial.items[0]!, key: 'about_intro' }, { ...initial.items[0]!, id: otherId, key: 'vision', title: { ar: 'رؤيتنا', en: 'Our vision' } }];
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ accessToken: 'cms.about.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'about-auth')) }));
  await page.route('**/api/v1/admin/content/about', async route => {
    if (route.request().method() === 'PUT') {
      const body = cmsAdminAboutBlockPutSchema.parse(route.request().postDataJSON());
      if (!('id' in body) || !body.id) throw new Error('Expected an update, not an additional record');
      const original = items.find(item => item.id === body.id);
      expect(body.version).toBe(original?.version);
      items = items.map(item => item.id === body.id ? { ...item, title: body.title ?? item.title, body: body.body ?? item.body, order: body.order ?? item.order, active: body.active ?? item.active, status: body.status ?? item.status, version: item.version + 1 } : item);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ namespace: 'about', items }, 'about-current')) });
  });
  await page.route('**/api/v1/public/about', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ items: items.map(({ key, title, body, order }) => ({ key, title, body, order })) }, 'public-about-current')) }));
  await page.goto(`/admin/content/about?lang=${lang}`);
  await page.getByTestId(`admin-cms-about-${otherId}`).getByRole('button', { name: lang === 'ar' ? 'تعديل' : 'Edit', exact: true }).click();
  const editor = page.getByTestId('admin-cms-about-editor');
  await expect(editor.locator('#admin-cms-about-title-ar')).toBeFocused();
  await expect(editor.locator('#admin-cms-about-key')).toBeDisabled();
  await editor.locator('#admin-cms-about-title-ar').fill('رؤيتنا الجديدة');
  await editor.locator('#admin-cms-about-title-en').fill('Our revised vision');
  await editor.locator('#admin-cms-about-body-ar').fill('نص رؤيتنا الذي تم تعديله وحفظه');
  await editor.locator('#admin-cms-about-body-en').fill('Our revised description saved by the administrator');
  await editor.locator('#admin-cms-about-reason').fill('Update official vision');
  await editor.locator('button[type="submit"]').click();
  await expect(editor).not.toBeVisible();
  await expect(page.getByRole('status')).toHaveText(lang === 'ar' ? 'تم حفظ محتوى «عن المنصة» بنجاح.' : 'About content saved successfully.');
  expect(items).toHaveLength(2);
  expect(items.find(item => item.id === adminCmsAboutId)?.key).toBe('about_intro');
  await page.goto(`/about?lang=${lang}`);
  await expect(page.getByRole('heading', { name: lang === 'ar' ? 'رؤيتنا الجديدة' : 'Our revised vision', exact: true })).toBeVisible();
  await expect(page.getByText(lang === 'ar' ? 'نص رؤيتنا الذي تم تعديله وحفظه' : 'Our revised description saved by the administrator', { exact: true })).toBeVisible();
});

test('published About titles and paragraphs fit on desktop and mobile in both languages', async ({ page }) => {
  const lang = locale();
  const title = lang === 'ar' ? 'عن منصة عقارات السادات وخدماتنا ورؤيتنا لتطوير السوق العقاري في مدينة السادات' : 'About Sadat Real Estate and our services and vision for the property market in Sadat City';
  const body = lang === 'ar' ? 'نص التعريف بالمنصة وخدماتها الموثوقة للعملاء ومقدمي العقارات. '.repeat(8) : 'Our published platform description and trusted services for customers and property providers. '.repeat(8);
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/v1/public/about', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ items: [
    { key: 'about_intro', title: { [lang]: title }, body: { [lang]: body }, order: 0 },
    { key: 'vision', title: { [lang]: title }, body: { [lang]: body }, order: 1 }
  ] }, 'about-responsive')) }));
  await page.goto(`/about?lang=${lang}`);
  await expect(page.locator('[data-page="public-about"]')).toHaveAttribute('data-about-state', 'success');
  await expect(page.locator('.public-about__published-blocks article')).toHaveCount(1);
  const bounds = await page.evaluate(() => {
    const hero = document.querySelector('.public-about__hero')!.getBoundingClientRect();
    const text = document.querySelector('.public-about__hero-content')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth, heroBottom: hero.bottom, textBottom: text.bottom, left: text.left, right: text.right, width: innerWidth };
  });
  expect(bounds.overflow).toBe(false);
  expect(bounds.textBottom).toBeLessThanOrEqual(bounds.heroBottom + 1);
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width);
  await page.screenshot({ path: test.info().outputPath('published-about.png'), fullPage: true });
});
