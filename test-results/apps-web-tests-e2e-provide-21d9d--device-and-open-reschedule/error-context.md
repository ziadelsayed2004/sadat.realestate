# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\tests\e2e\provider-viewings.spec.ts >> PRV-18 enriched appointments fit every device and open reschedule
- Location: apps\web\tests\e2e\provider-viewings.spec.ts:4:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/provider/viewings?lang=ar", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { getProviderViewingsCopy } from '../../src/features/provider/viewings-copy.ts';
  3   | 
  4   | test('PRV-18 enriched appointments fit every device and open reschedule', async ({ page }, testInfo) => {
  5   |   const locale = localeForViewings();
  6   |   const copy = getProviderViewingsCopy(locale);
  7   |   if (testInfo.project.name.startsWith('tablet-')) await page.setViewportSize({ width: 1024, height: 944 });
  8   |   if (testInfo.project.name.startsWith('mobile-')) await page.setViewportSize({ width: 402, height: 1042 });
  9   |   testInfo.annotations.push({ type: 'design-source', description: 'Figma tablet node 6017:121591 (1024x944); mobile node 6017:119785 (402x1042)' });
  10  |   const property = { id: PROPERTY_ID, slug: 'viewing-apartment', kind: 'property', transactionType: 'sale', name: { ar: 'شقة واسعة في الحي الأول بالقرب من الخدمات', en: 'Spacious first district apartment near local services' }, locationName: { ar: 'الحي الأول، مدينة السادات', en: 'First district, Sadat City' } };
  11  |   await routeSession(page);
  12  |   await page.route('**/api/v1/provider/viewings**', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ ...viewingFixture(), property, customerName: 'Local Customer' }], page: 1, limit: 5, total: 1 }, 'responsive-viewings') }));
