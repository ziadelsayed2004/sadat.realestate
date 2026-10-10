import { expect, test } from '@playwright/test';

const slug = 'project-builder';
const projectId = 'b'.repeat(24);
const project = {
  id: projectId, slug: 'central-project',
  name: { ar: 'المشروع المركزي', en: 'Central project' },
  description: { ar: 'تفاصيل المشروع المنشور وموقعه وخطة التسليم.', en: 'Published project details, location and delivery plan.' },
  imageUrl: '/assets/canonical/public/property-villa.png',
  locationName: { ar: 'الحي الأول', en: 'First district' },
  areaLabel: { ar: '١٢٠–٢٤٠ م²', en: '120–240 m²' },
  deliveryLabel: { ar: 'تسليم ٢٠٢٧', en: 'Delivery in 2027' },
  unitCount: 48
};
const profile = {
  id: 'a'.repeat(24), kind: 'developer_company', slug,
  name: { ar: 'شركة المطور', en: 'Developer company' }, verified: true,
  projectCount: 1, propertyCount: 2, projects: [project],
  properties: [
    { id: 'c'.repeat(24), slug: 'project-unit', kind: 'unit', transactionType: 'sale', name: { ar: 'وحدة المشروع', en: 'Project unit' }, projectId },
    { id: 'd'.repeat(24), slug: 'other-unit', kind: 'unit', transactionType: 'sale', name: { ar: 'وحدة مشروع آخر', en: 'Other project unit' }, projectId: 'e'.repeat(24) }
  ],
  stats: { publishedProjects: 1, availableProperties: 2, saleProperties: 2, rentalProperties: 0 }
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } } }));
  await page.route(`**/api/v1/public/developers/${slug}`, route => route.fulfill({ json: { data: profile, meta: { requestId: 'project-detail' } } }));
});

test('view project navigates to independent localized details and scoped units', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const ar = locale === 'ar';
  await page.goto(`/developers/${slug}?lang=${locale}#developer-projects`);
  const link = page.getByRole('link', { name: ar ? 'عرض المشروع' : 'View project', exact: true });
  await expect(link).toHaveAttribute('href', `/developers/${slug}/projects/central-project?lang=${locale}`);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/developers/${slug}/projects/central-project\\?lang=${locale}$`));
  await expect(page.getByRole('heading', { name: project.name[locale], level: 1 })).toBeVisible();
  await expect(page.locator('.public-developer-profile__main')).toHaveCSS('direction', ar ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell__header')).toBeHidden();
  await expect.poll(() => page.locator('[data-project-detail] img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText(project.description[locale], { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: ar ? 'وحدة المشروع' : 'Project unit', exact: true })).toHaveAttribute('href', `/properties/project-unit?lang=${locale}`);
  await expect(page.getByText(ar ? 'وحدة مشروع آخر' : 'Other project unit', { exact: true })).toHaveCount(0);
  await expect(page.locator('[name=projectId]')).toHaveValue(projectId);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: project.name[locale], level: 1 })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('project-details.png'), fullPage: true });
  await page.locator('.public-developer-profile__tabs a').first().click();
  await expect(page).toHaveURL(new RegExp(`/developers/${slug}\\?lang=${locale}#developer-projects$`));
  await expect(page.getByRole('link', { name: ar ? 'عرض المشروع' : 'View project', exact: true })).toBeVisible();
});

test('unknown project has an unavailable state without other project details', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await page.goto(`/developers/${slug}/projects/unpublished?lang=${locale}`);
  await expect(page.getByRole('heading', { name: locale === 'ar' ? 'المشروع غير متاح' : 'Project unavailable' })).toBeVisible();
  await expect(page.getByText(project.name[locale], { exact: true })).toHaveCount(0);
  await expect(page.locator('.public-developer-profile__property-card')).toHaveCount(0);
});
