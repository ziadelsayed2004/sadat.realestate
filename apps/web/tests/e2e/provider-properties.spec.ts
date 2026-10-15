import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
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
      ? [propertyFixture('cccccccccccccccccccccccc', 'published', { ar: 'فيلا المزود', en: 'Provider villa',})]
      : pageNumber === 2
        ? [propertyFixture('eeeeeeeeeeeeeeeeeeeeeeee', 'draft', { ar: 'مسودة المزود', en: 'Provider draft',}, ['update', 'submit'])]
        : [
            propertyFixture('cccccccccccccccccccccccc', 'published', { ar: 'فيلا المزود', en: 'Provider villa',}),
            propertyFixture('dddddddddddddddddddddddd', 'needs_changes', { ar: 'عقار يحتاج تعديلاً', en: 'Needs changes property',}, ['update', 'submit'])
          ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items }, ...successMeta(`provider-properties-${pageNumber}`, total, pageNumber, 5) })
    });
  });
}

test('keeps property filters separate and usable when the provider list is empty', async ({ page }, info) => {
  const locale = localeForProject();
  await routeProviderSession(page);
  await routeProviderProperties(page);
  let initial = true;
  await page.route('**/api/v1/provider/properties**', async route => {
    if (!initial) return route.fallback();
    initial = false;
    await route.fulfill({ json: { data: { items: [] }, ...successMeta('empty-provider-properties', 0, 1, 5) } });
  });
  await page.goto(`/provider/properties?lang=${locale}`);
  await expect(page.getByTestId('provider-properties-count')).toContainText(/0|٠/u);
  const filters = page.locator('.provider-properties__filters');
  const search = page.getByRole('searchbox');
  const status = page.getByLabel(/Status|الحالة/iu);
  const searchBox = (await search.boundingBox())!;
  const statusBox = (await status.boundingBox())!;
  const formBox = (await filters.boundingBox())!;
  expect(searchBox.x >= statusBox.x + statusBox.width || statusBox.x >= searchBox.x + searchBox.width || searchBox.y >= statusBox.y + statusBox.height || statusBox.y >= searchBox.y + searchBox.height).toBe(true);
  for (const box of [searchBox, statusBox]) {
    expect(box.x).toBeGreaterThanOrEqual(formBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(formBox.x + formBox.width + 1);
  }
  if (page.viewportSize()!.width <= 640) expect(statusBox.y - searchBox.y - searchBox.height).toBeGreaterThanOrEqual(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await filters.screenshot({ path: info.outputPath('property-filters.png') });
  await search.fill('villa');
  await status.selectOption('published');
  await filters.getByRole('button', { name: /Apply|تطبيق/iu }).click();
  await expect(page.getByTestId('provider-properties-count')).toContainText(/1|١/u);
  await filters.getByRole('button', { name: /Clear filters|مسح الفلاتر/iu }).click();
  await expect(search).toHaveValue('');
  await expect(status).toHaveValue('all');
  await expect(page.getByTestId('provider-properties-count')).toContainText(/7|٧/u);
});

test('opens property cards without hiding their actions on narrow screens', async ({ page }, info) => {
  const locale = localeForProject();
  await routeProviderSession(page);
  await routeProviderProperties(page);
  await page.route('**/api/v1/provider/properties**', async route => {
    await route.fulfill({ json: { data: { items: [
      propertyFixture('cccccccccccccccccccccccc', 'published', { ar: 'فيلا المزود', en: 'Provider villa' }),
      { ...propertyFixture('dddddddddddddddddddddddd', 'needs_changes', { ar: 'عقار يحتاج تعديلاً', en: 'Needs changes property' }, ['update', 'submit']), reviewReason: 'Add the missing location details.' },
      { ...propertyFixture('eeeeeeeeeeeeeeeeeeeeeeee', 'draft', { ar: 'مسودة المزود', en: 'Provider draft' }, ['update', 'submit']), slug: 'property-d75bfc28c0a04c6383e59274c5ef43b9' }
    ] }, ...successMeta('mobile-property-cards', 3, 1, 5) } });
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/provider/properties?lang=${locale}`);
    const draft = page.getByTestId('provider-property-eeeeeeeeeeeeeeeeeeeeeeee');
    await expect(draft).toBeVisible();
    await draft.evaluate(element => element.scrollIntoView({ block: 'center' }));
    const card = (await draft.boundingBox())!;
    const links = draft.locator('.provider-properties__actions a');
    await expect(links).toHaveCount(3);
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      const box = (await link.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(card.x);
      expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width + 1);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(await link.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
    }
    await expect(draft.locator('.provider-properties__identity a')).toHaveAttribute('href', `/provider/properties/eeeeeeeeeeeeeeeeeeeeeeee/review?lang=${locale}`);
    await expect(links.filter({ hasText: /^(Edit|تعديل)$/u })).toHaveAttribute('href', `/provider/properties/eeeeeeeeeeeeeeeeeeeeeeee/basic?lang=${locale}`);
    await expect(page.getByTestId('provider-property-cccccccccccccccccccccccc').locator('.provider-properties__actions a')).toHaveCount(1);
    await expect(page.getByTestId('provider-property-dddddddddddddddddddddddd')).toContainText('Add the missing location details.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await draft.screenshot({ path: info.outputPath(`property-card-${width}.png`) });
  }
});

test.describe('PRV-02 My Properties', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-02' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/provider/PRV-02.png; local SHA-256 2a2b739851e2d3557dda12e8a350228b0fdfb4b40a2242b36298d38d2e8e7738; Figma node 6017:19308; Drive folder 1BmLx4tpZxfEGPmnsbQhay7RdCdpvy1hC' });
    test.skip(!testInfo.project.name.includes('desktop'), 'The desktop table baseline is checked in desktop projects.');
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

    await page.locator('#main-content').focus();
    await expect(page.locator('.a11y-skip-link')).toHaveCount(0);
  await page.locator('#main-content').focus();
  await expect(page.locator('#main-content')).toBeFocused();
    await page.locator('#provider-properties-search').focus();
    await expect(page.locator('#provider-properties-search')).toBeFocused();
    await expect(page.locator('.a11y-skip-link')).toHaveCount(0);
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
