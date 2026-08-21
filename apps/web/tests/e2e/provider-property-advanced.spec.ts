import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const featureId = 'cccccccccccccccccccccccc';
const serviceId = 'dddddddddddddddddddddddd';

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function propertyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: propertyId,
    kind: 'property',
    name: { ar: 'عقار المزوّد', en: 'Provider property', 'zh-CN': '提供方房产' },
    slug: 'provider-property',
    transactionType: 'sale',
    source: { providerId, sourceType: 'individual_broker' },
    locationId: 'eeeeeeeeeeeeeeeeeeeeeeee',
    coordinates: { latitude: 30.62, longitude: 30.74 },
    status: 'draft',
    active: true,
    version: 2,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions: ['update', 'submit'],
    ...overrides
  };
}

async function routeProviderSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    if (!allowed) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'advanced-refresh-denied' } }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { accessToken: 'provider.advanced.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: providerId, roleType: 'provider', status: 'verified' } }, ...successMeta('advanced-refresh') })
    });
  });
}

async function routeProviderProperty(page: import('@playwright/test').Page, options: { readonly forbidden?: boolean } = {}): Promise<void> {
  await page.route(`**/api/v1/provider/properties/${propertyId}`, async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer provider.advanced.token');
    if (options.forbidden) {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'advanced-forbidden' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: propertyFixture(), ...successMeta('advanced-property') }) });
  });
}

