import { expect, test } from '@playwright/test';
import { getProviderPropertyCompletionCopy } from '../../src/features/provider_property/completion-copy.ts';

const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const PROPERTY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const MEDIA_ID = 'cccccccccccccccccccccccc';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function copyFor(locale: 'ar' | 'en' | 'zh-CN') {
  const copy = getProviderPropertyCompletionCopy(locale);
  return {
    chooseImage: copy.media.chooseImage,
    chooseFloorPlan: copy.media.chooseFloorPlan,
    continue: copy.continue,
    remove: copy.media.remove,
    submit: copy.review.submit,
    data: copy.review.accurateData,
    authority: copy.review.authority,
    review: copy.review.reviewProcess
  };
}

function envelope(data: unknown, requestId: string): string {
  return JSON.stringify({ data, meta: { requestId } });
}

function propertyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: PROPERTY_ID,
    kind: 'property',
    name: { ar: 'Ø¹Ù‚Ø§Ø± Ø§Ù„Ù…Ø²ÙˆÙ‘Ø¯', en: 'Provider property', 'zh-CN': 'æä¾›æ–¹æˆ¿äº§' },
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

function mediaFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: MEDIA_ID,
    propertyId: PROPERTY_ID,
    kind: 'image',
    originalFilename: 'front.jpg',
    detectedMime: 'image/jpeg',
    byteSize: 128,
    sha256: 'd'.repeat(64),
    sortOrder: 0,
    isCover: true,
    processingState: 'ready',
    active: true,
    version: 1,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T08:00:00.000Z',
    ...overrides
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    if (!allowed) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'completion-auth-denied' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'provider.completion.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, meta: { requestId: 'completion-refresh' } }) });
  });
}

async function routeProperty(page: import('@playwright/test').Page, overrides: Record<string, unknown> = {}): Promise<void> {
  await page.route(`**/api/v1/provider/properties/${PROPERTY_ID}`, async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer provider.completion.token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(propertyFixture(overrides), 'completion-property') });
  });
}

