import { expect, test } from '@playwright/test';
import { getProviderPropertyStateCopy } from '../../src/features/provider_property/state-copy.ts';

const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const PROPERTY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
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
    name: { ar: '\u0639\u0642\u0627\u0631 \u0627\u0644\u0645\u0632\u0648\u0651\u062f', en: 'Provider property',},
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
    const reviewReason = locale === 'ar' ? '\u064a\u0631\u062c\u0649 \u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0642\u0627\u0631 \u0627\u0644\u0646\u0627\u0642\u0635\u0629.' : 'Complete the missing property data.';
    await routeSession(page);
    await routeProperty(page, { locationId: undefined, price: undefined, contact: undefined, status: 'draft', availableActions: ['update', 'submit'], reviewReason });
    await page.goto(`/provider/properties/${PROPERTY_ID}/review?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-11"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.validation.title, level: 1 })).toBeVisible();
    await expect(page.getByText(copy.validation.issueLabels.location).first()).toBeVisible();
    await expect(page.getByText(reviewReason)).toBeVisible();
    await expect(page.locator('.provider-property-completion__steps')).toHaveCount(0);
    await expect(page.locator('[data-provider-nav="addProperty"] a')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('body')).not.toContainText(/reviewedBy|assignedTo|auditData|storageKey|refreshToken|accessToken/u);
    await expect(page).toHaveScreenshot(`provider-property-validation-${locale}.png`, { fullPage: true });
    for (const width of [393, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        contained: ['.provider-property-validation', '.provider-property-state__actions'].every(selector => {
          const bounds = document.querySelector(selector)?.getBoundingClientRect();
          return bounds !== undefined && bounds.left >= -0.5 && bounds.right <= document.documentElement.clientWidth + 0.5;
        })
      }))).toEqual({ documentWidth: width, viewportWidth: width, contained: true });
    }
  });

  test('renders the submitted state and read-only next action', async ({ page }) => {
    const locale = localeForProject();
    const copy = getProviderPropertyStateCopy(locale);
    await routeSession(page);
    await routeProperty(page, { status: 'pending_review', availableActions: [], submittedAt: '2026-08-18T10:00:00.000Z' });
    await page.goto(`/provider/properties/${PROPERTY_ID}/submitted?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-12"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-12"]')).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
    await expect(page.getByRole('heading', { name: copy.statuses.pending_review.title, level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.actions.viewProperty })).toBeVisible();
    await expect(page.locator('[data-provider-nav="addProperty"] a')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.provider-property-state__submitted-card dl > div')).toHaveCount(3);
    await expect(page.locator('.provider-property-state__notice, .provider-property-state__safe')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/reviewedBy|assignedTo|auditData|storageKey|refreshToken|accessToken/u);
    await expect(page).toHaveScreenshot(`provider-property-submitted-${locale}.png`, { fullPage: true });
    for (const viewport of [{ width: 402, height: 858 }, { width: 1024, height: 720 }]) {
      await page.setViewportSize(viewport);
      await expect.poll(() => page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        contained: ['.provider-property-state__main--submitted', '.provider-property-state__submitted-card', '.provider-property-state__submitted-actions'].every(selector => {
          const bounds = document.querySelector(selector)?.getBoundingClientRect();
          return bounds !== undefined && bounds.left >= -0.5 && bounds.right <= document.documentElement.clientWidth + 0.5;
        })
      }))).toEqual({ documentWidth: viewport.width, viewportWidth: viewport.width, contained: true });
      if (viewport.width === 402) {
        const view = page.locator('[data-action="view-property"]');
        const back = page.locator('[data-action="back"]');
        await expect.poll(async () => (await view.boundingBox())?.y ?? 0).toBeLessThan((await back.boundingBox())?.y ?? 0);
      }
    }
  });

  test('renders the rejected state with its server reason and unavailable support control', async ({ page }) => {
    const locale = localeForProject();
    const copy = getProviderPropertyStateCopy(locale);
    const reviewReason = locale === 'ar'
      ? 'العقار لا يستوفي معايير الجودة المطلوبة لإدراجه في المنصة. الصور المرفوعة غير واضحة والبيانات المُدخلة غير مكتملة. لإعادة التقديم، يرجى مراجعة المتطلبات والتواصل مع فريق الدعم إذا احتجت مساعدة.'
      : 'The property does not meet the quality standards required for listing. The uploaded images are unclear and the entered data is incomplete. Review the requirements before resubmitting and contact support if you need help.';
    await routeSession(page);
    await routeProperty(page, { status: 'rejected', availableActions: [], reviewReason });
    await page.goto(`/provider/properties/${PROPERTY_ID}/rejected?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-13"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-13"]')).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
    await expect(page.getByRole('heading', { name: copy.statuses.rejected.title, level: 1 })).toBeVisible();
    await expect(page.getByText(reviewReason)).toBeVisible();
    await expect(page.locator('[data-provider-nav="addProperty"] a')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: copy.actions.contactSupport })).toBeDisabled();
    await expect(page.locator('.provider-property-state__card, .provider-property-state__safe, .provider-property-state__unavailable')).toHaveCount(0);
    await expect(page).toHaveScreenshot(`provider-property-rejected-${locale}.png`, { fullPage: true });
    for (const viewport of [{ width: 402, height: 780 }, { width: 1024, height: 900 }]) {
      await page.setViewportSize(viewport);
      await expect.poll(() => page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        contained: ['.provider-property-state__main--rejected', '.provider-property-state__rejected-card', '.provider-property-state__rejected-actions'].every(selector => {
          const bounds = document.querySelector(selector)?.getBoundingClientRect();
          return bounds !== undefined && bounds.left >= -0.5 && bounds.right <= document.documentElement.clientWidth + 0.5;
        })
      }))).toEqual({ documentWidth: viewport.width, viewportWidth: viewport.width, contained: true });
      if (viewport.width === 402) {
        const back = page.locator('[data-action="back"]');
        const support = page.locator('[data-action="support"]');
        await expect.poll(async () => (await back.boundingBox())?.y ?? 0).toBeLessThan((await support.boundingBox())?.y ?? 0);
      }
    }
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
