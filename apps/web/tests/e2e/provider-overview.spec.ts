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
  await page.route('**/api/v1/provider/notifications**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], unreadCount: 0, page: 1, limit: 3, total: 0 }, ...successMeta('provider-no-notifications') }) }));
  await page.route('**/api/v1/provider/dashboard', async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer provider.access.token');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          application: { applicationId: 'bbbbbbbbbbbbbbbbbbbbbbbb', providerType: 'individual_broker', status: 'approved', version: 2, availableActions: ['open_dashboard'] },
          properties: { total: 14, published: 8, pendingReview: 2, needsChanges: 1, drafts: 2, recent: [
            { id: 'ccccccccccccccccccccccc1', kind: 'property', name: { ar: 'شقة 3 غرف — الحي الأول', en: '3-bedroom apartment — First District' }, slug: 'p-1041', transactionType: 'sale', source: { providerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', sourceType: 'individual_broker' }, status: 'published', active: true, version: 1, createdAt: '2025-07-15T08:00:00.000Z', updatedAt: '2025-07-15T09:00:00.000Z', availableActions: [] },
            { id: 'ccccccccccccccccccccccc2', kind: 'property', name: { ar: 'فيلا مستقلة — المنطقة الراقية', en: 'Standalone villa — Premium District' }, slug: 'p-1038', transactionType: 'sale', source: { providerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', sourceType: 'individual_broker' }, status: 'pending_review', active: true, version: 1, createdAt: '2025-07-12T08:00:00.000Z', updatedAt: '2025-07-12T09:00:00.000Z', availableActions: [] },
            { id: 'ccccccccccccccccccccccc3', kind: 'property', name: { ar: 'مكتب إداري P200 — المنطقة الصناعية', en: 'P200 office — Industrial District' }, slug: 'p-1035', transactionType: 'rent', source: { providerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', sourceType: 'individual_broker' }, status: 'needs_changes', active: true, version: 1, createdAt: '2025-07-10T08:00:00.000Z', updatedAt: '2025-07-10T09:00:00.000Z', availableActions: [] },
            { id: 'ccccccccccccccccccccccc4', kind: 'property', name: { ar: 'أرض 400م — الحي السابع', en: '400m land — Seventh District' }, slug: 'p-1030', transactionType: 'sale', source: { providerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', sourceType: 'individual_broker' }, status: 'published', active: true, version: 1, createdAt: '2025-07-05T08:00:00.000Z', updatedAt: '2025-07-05T09:00:00.000Z', availableActions: [] }
          ] },
          activity: { customerRequests: 23, bookedViewings: 1 }
        },
        ...successMeta('provider-dashboard')
      })
    });
  });
}

test('dashboard shows advertising approval and payment alerts with their request links and unread count', async ({ page }) => {
  const locale = localeForProject();
  await routeProviderSession(page);
  await routeProviderOverview(page);
  const requestId = 'eeeeeeeeeeeeeeeeeeeeeeee';
  let unread = true;
  let calls = 0;
  const items = [
    { id: 'ddddddddddddddddddddddd1', type: 'advertising.approved', title: { ar: 'تمت الموافقة على طلب إعلانك', en: 'Your advertising request was approved' }, message: { ar: 'ستحدد الإدارة السعر والفترة قبل الدفع.', en: 'Administration will agree the price and period before payment.' }, link: `/provider/ads/${requestId}`, readAt: null, createdAt: '2026-10-08T08:00:00.000Z' },
    { id: 'ddddddddddddddddddddddd2', type: 'advertising.waiting_payment', title: { ar: 'مطلوب دفع قيمة إعلانك', en: 'Payment required for your advertisement' }, message: { ar: 'ارفع إثبات الدفع واضغط إرسال الطلب.', en: 'Upload payment proof and press Send request.' }, link: `/provider/ads/${requestId}`, readAt: null, createdAt: '2026-10-08T09:00:00.000Z' }
  ] as const;
  await page.route('**/api/v1/provider/notifications**', async route => {
    calls++;
    expect(route.request().headers().authorization).toBe('Bearer provider.access.token');
    expect(new URL(route.request().url()).searchParams.get('unreadOnly')).toBe('true');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: unread ? items : [], unreadCount: unread ? 2 : 0, page: 1, limit: 3, total: unread ? 2 : 0 }, ...successMeta('provider-ad-alerts') }) });
  });
  await page.goto(`/provider?lang=${locale}`);
  const panel = page.locator('.provider-dashboard__notifications-preview');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(locale === 'ar' ? items[0].title.ar : items[0].title.en);
  await expect(panel).toContainText(locale === 'ar' ? items[1].title.ar : items[1].title.en);
  await expect(panel.getByRole('link', { name: locale === 'ar' ? 'عرض التفاصيل' : 'View details' }).first()).toHaveAttribute('href', `/provider/ads/${requestId}?lang=${locale}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const link of await panel.getByRole('link').all()) {
    const bounds = await link.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  await expect(page.locator('[data-provider-nav="notifications"] .provider-dashboard__notification-count')).toHaveText(new Intl.NumberFormat(locale).format(2));
  await panel.screenshot({ path: test.info().outputPath(`provider-ad-alerts-${locale}.png`) });
  unread = false;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(panel).toHaveCount(0);
  expect(calls).toBeGreaterThanOrEqual(2);
  await expect(page.locator('.provider-dashboard__notification-count')).toHaveCount(0);
});

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
    await expect(page.getByTestId('provider-summary-total')).toContainText('14');
    await expect(page.getByTestId('provider-summary-published')).toContainText('8');
    await expect(page.getByTestId('provider-summary-pending')).toContainText('2');
    await expect(page.getByTestId('provider-summary-drafts')).toContainText('2');
    await expect(page.getByTestId('provider-summary-customer-requests')).toContainText('23');
    await expect(page.locator('.provider-dashboard__recent-table tbody tr')).toHaveCount(4);
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
    await expect(page.locator('.provider-dashboard__website-link')).toBeVisible();
    await expect(page.locator('.provider-dashboard__website-link')).toHaveAttribute('href', `/?lang=${locale}`);
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
      const metricColumns = await page.locator('.provider-dashboard__metric-grid').evaluate(element =>
        getComputedStyle(element).gridTemplateColumns.split(' ').map(value => Number.parseFloat(value))
      );
      const expectedColumnWidth = (viewportWidth - 40) / 2;
      expect(metricColumns).toHaveLength(2);
      expect(metricColumns[0]).toBeCloseTo(expectedColumnWidth, 1);
      expect(metricColumns[1]).toBeCloseTo(expectedColumnWidth, 1);
      const menu = page.locator('.provider-dashboard__menu-button');
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('.provider-dashboard__navigation li:visible')).toHaveCount(11);
      await expect(page.locator('.provider-dashboard__mobile-website a')).toBeVisible();
      await expect(page.locator('.provider-dashboard__mobile-website a')).toHaveAttribute('href', `/?lang=${locale}`);
      await page.locator('.provider-dashboard__navigation').screenshot({ path: testInfo.outputPath(`provider-navigation-${locale}.png`) });
      await page.locator('.provider-dashboard__navigation-backdrop').click({ position: { x: 2, y: 300 } });
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    } else {
      await expect(page.locator('.provider-dashboard__navigation')).toHaveCSS('width', '72px');
      await expect(page.locator('.provider-dashboard__topbar')).toHaveCSS('height', '64px');
      expect(geometry.columns).toContain('72px');
    }
  });
});
