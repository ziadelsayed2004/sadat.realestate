import { expect, test } from '@playwright/test';
import { adminHomeSectionFixture, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';

test('homepage content can be stopped and resumed with saved state and unchanged text', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'Admin content is approved for desktop.');
  const ar = testInfo.project.name.endsWith('-ar');
  const locale = ar ? 'ar' : 'en';
  await routePublicHomepageApi(page);
  await routeAdminHomeApis(page);
  let section = { ...adminHomeSectionFixture(), key: 'hero', availableActions: ['update', 'publish', 'deactivate'] };
  const writes: unknown[] = [];
  await page.route('**/api/v1/admin/content/homepage', async route => {
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON(); writes.push(input);
      expect(input.version).toBe(section.version);
      section = { ...section, status: input.status, visible: input.visible, version: section.version + 1 };
    }
    await route.fulfill({ json: { data: { namespace: 'homepage', items: [section] }, meta: { requestId: 'section-display' } } });
  });
  await page.route('**/api/v1/public/home', route => {
    const home = publicHomepageFixture().data;
    home.banners = [];
    home.sections = section.status === 'published' && section.visible ? [{ key: section.key, title: section.title, body: section.body, order: section.order }] : [];
    return route.fulfill({ json: { data: home, meta: { requestId: 'section-public' } } });
  });
  await page.goto(`/?lang=${locale}`);
  await expect(page.locator('.public-homepage__hero h1')).toHaveText(section.title[locale]);
  await page.goto(`/admin/content/homepage?lang=${locale}`);
  const row = page.getByTestId(`admin-home-homepage-${section.id}`);
  await row.getByRole('button', { name: ar ? 'إيقاف' : 'Stop', exact: true }).click();
  const form = page.getByTestId('homepage-section-visibility');
  await expect(form).toContainText(ar ? 'بياناته محفوظة' : 'Its data is kept');
  await form.getByRole('textbox').fill('Hide while updating content');
  await form.screenshot({ path: testInfo.outputPath('homepage-section-stop-form.png') });
  await form.getByRole('button', { name: ar ? 'إيقاف' : 'Stop', exact: true }).click();
  await expect(row).toContainText(ar ? 'مخفي عن الزوار' : 'Hidden from visitors');
  await page.locator('.admin-home__panel').screenshot({ path: testInfo.outputPath('homepage-section-stopped.png') });
  expect(writes[0]).toMatchObject({ id: section.id, version: 4, status: 'inactive', visible: false, reason: 'Hide while updating content' });
  await page.reload();
  await expect(row.getByRole('button', { name: ar ? 'إعادة تشغيل' : 'Resume' })).toBeVisible();
  await page.goto(`/?lang=${locale}`);
  await expect(page.locator('.public-homepage__hero h1')).not.toHaveText(section.title[locale]);
  await page.goto(`/admin/content/homepage?lang=${locale}`);
  await row.getByRole('button', { name: ar ? 'إعادة تشغيل' : 'Resume' }).click();
  await form.getByRole('textbox').fill('Ready to show again');
  await form.getByRole('button', { name: ar ? 'إعادة تشغيل' : 'Resume' }).click();
  await expect(row).toContainText(ar ? 'ظاهر للزوار' : 'Visible to visitors');
  expect(writes[1]).toMatchObject({ id: section.id, version: 5, status: 'published', visible: true, reason: 'Ready to show again' });
  await page.locator('.admin-home__panel').screenshot({ path: testInfo.outputPath('homepage-section-resumed.png') });
  await page.goto(`/?lang=${locale}`);
  await expect(page.locator('.public-homepage__hero h1')).toHaveText(section.title[locale]);
  await expect(page.locator('.public-homepage__hero-body')).toHaveText(section.body[locale]);
});
