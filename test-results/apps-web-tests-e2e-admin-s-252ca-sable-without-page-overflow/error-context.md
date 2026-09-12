# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\tests\e2e\admin-sidebar-responsive.spec.ts >> Admin sidebar responsive shell >> keeps the detailed navigation usable without page overflow
- Location: apps\web\tests\e2e\admin-sidebar-responsive.spec.ts:50:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/admin?lang=ar", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | function localeForProject(): 'ar' | 'en' {
  4   |   return test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  5   | }
  6   | 
  7   | async function openCompactSidebar(page: Page) {
  8   |   if ((page.viewportSize()?.width ?? 0) <= 1100) {
  9   |     const toggle = page.getByTestId('admin-sidebar-toggle');
  10  |     await expect(toggle).toBeVisible();
  11  |     await toggle.click();
  12  |     await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  13  |   }
  14  | }
  15  | 
  16  | test.describe('Admin sidebar responsive shell', () => {
  17  |   test.beforeEach(async ({ page }) => {
  18  |     await page.route('**/api/v1/auth/refresh', async route => {
  19  |       await route.fulfill({
  20  |         status: 200,
  21  |         contentType: 'application/json',
  22  |         body: JSON.stringify({
  23  |           data: {
  24  |             accessToken: 'admin.sidebar.responsive',
  25  |             tokenType: 'Bearer',
  26  |             expiresInSeconds: 900,
  27  |             user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'admin', status: 'verified' }
  28  |           },
  29  |           meta: { requestId: 'admin-sidebar-responsive-refresh' }
  30  |         })
  31  |       });
  32  |     });
  33  |     await page.route('**/api/v1/admin/overview**', async route => {
  34  |       const url = new URL(route.request().url());
  35  |       await route.fulfill({
  36  |         status: 200,
  37  |         contentType: 'application/json',
  38  |         body: JSON.stringify({
  39  |           data: {
  40  |             range: { from: url.searchParams.get('from'), to: url.searchParams.get('to') },
  41  |             metrics: { users: 1, seekers: 1, providers: 1, verifiedProviders: 1, publishedProperties: 1, openRequests: 1, pendingReviews: 1 },
  42  |             generatedAt: '2026-08-19T09:00:00.000Z'
  43  |           },
  44  |           meta: { requestId: 'admin-sidebar-responsive-data' }
  45  |         })
  46  |       });
  47  |     });
  48  |   });
  49  | 
  50  |   test('keeps the detailed navigation usable without page overflow', async ({ page }) => {
  51  |     const locale = localeForProject();
> 52  |     await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  53  |     await openCompactSidebar(page);
  54  |     await expect(page.getByTestId('admin-sidebar')).toBeVisible();
  55  |     await expect(page.getByTestId('admin-sidebar').locator('a')).toHaveCount(53);
  56  |     await expect(page.getByTestId('admin-sidebar').locator('.admin-dashboard__navigation-scroll')).toBeVisible();
  57  |     const dimensions = await page.evaluate(() => ({
  58  |       viewport: window.innerWidth,
  59  |       documentWidth: document.documentElement.scrollWidth,
  60  |       bodyWidth: document.body.scrollWidth
  61  |     }));
  62  |     expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport);
  63  |     expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewport);
  64  |     await page.screenshot({ path: test.info().outputPath('admin-overview.png') });
  65  |   });
  66  | 
  67  |   test('keeps the admin logout action visible and functional', async ({ page }) => {
  68  |     const locale = localeForProject();
  69  |     await page.route('**/api/v1/auth/logout', async route => {
  70  |       await route.fulfill({
  71  |         status: 200,
  72  |         contentType: 'application/json',
  73  |         body: JSON.stringify({ data: { loggedOut: true }, meta: { requestId: 'admin-sidebar-logout' } })
  74  |       });
  75  |     });
  76  |     await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);
  77  |     await openCompactSidebar(page);
  78  |     const logout = page.locator('[data-testid="admin-logout-button"]:visible');
  79  |     await expect(logout).toHaveCount(1);
  80  |     await expect(logout).toBeEnabled();
  81  |     if ((page.viewportSize()?.width ?? 0) > 1100) {
  82  |       const box = await logout.boundingBox();
  83  |       expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  84  |     }
  85  |     await logout.click();
  86  |     await expect(page).toHaveURL(new RegExp(`/auth/login\\?lang=${locale}$`, 'u'));
  87  |   });
  88  | 
  89  |   test('collapses each category independently and restores the active route on reload', async ({ page }) => {
  90  |     await page.goto(`/admin?lang=${localeForProject()}`);
  91  |     await openCompactSidebar(page);
  92  |     const sidebar = page.getByTestId('admin-sidebar');
  93  |     const toggles = sidebar.locator('button[aria-controls]');
  94  |     await expect(toggles).toHaveCount(8);
  95  |     for (const toggle of await toggles.all()) {
  96  |       const id = await toggle.getAttribute('aria-controls');
  97  |       if (id === 'admin-navigation-home') {
  98  |         await toggle.press('Enter');
  99  |         await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  100 |         continue;
  101 |       }
  102 |       await toggle.press('Enter');
  103 |       await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  104 |       await expect(page.locator(`#${id}`)).toBeHidden();
  105 |       await toggle.press('Enter');
  106 |       await expect(page.locator(`#${id}`)).toBeVisible();
  107 |     }
  108 |     await sidebar.locator('[aria-controls="admin-navigation-content"]').click();
  109 |     await sidebar.locator('[aria-controls="admin-navigation-home"]').click();
  110 |     await page.reload();
  111 |     await openCompactSidebar(page);
  112 |     await expect(page.locator('#admin-navigation-content')).toBeHidden();
  113 |     await expect(sidebar.locator('a[aria-current="page"]')).toBeVisible();
  114 |   });
  115 | 
  116 |   test('keeps navigation pinned during page scroll and card spacing bounded', async ({ page }) => {
  117 |     await page.goto(`/admin?lang=${localeForProject()}`);
  118 |     const sidebar = page.getByTestId('admin-sidebar');
  119 |     await expect(page.locator('.admin-dashboard__metric').first()).toBeVisible();
  120 |     await page.evaluate(() => window.scrollTo(0, 650));
  121 |     if ((page.viewportSize()?.width ?? 0) <= 1100) await openCompactSidebar(page);
  122 |     await expect.poll(async () => Math.round((await sidebar.boundingBox())?.y ?? -1)).toBe(64);
  123 |     if ((page.viewportSize()?.width ?? 0) > 1100) {
  124 |       const box = await sidebar.boundingBox();
  125 |       expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  126 |       const gap = await page.locator('.admin-dashboard__metric-grid').first().evaluate(element => getComputedStyle(element).gap);
  127 |       expect(gap).toBe('12px');
  128 |     }
  129 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  130 |   });
  131 | 
  132 |   test('uses a rounded focus ring for native selects on touch screens', async ({ page }) => {
  133 |     test.skip((page.viewportSize()?.width ?? 0) > 1100, 'Touch focus regression applies to compact layouts.');
  134 |     await page.goto(`/admin?lang=${localeForProject()}`);
  135 |     await page.locator('main').evaluate(main => {
  136 |       const select = document.createElement('select');
  137 |       select.id = 'touch-focus-regression-select';
  138 |       select.setAttribute('aria-label', 'Touch focus regression');
  139 |       select.innerHTML = '<option>One</option><option>Two</option>';
  140 |       main.prepend(select);
  141 |     });
  142 |     const select = page.locator('#touch-focus-regression-select');
  143 |     await select.focus();
  144 |     const style = await select.evaluate(element => {
  145 |       const computed = getComputedStyle(element);
  146 |       return {
  147 |         outlineStyle: computed.outlineStyle,
  148 |         boxShadow: computed.boxShadow,
  149 |         borderRadius: computed.borderRadius,
  150 |         tapHighlight: computed.getPropertyValue('-webkit-tap-highlight-color')
  151 |       };
  152 |     });
```