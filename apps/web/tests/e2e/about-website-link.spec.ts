import { expect, test } from '@playwright/test';
import { cmsAdminContentDataSchema } from '@sadat-real-estate/contracts';
import { adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

test('opens the published About section in a new tab at its exact location', async ({ page, context }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const fixture = cmsAdminContentDataSchema.parse(adminCmsContentFor('about'));
  if (fixture.namespace !== 'about') throw new Error('Expected About fixture');
  const base = fixture.items[0]!;
  const items = [
    { ...base, id: '111111111111111111111111', key: 'about_intro', title: { ar: 'عن منصتنا', en: 'About our platform' }, order: 0 },
    { ...base, id: '222222222222222222222222', key: 'vision', title: { ar: 'رؤيتنا', en: 'Our vision' }, body: { ar: 'رؤيتنا لخدمة مدينة السادات.\n'.repeat(40), en: 'Our vision for serving Sadat City.\n'.repeat(40) }, order: 10 },
    { ...base, id: '333333333333333333333333', key: 'mission', title: { ar: 'خدماتنا المتكاملة', en: 'Our integrated services' }, order: 20 },
    { ...base, id: '444444444444444444444444', key: 'unfinished', status: 'draft', order: 30 },
    { ...base, id: '555555555555555555555555', key: 'hidden', active: false, order: 40 }
  ];
  const writes: string[] = [];
  await context.route('**/api/v1/auth/refresh', route => route.fulfill({ json: adminCmsEnvelope({ accessToken: 'cms.about.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'about-link-auth') }));
  await context.route('**/api/v1/admin/content/about', async route => {
    if (route.request().method() !== 'GET') writes.push(route.request().method());
    await route.fulfill({ json: adminCmsEnvelope({ namespace: 'about', items }, 'about-link-admin') });
  });
  await context.route('**/api/v1/public/about', async route => {
    // Exercise fragment navigation when public content arrives after the page.
    await new Promise(resolve => setTimeout(resolve, 450));
    await route.fulfill({ json: adminCmsEnvelope({ items: items.filter(item => item.active && item.status === 'published').map(({ key, title, body, order }) => ({ key, title, body, order })) }, 'about-link-public') });
  });
  await page.goto(`/admin/content/about?lang=${locale}`);
  const records = page.locator('.admin-cms__record-grid');
  await expect(records.locator('a[target="_blank"]')).toHaveCount(3);
  for (const id of ['444444444444444444444444', '555555555555555555555555']) {
    const record = page.getByTestId(`admin-cms-about-${id}`);
    await expect(record.getByRole('link')).toHaveCount(0);
    await expect(record).toContainText(locale === 'ar' ? 'غير ظاهر للزوار' : 'Not visible to visitors');
  }
  for (const item of [items[2]!, items[0]!]) {
    const link = page.getByTestId(`admin-cms-about-${item.id}`).getByRole('link', { name: locale === 'ar' ? 'عرض في الموقع' : 'View on website' });
    await expect(link).toHaveAttribute('href', `/about?lang=${locale}#about-block-${item.key}`);
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const opened = page.waitForEvent('popup');
    await link.click();
    const publicPage = await opened;
    await expect(publicPage).toHaveURL(new RegExp(`/about\\?lang=${locale}#about-block-${item.key}$`, 'u'));
    const target = publicPage.locator(`#about-block-${item.key}`);
    await expect(target).toContainText(item.title[locale]!);
    await expect.poll(() => target.evaluate(element => {
      const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
      return element.getBoundingClientRect().top - Math.max(0, headerBottom);
    })).toBeGreaterThanOrEqual(-1);
    await expect.poll(() => target.evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(180);
    await expect(publicPage.locator('#about-block-unfinished, #about-block-hidden')).toHaveCount(0);
    expect(await publicPage.evaluate(() => window.opener === null)).toBe(true);
    await publicPage.close();
    await expect(page).toHaveURL(`/admin/content/about?lang=${locale}`);
  }
  expect(writes).toEqual([]);
  await page.locator('h1').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('about-website-links.png'), fullPage: true });
});
