# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\tests\e2e\provider-advertising.spec.ts >> PRV-19 advertising requests match the responsive source and keep creation usable
- Location: apps\web\tests\e2e\provider-advertising.spec.ts:79:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/provider/ads?lang=ar", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  4   | const REQUEST_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  5   | const QUOTE_ID = 'cccccccccccccccccccccccc';
  6   | 
  7   | function localeForProject(): 'ar' | 'en' {
  8   |   const projectName = test.info().project.name;
  9   |   if (projectName.endsWith('-en')) return 'en';
  10  |   return 'ar';
  11  | }
  12  | 
  13  | async function waitForVisualStability(page: import('@playwright/test').Page): Promise<void> {
  14  |   await page.evaluate(async () => {
  15  |     await Promise.all(['400 15px Cairo', '600 15px Cairo', '700 15px Cairo', '800 15px Cairo'].map(font => document.fonts.load(font)));
  16  |     await document.fonts.ready;
  17  |     await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  18  |   });
  19  |   await page.waitForTimeout(100);
  20  | }
  21  | 
  22  | function envelope(data: unknown, requestId: string, meta: Record<string, unknown> = {}): string {
  23  |   return JSON.stringify({ data, meta: { requestId, ...meta } });
  24  | }
  25  | 
  26  | function advertisingRequest(status: 'quote_sent' | 'waiting_payment' = 'quote_sent') {
  27  |   return {
  28  |     id: REQUEST_ID,
  29  |     placementKey: 'homepage.hero',
  30  |     purpose: 'Promote an approved property campaign.',
  31  |     intervalStart: '2026-09-01T08:00:00.000Z',
  32  |     intervalEnd: '2026-09-30T08:00:00.000Z',
  33  |     status,
  34  |     version: 1,
  35  |     createdAt: '2026-08-18T08:00:00.000Z',
  36  |     updatedAt: '2026-08-18T09:00:00.000Z',
  37  |     history: [{ status, version: 1, changedAt: '2026-08-18T09:00:00.000Z' }],
  38  |     quote: {
  39  |       id: QUOTE_ID,
  40  |       requestId: REQUEST_ID,
  41  |       currency: 'EGP',
  42  |       lineItems: [{ description: 'Homepage hero placement', quantity: 1, unitAmountMinor: 250000 }],
  43  |       totalMinor: 250000,
  44  |       validUntil: '2026-08-28T08:00:00.000Z',
  45  |       terms: 'Administrative quote terms.',
  46  |       status: status === 'waiting_payment' ? 'accepted' : 'issued',
  47  |       version: 2,
  48  |       decisionHistory: [{ action: 'issued', version: 0, createdAt: '2026-08-18T09:00:00.000Z' }]
  49  |     },
  50  |     paymentProofs: [],
  51  |     schedule: undefined
  52  |   };
  53  | }
  54  | 
  55  | async function routeSession(page: import('@playwright/test').Page): Promise<void> {
  56  |   await page.route('**/api/v1/auth/refresh', async route => {
  57  |     await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'provider.advertising.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, 'provider-advertising-refresh') });
  58  |   });
  59  | }
  60  | 
  61  | async function routeAdvertisingApi(page: import('@playwright/test').Page): Promise<void> {
  62  |   await page.route('**/api/v1/provider/ads**', async route => {
  63  |     expect(route.request().headers().authorization).toBe('Bearer provider.advertising.token');
  64  |     const url = new URL(route.request().url());
  65  |     const detail = url.pathname.endsWith(`/${REQUEST_ID}`);
  66  |     const empty = !detail && url.searchParams.get('status') === 'rejected';
  67  |     await route.fulfill({
  68  |       status: 200,
  69  |       contentType: 'application/json',
  70  |       body: envelope(detail ? advertisingRequest() : { items: empty ? [] : [advertisingRequest()], page: 1, limit: 5, total: empty ? 0 : 1 }, detail ? 'provider-advertising-detail' : 'provider-advertising-list', detail ? {} : { page: 1, limit: 5, total: empty ? 0 : 1 })
  71  |     });
  72  |   });
  73  |   await page.route('**/api/v1/provider/commission', async route => {
  74  |     expect(route.request().headers().authorization).toBe('Bearer provider.advertising.token');
  75  |     await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accountId: PROVIDER_ID, source: 'policy', effectiveAt: '2026-08-19T08:00:00.000Z', policyVersion: 3, kind: 'percentage', percentageBps: 250, readOnly: true }, 'provider-commission') });
  76  |   });
  77  | }
  78  | 
  79  | test('PRV-19 advertising requests match the responsive source and keep creation usable', async ({ page }, testInfo) => {
  80  |   const locale = localeForProject();
  81  |   if (testInfo.project.name.startsWith('tablet-')) await page.setViewportSize({ width: 1024, height: 760 });
  82  |   if (testInfo.project.name.startsWith('mobile-')) await page.setViewportSize({ width: 402, height: 1062 });
  83  |   testInfo.annotations.push({ type: 'design-source', description: 'Figma tablet node 6017:121347 (1024x760); mobile node 6017:119686 (402x1062)' });
  84  |   await routeSession(page);
  85  |   await routeAdvertisingApi(page);
> 86  |   await page.goto(`/provider/ads?lang=${encodeURIComponent(locale)}`);
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  87  |   const screen = page.locator('[data-screen-id="PRV-19"]');
  88  |   await expect(screen).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  89  |   await expect(screen).toHaveAttribute('data-advertising-state', 'success');
  90  |   const row = page.getByTestId('provider-advertising-row');
  91  |   await expect(row).toBeVisible();
  92  |   const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  93  |   expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
  94  |   const rowBounds = await row.boundingBox();
  95  |   if (dimensions.width <= 1100) {
  96  |     expect(rowBounds?.x).toBeGreaterThanOrEqual(0);
  97  |     expect((rowBounds?.x ?? 0) + (rowBounds?.width ?? 0)).toBeLessThanOrEqual(dimensions.width + 1);
  98  |   }
  99  |   await page.locator('#provider-advertising-status').selectOption('rejected');
  100 |   await page.locator('.provider-advertising__filter-actions button').first().click();
  101 |   await expect(page.getByTestId('provider-advertising-row')).toHaveCount(0);
  102 |   await expect(screen).toHaveAttribute('data-advertising-state', 'empty');
  103 |   await page.locator('.provider-advertising__filter-actions button').nth(1).click();
  104 |   await expect(page.getByTestId('provider-advertising-row')).toBeVisible();
  105 |   await expect(screen).toHaveAttribute('data-advertising-state', 'success');
  106 |   await page.locator('.provider-advertising__heading > .ui-button').click();
  107 |   const dialog = page.getByRole('dialog');
  108 |   await expect(dialog).toBeVisible();
  109 |   const dialogBounds = await dialog.boundingBox();
  110 |   expect(dialogBounds?.x).toBeGreaterThanOrEqual(0);
  111 |   expect((dialogBounds?.x ?? 0) + (dialogBounds?.width ?? 0)).toBeLessThanOrEqual(dimensions.width + 1);
  112 |   expect(dialogBounds?.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  113 |   await dialog.getByRole('button', { name: /Submit request|إرسال الطلب/u }).click();
  114 |   await expect(dialog.getByRole('alert')).toBeVisible();
  115 | });
  116 | 
  117 | test.describe('PRV-19 and PRV-20 Provider advertising and commission', () => {
  118 |   test.beforeEach(async ({ page }, testInfo) => {
  119 |     testInfo.annotations.push({ type: 'screen-id', description: 'PRV-19, PRV-20' });
  120 |     testInfo.annotations.push({ type: 'design-source', description: 'PRV-19 docs/design_sources/final_screens/provider/PRV-19.png; Figma node 6017:22088; PRV-20 docs/design_sources/final_screens/provider/PRV-20.png; Figma node 6028:10071; Drive folders 1KCTXCjiPpyefVI2qnLBwQB1pI87MuCw3 and 1FyRkPx1NM9yneEO-rbVV1hzunmUgjTmb' });
  121 |     test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
  122 |     await routeSession(page);
  123 |     await routeAdvertisingApi(page);
  124 |   });
  125 | 
  126 |   test('renders owned advertising requests with locale direction, safe projection, keyboard focus, and visual evidence', async ({ page }) => {
  127 |     const locale = localeForProject();
  128 |     const response = await page.goto(`/provider/ads?lang=${encodeURIComponent(locale)}`);
  129 |     expect(response?.ok()).toBeTruthy();
  130 |     await expect(page.locator('html')).toHaveAttribute('lang', locale);
  131 |     await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  132 |     await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
  133 |     await expect(page.locator('[data-screen-id="PRV-19"]')).toHaveAttribute('data-advertising-state', 'success');
  134 |     await expect(page.getByTestId('provider-advertising-row')).toBeVisible();
  135 |     await expect(page.getByRole('combobox', { name: /Status|الحالة|状态/u })).toBeVisible();
  136 |     const action = page.getByRole('link', { name: /View details|عرض التفاصيل|查看详情/u }).first();
  137 |     await action.focus();
  138 |     await expect(action).toBeFocused();
  139 |     await expect(page.locator('body')).not.toContainText(new RegExp(PROVIDER_ID));
  140 |     await expect(page.locator('body')).not.toContainText(/storageKey|accessToken|refreshToken|bank verification/u);
  141 |     await waitForVisualStability(page);
  142 |     await expect(page).toHaveScreenshot(`provider-advertising-${locale}.png`, { fullPage: true });
  143 |   });
  144 | 
  145 |   test('renders read-only commission and exposes labeled protected content', async ({ page }) => {
  146 |     const locale = localeForProject();
  147 |     await page.goto(`/provider/commission?lang=${encodeURIComponent(locale)}`);
  148 |     await expect(page.locator('[data-screen-id="PRV-20"]')).toHaveAttribute('data-commission-state', 'success');
  149 |     await expect(page.getByText('2.5%')).toBeVisible();
  150 |     await expect(page.getByText(/read-only|للعرض فقط|仅供查看/u)).toBeVisible();
  151 |     await expect(page.locator('main#main-content')).toBeVisible();
  152 |     await expect(page.getByRole('navigation', { name: /Provider dashboard|لوحة مزود العقار|房产提供方工作台/u })).toBeVisible();
  153 |     await expect(page.locator('body')).not.toContainText(/sourceRecordId|policyId|assignedTo|internalNotes|auditData/u);
  154 |     await expect(page).toHaveScreenshot(`provider-commission-${locale}.png`, { fullPage: true });
  155 |   });
  156 | });
  157 | 
```