import { expect, test } from '@playwright/test';
import { adminHomeBannerId, routeAdminHomeApis } from './admin-home.fixtures.ts';
import { publicHomepageFixture, routePublicHomepageApi } from './public-fixtures.ts';
import { getBannerControlCopy } from '../../src/features/admin_home/banner-controls-copy.ts';

test('saved banner content reopens and replaces the default sentence on the homepage', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  const body = { ar: 'عقارك الجديد يبدأ معنا — محتوى كتبته بنفسي', en: 'Your new home starts with us — my own content' };
  const controls = getBannerControlCopy(locale);
  await page.clock.install({ time: new Date('2026-08-22T12:00:00Z') });
  await routeAdminHomeApis(page);
  await page.goto(`/admin/banners?lang=${locale}`);
  const row = page.getByTestId(`admin-home-banner-${adminHomeBannerId}`);
  await row.getByRole('button', { name: controls.edit, exact: true }).click();
  await page.locator('#admin-home-banner-body-ar').fill(body.ar);
  await page.locator('#admin-home-banner-body-en').fill(body.en);
  await page.locator('#admin-home-banner-reason').fill('Show the content written by the site owner');
  const saveRequest = page.waitForRequest(request => request.method() === 'PATCH' && request.url().endsWith(`/admin/banners/${adminHomeBannerId}`));
  await page.locator('.admin-home__editor button[type=submit]').click();
  expect((await saveRequest).postDataJSON()).toMatchObject({ body });
  await expect(page.locator('.admin-home__feedback[role=status]')).toBeVisible();
  await page.goto(`/admin/banners?lang=${locale}`);
  await row.getByRole('button', { name: controls.edit, exact: true }).click();
  await expect(page.locator('#admin-home-banner-body-ar')).toHaveValue(body.ar);
  await expect(page.locator('#admin-home-banner-body-en')).toHaveValue(body.en);

  await routePublicHomepageApi(page);
  const home = publicHomepageFixture().data;
  await page.route('**/api/v1/public/home', route => route.fulfill({ json: { data: { ...home, banners: [{ key: `banner_${adminHomeBannerId}`, title: { ar: 'عنوان البانر', en: 'Banner title' }, body, imageUrl: '/assets/canonical/public/home-hero-sadat-city.png', order: 0 }] }, meta: { requestId: 'owned-home-content' } } }));
  await page.goto(`/?lang=${locale}`);
  await expect(page.locator('.public-homepage__hero-body')).toHaveText(body[locale]);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale === 'ar' ? 'عنوان البانر' : 'Banner title');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('owned-home-content.png') });
});
