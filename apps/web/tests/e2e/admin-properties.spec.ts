import { expect, test } from '@playwright/test';
import { adminPropertyCandidateId, adminPropertyFixture, adminPropertyId, adminPropertyReportId, localeForAdminProperties, routeAdminPropertyApis } from './admin-properties.fixtures.ts';

test.describe('ADM-14 through ADM-17 property management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-14..ADM-17 local final exports with approved desktop scope; Figma page 6017:4356 and Drive folders recorded in completion evidence.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminPropertyApis(page);
  });

  test('renders list, review, duplicate, and report flows with safe server projections', async ({ page }) => {
    const locale = localeForAdminProperties(test.info().project.name);
    await page.goto(`/admin/properties?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-14"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`admin-property-${adminPropertyId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/reviewedBy|reporterId|internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

    await page.locator(`a[href^="/admin/properties/review?propertyId=${adminPropertyId}"]`).click();
    await expect(page.locator('[data-screen-id="ADM-15"]').first()).toBeVisible();
    await page.locator('#admin-property-reason').fill('Approved after evidence review');
    await page.locator('.admin-properties__action-card button[type="submit"]').click();
    await expect(page.locator('.admin-properties__feedback[role="status"]')).toBeVisible();

    await page.goto(`/admin/properties/possible-duplicates?propertyId=${adminPropertyId}&lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-16"]').first()).toBeVisible();
    await expect(page.getByText(adminPropertyCandidateId)).toBeVisible();
    await expect(page.getByText('The slug and transaction location match.')).toBeVisible();

    await page.goto(`/admin/property-reports?reportId=${adminPropertyReportId}&lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-17"]').first()).toBeVisible();
    await expect(page.getByText('The listing appears to duplicate another property.')).toBeVisible();
    await page.locator('#admin-property-report-reason').fill('Reviewed duplicate evidence');
    await page.locator('.admin-properties__action-card button[type="submit"]').click();
    await expect(page.locator('.admin-properties__feedback[role="status"]')).toBeVisible();
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminPropertyApis(page, false);
    await page.goto('/admin/properties?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});


test('keeps the property review actions contained and readable at every viewport', async ({ page }, info) => {
  const locale = localeForAdminProperties(info.project.name);
  await routeAdminPropertyApis(page);
  await page.route('**/api/v1/admin/properties**', route => route.fulfill({ json: {
    data: { items: [
      { ...adminPropertyFixture(), status: 'published', availableActions: ['update', 'archive', 'hide'], imageUrl: '/assets/canonical/public/listing-property-duplex.png' },
      { ...adminPropertyFixture(), id: adminPropertyCandidateId, name: { ar: 'شقة بمساحة واسعة في الحي الأول بمدينة السادات', en: 'A spacious apartment in the first district of Sadat City' }, availableActions: ['update', 'archive', 'approve', 'reject'], imageUrl: '/assets/canonical/public/listing-property-duplex.png' }
    ] }, meta: { requestId: 'admin-review-all-actions', page: 1, limit: 20, total: 2 }
  } }));
  await page.goto(`/admin/properties/review?lang=${locale}`);
  const row = page.getByTestId(`admin-property-${adminPropertyId}`);
  await expect(row).toBeVisible();
  await expect(row.locator('.admin-properties__row-actions a')).toHaveCount(5);
  const geometry = await row.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    return [...node.querySelectorAll('.admin-properties__row-actions a')].map(link => {
      const box=link.getBoundingClientRect();
      return {left:box.left-bounds.left,right:box.right-bounds.right,height:box.height,width:box.width,x:box.x,y:box.y};
    });
  });
  expect(geometry.length).toBeGreaterThan(0);
  for (const link of geometry) {
    expect(link.left).toBeGreaterThanOrEqual(-1);
    expect(link.right).toBeLessThanOrEqual(1);
    expect(link.height).toBeLessThan(70);
    expect(link.width).toBeGreaterThan(70);
  }
  for (let index = 0; index < geometry.length; index++) {
    for (const other of geometry.slice(index + 1)) {
      const current = geometry[index]!;
      const overlapX = Math.min(current.x + current.width, other.x + other.width) - Math.max(current.x, other.x);
      const overlapY = Math.min(current.y + current.height, other.y + other.height) - Math.max(current.y, other.y);
      expect(overlapX > 1 && overlapY > 1).toBe(false);
    }
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.locator('.a11y-skip-link').evaluate(node => { (node as HTMLElement).style.visibility = 'hidden'; });
  await row.screenshot({path:info.outputPath('property-review-row.png'), style: '.route-shell--admin > .route-shell__header{position:static!important}'});
  // Reset the viewport so sticky navigation stays at the top of the full-page capture.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(`property-review-cards-${locale}.png`, { fullPage: true });
});
