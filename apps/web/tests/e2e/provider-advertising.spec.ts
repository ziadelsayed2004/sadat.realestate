import { expect, test } from '@playwright/test';

const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const REQUEST_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const QUOTE_ID = 'cccccccccccccccccccccccc';

function localeForProject(): 'ar' | 'en' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

async function waitForVisualStability(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(['400 15px Cairo', '600 15px Cairo', '700 15px Cairo', '800 15px Cairo'].map(font => document.fonts.load(font)));
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.waitForTimeout(100);
}

function envelope(data: unknown, requestId: string, meta: Record<string, unknown> = {}): string {
  return JSON.stringify({ data, meta: { requestId, ...meta } });
}

function advertisingRequest(status: 'quote_sent' | 'waiting_payment' = 'quote_sent') {
  return {
    id: REQUEST_ID,
    placementKey: 'homepage.hero',
    purpose: 'Promote an approved property campaign.',
    intervalStart: '2026-09-01T08:00:00.000Z',
    intervalEnd: '2026-09-30T08:00:00.000Z',
    status,
    version: 1,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    history: [{ status, version: 1, changedAt: '2026-08-18T09:00:00.000Z' }],
    quote: {
      id: QUOTE_ID,
      requestId: REQUEST_ID,
      currency: 'EGP',
      lineItems: [{ description: 'Homepage hero placement', quantity: 1, unitAmountMinor: 250000 }],
      totalMinor: 250000,
      validUntil: '2026-08-28T08:00:00.000Z',
      terms: 'Administrative quote terms.',
      status: status === 'waiting_payment' ? 'accepted' : 'issued',
      version: 2,
      decisionHistory: [{ action: 'issued', version: 0, createdAt: '2026-08-18T09:00:00.000Z' }]
    },
    paymentProofs: [],
    schedule: undefined
  };
}

async function routeSession(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'provider.advertising.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, 'provider-advertising-refresh') });
  });
}

async function routeAdvertisingApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/provider/ads**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.advertising.token');
    const url = new URL(route.request().url());
    const detail = url.pathname.endsWith(`/${REQUEST_ID}`);
    const empty = !detail && url.searchParams.get('status') === 'rejected';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope(detail ? advertisingRequest() : { items: empty ? [] : [advertisingRequest()], page: 1, limit: 5, total: empty ? 0 : 1 }, detail ? 'provider-advertising-detail' : 'provider-advertising-list', detail ? {} : { page: 1, limit: 5, total: empty ? 0 : 1 })
    });
  });
  await page.route('**/api/v1/provider/commission', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.advertising.token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accountId: PROVIDER_ID, source: 'policy', effectiveAt: '2026-08-19T08:00:00.000Z', policyVersion: 3, kind: 'percentage', percentageBps: 250, readOnly: true }, 'provider-commission') });
  });
}

test('PRV-19 advertising requests match the responsive source and keep creation usable', async ({ page }, testInfo) => {
  const locale = localeForProject();
  if (testInfo.project.name.startsWith('tablet-')) await page.setViewportSize({ width: 1024, height: 760 });
  if (testInfo.project.name.startsWith('mobile-')) await page.setViewportSize({ width: 402, height: 1062 });
  testInfo.annotations.push({ type: 'design-source', description: 'Figma tablet node 6017:121347 (1024x760); mobile node 6017:119686 (402x1062)' });
  await routeSession(page);
  await routeAdvertisingApi(page);
  await page.goto(`/provider/ads?lang=${encodeURIComponent(locale)}`);
  const screen = page.locator('[data-screen-id="PRV-19"]');
  await expect(screen).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  await expect(screen).toHaveAttribute('data-advertising-state', 'success');
  const row = page.getByTestId('provider-advertising-row');
  await expect(row).toBeVisible();
  const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
  const rowBounds = await row.boundingBox();
  if (dimensions.width <= 1100) {
    expect(rowBounds?.x).toBeGreaterThanOrEqual(0);
    expect((rowBounds?.x ?? 0) + (rowBounds?.width ?? 0)).toBeLessThanOrEqual(dimensions.width + 1);
  }
  await page.locator('#provider-advertising-status').selectOption('rejected');
  await page.locator('.provider-advertising__filter-actions button').first().click();
  await expect(page.getByTestId('provider-advertising-row')).toHaveCount(0);
  await expect(screen).toHaveAttribute('data-advertising-state', 'empty');
  await page.locator('.provider-advertising__filter-actions button').nth(1).click();
  await expect(page.getByTestId('provider-advertising-row')).toBeVisible();
  await expect(screen).toHaveAttribute('data-advertising-state', 'success');
  await page.locator('.provider-advertising__heading > .ui-button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds?.x).toBeGreaterThanOrEqual(0);
  expect((dialogBounds?.x ?? 0) + (dialogBounds?.width ?? 0)).toBeLessThanOrEqual(dimensions.width + 1);
  expect(dialogBounds?.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await dialog.getByRole('button', { name: /Submit request|إرسال الطلب/u }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
});

test.describe('PRV-19 and PRV-20 Provider advertising and commission', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-19, PRV-20' });
    testInfo.annotations.push({ type: 'design-source', description: 'PRV-19 docs/design_sources/final_screens/provider/PRV-19.png; Figma node 6017:22088; PRV-20 docs/design_sources/final_screens/provider/PRV-20.png; Figma node 6028:10071; Drive folders 1KCTXCjiPpyefVI2qnLBwQB1pI87MuCw3 and 1FyRkPx1NM9yneEO-rbVV1hzunmUgjTmb' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
    await routeSession(page);
    await routeAdvertisingApi(page);
  });

  test('renders owned advertising requests with locale direction, safe projection, keyboard focus, and visual evidence', async ({ page }) => {
    const locale = localeForProject();
    const response = await page.goto(`/provider/ads?lang=${encodeURIComponent(locale)}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.locator('[data-screen-id="PRV-19"]')).toHaveAttribute('data-advertising-state', 'success');
    await expect(page.getByTestId('provider-advertising-row')).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Status|الحالة|状态/u })).toBeVisible();
    const action = page.getByRole('link', { name: /View details|عرض التفاصيل|查看详情/u }).first();
    await action.focus();
    await expect(action).toBeFocused();
    await expect(page.locator('body')).not.toContainText(new RegExp(PROVIDER_ID));
    await expect(page.locator('body')).not.toContainText(/storageKey|accessToken|refreshToken|bank verification/u);
    await waitForVisualStability(page);
    await expect(page).toHaveScreenshot(`provider-advertising-${locale}.png`, { fullPage: true });
  });

  test('renders read-only commission and exposes labeled protected content', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/provider/commission?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-20"]')).toHaveAttribute('data-commission-state', 'success');
    await expect(page.getByText('2.5%')).toBeVisible();
    await expect(page.getByText(/read-only|للعرض فقط|仅供查看/u)).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Provider dashboard|لوحة مزود العقار|房产提供方工作台/u })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/sourceRecordId|policyId|assignedTo|internalNotes|auditData/u);
    await expect(page).toHaveScreenshot(`provider-commission-${locale}.png`, { fullPage: true });
  });
});
