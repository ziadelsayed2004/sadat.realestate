import { expect, test } from '@playwright/test';
import { adminHomeSectionFixture, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';
import { getAdminHomeCopy } from '../../src/features/admin_home/copy.ts';

const language = () => test.info().project.name.endsWith('-en') ? 'en' : 'ar';

test('selects a real homepage section with an automatic key and order, then publishes to that location', async ({ page }) => {
  const locale = language();
  const copy = getAdminHomeCopy(locale);
  await routePublicHomepageApi(page);
  await routeAdminHomeApis(page);
  const base = adminHomeSectionFixture();
  let items = [base];
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/content/homepage', async route => {
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON(); writes.push(input);
      const changes = { ...input }; delete changes.reason;
      items = [...items, { ...base, ...changes, id: 'eeeeeeeeeeeeeeeeeeeeeeee', version: 0, availableActions: ['update', 'publish', 'deactivate'] }];
    }
    await route.fulfill({ json: { data: { namespace: 'homepage', items }, meta: { requestId: 'section-placements' } } });
  });
  await page.route('**/api/v1/public/home', route => {
    const home = publicHomepageFixture().data;
    home.sections = items.filter(item => item.status === 'published' && item.visible).map(({ key, title, body, order }) => ({ key, title, body, order }));
    return route.fulfill({ json: { data: home, meta: { requestId: 'section-placement-public' } } });
  });
  await page.goto(`/admin/content/homepage?lang=${locale}`);
  await page.getByRole('button', { name: copy.add, exact: true }).click();
  const picker = page.locator('#admin-home-homepage-key');
  await expect(picker).toHaveJSProperty('tagName', 'SELECT');
  await expect(picker.locator('option[value=featured_properties]')).toHaveJSProperty('disabled', true);
  await picker.selectOption('articles');
  await expect(page.locator('#homepage-place-help')).toContainText(locale === 'ar' ? 'بعد العقارات المميزة' : 'After featured properties');
  await expect(page.getByRole('link', { name: locale === 'ar' ? 'شاهد مكانه في الرئيسية' : 'View its location on the homepage' })).toHaveAttribute('href', `/?lang=${locale}#public-homepage-article`);
  const order = page.locator('#admin-home-homepage-order');
  await expect(order).toHaveValue('');
  await expect(order).not.toHaveAttribute('required', '');
  const title = locale === 'ar' ? 'أخبار السوق العقاري' : 'Real estate market news';
  const body = locale === 'ar' ? 'مقالاتنا المختارة تساعدك على الاختيار.' : 'Our selected articles help you choose.';
  await page.locator(`#admin-home-homepage-title-${locale}`).fill(title);
  await page.locator(`#admin-home-homepage-body-${locale}`).fill(body);
  await page.locator('#admin-home-homepage-status').selectOption('published');
  await expect(page.locator('#admin-home-homepage-visible')).toHaveCount(0);
  await page.locator('#admin-home-homepage-reason').fill('Publish the articles heading');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('admin-home-homepage-editor').screenshot({ path: test.info().outputPath('section-picker-editor.png') });
  await page.getByTestId('admin-home-homepage-editor').locator('button[type=submit]').click();
  await expect(page.getByTestId('admin-home-homepage-editor')).toHaveCount(0);
  expect(writes[0]).toMatchObject({ key: 'articles', order: 3, status: 'published', visible: true, title: { [locale]: title }, body: { [locale]: body } });
  await page.goto(`/?lang=${locale}#public-homepage-article`);
  await expect(page.locator('#site-intro')).toBeHidden({ timeout: 2500 });
  await expect(page.locator('#public-homepage-article')).toHaveText(title);
  await expect(page.locator('.public-homepage__section--article .public-homepage__section-description')).toHaveText(body);
  await expect(page.locator('#public-homepage-properties')).toHaveText(base.title[locale]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#public-homepage-article').scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('section-in-its-location.png') });
});

test('keeps an existing section key, current order and unsaved inputs when saving fails', async ({ page }) => {
  const locale = language();
  const copy = getAdminHomeCopy(locale);
  await routeAdminHomeApis(page);
  let item = { ...adminHomeSectionFixture(), key: 'tips', order: 9 };
  let fail = true;
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/content/homepage', async route => {
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON(); writes.push(input);
      if (fail) { await route.fulfill({ status: 409, json: { error: { code: 'VERSION_CONFLICT', messageKey: 'errors.conflict', details: [], requestId: 'section-conflict' } } }); return; }
      const changes = { ...input }; delete changes.reason;
      item = { ...item, ...changes, version: item.version + 1 };
    }
    await route.fulfill({ json: { data: { namespace: 'homepage', items: [item] }, meta: { requestId: 'edit-section' } } });
  });
  await page.goto(`/admin/content/homepage?lang=${locale}`);
  await page.getByTestId(`admin-home-homepage-${item.id}`).getByRole('button', { name: copy.actionsByKey.update!, exact: true }).click();
  const editor = page.getByTestId('admin-home-homepage-editor');
  await expect(page.locator('#admin-home-homepage-key')).toBeDisabled();
  await expect(page.locator('#admin-home-homepage-order')).toHaveValue('');
  await expect(page.locator('#admin-home-homepage-order')).toHaveAttribute('placeholder', '9');
  await page.locator(`#admin-home-homepage-title-${locale}`).fill('Updated section title');
  await page.locator('#admin-home-homepage-reason').fill('Revise section title');
  await editor.locator('button[type=submit]').click();
  await expect(editor.getByRole('alert')).toContainText(copy.mutation.conflict);
  await expect(page.locator(`#admin-home-homepage-title-${locale}`)).toHaveValue('Updated section title');
  await expect(page.locator('#admin-home-homepage-key')).toHaveValue('tips');
  await expect(page.locator('#admin-home-homepage-reason')).toHaveValue('Revise section title');
  expect(writes[0]).toMatchObject({ id: item.id, version: 4 });
  expect(writes[0]).not.toHaveProperty('order');
  expect(writes[0]).not.toHaveProperty('key');
  fail = false;
  await editor.locator('button[type=submit]').click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByTestId(`admin-home-homepage-${item.id}`)).toContainText('Updated section title');
});

test('uses each configured title and description in its own homepage section', async ({ page }) => {
  const locale = language();
  await routePublicHomepageApi(page);
  const keys = ['hero', 'featured_properties', 'articles', 'community', 'tips', 'about'];
  await page.route('**/api/v1/public/home', route => {
    const home = publicHomepageFixture().data;
    home.banners = [];
    home.sections = keys.map((key, order) => ({ key, title: { [locale]: `Title ${key}` }, body: { [locale]: `Description ${key}` }, order }));
    return route.fulfill({ json: { data: home, meta: { requestId: 'all-section-texts' } } });
  });
  await page.goto(`/?lang=${locale}`);
  await expect(page.locator('#site-intro')).toBeHidden({ timeout: 2500 });
  for (const [key, selector] of [['hero', '#public-homepage-hero-title'], ['featured_properties', '#public-homepage-properties'], ['articles', '#public-homepage-article'], ['community', '#public-homepage-community'], ['tips', '#public-homepage-tip'], ['about', '#public-homepage-about']]) {
    await expect(page.locator(selector!)).toHaveText(`Title ${key}`);
    await expect(page.getByText(`Description ${key}`, { exact: true })).toBeAttached();
  }
});
