# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\tests\e2e\provider-customer-requests.spec.ts >> PRV-16 responsive layout keeps filters and request actions usable
- Location: apps\web\tests\e2e\provider-customer-requests.spec.ts:64:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/provider/customer-requests?lang=ar", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  4   | const REQUEST_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  5   | 
  6   | function localeForRequests(): 'ar' | 'en' {
  7   |   const project = test.info().project.name;
  8   |   if (project.endsWith('-en')) return 'en';
  9   |   return 'ar';
  10  | }
  11  | 
  12  | function envelope(data: unknown, requestId: string, meta: Record<string, unknown> = {}): string {
  13  |   return JSON.stringify({ data, meta: { requestId, ...meta } });
  14  | }
  15  | 
  16  | function requestFixture(status = 'new', availableActions: string[] = ['contact', 'cancel']) {
  17  |   return {
  18  |     id: REQUEST_ID,
  19  |     type: 'provider_customer',
  20  |     source: 'provider',
  21  |     providerId: PROVIDER_ID,
  22  |     payload: { firstName: 'Mona', lastName: 'Hassan', phone: '01012345678', email: 'mona@example.com', message: 'Interested in a property' },
  23  |     status,
  24  |     version: status === 'contacted' ? 3 : 2,
  25  |     availableActions,
  26  |     createdAt: '2026-08-18T08:00:00.000Z',
  27  |     updatedAt: '2026-08-18T09:00:00.000Z'
  28  |   };
  29  | }
  30  | 
  31  | async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  32  |   await page.route('**/api/v1/auth/refresh', async route => {
  33  |     if (!allowed) {
  34  |       await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'customer-requests-auth-denied' } }) });
  35  |       return;
  36  |     }
  37  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'provider.customer.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, meta: { requestId: 'customer-requests-refresh' } }) });
  38  |   });
  39  | }
  40  | 
  41  | async function routeRequests(page: import('@playwright/test').Page): Promise<void> {
  42  |   await page.route('**/api/v1/provider/customer-requests**', async route => {
  43  |     expect(route.request().headers().authorization).toBe('Bearer provider.customer.token');
  44  |     const url = new URL(route.request().url());
  45  |     if (route.request().method() === 'GET') {
  46  |       expect(url.searchParams.get('source')).toBe('provider');
  47  |       expect(url.searchParams.get('type')).toBe('provider_customer');
  48  |       const filtered = url.searchParams.get('status') === 'contacted';
  49  |       await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [requestFixture(filtered ? 'contacted' : 'new', filtered ? ['schedule'] : ['contact', 'cancel'])], page: 1, limit: 5, total: 1 }, 'customer-requests-list', { page: 1, limit: 5, total: 1 }) });
  50  |       return;
  51  |     }
  52  |     const body = route.request().postDataJSON() as Record<string, unknown> | null;
  53  |     if (url.pathname.endsWith('/transitions')) {
  54  |       expect(body).toMatchObject({ transition: 'contact', expectedVersion: 2 });
  55  |       await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(requestFixture('contacted', ['schedule']), 'customer-requests-transition') });
  56  |       return;
  57  |     }
  58  |     expect(route.request().method()).toBe('POST');
  59  |     expect(body).toMatchObject({ firstName: 'New', lastName: 'Customer', phone: '01198765432' });
  60  |     await route.fulfill({ status: 201, contentType: 'application/json', body: envelope(requestFixture(), 'customer-requests-create') });
  61  |   });
  62  | }
  63  | 
  64  | test('PRV-16 responsive layout keeps filters and request actions usable', async ({ page }, testInfo) => {
  65  |   const locale = localeForRequests();
  66  |   if (testInfo.project.name.startsWith('tablet-')) await page.setViewportSize({ width: 1024, height: 936 });
  67  |   if (testInfo.project.name.startsWith('mobile-')) await page.setViewportSize({ width: 402, height: 1282 });
  68  |   testInfo.annotations.push({ type: 'design-source', description: 'Figma tablet node 6017:120752 (1024x936); mobile node 6017:119345 (402x1282)' });
  69  |   await routeSession(page);
  70  |   await routeRequests(page);
> 71  |   await page.goto(`/provider/customer-requests?lang=${locale}`);
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  72  |   const screen = page.locator('[data-screen-id="PRV-16"]');
  73  |   await expect(screen).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  74  |   await expect(page.getByTestId(`provider-customer-request-${REQUEST_ID}`)).toBeVisible();
  75  |   const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  76  |   const viewingsLink = page.locator(`.provider-customer-requests__heading-actions a[href="/provider/viewings?lang=${locale}"]`);
  77  |   await expect(viewingsLink).toBeVisible();
  78  |   await expect(viewingsLink).toHaveCSS('border-radius', '18px');
  79  |   await expect(viewingsLink).toHaveCSS('border-top-color', 'rgb(23, 35, 61)');
  80  |   await expect(viewingsLink).toHaveCSS('text-decoration-line', 'none');
  81  |   await expect(viewingsLink.locator('img')).toHaveJSProperty('naturalWidth', 15);
  82  |   expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
  83  |   if (dimensions.width <= 600) {
  84  |     await expect(page.locator('.provider-dashboard__brand')).toBeHidden();
  85  |     const navigation = await page.locator('.provider-dashboard__navigation').boundingBox();
  86  |     expect(navigation?.height).toBeLessThan(100);
  87  |     const active = page.locator('.provider-dashboard__navigation [aria-current="page"]');
  88  |     const activeBounds = await active.boundingBox();
  89  |     expect(activeBounds?.x).toBeGreaterThanOrEqual(0);
  90  |     expect((activeBounds?.x ?? 0) + (activeBounds?.width ?? 0)).toBeLessThanOrEqual(dimensions.width);
  91  |     await page.locator('.provider-dashboard__menu-button').click();
  92  |     await expect(page.locator('.provider-dashboard__navigation')).toHaveAttribute('data-mobile-open', 'true');
  93  |     const logout = page.locator('.provider-dashboard__mobile-logout button');
  94  |     await expect(logout).toBeVisible();
  95  |     await logout.focus();
  96  |     await expect(logout).toBeFocused();
  97  |     const logoutBounds = await logout.boundingBox();
  98  |     expect(logoutBounds?.width).toBeGreaterThanOrEqual(44);
  99  |     expect(logoutBounds?.x).toBeGreaterThanOrEqual(0);
  100 |     expect((logoutBounds?.x ?? 0) + (logoutBounds?.width ?? 0)).toBeLessThanOrEqual(dimensions.width);
  101 |     await page.locator('.provider-dashboard__menu-button').click();
  102 |   }
  103 |   const filters = page.locator('.provider-customer-requests__filters');
  104 |   await expect(filters).toBeVisible();
  105 |   await page.locator('#provider-customer-requests-status').selectOption('contacted');
  106 |   await filters.locator('button[type="submit"]').click();
  107 |   await expect(page.getByTestId(`provider-customer-request-${REQUEST_ID}`)).toHaveAttribute('data-request-status', 'contacted');
  108 |   const region = page.locator('.provider-customer-requests__table-wrap');
  109 |   await region.focus();
  110 |   await expect(region).toBeFocused();
  111 |   const record = await page.getByTestId(`provider-customer-request-${REQUEST_ID}`).evaluate(element => {
  112 |     const rect = element.getBoundingClientRect();
  113 |     return { left: rect.left, right: rect.right, display: getComputedStyle(element).display };
  114 |   });
  115 |   expect(record.left).toBeGreaterThanOrEqual(-0.5);
  116 |   expect(record.right).toBeLessThanOrEqual(dimensions.width + 0.5);
  117 |   if (dimensions.width <= 600) expect(record.display).toBe('grid');
  118 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  119 |   await page.screenshot({ path: testInfo.outputPath(`responsive-${locale}.png`), fullPage: true });
  120 | });
  121 | 
  122 | test('PRV-17 request form stays inside the mapped tablet and mobile frames', async ({ page }, testInfo) => {
  123 |   test.skip(testInfo.project.name.startsWith('desktop-'), 'Responsive modal contract uses the mapped tablet and mobile frames.');
  124 |   const locale = localeForRequests();
  125 |   const viewport = testInfo.project.name.startsWith('tablet-') ? { width: 1024, height: 936 } : { width: 402, height: 1282 };
  126 |   await page.setViewportSize(viewport);
  127 |   await routeSession(page);
  128 |   await routeRequests(page);
  129 |   await page.goto(`/provider/customer-requests?lang=${locale}`);
  130 |   await page.getByRole('button', { name: /Add customer request|إضافة طلب يدوي|添加客户请求/u }).click();
  131 |   const modal = page.locator('[data-screen-id="PRV-17"] .provider-customer-requests__request-modal');
  132 |   await expect(modal).toBeVisible();
  133 |   await expect(page.locator('[data-screen-id="PRV-17"]')).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  134 |   const bounds = await modal.boundingBox();
  135 |   expect(bounds?.x).toBeGreaterThanOrEqual(0);
  136 |   expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
  137 |   expect(bounds?.y).toBeGreaterThanOrEqual(testInfo.project.name.startsWith('mobile-') ? 56 : 0);
  138 |   expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(testInfo.project.name.startsWith('mobile-') ? viewport.height - 64 : viewport.height);
  139 |   await expect(page.getByLabel(/First name|الاسم الأول|名字/u)).toBeVisible();
  140 |   await expect(page.getByLabel(/Phone number|رقم الهاتف|电话号码/u)).toBeVisible();
  141 |   await page.screenshot({ path: testInfo.outputPath(`prv-17-${locale}.png`), fullPage: true });
  142 |   await page.getByRole('button', { name: /Save request|حفظ الطلب|保存客户请求/u }).click();
  143 |   await expect(page.getByRole('alert')).toBeVisible();
  144 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  145 | });
  146 | 
  147 | test.describe('PRV-16/PRV-17 Provider Customer Requests', () => {
  148 |   test.beforeEach(async ({ page }, testInfo) => {
  149 |     testInfo.annotations.push({ type: 'screen-id', description: 'PRV-16, PRV-17' });
  150 |     testInfo.annotations.push({ type: 'design-source', description: 'PRV-16 docs/design_sources/final_screens/provider/PRV-16.png SHA-256 f40fc7db1a5944ef285eaa885d70ee3c2199bf170daf13a158776fc1827ec083; Figma node 6017:21368; PRV-17 docs/design_sources/final_screens/provider/PRV-17.png SHA-256 c5737bcda9c5771316253f8174c9ea6c372201ff29510a26e2547bfd87f70281; Figma node 6017:21747' });
  151 |     test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
  152 |     void page;
  153 |   });
  154 | 
  155 |   test('renders the owned request list, locale direction, safe projection, filters, and keyboard/visual evidence', async ({ page }) => {
  156 |     const locale = localeForRequests();
  157 |     await routeSession(page);
  158 |     await routeRequests(page);
  159 |     const response = await page.goto(`/provider/customer-requests?lang=${encodeURIComponent(locale)}`);
  160 |     expect(response?.ok()).toBeTruthy();
  161 |     await expect(page.locator('html')).toHaveAttribute('lang', locale);
  162 |     await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  163 |     await expect(page.locator('[data-screen-id="PRV-16"]')).toBeVisible();
  164 |     await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
  165 |     await expect(page.getByTestId(`provider-customer-request-${REQUEST_ID}`)).toBeVisible();
  166 |     await expect(page.getByTestId(`provider-customer-request-${REQUEST_ID}`).locator('.provider-customer-requests__identity strong')).toHaveText('Mona Hassan');
  167 |     await expect(page.getByRole('button', { name: /Mark contacted|تم التواصل|标记为已联系/u })).toBeEnabled();
  168 |     await expect(page.locator('body')).not.toContainText(new RegExp(PROVIDER_ID));
  169 |     await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|storageKey|accessToken|refreshToken/u);
  170 | 
  171 |     await page.locator('.a11y-skip-link').focus();
```