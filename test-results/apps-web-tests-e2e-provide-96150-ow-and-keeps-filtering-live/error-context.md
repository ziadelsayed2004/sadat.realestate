# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\tests\e2e\provider-projects.spec.ts >> PRV-15 responsive Figma contract >> renders usable project records without viewport overflow and keeps filtering live
- Location: apps\web\tests\e2e\provider-projects.spec.ts:157:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/provider/projects?lang=ar", waiting until "load"

```

# Test source

```ts
  61  |     if (path === '/api/v1/provider/projects') {
  62  |       expect(route.request().method()).toBe('POST');
  63  |       await route.fulfill({ status: 201, contentType: 'application/json', body: envelope(projectFixture(DRAFT_PROJECT_ID, 'draft', ['update', 'submit']), 'projects-create') });
  64  |       return;
  65  |     }
  66  |     expect(route.request().method()).toBe('PATCH');
  67  |     await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(projectFixture(DRAFT_PROJECT_ID, 'draft', ['update', 'submit']), 'projects-update') });
  68  |   });
  69  | }
  70  | 
  71  | test.describe('PRV-15 Provider Projects', () => {
  72  |   test.beforeEach(async ({ page }, testInfo) => {
  73  |     testInfo.annotations.push({ type: 'screen-id', description: 'PRV-15' });
  74  |     testInfo.annotations.push({ type: 'design-source', description: 'PRV-15 docs/design_sources/final_screens/provider/PRV-15.png SHA-256 1856d403d730c82c4793ebbb3ddf7dc4482ecc272b19327411a832c9dcf006ac; Figma node 6017:21162; Drive folder 1JM9TjIqqsFhXnObamIdFGepIPeLUf0ml' });
  75  |     test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
  76  |     void page;
  77  |   });
  78  | 
  79  |   test('renders owned projects, server actions, locale direction, filters, and visual keyboard evidence', async ({ page }) => {
  80  |     const locale = localeForProject();
  81  |     await routeSession(page);
  82  |     await routeProjects(page);
  83  |     const response = await page.goto(`/provider/projects?lang=${encodeURIComponent(locale)}`);
  84  |     expect(response?.ok()).toBeTruthy();
  85  |     await expect(page.locator('html')).toHaveAttribute('lang', locale);
  86  |     await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  87  |     await expect(page.locator('[data-screen-id="PRV-15"]')).toBeVisible();
  88  |     await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
  89  |     await expect(page.getByTestId('provider-projects-count')).toContainText(/2|٢|二/u);
  90  |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`)).toBeVisible();
  91  |     await expect(page.getByRole('button', { name: /Open navigation menu|فتح قائمة التنقل/u }).locator('.a11y-visually-hidden')).toBeHidden();
  92  |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`).locator('.provider-projects__identity strong')).not.toHaveText('');
  93  |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`).locator('code')).toHaveText('provider-project');
  94  |     await expect(page.locator('[data-screen-id="PRV-15"] .ui-button--primary').first()).toHaveCSS('background-color', 'rgb(15, 74, 59)');
  95  |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`).getByRole('button', { name: /Edit|تعديل|编辑/u })).toBeEnabled();
  96  |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`).getByRole('button', { name: /Submit for review|إرسال للمراجعة|提交审核/u })).toBeEnabled();
  97  |     await expect(page.locator('body')).not.toContainText(/aaaaaaaaaaaaaaaaaaaaaaaa|reviewedBy|assignedTo|auditData|storageKey|accessToken|refreshToken/u);
  98  | 
  99  |     await page.getByRole('searchbox').fill('published');
  100 |     await page.getByRole('button', { name: /Apply|تطبيق|应用/u }).click();
  101 |     await expect(page.getByTestId('provider-projects-count')).toContainText(/1|١|一/u);
  102 |     await expect(page.getByTestId(`provider-project-${PUBLISHED_PROJECT_ID}`)).toBeVisible();
  103 |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`)).toHaveCount(0);
  104 | 
  105 |     await page.getByRole('searchbox').fill('');
  106 |     await page.getByRole('button', { name: /Apply|تطبيق|应用/u }).click();
  107 |     await page.getByRole('button', { name: /Edit:|تعديل:|编辑:/u }).first().focus();
  108 |     await expect(page.getByRole('button', { name: /Edit:|تعديل:|编辑:/u }).first()).toBeFocused();
  109 |     await page.locator('.a11y-skip-link').focus();
  110 |     await expect(page.locator('.a11y-skip-link')).toBeFocused();
  111 |     await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
  112 |     await expect(page).toHaveScreenshot(`provider-projects-${locale}.png`, { fullPage: true });
  113 |   });
  114 | 
  115 |   test('runs create, update, and submit through server-owned actions', async ({ page }) => {
  116 |     const locale = localeForProject();
  117 |     await routeSession(page);
  118 |     await routeProjects(page);
  119 |     await page.goto(`/provider/projects?lang=${encodeURIComponent(locale)}`);
  120 |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`)).toBeVisible();
  121 | 
  122 |     await page.getByRole('button', { name: /Add new project|إضافة مشروع جديد|添加新项目/u }).click();
  123 |     await page.getByLabel(/Project name.*English|اسم المشروع.*English|项目名称.*英语/u).fill('New provider project');
  124 |     await page.getByLabel(/Slug|الرابط المختصر|短链接/u).fill('new-provider-project');
  125 |     await page.getByLabel(/Change reason|سبب التغيير|变更原因/u).fill('Create project');
  126 |     await page.getByRole('button', { name: /Save|حفظ|保存/u }).click();
  127 |     await expect(page.getByRole('status').filter({ hasText: /created|تم إنشاء|已创建/u })).toBeVisible();
  128 | 
  129 |     await page.getByRole('button', { name: /Edit:|تعديل:|编辑:/u }).first().click();
  130 |     await page.getByLabel(/Change reason|سبب التغيير|变更原因/u).fill('Update project');
  131 |     await page.getByRole('button', { name: /Save|حفظ|保存/u }).click();
  132 |     await expect(page.getByRole('status').filter({ hasText: /updated|تم تحديث|已更新/u })).toBeVisible();
  133 | 
  134 |     await page.getByRole('button', { name: /Submit for review:|إرسال للمراجعة:|提交审核:/u }).first().click();
  135 |     await page.getByLabel(/Submission reason|سبب الإرسال|提交原因/u).fill('Submit project');
  136 |     await page.getByRole('button', { name: /^(Submit|إرسال|提交)$/u }).click();
  137 |     await expect(page.getByRole('status').filter({ hasText: /submitted|تم إرسال|已提交/u })).toBeVisible();
  138 |   });
  139 | 
  140 |   test('fails closed when the provider session expires', async ({ page }) => {
  141 |     const locale = localeForProject();
  142 |     await routeSession(page, false);
  143 |     await page.goto(`/provider/projects?lang=${encodeURIComponent(locale)}`);
  144 |     await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
  145 |     await expect(page.locator('[data-screen-id="PRV-15"]')).toHaveCount(0);
  146 |   });
  147 | });
  148 | 
  149 | test.describe('PRV-15 responsive Figma contract', () => {
  150 |   test.beforeEach(async ({ page }, testInfo) => {
  151 |     testInfo.annotations.push({ type: 'screen-id', description: 'PRV-15' });
  152 |     testInfo.annotations.push({ type: 'design-source', description: 'Figma tablet node 6017:120496 (1024x916); mobile node 6017:119219 (402x1327)' });
  153 |     test.skip(testInfo.project.name.startsWith('desktop-'), 'Responsive contract runs against the mapped tablet and mobile frames.');
  154 |     await page.setViewportSize(testInfo.project.name.startsWith('tablet-') ? { width: 1024, height: 916 } : { width: 402, height: 1327 });
  155 |   });
  156 | 
  157 |   test('renders usable project records without viewport overflow and keeps filtering live', async ({ page }, testInfo) => {
  158 |     const locale = localeForProject();
  159 |     await routeSession(page);
  160 |     await routeProjects(page);
> 161 |     const response = await page.goto(`/provider/projects?lang=${encodeURIComponent(locale)}`);
      |                                 ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  162 |     expect(response?.ok()).toBeTruthy();
  163 | 
  164 |     const screen = page.locator('[data-screen-id="PRV-15"]');
  165 |     await expect(screen).toBeVisible();
  166 |     await expect(screen).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  167 |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`)).toBeVisible();
  168 |     expect(await page.evaluate(() => window.scrollY)).toBe(0);
  169 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  170 | 
  171 |     const viewportWidth = page.viewportSize()?.width ?? 0;
  172 |     const records = await page.locator('[data-testid^="provider-project-"]').evaluateAll(elements => elements.map(element => {
  173 |       const rect = element.getBoundingClientRect();
  174 |       return { left: rect.left, right: rect.right, width: rect.width, display: getComputedStyle(element).display };
  175 |     }));
  176 |     records.forEach(record => {
  177 |       expect(record.left).toBeGreaterThanOrEqual(-0.5);
  178 |       expect(record.right).toBeLessThanOrEqual(viewportWidth + 0.5);
  179 |       expect(record.width).toBeGreaterThan(0);
  180 |       if (viewportWidth <= 620) expect(record.display).toBe('grid');
  181 |     });
  182 | 
  183 |     await page.screenshot({ path: testInfo.outputPath('provider-projects-responsive.png'), fullPage: true });
  184 | 
  185 |     await page.getByRole('searchbox').fill('published');
  186 |     await page.getByRole('button', { name: /Apply|تطبيق|应用/u }).click();
  187 |     await expect(page.getByTestId(`provider-project-${PUBLISHED_PROJECT_ID}`)).toBeVisible();
  188 |     await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`)).toHaveCount(0);
  189 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  190 |   });
  191 | });
  192 | 
```