import { expect, test } from '@playwright/test';
import { getProviderPropertyStateCopy } from '../../src/features/provider_property/state-copy.ts';

const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const PROPERTY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function envelope(data: unknown, requestId: string): string {
  return JSON.stringify({ data, meta: { requestId } });
}

function propertyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: PROPERTY_ID,
    kind: 'property',
    name: { ar: 'عقار المزود', en: 'Provider property', 'zh-CN': '提供方房产' },
    slug: 'provider-property',
    transactionType: 'sale',
    source: { providerId: PROVIDER_ID, sourceType: 'individual_broker' },
    locationId: 'dddddddddddddddddddddddd',
    price: { amount: 1_000_000, currency: 'EGP' },
    contact: { contactName: 'Mona Hassan', phone: '+201000000000', preferredLocale: 'en' },
    status: 'draft',
    active: true,
    version: 2,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions: ['update', 'submit'],
    ...overrides
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    if (!allowed) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'state-auth-denied' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'provider.state.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, meta: { requestId: 'state-refresh' } }) });
  });
}

async function routeProperty(page: import('@playwright/test').Page, overrides: Record<string, unknown> = {}): Promise<void> {
  await page.route(`**/api/v1/provider/properties/${PROPERTY_ID}`, async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer provider.state.token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(propertyFixture(overrides), 'state-property') });
  });
}

test.describe('PRV-11 through PRV-14 provider property states', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-11; PRV-12; PRV-13; PRV-14' });
    testInfo.annotations.push({ type: 'design-source', description: 'PRV-11 docs/design_sources/final_screens/provider/PRV-11.png SHA-256 48481A68580FB9AFBF5A393F8F8AF14E86D5030824DF723D5CFB39BD88658FAE; Figma node 6017:21064; PRV-12 docs/design_sources/final_screens/provider/PRV-12.png SHA-256 639A23D667A4A22DE0EED819EA7A01E094E2E59BC4701624751D3B5383CDB625; Figma node 6017:21012; PRV-13 docs/design_sources/final_screens/provider/PRV-13.png SHA-256 7DA1D3350789A70B0C742D194E070E4E225D20C8D3B401D141928135FF88E031; Figma node 6017:21123; PRV-14 docs/design_sources/final_screens/provider/PRV-14.png SHA-256 EFDFD0BB2B283417E32A19B6089C0E09D78956B42E7F0A585187F0F1455C3AC3; Figma node 6017:20973; Drive folders 1LMR8ByJMrmEE5500eTUOTtB0rWcL8G3u, 1rNEVgpLFKw_zSNpAXndLQfWMyNlT2bhb, 1wpWqXwKoSFCkvlGwPQxzjuAt6cti-uxT, 19ObqV6wXoya0W2PD0N_lWrTMNGkiGg0A' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
    void page;
  });

  test('renders validation errors from the server-owned draft shape', async ({ page }) => {
    const locale = localeForProject();
    const copy = getProviderPropertyStateCopy(locale);
    await routeSession(page);
    await routeProperty(page, { locationId: undefined, price: undefined, contact: undefined, status: 'draft', availableActions: ['update', 'submit'], reviewReason: 'Complete the missing property data.' });
    await page.goto(`/provider/properties/${PROPERTY_ID}/review?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-11"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.validation.title, level: 1 })).toBeVisible();
    await expect(page.getByText(copy.validation.issueLabels.location).first()).toBeVisible();
    await expect(page.getByText('Complete the missing property data.')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/reviewedBy|assignedTo|auditData|storageKey|refreshToken|accessToken/u);
    await expect(page).toHaveScreenshot(`provider-property-validation-${locale}.png`, { fullPage: true });
  });

  test('renders the submitted state and read-only next action', async ({ page }) => {
    const locale = localeForProject();
    const copy = getProviderPropertyStateCopy(locale);
    await routeSession(page);
    await routeProperty(page, { status: 'pending_review', availableActions: [], submittedAt: '2026-08-18T10:00:00.000Z' });
    await page.goto(`/provider/properties/${PROPERTY_ID}/submitted?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-12"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.statuses.pending_review.title, level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.actions.viewProperty })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/reviewedBy|assignedTo|auditData|storageKey|refreshToken|accessToken/u);
    await expect(page).toHaveScreenshot(`provider-property-submitted-${locale}.png`, { fullPage: true });
  });

  test('renders the rejected state with its safe reason and no unsupported action', async ({ page }) => {
    const locale = localeForProject();
    const copy = getProviderPropertyStateCopy(locale);
    await routeSession(page);
    await routeProperty(page, { status: 'rejected', availableActions: [], reviewReason: 'Missing approved media.' });
    await page.goto(`/provider/properties/${PROPERTY_ID}/rejected?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-13"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.statuses.rejected.title, level: 1 })).toBeVisible();
    await expect(page.getByText('Missing approved media.')).toBeVisible();
    await expect(page.getByText(copy.actions.supportUnavailable)).toBeVisible();
    await expect(page).toHaveScreenshot(`provider-property-rejected-${locale}.png`, { fullPage: true });
  });

  test('renders the published state without fabricating views and exposes the public route', async ({ page }) => {
    const locale = localeForProject();
    const copy = getProviderPropertyStateCopy(locale);
    await routeSession(page);
    await routeProperty(page, { status: 'published', availableActions: [], publishedAt: '2026-08-18T11:00:00.000Z' });
    await page.goto(`/provider/properties/${PROPERTY_ID}/published?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-14"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.statuses.published.title, level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.actions.viewPublic })).toHaveAttribute('href', /\/properties\/provider-property/);
    await expect(page.locator('[data-value="unavailable"]')).toHaveText(copy.labels.unavailable);
    await expect(page).toHaveScreenshot(`provider-property-published-${locale}.png`, { fullPage: true });
  });

  test('keeps state actions keyboard reachable and fails closed for permission denial', async ({ page }) => {
    const locale = localeForProject();
    const copy = getProviderPropertyStateCopy(locale);
    await routeSession(page);
    await routeProperty(page, { status: 'published', availableActions: [] });
    await page.goto(`/provider/properties/${PROPERTY_ID}/published?lang=${encodeURIComponent(locale)}`);
    const back = page.getByRole('link', { name: copy.actions.back });
    await back.focus();
    await expect(back).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: copy.actions.viewPublic })).toBeFocused();

    await routeSession(page, false);
    await page.goto(`/provider/properties/${PROPERTY_ID}/submitted?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-12"]')).toHaveCount(0);
  });
});
