import { expect, test, type Page } from '@playwright/test';
import { expectNoPrivateCommissionFields, routeAdminCommissionApis } from './admin-commissions.fixtures.ts';

const propertyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const requestId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const viewingId = 'cccccccccccccccccccccccc';
const providerId = 'dddddddddddddddddddddddd';

type Locale = 'ar' | 'en';

function localeForProject(): Locale {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

function envelope(data: unknown, requestIdValue: string): string {
  return JSON.stringify({ data, meta: { requestId: requestIdValue } });
}

async function expectLocale(page: Page, locale: Locale): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
}

function publishedProperty() {
  return {
    id: propertyId,
    slug: 'critical-published-home',
    kind: 'property',
    name: { ar: 'منزل منشور', en: 'Critical published home',},
    transactionType: 'sale',
    description: { ar: 'وصف المنزل المنشور', en: 'A published home used by the critical journey.',},
    area: { value: 120, unit: 'sqm' },
    layout: { bedrooms: 3, bathrooms: 2, floor: 4 },
    price: { amount: 1250000, currency: 'EGP' },
    source: { sourceType: 'developer_company', organizationId: 'eeeeeeeeeeeeeeeeeeeeeeee' },
    seo: { title: { ar: 'منزل منشور', en: 'Critical published home',}, description: { en: 'A published home.' }, slug: 'critical-published-home' },
    project: { id: 'eeeeeeeeeeeeeeeeeeeeeeee', slug: 'critical-project', name: { en: 'Critical project' }, description: { en: 'A published project.' } },
    media: [],
    features: [],
    services: [],
    relatedProperties: []
  };
}

async function routeRegistration(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/otp/send', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'registration'
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accepted: true, challengeId: '00000000-0000-4000-8000-000000000001', expiresInSeconds: 300, retryAfterSeconds: 30 }, 'critical-otp-send') });
  });
  await page.route('**/api/v1/auth/otp/verify', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      email: 'seeker@example.com', roleType: 'seeker', purpose: 'registration', challengeId: '00000000-0000-4000-8000-000000000001', code: '123456'
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ outcome: 'verified', verificationToken: 'A'.repeat(43), expiresInSeconds: 600, roleType: 'seeker' }, 'critical-otp-verify') });
  });
}

async function routePublicProperties(page: Page): Promise<void> {
  await page.route('**/api/v1/public/properties**', async route => {
    expect(route.request().method()).toBe('GET');
    const pathname = new URL(route.request().url()).pathname;
    const detail = publishedProperty();
    const listItem = { id: detail.id, slug: detail.slug, kind: detail.kind, name: detail.name, transactionType: detail.transactionType, description: detail.description, area: detail.area, layout: detail.layout, price: detail.price };
    const data = pathname.endsWith('/critical-published-home') ? detail : { items: [listItem], categories: [], propertyTypes: [], page: 1, limit: 20, total: 1 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(data, pathname.endsWith('/critical-published-home') ? 'critical-public-detail' : 'critical-public-search') });
  });
}

async function routeSeekerSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'seeker.critical.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'ffffffffffffffffffffffff', roleType: 'seeker', status: 'verified' } }, 'critical-seeker-refresh') });
  });
}

