import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string, total?: number) {
  return { meta: { requestId, ...(total === undefined ? {} : { total }) } };
}

async function routeProviderSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'provider-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'provider.access.token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'provider', status: 'verified' }
        },
        ...successMeta('provider-refresh')
      })
    });
  });
}

async function routeProviderOverview(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/provider/dashboard', async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer provider.access.token');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          application: { applicationId: 'bbbbbbbbbbbbbbbbbbbbbbbb', providerType: 'individual_broker', status: 'approved', version: 2, availableActions: ['open_dashboard'] },
          properties: { total: 3, published: 1, pendingReview: 1, needsChanges: 0, drafts: 1, recent: [{ id: 'cccccccccccccccccccccccc', kind: 'property', name: { ar: 'عقار المزود', en: 'Provider property' }, slug: 'provider-property', transactionType: 'sale', source: { providerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', sourceType: 'individual_broker' }, status: 'published', active: true, version: 1, createdAt: '2026-08-18T08:00:00.000Z', updatedAt: '2026-08-18T09:00:00.000Z', availableActions: [] }] },
          activity: { customerRequests: 0, bookedViewings: 0 }
        },
        ...successMeta('provider-dashboard')
      })
    });
  });
}

test.describe('PRV-01 Provider Overview', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-01' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/provider/PRV-01.png; Figma node 6017:19032; Drive folder 1-Jda_ykLlQC3ZwlFG8I-t6sq3B8UOg86' });
    void page;
  });

  test('loads owner-scoped totals, preserves desktop direction, and omits internal provider data', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'Desktop geometry assertion.');
    const locale = localeForProject();
    await routeProviderSession(page);
    await routeProviderOverview(page);
    const response = await page.goto(`/provider?lang=${encodeURIComponent(locale)}`);

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="PRV-01"]')).toBeVisible();
    await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId('provider-summary-total')).toContainText('3');
    await expect(page.getByTestId('provider-summary-published')).toContainText('1');
    await expect(page.getByTestId('provider-summary-pending')).toContainText('1');
    await expect(page.getByTestId('provider-summary-drafts')).toContainText('1');
    await expect(page.locator('.provider-dashboard__navigation a[data-active="true"]')).toHaveAttribute('href', `/provider?lang=${locale}`);
    await expect(page.locator('.provider-dashboard__navigation a[data-active="true"]')).toContainText(locale === 'ar' ? 'لوحة التحكم' : 'Dashboard');
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|storageKey|accessToken|refreshToken/u);

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const dashboardBox = await page.locator('.provider-dashboard').boundingBox();
    const navigationBox = await page.locator('.provider-dashboard__navigation').boundingBox();
    expect(navigationBox).not.toBeNull();
    expect(navigationBox?.width).toBe(240);
    expect(navigationBox?.x).toBe(locale === 'ar' ? viewportWidth - 240 : 0);
    expect(navigationBox?.height).toBeGreaterThanOrEqual((dashboardBox?.height ?? 0) - 1);

    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.provider-dashboard__navigation a').nth(1).focus();
    await expect(page.locator('.provider-dashboard__navigation a').nth(1)).toBeFocused();

    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`provider-overview-${locale}.png`, { fullPage: true });
  });

  test('fails closed when the provider session cannot be refreshed', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page, false);
    await page.goto(`/provider?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-01"]')).toHaveCount(0);
  });

  test('keeps the canonical 1577px desktop frame geometry', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'Desktop geometry assertion.');
    const locale = localeForProject();
    await page.setViewportSize({ width: 1577, height: 1067 });
    await routeProviderSession(page);
    await routeProviderOverview(page);
    await page.goto(`/provider?lang=${encodeURIComponent(locale)}`);

    const navigationBox = await page.locator('.provider-dashboard__navigation').boundingBox();
    const topbarBox = await page.locator('.provider-dashboard__topbar').boundingBox();
    const contentBox = await page.locator('.provider-dashboard__content').boundingBox();
    const insightsBox = await page.locator('.provider-dashboard__insights').boundingBox();
    const chartBox = await page.locator('.provider-dashboard__chart').boundingBox();
    const quickActionsBox = await page.locator('.provider-dashboard__quick-actions').boundingBox();
    const metricGrid = page.locator('.provider-dashboard__metric-grid');
    expect(navigationBox).not.toBeNull();
    expect(topbarBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(navigationBox?.width).toBe(240);
    expect(navigationBox?.x).toBe(locale === 'ar' ? 1337 : 0);
    expect(topbarBox?.width).toBe(1337);
    expect(topbarBox?.height).toBe(56);
    expect(contentBox?.width).toBe(1337);
    expect(insightsBox?.height).toBe(277);
    expect(chartBox?.y).toBe(quickActionsBox?.y);
    expect(chartBox?.height).toBe(277);
    await expect(metricGrid).toHaveCSS('grid-template-columns', '313.25px 313.25px 313.25px 313.25px');
    await page.screenshot({ path: testInfo.outputPath(`provider-1577-${locale}.png`), fullPage: true });
  });

  test('matches the direct responsive shell geometry and mobile navigation behavior', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('desktop'), 'Responsive source assertion.');
    const locale = localeForProject();
    await routeProviderSession(page);
    await routeProviderOverview(page);
    await page.goto(`/provider?lang=${encodeURIComponent(locale)}`);

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const geometry = await page.locator('.provider-dashboard').evaluate(element => ({
      innerWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      columns: getComputedStyle(element).gridTemplateColumns
    }));
    expect(geometry.innerWidth).toBe(viewportWidth);
    expect(geometry.documentWidth).toBeLessThanOrEqual(viewportWidth);

    if (testInfo.project.name.includes('mobile')) {
      await expect(page.locator('.provider-dashboard__topbar')).toHaveCSS('height', '56px');
      await expect(page.locator('.provider-dashboard__navigation')).toHaveCSS('position', 'fixed');
      await expect(page.locator('.provider-dashboard__navigation li:visible')).toHaveCount(4);
      await expect(page.locator('.provider-dashboard__metric-grid')).toHaveCSS('grid-template-columns', '181px 181px');
      const menu = page.locator('.provider-dashboard__menu-button');
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('.provider-dashboard__navigation li:visible')).toHaveCount(10);
      await page.locator('.provider-dashboard__navigation-backdrop').click({ position: { x: 2, y: 300 } });
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    } else {
      await expect(page.locator('.provider-dashboard__navigation')).toHaveCSS('width', '72px');
      await expect(page.locator('.provider-dashboard__topbar')).toHaveCSS('height', '64px');
      expect(geometry.columns).toContain('72px');
    }
  });
});
