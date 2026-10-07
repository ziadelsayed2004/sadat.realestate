import { expect, test } from '@playwright/test';

test('company search stays above the cards, filters names and recovers from no results', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const companies = [
    { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'nile-group', name: { ar: 'مجموعة النيل العقارية', en: 'Nile Real Estate Group' } },
    { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'delta-group', name: { ar: 'مجموعة دلتا العقارية', en: 'Delta Real Estate Group' } }
  ].map(company => ({ ...company, kind: 'developer_company', verified: true, projectCount: 0, propertyCount: 1, imageUrl: '/assets/canonical/public/team-asset-1.png' }));
  let documents = 0;
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents += 1; });
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/v1/public/developers*', async route => {
    const url = new URL(route.request().url());
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const items = companies.filter(company => Object.values(company.name).some(name => name.toLowerCase().includes(search)));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items, total: items.length, page: 1, limit: 20 }, meta: { requestId: 'company-search' } }) });
  });
  await page.goto(`/developers?lang=${locale}`);
  const input = page.getByRole('searchbox');
  const form = page.getByRole('search');
  const cards = page.locator('.public-developer-directory__card');
  await expect(input).toBeVisible(); await expect(cards).toHaveCount(2);
  await expect(input).toHaveAttribute('placeholder', locale === 'ar' ? 'اكتب اسم الشركة أو جزءًا منه' : 'Enter a company name or part of it');
  const inputBox = (await input.boundingBox())!;
  const cardBox = (await cards.first().boundingBox())!;
  expect(inputBox.y + inputBox.height).toBeLessThan(cardBox.y);
  expect(inputBox.width).toBeGreaterThan(150);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: test.info().outputPath('company-search.png'), fullPage: true });
  await input.fill(locale === 'ar' ? 'النيل' : 'nIlE'); await input.press('Enter');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText(locale === 'ar' ? 'مجموعة النيل العقارية' : 'Nile Real Estate Group');
  expect(new URL(page.url()).searchParams.get('lang')).toBe(locale);
  await input.fill('no matching company');
  await form.getByRole('button', { name: locale === 'ar' ? 'بحث' : 'Search', exact: true }).click();
  await expect(page.locator('[data-page="public-developers"]')).toHaveAttribute('data-developers-state', 'empty');
  await expect(input).toBeVisible(); await expect(input).toHaveValue('no matching company');
  await form.getByRole('button', { name: locale === 'ar' ? 'إعادة ضبط' : 'Reset' }).click();
  await expect(cards).toHaveCount(2); await expect(input).toHaveValue('');
  expect(new URL(page.url()).searchParams.has('search')).toBe(false);
  expect(new URL(page.url()).searchParams.get('lang')).toBe(locale);
  expect(documents).toBe(1);
});