test.describe('PRV-05, PRV-06, and PRV-07 advanced property wizard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-05; PRV-06; PRV-07' });
    testInfo.annotations.push({ type: 'design-source', description: 'PRV-05 docs/design_sources/final_screens/provider/PRV-05.png SHA-256 770e2d4d7877178c19f3ecdf52faf1969d18105623ba4f0682ddd6932d79a0d6; PRV-06 docs/design_sources/final_screens/provider/PRV-06.png SHA-256 0cb52fad5e024a0594c130a4d6b1754dc7423e48ae9576ebf2eef79a5eb49b43; PRV-07 docs/design_sources/final_screens/provider/PRV-07.png SHA-256 284bf2b8d736d2c422572593a3c7d32a8d06a42eca5530aff15194dbd735ef96; Figma node 6017-19032' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Provider Dashboard is approved for desktop only.');
    void page;
  });

  test('saves PRV-05 details with conditional layout validation and safe catalog boundary', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page);
    await routeProviderProperty(page);
    await page.route(`**/api/v1/provider/properties/${propertyId}/steps/details`, async route => {
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().headers().authorization).toBe('Bearer provider.advanced.token');
      const body = route.request().postDataJSON() as { version?: number; area?: { value?: number; unit?: string }; layout?: { bedrooms?: number; bathrooms?: number; floor?: number; totalFloors?: number }; reason?: string };
      expect(body).toMatchObject({ version: 2, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 8 } });
      expect(typeof body.reason).toBe('string');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: propertyFixture({ version: 3, area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4, totalFloors: 8 } }), ...successMeta('advanced-details-saved') }) });
    });
    const response = await page.goto(`/provider/properties/${propertyId}/details?lang=${encodeURIComponent(locale)}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="PRV-05"]')).toBeVisible();
    await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.locator('[role="status"]')).toContainText(/catalog|دليل|目录/u);
    await page.locator('#provider-property-area').fill('120');
    await page.locator('#provider-property-bedrooms').fill('3');
    await page.locator('#provider-property-bathrooms').fill('2');
    await page.locator('#provider-property-floor').fill('4');
    await page.locator('#provider-property-total-floors').fill('8');
    await page.locator('button[value="save"]').click();
    await expect(page.locator('.provider-property-wizard__form-message--success')).toBeVisible();
    await expect(page.locator('button[value="save"]')).toHaveText(/\S/u);
    await expect(page.locator('body')).not.toContainText(/aaaaaaaaaaaaaaaaaaaaaaaa|accessToken|refreshToken|storageKey|internalNotes|assignedTo|auditData/u);
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await expect(page).toHaveScreenshot(`provider-property-details-${locale}.png`, { fullPage: true });
  });

  test('saves PRV-06 price and a currency-consistent payment plan', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page);
    await routeProviderProperty(page);
    await page.route(`**/api/v1/provider/properties/${propertyId}/steps/price-payment`, async route => {
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().headers().authorization).toBe('Bearer provider.advanced.token');
      const body = route.request().postDataJSON() as { version?: number; price?: { amount?: number; currency?: string }; paymentPlans?: Array<{ name?: Record<string, string>; installments?: number; frequency?: string; installmentAmount?: { amount?: number; currency?: string } }>; reason?: string };
      expect(body).toMatchObject({ version: 2, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [{ name: { [locale]: '12 month plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'EGP' } }] });
      expect(typeof body.reason).toBe('string');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: propertyFixture({ version: 3, price: { amount: 1_000_000, currency: 'EGP' }, paymentPlans: [{ name: { [locale]: '12 month plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: 80_000, currency: 'EGP' } }] }), ...successMeta('advanced-price-saved') }) });
    });
    const response = await page.goto(`/provider/properties/${propertyId}/price-payment?lang=${encodeURIComponent(locale)}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('[data-screen-id="PRV-06"]')).toBeVisible();
    await page.locator('#provider-property-price').fill('1000000');
    await page.locator('#provider-property-currency').fill('EGP');
    await page.locator('#provider-property-payment-plan').check();
    await page.locator('#provider-property-plan-name').fill('12 month plan');
    await page.locator('#provider-property-installments').fill('12');
    await page.locator('#provider-property-installment-amount').fill('80000');
    await page.locator('button[value="save"]').click();
    await expect(page.locator('.provider-property-wizard__form-message--success')).toBeVisible();
    await expect(page.locator('button[value="save"]')).toHaveText(/\S/u);
    await expect(page.locator('[aria-label*="commission" i], [aria-label*="عمولة"], [aria-label*="佣金"]').first()).toBeVisible();
    await expect(page).toHaveScreenshot(`provider-property-price-${locale}.png`, { fullPage: true });
  });

  test('saves PRV-07 references without calling admin taxonomy routes', async ({ page }) => {
    const locale = localeForProject();
    const unexpectedAdminRequests: string[] = [];
    await page.on('request', request => { if (request.url().includes('/api/v1/admin/')) unexpectedAdminRequests.push(request.url()); });
    await routeProviderSession(page);
    await routeProviderProperty(page);
    await page.route(`**/api/v1/provider/properties/${propertyId}/steps/features-services`, async route => {
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().headers().authorization).toBe('Bearer provider.advanced.token');
      const body = route.request().postDataJSON() as { version?: number; featureIds?: string[]; serviceIds?: string[]; reason?: string };
      expect(body).toMatchObject({ version: 2, featureIds: [featureId], serviceIds: [serviceId] });
      expect(typeof body.reason).toBe('string');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: propertyFixture({ version: 3, featureIds: [featureId], serviceIds: [serviceId] }), ...successMeta('advanced-features-saved') }) });
    });
    const response = await page.goto(`/provider/properties/${propertyId}/features-services?lang=${encodeURIComponent(locale)}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('[data-screen-id="PRV-07"]')).toBeVisible();
    await expect(page.locator('[role="status"]')).toContainText(/catalog|دليل|目录/u);
    await page.locator('#provider-property-feature-ids').fill(featureId);
    await page.locator('#provider-property-service-ids').fill(serviceId);
    await page.locator('button[value="save"]').click();
    await expect(page.locator('.provider-property-wizard__form-message--success')).toBeVisible();
    await expect(page.locator('button[value="save"]')).toHaveText(/\S/u);
    expect(unexpectedAdminRequests).toEqual([]);
    await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|storageKey|internalNotes|assignedTo|auditData/u);
    await expect(page).toHaveScreenshot(`provider-property-features-${locale}.png`, { fullPage: true });
  });

  test('fails closed for session denial and provider property permission denial', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page, false);
    await page.goto(`/provider/properties/${propertyId}/details?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-05"]')).toHaveCount(0);

    await routeProviderSession(page);
    await routeProviderProperty(page, { forbidden: true });
    await page.goto(`/provider/properties/${propertyId}/details?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-05"] .provider-property-wizard__state[data-state="permission"]')).toBeVisible();
    await expect(page.locator('#provider-property-area')).toHaveCount(0);
  });
});
