import { expect, test } from '@playwright/test';

const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const PROPERTY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const SEEKER_ID = 'cccccccccccccccccccccccc';
const VIEWING_ID = 'dddddddddddddddddddddddd';

function localeForViewings(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function envelope(data: unknown, requestId: string, meta: Record<string, unknown> = {}): string {
  return JSON.stringify({ data, meta: { requestId, ...meta } });
}

function viewingFixture(status = 'requested', version = 2) {
  return {
    id: VIEWING_ID,
    propertyId: PROPERTY_ID,
    seekerId: SEEKER_ID,
    providerId: PROVIDER_ID,
    status,
    requestedAt: '2026-08-28T10:00:00.000Z',
    timezone: 'Africa/Cairo',
    note: 'Customer requested a morning appointment.',
    version,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z'
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    if (!allowed) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'viewings-auth-denied' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'provider.viewings.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, meta: { requestId: 'viewings-refresh' } }) });
  });
}

async function routeViewings(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/provider/viewings**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.viewings.token');
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      const status = url.searchParams.get('status') ?? 'requested';
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [viewingFixture(status)], page: 1, limit: 5, total: 1 }, 'viewings-list', { page: 1, limit: 5, total: 1 }) });
      return;
    }
    expect(url.pathname).toBe(`/api/v1/provider/viewings/${VIEWING_ID}/transitions`);
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body.expectedVersion).toBe(2);
    if (body.action === 'cancel') expect(body.reason).toEqual(expect.any(String));
    if (body.action === 'reschedule') {
      expect(body.requestedAt).toEqual(expect.any(String));
      expect(body.timezone).toBe('Africa/Cairo');
    }
    const nextStatus = body.action === 'confirm' ? 'confirmed' : body.action === 'reschedule' ? 'rescheduled' : body.action === 'cancel' ? 'cancelled' : 'completed';
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(viewingFixture(nextStatus, 3), 'viewings-transition') });
  });
}

test.describe('PRV-18 Provider Viewing Appointments', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-18' });
    testInfo.annotations.push({ type: 'design-source', description: 'PRV-18 docs/design_sources/final_screens/provider/PRV-18.png SHA-256 9a7b859c90236e892de44f81fadf1f5e3484ec13f6a173e497bddbf3e2690c57; Figma node 6017:21613; Drive folder 1wV5wYwgV1HV8sSBohdBqbIKP6qwztZgP' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
    void page;
  });

  test('renders owned appointments, locale direction, safe projection, filter, keyboard, and visual evidence', async ({ page }) => {
    const locale = localeForViewings();
    await routeSession(page);
    await routeViewings(page);
    const response = await page.goto(`/provider/viewings?lang=${encodeURIComponent(locale)}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="PRV-18"]')).toBeVisible();
    await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId('provider-viewings-count')).toContainText(/1|Ù¡|一/u);
    await expect(page.getByTestId('provider-viewing-row')).toBeVisible();
    await expect(page.getByRole('button', { name: /Confirm|تأكيد|确认/u })).toBeEnabled();
    await expect(page.locator('body')).not.toContainText(new RegExp(PROVIDER_ID));
    await expect(page.locator('body')).not.toContainText(new RegExp(SEEKER_ID));
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|storageKey|accessToken|refreshToken/u);

    await page.getByRole('combobox', { name: /Status|الحالة|状态/u }).selectOption('confirmed');
    await page.getByRole('button', { name: /Apply|تطبيق|应用/u }).click();
    await expect(page.getByTestId('provider-viewing-row')).toHaveAttribute('data-viewing-status', 'confirmed');

    await page.getByRole('button', { name: /Reschedule|إعادة الجدولة|改期/u }).first().focus();
    await expect(page.getByRole('button', { name: /Reschedule|إعادة الجدولة|改期/u }).first()).toBeFocused();
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`provider-viewings-${locale}.png`, { fullPage: true });
  });

  test('runs versioned confirm and reschedule transitions through the provider API', async ({ page }) => {
    const locale = localeForViewings();
    await routeSession(page);
    await routeViewings(page);
    await page.goto(`/provider/viewings?lang=${encodeURIComponent(locale)}`);
    await expect(page.getByTestId('provider-viewing-row')).toBeVisible();
    await page.getByRole('button', { name: /Confirm|تأكيد|确认/u }).click();
    await page.getByRole('button', { name: /Save change|حفظ التغيير|保存更改/u }).click();
    await expect(page.getByRole('status').filter({ hasText: /confirmed|تأكيد|已确认/u })).toBeVisible();

    await page.getByRole('button', { name: /Reschedule|إعادة الجدولة|改期/u }).click();
    await page.getByLabel(/Viewing time|موعد المعاينة|看房时间/u).fill('2026-08-29T11:00');
    await page.getByRole('button', { name: /Save change|حفظ التغيير|保存更改/u }).click();
    await expect(page.getByRole('status').filter({ hasText: /rescheduled|إعادة جدولة|已改期/u })).toBeVisible();
  });

  test('fails closed when the provider session expires', async ({ page }) => {
    const locale = localeForViewings();
    await routeSession(page, false);
    await page.goto(`/provider/viewings?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-18"]')).toHaveCount(0);
  });
});
