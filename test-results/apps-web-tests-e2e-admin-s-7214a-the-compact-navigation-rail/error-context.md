# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\tests\e2e\admin-sidebar-responsive.spec.ts >> Admin sidebar responsive shell >> brings the active route into view in the compact navigation rail
- Location: apps\web\tests\e2e\admin-sidebar-responsive.spec.ts:159:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/admin/settings/seo?lang=ar", waiting until "load"

```

# Test source

```ts
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
  153 |     expect(style.outlineStyle).toBe('none');
  154 |     expect(style.boxShadow).not.toBe('none');
  155 |     expect(style.borderRadius).not.toBe('0px');
  156 |     expect(style.tapHighlight).toBe('rgba(0, 0, 0, 0)');
  157 |   });
  158 | 
  159 |   test('brings the active route into view in the compact navigation rail', async ({ page }) => {
  160 |     const locale = localeForProject();
> 161 |     await page.goto(`/admin/settings/seo?lang=${locale}`);
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  162 |     await openCompactSidebar(page);
  163 |     const sidebar = page.getByTestId('admin-sidebar');
  164 |     const scroll = sidebar.locator('.admin-dashboard__navigation-scroll');
  165 |     const active = sidebar.locator('a[aria-current="page"]');
  166 |     await expect(active).toHaveCount(1);
  167 |     await expect.poll(async () => active.evaluate(element => {
  168 |       const item = element.getBoundingClientRect();
  169 |       const container = element.closest('.admin-dashboard__navigation-scroll')!.getBoundingClientRect();
  170 |       const tolerance = 1;
  171 |       return item.left >= container.left - tolerance && item.right <= container.right + tolerance && item.top >= container.top - tolerance && item.bottom <= container.bottom + tolerance;
  172 |     })).toBe(true);
  173 |     if ((page.viewportSize()?.width ?? 0) <= 1100) {
  174 |       await expect(scroll).toBeVisible();
  175 |     }
  176 |   });
  177 | 
  178 |   test('opens from the logical edge with a bounded toggle and animated backdrop', async ({ page }) => {
  179 |     test.skip((page.viewportSize()?.width ?? 0) > 1100, 'Drawer behavior applies to tablet and mobile widths.');
  180 |     const locale = localeForProject();
  181 |     await page.goto(`/admin?lang=${locale}`);
  182 |     const viewport = page.viewportSize()!;
  183 |     const toggle = page.getByTestId('admin-sidebar-toggle');
  184 |     const sidebar = page.getByTestId('admin-sidebar');
  185 |     const backdrop = page.getByTestId('admin-sidebar-backdrop');
  186 |     const toggleBox = await toggle.boundingBox();
  187 |     expect(toggleBox).not.toBeNull();
  188 |     expect(toggleBox!.x).toBeGreaterThanOrEqual(0);
  189 |     expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(viewport.width);
  190 |     await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  191 |     await expect(sidebar).toBeHidden();
  192 |     await toggle.click();
  193 |     await expect(sidebar).toBeVisible();
  194 |     await expect(backdrop).toBeVisible();
  195 |     await expect.poll(async () => sidebar.evaluate(element => {
  196 |       const box = element.getBoundingClientRect();
  197 |       const shell = element.closest('.route-shell')!;
  198 |       return shell.getAttribute('dir') === 'rtl' ? Math.round(innerWidth - box.right) : Math.round(box.left);
  199 |     })).toBe(0);
  200 |     const geometry = await sidebar.evaluate(element => {
  201 |       const box = element.getBoundingClientRect();
  202 |       const styles = getComputedStyle(element);
  203 |       return { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), transitionProperty: styles.transitionProperty };
  204 |     });
  205 |     expect(geometry.top).toBe(64);
  206 |     expect(geometry.transitionProperty).toContain('transform');
  207 |     expect(locale === 'ar' ? geometry.right : geometry.left).toBe(locale === 'ar' ? viewport.width : 0);
  208 |     await backdrop.click({ position: { x: locale === 'ar' ? 2 : viewport.width - 2, y: 2 } });
  209 |     await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  210 |     await expect(sidebar).toBeHidden();
  211 |     await toggle.click();
  212 |     await page.keyboard.press('Escape');
  213 |     await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  214 |     expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  215 |   });
  216 | });
  217 | 
```