> 13  |   await page.goto(`/provider/viewings?lang=${locale}`);
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  14  |   await expect(page.locator('[data-screen-id="PRV-18"]')).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  15  |   const card = page.getByTestId('provider-viewing-row');
  16  |   await expect(card.getByText(property.name[locale])).toBeVisible();
  17  |   await expect(card.getByText(property.locationName[locale])).toBeVisible();
  18  |   await expect(card.getByText('Local Customer', { exact: true })).toBeVisible();
  19  |   await expect(card.locator('.provider-viewings__clock')).toBeVisible();
  20  |   await expect(card.locator('.provider-viewings__clock')).toHaveAttribute('title', 'Africa/Cairo');
  21  |   await expect(card.locator('.provider-viewings__clock')).toHaveAttribute('datetime', viewingFixture().requestedAt);
  22  |   await expect(page.getByRole('combobox', { name: copy.statusLabel })).not.toBeVisible();
  23  |   await page.locator('.provider-viewings__filter-disclosure summary').click();
  24  |   await expect(page.getByRole('combobox', { name: copy.statusLabel })).toBeVisible();
  25  |   await page.locator('.provider-viewings__filter-disclosure summary').click();
  26  |   const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  27  |   expect(await fits()).toBeTruthy();
  28  |   const box = await card.boundingBox();
  29  |   expect(box).not.toBeNull();
  30  |   expect(box!.x).toBeGreaterThanOrEqual(0);
  31  |   expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  32  |   if (page.viewportSize()!.width <= 620) {
  33  |     const bottomNavigation = await page.locator('.provider-dashboard__navigation').boundingBox();
  34  |     expect(bottomNavigation?.height).toBeLessThanOrEqual(64);
  35  |     await page.locator('.provider-dashboard__menu-button').click();
  36  |     await expect(page.locator('.provider-dashboard__navigation')).toHaveAttribute('data-mobile-open', 'true');
  37  |     await page.locator('.provider-dashboard__navigation-backdrop').click({ position: { x: 2, y: 2 } });
  38  |     await expect(page.locator('.provider-dashboard__navigation')).not.toHaveAttribute('data-mobile-open', 'true');
  39  |     for (const button of await card.getByRole('button').all()) {
  40  |       const bounds = await button.boundingBox();
  41  |       expect(bounds?.height).toBeGreaterThanOrEqual(44);
  42  |     }
  43  |   }
  44  |   await page.screenshot({ path: testInfo.outputPath('appointments.png'), fullPage: true });
  45  |   await card.getByRole('button', { name: `${copy.actions.reschedule}: ${property.name[locale]}`, exact: true }).click();
  46  |   await expect(page.getByRole('dialog')).toBeVisible();
  47  |   await expect(page.getByLabel(copy.dialog.date, { exact: true })).toBeVisible();
  48  |   expect(await fits()).toBeTruthy();
  49  |   const dialogBounds = await page.getByRole('dialog').boundingBox();
  50  |   expect(dialogBounds?.x).toBeGreaterThanOrEqual(0);
  51  |   expect((dialogBounds?.x ?? 0) + (dialogBounds?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  52  |   expect(dialogBounds?.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  53  |   await page.screenshot({ path: testInfo.outputPath('reschedule.png'), fullPage: true });
  54  | });
  55  | 
  56  | const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  57  | const PROPERTY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  58  | const SEEKER_ID = 'cccccccccccccccccccccccc';
  59  | const VIEWING_ID = 'dddddddddddddddddddddddd';
  60  | 
  61  | function localeForViewings(): 'ar' | 'en' {
  62  |   const project = test.info().project.name;
  63  |   if (project.endsWith('-en')) return 'en';
  64  |   return 'ar';
  65  | }
  66  | 
  67  | function envelope(data: unknown, requestId: string, meta: Record<string, unknown> = {}): string {
  68  |   return JSON.stringify({ data, meta: { requestId, ...meta } });
  69  | }
  70  | 
  71  | function viewingFixture(status = 'requested', version = 2) {
  72  |   return {
  73  |     id: VIEWING_ID,
  74  |     propertyId: PROPERTY_ID,
  75  |     seekerId: SEEKER_ID,
  76  |     providerId: PROVIDER_ID,
  77  |     status,
  78  |     requestedAt: '2026-08-28T10:00:00.000Z',
  79  |     timezone: 'Africa/Cairo',
  80  |     note: 'Customer requested a morning appointment.',
  81  |     version,
  82  |     createdAt: '2026-08-18T08:00:00.000Z',
  83  |     updatedAt: '2026-08-18T09:00:00.000Z'
  84  |   };
  85  | }
  86  | 
  87  | async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  88  |   await page.route('**/api/v1/auth/refresh', async route => {
  89  |     if (!allowed) {
  90  |       await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'viewings-auth-denied' } }) });
  91  |       return;
  92  |     }
  93  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'provider.viewings.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, meta: { requestId: 'viewings-refresh' } }) });
  94  |   });
  95  | }
  96  | 
  97  | async function routeViewings(page: import('@playwright/test').Page): Promise<void> {
  98  |   await page.route('**/api/v1/provider/viewings**', async route => {
  99  |     expect(route.request().headers().authorization).toBe('Bearer provider.viewings.token');
  100 |     const url = new URL(route.request().url());
  101 |     if (route.request().method() === 'GET') {
  102 |       const status = url.searchParams.get('status') ?? 'requested';
  103 |       await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [viewingFixture(status)], page: 1, limit: 5, total: 1 }, 'viewings-list', { page: 1, limit: 5, total: 1 }) });
  104 |       return;
  105 |     }
  106 |     expect(url.pathname).toBe(`/api/v1/provider/viewings/${VIEWING_ID}/transitions`);
  107 |     const body = route.request().postDataJSON() as Record<string, unknown>;
  108 |     expect(body.expectedVersion).toBe(2);
  109 |     if (body.action === 'cancel') expect(body.reason).toEqual(expect.any(String));
  110 |     if (body.action === 'reschedule') {
  111 |       expect(body.requestedAt).toEqual(expect.any(String));
  112 |       expect(body.timezone).toBe('Africa/Cairo');
  113 |     }
```