test.describe('PRV-08, PRV-09, and PRV-10 provider property completion', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-08; PRV-09; PRV-10' });
    testInfo.annotations.push({ type: 'design-source', description: 'PRV-08 docs/design_sources/final_screens/provider/PRV-08.png SHA-256 d49d11c87ec5544de2ba9b1056860a13b9c57d7bf0b10c5ed53235c89a170021; PRV-09 docs/design_sources/final_screens/provider/PRV-09.png SHA-256 fc5b166453e2d9ca35d3706ed1368eb98a30ece3f3eb23f03ee6bdb81c1b8e09; PRV-10 docs/design_sources/final_screens/provider/PRV-10.png SHA-256 f34bfb0378ffe6c72625f592ea3c1b108c10cdf05273d53d907ced901aa49497; Figma node 6017:19032; Drive folders 1PTID8nypqLiSrU3-O6cAiXoJdu9hVUi4, 1yW0-rmLNBH19aM5xW3l3q0sm51yARrLS, 1Q4Enn2KDiWVSa3zI_htObrmdyMn4f0WQ' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
    void page;
  });

  test('uploads, reorders, and removes private media without exposing storage identifiers', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeProperty(page);
    await page.route(`**/api/v1/provider/properties/${PROPERTY_ID}/media`, async route => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['authorization']).toBe('Bearer provider.completion.token');
      expect(route.request().headers()['x-media-kind']).toBe('image');
      expect(route.request().headers()['x-file-name']).toBe('front.jpg');
      expect(route.request().headers()['content-type']).toBe('image/jpeg');
      expect(route.request().postDataBuffer()?.length ?? 0).toBeGreaterThan(0);
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(mediaFixture(), 'completion-media-upload') });
    });
    await page.route(`**/api/v1/provider/properties/${PROPERTY_ID}/media/${MEDIA_ID}`, async route => {
      expect(route.request().method()).toBe('DELETE');
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(mediaFixture({ processingState: 'deleted', active: false }), 'completion-media-delete') });
    });
    await page.goto(`/provider/properties/${PROPERTY_ID}/media?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-08"]')).toBeVisible();
    await page.locator('#provider-property-media-image').setInputFiles({ name: 'front.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('jpeg-bytes') });
    await expect(page.getByText('front.jpg')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/storageKey|https?:\/\//u);
    await page.locator('.provider-property-completion__media-item button').last().click();
    await expect(page.locator('.provider-property-completion__media-list')).toHaveCount(0);
    await expect(page).toHaveScreenshot(`provider-property-media-${locale}.png`, { fullPage: true });
  });

  test('saves only supported contact fields and identifies unavailable internal notes', async ({ page }) => {
    const locale = localeForProject();
    const copy = copyFor(locale);
    await routeSession(page);
    await routeProperty(page);
    await page.route(`**/api/v1/provider/properties/${PROPERTY_ID}/steps/contact`, async route => {
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().postDataJSON()).toEqual({ version: 2, contact: { contactName: 'Mona Hassan', phone: '+201000000000', whatsappNumber: '+201000000001', email: 'mona@example.com', preferredLocale: locale }, reason: 'Provider updated contact details' });
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(propertyFixture({ version: 3, contact: { contactName: 'Mona Hassan', phone: '+201000000000', whatsappNumber: '+201000000001', email: 'mona@example.com', preferredLocale: locale } }), 'completion-contact') });
    });
    await page.goto(`/provider/properties/${PROPERTY_ID}/contact?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-09"]')).toBeVisible();
    await page.locator('#provider-property-contact-whatsapp').fill('+201000000001');
    await page.locator('#provider-property-contact-email').fill('mona@example.com');
    await page.locator('#provider-property-contact-locale').selectOption(locale);
    await expect(page.locator('.provider-property-completion__notice')).toBeVisible();
    await page.getByRole('button', { name: copy.continue }).click();
    await expect(page).toHaveURL(new RegExp(`/provider/properties/${PROPERTY_ID}/review`));
    await expect(page).toHaveScreenshot(`provider-property-contact-${locale}.png`, { fullPage: true });
  });

  test('submits only when availableActions and all confirmations permit it', async ({ page }) => {
    const locale = localeForProject();
    const copy = copyFor(locale);
    await routeSession(page);
    await routeProperty(page);
    await page.route(`**/api/v1/provider/properties/${PROPERTY_ID}/submit`, async route => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({ version: 2, reason: 'Provider submitted property for review' });
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(propertyFixture({ status: 'pending_review', availableActions: [] }), 'completion-submit') });
    });
    await page.goto(`/provider/properties/${PROPERTY_ID}/review?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-10"]')).toBeVisible();
    const submit = page.getByRole('button', { name: copy.submit });
    await expect(submit).toBeDisabled();
    await page.getByLabel(copy.data).check();
    await page.getByLabel(copy.authority).check();
    await page.getByLabel(copy.review).check();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText(getProviderPropertyCompletionCopy(locale).review.submittedTitle)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/internalNote|assignedTo|auditData|storageKey|refreshToken|accessToken/u);
    await expect(page).toHaveScreenshot(`provider-property-review-${locale}.png`, { fullPage: true });
  });

  test('fails closed for session and property permission denial', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page, false);
    await page.goto(`/provider/properties/${PROPERTY_ID}/media?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-08"]')).toHaveCount(0);

    await routeSession(page);
    await page.route(`**/api/v1/provider/properties/${PROPERTY_ID}`, async route => {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'completion-forbidden' } }) });
    });
    await page.goto(`/provider/properties/${PROPERTY_ID}/media?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-08"] .provider-property-completion__state')).toBeVisible();
    await expect(page.locator('#provider-property-media-image')).toHaveCount(0);
  });

  test('completion controls expose one main landmark, labels, and keyboard focus', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeProperty(page);
    await page.goto(`/provider/properties/${PROPERTY_ID}/review?lang=${encodeURIComponent(locale)}`);
    const screen = page.locator('[data-screen-id="PRV-10"]');
    await expect(screen.locator('h1')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(screen.locator('input[type="checkbox"]')).toHaveCount(3);
    await expect(page.locator('#provider-property-submit-reason')).toHaveAccessibleName(getProviderPropertyCompletionCopy(locale).review.reviewReason);
    const back = screen.getByRole('button', { name: getProviderPropertyCompletionCopy(locale).back });
    await back.focus();
    await expect(back).toBeFocused();
    const firstCheck = screen.locator('input[type="checkbox"]').first();
    const secondCheck = screen.locator('input[type="checkbox"]').nth(1);
    await firstCheck.focus();
    await expect(firstCheck).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(secondCheck).toBeFocused();
  });
});
