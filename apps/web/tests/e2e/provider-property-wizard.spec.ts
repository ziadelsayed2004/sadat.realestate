import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const locationId = 'cccccccccccccccccccccccc';

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
    locationId,
    coordinates: { latitude: 30.62, longitude: 30.74 },
    status: 'draft',
    active: true,
    version: 3,
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
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'wizard-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { accessToken: 'provider.wizard.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: providerId, roleType: 'provider', status: 'verified' } },
        ...successMeta('wizard-refresh')
      })
    });
  });
}

async function routeProviderProperty(page: import('@playwright/test').Page, options: { readonly forbidden?: boolean } = {}): Promise<void> {
  await page.route(`**/api/v1/provider/properties/${propertyId}`, async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer provider.wizard.token');
    if (options.forbidden) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'wizard-forbidden' } })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: propertyFixture(), ...successMeta('wizard-property') }) });
  });
  await page.route(`**/api/v1/provider/properties/${propertyId}/steps/location`, async route => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().headers().authorization).toBe('Bearer provider.wizard.token');
    const body = route.request().postDataJSON() as { version?: number; locationId?: string; coordinates?: { latitude?: number; longitude?: number }; reason?: string };
    expect(body).toMatchObject({ version: 3, locationId, coordinates: { latitude: 30.63, longitude: 30.74 } });
    expect(typeof body.reason).toBe('string');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: propertyFixture({ version: 4, coordinates: { latitude: 30.63, longitude: 30.74 } }), ...successMeta('wizard-location-saved') }) });
  });
  await page.route('**/api/v1/provider/properties', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBe('Bearer provider.wizard.token');
    const body = route.request().postDataJSON() as { name?: Record<string, string>; slug?: string; source?: { providerId?: string; sourceType?: string }; reason?: string };
    expect(body).toMatchObject({ name: { [localeForProject()]: 'New provider property' }, slug: 'new-provider-property', source: { providerId, sourceType: 'individual_broker' } });
    expect(typeof body.reason).toBe('string');
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: propertyFixture({ name: { en: 'New provider property' }, slug: 'new-provider-property', locationId: undefined, coordinates: undefined, version: 0 }), ...successMeta('wizard-created') }) });
  });
}

test.describe('PRV-03 and PRV-04 Add Property wizard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-03; PRV-04' });
    testInfo.annotations.push({ type: 'design-source', description: 'PRV-03 docs/design_sources/final_screens/provider/PRV-03.png SHA-256 82b6e746c740ef4a064a71533b8b025aaafe0bd56bdd2345cd62b40af2463e22; Figma node 6017:19499; PRV-04 docs/design_sources/final_screens/provider/PRV-04.png SHA-256 870908c5a0b2ac4d1d0475d0e1552a74e99571487831feec50f11e6b80f37106; Figma node 6017:19679; Drive folders 1DdoEN9a92vmsDI0Zk8dSN1Yxk5k37K4R and 1cHXSIRo0S4A5f2S16gpanhN4GgYsNDRS' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Provider dashboard is approved for desktop only.');
    void page;
  });

  test('creates an owned draft through the implemented contract and preserves locale direction', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page);
    await routeProviderProperty(page);
    const response = await page.goto(`/provider/properties/new/basic?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="PRV-03"]')).toBeVisible();
    await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
    await page.locator('#provider-property-name').fill('New provider property');
    await page.locator('#provider-property-slug').fill('new-provider-property');
    await page.locator('#provider-property-source-type').selectOption('individual_broker');
    await page.getByRole('button', { name: /Save draft|حفظ المسودة|保存草稿/u }).click();
    await expect(page.locator('.provider-property-wizard__form-message--success')).toContainText(/Draft saved|تم حفظ المسودة|草稿已保存/u);
    await expect(page.locator('body')).not.toContainText(/aaaaaaaaaaaaaaaaaaaaaaaa|accessToken|refreshToken|storageKey|internalNotes|assignedTo|auditData/u);
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('#provider-property-name').focus();
    await expect(page.locator('#provider-property-name')).toBeFocused();
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`provider-property-basic-${locale}.png`, { fullPage: true });
  });

  test('resumes a draft and saves only the implemented location payload', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page);
    await routeProviderProperty(page);
    const response = await page.goto(`/provider/properties/${propertyId}/location?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('[data-screen-id="PRV-04"]')).toBeVisible();
    await expect(page.getByText(/provider location catalog is unavailable|دليل المواقع غير متاح|位置目录不可用/u)).toBeVisible();
    await page.locator('#provider-property-location-id').fill(locationId);
    await page.locator('#provider-property-latitude').fill('30.63');
    await page.locator('#provider-property-longitude').fill('30.74');
    await page.getByRole('button', { name: /Save draft|حفظ المسودة|保存草稿/u }).click();
    await expect(page.locator('.provider-property-wizard__form-message--success')).toContainText(/Draft saved|تم حفظ المسودة|草稿已保存/u);
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`provider-property-location-${locale}.png`, { fullPage: true });
  });

  test('fails closed when the provider session or property permission is unavailable', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page, false);
    await page.goto(`/provider/properties/${propertyId}/location?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-04"]')).toHaveCount(0);

    await routeProviderSession(page);
    await routeProviderProperty(page, { forbidden: true });
    await page.goto(`/provider/properties/${propertyId}/location?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-04"] .provider-property-wizard__state[data-state="permission"]')).toBeVisible();
    await expect(page.locator('#provider-property-location-id')).toHaveCount(0);
  });
});
