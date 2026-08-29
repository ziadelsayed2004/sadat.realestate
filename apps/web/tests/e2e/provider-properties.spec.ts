import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string, total?: number, page?: number, limit?: number) {
  return { meta: { requestId, ...(total === undefined ? {} : { total }), ...(page === undefined ? {} : { page }), ...(limit === undefined ? {} : { limit }) } };
}

async function routeProviderSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'provider-properties-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'provider.properties.token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'provider', status: 'verified' }
        },
        ...successMeta('provider-properties-refresh')
      })
    });
  });
}

function propertyFixture(id: string, status: string, name: Record<string, string>, availableActions: string[] = []) {
  return {
    id,
    kind: 'property',
    name,
    slug: `${status.replaceAll('_', '-')}-property`,
    transactionType: 'sale',
    source: { providerId: 'aaaaaaaaaaaaaaaaaaaaaaaa', sourceType: 'individual_broker' },
    status,
    price: { amount: 1500000, currency: 'EGP' },
    active: true,
    version: 3,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions
  };
}

async function routeProviderProperties(page: import('@playwright/test').Page, forbidden = false): Promise<void> {
  await page.route('**/api/v1/provider/properties**', async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer provider.properties.token');
    if (forbidden) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'provider-properties-forbidden' } })
      });
      return;
    }
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const pageNumber = Number(url.searchParams.get('page') ?? '1');
    const filtered = status === 'published' && search === 'villa';
    const total = filtered ? 1 : 7;
    const items = filtered
      ? [propertyFixture('cccccccccccccccccccccccc', 'published', { ar: 'فيلا المزود', en: 'Provider villa', 'zh-CN': '提供方别墅' })]
      : pageNumber === 2
        ? [propertyFixture('eeeeeeeeeeeeeeeeeeeeeeee', 'draft', { ar: 'مسودة المزود', en: 'Provider draft', 'zh-CN': '提供方草稿' }, ['update', 'submit'])]
        : [
            propertyFixture('cccccccccccccccccccccccc', 'published', { ar: 'فيلا المزود', en: 'Provider villa', 'zh-CN': '提供方别墅' }),
            propertyFixture('dddddddddddddddddddddddd', 'needs_changes', { ar: 'عقار يحتاج تعديلاً', en: 'Needs changes property', 'zh-CN': '需要修改的房产' }, ['update', 'submit'])
          ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items }, ...successMeta(`provider-properties-${pageNumber}`, total, pageNumber, 5) })
    });
  });
}

test.describe('PRV-02 My Properties', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-02' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/provider/PRV-02.png; local SHA-256 2a2b739851e2d3557dda12e8a350228b0fdfb4b40a2242b36298d38d2e8e7738; Figma node 6017:19308; Drive folder 1BmLx4tpZxfEGPmnsbQhay7RdCdpvy1hC' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Provider dashboard is approved for desktop only.');
    void page;
  });

  test('loads owned properties, applies server filters, exposes available actions, and preserves locale direction', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page);
    await routeProviderProperties(page);
    const response = await page.goto(`/provider/properties?lang=${encodeURIComponent(locale)}`);

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="PRV-02"]')).toBeVisible();
    await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId('provider-properties-count')).toContainText(/7|٧/iu);
    await expect(page.getByTestId('provider-property-cccccccccccccccccccccccc')).toBeVisible();
    await expect(page.getByTestId('provider-property-dddddddddddddddddddddddd')).toBeVisible();
    await expect(page.locator('.provider-dashboard__navigation a[data-active="true"]')).toHaveAttribute('href', `/provider/properties?lang=${locale}`);
    await expect(page.getByTestId('provider-property-dddddddddddddddddddddddd').getByRole('link', { name: /^(Edit|تعديل|编辑):/iu })).toHaveAttribute('href', /\/provider\/properties\/dddd+\/location\?lang=/u);
    await expect(page.locator('body')).not.toContainText(/aaaaaaaaaaaaaaaaaaaaaaaa|internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken/u);

    await page.getByRole('searchbox').fill('villa');
    await page.getByLabel(/Status|الحالة|状态/iu).selectOption('published');
    await page.getByRole('button', { name: /Apply|تطبيق|应用/iu }).click();
    await expect(page.getByTestId('provider-properties-count')).toContainText(/1|١/iu);
    await expect(page.getByTestId('provider-property-cccccccccccccccccccccccc')).toBeVisible();
    await expect(page.getByTestId('provider-property-dddddddddddddddddddddddd')).toHaveCount(0);

    await page.getByRole('searchbox').fill('');
    await page.getByLabel(/Status|الحالة|状态/iu).selectOption('all');
    await page.getByRole('button', { name: /Apply|تطبيق|应用/iu }).click();
    await expect(page.getByRole('button', { name: /Next page|الصفحة التالية|下一页/iu })).toBeEnabled();
    await page.getByRole('button', { name: /Next page|الصفحة التالية|下一页/iu }).click();
    await expect(page.getByTestId('provider-property-eeeeeeeeeeeeeeeeeeeeeeee')).toBeVisible();

    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('#provider-properties-search').focus();
    await expect(page.locator('#provider-properties-search')).toBeFocused();
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`provider-properties-${locale}.png`, { fullPage: true });
  });

  test('fails closed for an expired provider session', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page, false);
    await page.goto(`/provider/properties?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-02"]')).toHaveCount(0);
  });

  test('renders API permission failure without property fallback data', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page);
    await routeProviderProperties(page, true);
    await page.goto(`/provider/properties?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-02"] .provider-dashboard__state[data-state="permission"]')).toBeVisible();
    await expect(page.getByTestId('provider-property-cccccccccccccccccccccccc')).toHaveCount(0);
  });
});