async function routeSeekerSurfaces(page: Page): Promise<void> {
  await page.route('**/api/v1/seeker/favorites**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.critical.token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ id: propertyId, slug: 'critical-published-home', kind: 'property', name: { en: 'Critical published home' }, transactionType: 'sale', area: { value: 120, unit: 'sqm' }, layout: { bedrooms: 3, bathrooms: 2, floor: 4 }, price: { amount: 1250000, currency: 'EGP' }, savedAt: '2026-08-20T10:00:00.000Z' }], page: 1, limit: 20, total: 1 }, 'critical-saved') });
  });
  await page.route('**/api/v1/seeker/requests**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.critical.token');
    const pathname = new URL(route.request().url()).pathname;
    const item = { id: requestId, type: 'contact', source: 'seeker', seekerId: 'ffffffffffffffffffffffff', propertyId, status: 'under_review', payload: { message: 'Please call me' }, version: 0, availableActions: ['cancel'], createdAt: '2026-08-20T10:00:00.000Z', updatedAt: '2026-08-20T10:00:00.000Z' };
    const data = pathname.endsWith(`/${requestId}`) ? item : { items: [item], page: 1, limit: 20, total: 1 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(data, pathname.endsWith(`/${requestId}`) ? 'critical-request-detail' : 'critical-request-list') });
  });
  await page.route('**/api/v1/seeker/viewings**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.critical.token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ id: viewingId, propertyId, seekerId: 'ffffffffffffffffffffffff', status: 'requested', requestedAt: '2026-08-27T11:00:00.000Z', timezone: 'Africa/Cairo', note: 'Please call before arriving.', version: 0, createdAt: '2026-08-20T10:00:00.000Z', updatedAt: '2026-08-20T10:00:00.000Z' }], page: 1, limit: 100, total: 1 }, 'critical-viewings') });
  });
}

async function routeProviderSession(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'provider.critical.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: providerId, roleType: 'provider', status: 'verified' } }, 'critical-provider-refresh') });
  });
}

async function routeProviderSurfaces(page: Page): Promise<void> {
  await page.route(`**/api/v1/provider/properties/${propertyId}`, async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer provider.critical.token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: propertyId, kind: 'property', name: { ar: 'عقار منشور', en: 'Critical published home',}, slug: 'critical-published-home', transactionType: 'sale', source: { providerId, sourceType: 'individual_broker' }, locationId: 'eeeeeeeeeeeeeeeeeeeeeeee', price: { amount: 1250000, currency: 'EGP' }, contact: { contactName: 'Mona Hassan', phone: '+201000000000', preferredLocale: 'en' }, status: 'published', active: true, version: 4, createdAt: '2026-08-18T08:00:00.000Z', updatedAt: '2026-08-20T11:00:00.000Z', publishedAt: '2026-08-20T11:00:00.000Z', availableActions: [] }, 'critical-provider-property') });
  });
  await page.route('**/api/v1/provider/ads**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.critical.token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ id: '121212121212121212121212', placementKey: 'homepage.hero', purpose: 'Promote an approved property campaign.', intervalStart: '2026-09-01T08:00:00.000Z', intervalEnd: '2026-09-30T08:00:00.000Z', status: 'quote_sent', version: 1, createdAt: '2026-08-20T10:00:00.000Z', updatedAt: '2026-08-20T10:00:00.000Z', history: [], quote: { id: '131313131313131313131313', requestId: '121212121212121212121212', currency: 'EGP', lineItems: [{ description: 'Homepage hero placement', quantity: 1, unitAmountMinor: 250000 }], totalMinor: 250000, validUntil: '2026-08-28T08:00:00.000Z', terms: 'Administrative quote terms.', status: 'issued', version: 1, decisionHistory: [{ action: 'issued', version: 0, createdAt: '2026-08-20T10:00:00.000Z' }] }, paymentProofs: [] }], page: 1, limit: 5, total: 1 }, 'critical-provider-ads') });
  });
  await page.route('**/api/v1/provider/commission', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.critical.token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accountId: providerId, source: 'policy', effectiveAt: '2026-08-20T08:00:00.000Z', policyVersion: 4, kind: 'percentage', percentageBps: 250, readOnly: true }, 'critical-provider-commission') });
  });
}

test.describe('F6 critical cross-surface journeys', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'source-of-truth', description: 'Implemented runtime routes and test-only isolated API fixtures; no production mocks or invented endpoints.' });
    testInfo.annotations.push({ type: 'locale-matrix', description: 'Arabic RTL, English LTR, and Arabic or English LTR on the approved Desktop dashboard scope.' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'The cross-surface journey enters Seeker, Provider, and Admin dashboards, whose approved scope is Desktop-only. Public/auth coverage remains covered by the existing all-device matrices.');
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('registration to public discovery to owned save, request, and viewing states', async ({ page }) => {
    const locale = localeForProject();
    await routeRegistration(page);
    await page.goto(`/auth/verify-email?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker`);
    await page.locator('#auth-otp-email').fill('seeker@example.com');
    await page.locator('[data-screen-id="AUTH-04"] button[type="submit"]').click();
    await expect(page.locator('[data-screen-id="AUTH-05"]')).toBeVisible();
    for (let position = 0; position < 6; position += 1) await page.locator('.auth-otp__digit').nth(position).fill(String(position + 1));
    await page.locator('[data-screen-id="AUTH-05"] button[type="submit"]').click();
    await expect(page.locator('[data-screen-id="AUTH-05"] [data-state="success"]')).toBeVisible();

    await routePublicProperties(page);
    await page.goto(`/properties?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-page="public-properties"]')).toHaveAttribute('data-listing-state', 'success');
    await expectLocale(page, locale);
    await page.goto(`/properties/critical-published-home?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-page="public-property-details"]')).toHaveAttribute('data-details-state', 'success');

    await routeSeekerSession(page);
    await routeSeekerSurfaces(page);
    await page.goto(`/seeker/saved?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-06"]')).toBeVisible();
    await expect(page.getByTestId(`seeker-saved-property-${propertyId}`)).toBeVisible();
    await page.goto(`/seeker/requests?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-02"]')).toBeVisible();
    await expect(page.getByTestId(`seeker-request-${requestId}`)).toBeVisible();
    await page.goto(`/seeker/requests/${requestId}?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-03"]')).toHaveAttribute('data-request-status', 'under_review');
    await page.goto(`/seeker/viewings?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-05"]')).toBeVisible();
    await expect(page.getByTestId(`seeker-viewing-${viewingId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|internalNotes|assignedTo|auditData|seekerId|providerId/u);
  });

  test('provider publication to public property and read-only advertising commission state', async ({ page }) => {
    const locale = localeForProject();
    await routeProviderSession(page);
    await routePublicProperties(page);
    await routeProviderSurfaces(page);
    await page.goto(`/provider/properties/${propertyId}/published?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-14"]')).toBeVisible();
    const publicLink = page.locator('a[href^="/properties/critical-published-home"], a[href^="/properties/provider-property"]');
    await expect(publicLink).toBeVisible();
    await publicLink.click();
    await expect(page.locator('[data-page="public-property-details"]')).toHaveAttribute('data-details-state', 'success');
    await page.goto(`/provider/ads?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-19"]')).toHaveAttribute('data-advertising-state', 'success');
    await expect(page.getByTestId('provider-advertising-row')).toBeVisible();
    await page.goto(`/provider/commission?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-20"]')).toHaveAttribute('data-commission-state', 'success');
    await expect(page.getByText('2.5%')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/storageKey|accessToken|refreshToken|bank verification|sourceRecordId|policyId/u);
  });

  test('administrator reviews commission policy through an implemented server action', async ({ page }) => {
    const locale = localeForProject();
    await routeAdminCommissionApis(page);
    await page.goto(`/admin/commissions?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-39"]')).toBeVisible();
    await expect(page.locator('.route-shell--admin')).toHaveAttribute('data-device-scope', 'desktop');
    await page.goto(`/admin/commissions/new?lang=${encodeURIComponent(locale)}`);
    await page.locator('#admin-commission-policy-key').fill('critical.sale');
    await page.locator('#admin-commission-policy-label').fill('Critical sale commission');
    await page.locator('#admin-commission-policy-percentage').fill('250');
    await page.locator('#admin-commission-policy-effective-from').fill('2026-08-20T09:00');
    const requestPromise = page.waitForRequest(request => request.method() === 'POST' && request.url().includes('/api/v1/admin/commission-policies'));
    await page.locator('.admin-commissions__form button[type="submit"]').click();
    const request = await requestPromise;
    expect(request.postDataJSON()).toMatchObject({ key: 'critical.sale', kind: 'percentage', percentageBps: 250, scope: { kind: 'default' } });
    expect(request.postDataJSON()).not.toHaveProperty('universalPrice');
    await expect(page.locator('.admin-commissions__feedback[data-tone="success"]')).toBeVisible();
    await expectNoPrivateCommissionFields(page);
    await expectLocale(page, locale);
  });
});
