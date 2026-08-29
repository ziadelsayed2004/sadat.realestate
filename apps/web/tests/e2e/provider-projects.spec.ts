import { expect, test } from '@playwright/test';

const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const DRAFT_PROJECT_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const PUBLISHED_PROJECT_ID = 'cccccccccccccccccccccccc';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function envelope(data: unknown, requestId: string, meta: Record<string, unknown> = {}): string {
  return JSON.stringify({ data, meta: { requestId, ...meta } });
}

function projectFixture(id: string, status: string, availableActions: string[] = []) {
  return {
    id,
    providerId: PROVIDER_ID,
    name: { ar: 'مشروع المزود', en: 'Provider project', 'zh-CN': '提供方项目' },
    slug: id === DRAFT_PROJECT_ID ? 'provider-project' : 'published-project',
    description: { en: 'A provider-owned project.' },
    status,
    version: 2,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions,
    ...(status === 'needs_changes' ? { reviewReason: 'Please update the project details.' } : {})
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    if (!allowed) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'projects-auth-denied' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'provider.projects.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, meta: { requestId: 'projects-refresh' } }) });
  });
}

async function routeProjects(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/provider/projects**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.projects.token');
    const url = new URL(route.request().url());
    const path = url.pathname;
    const body = route.request().postDataJSON() as Record<string, unknown> | null;
    if (route.request().method() === 'GET') {
      const filtered = url.searchParams.get('status') === 'published' || url.searchParams.get('search') === 'published';
      const items = filtered ? [projectFixture(PUBLISHED_PROJECT_ID, 'published')] : [projectFixture(DRAFT_PROJECT_ID, 'draft', ['update', 'submit']), projectFixture(PUBLISHED_PROJECT_ID, 'published')];
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items }, 'projects-list', { page: 1, limit: 5, total: filtered ? 1 : 2 }) });
      return;
    }
    expect(body?.reason).toEqual(expect.any(String));
    if (path.endsWith('/submit')) {
      expect(route.request().method()).toBe('POST');
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(projectFixture(DRAFT_PROJECT_ID, 'pending_review'), 'projects-submit') });
      return;
    }
    if (path === '/api/v1/provider/projects') {
      expect(route.request().method()).toBe('POST');
      await route.fulfill({ status: 201, contentType: 'application/json', body: envelope(projectFixture(DRAFT_PROJECT_ID, 'draft', ['update', 'submit']), 'projects-create') });
      return;
    }
    expect(route.request().method()).toBe('PATCH');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(projectFixture(DRAFT_PROJECT_ID, 'draft', ['update', 'submit']), 'projects-update') });
  });
}

test.describe('PRV-15 Provider Projects', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-15' });
    testInfo.annotations.push({ type: 'design-source', description: 'PRV-15 docs/design_sources/final_screens/provider/PRV-15.png SHA-256 1856d403d730c82c4793ebbb3ddf7dc4482ecc272b19327411a832c9dcf006ac; Figma node 6017:21162; Drive folder 1JM9TjIqqsFhXnObamIdFGepIPeLUf0ml' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
    void page;
  });

  test('renders owned projects, server actions, locale direction, filters, and visual keyboard evidence', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeProjects(page);
    const response = await page.goto(`/provider/projects?lang=${encodeURIComponent(locale)}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="PRV-15"]')).toBeVisible();
    await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId('provider-projects-count')).toContainText(/2|٢|二/u);
    await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`)).toBeVisible();
    await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`).locator('.provider-projects__identity strong')).not.toHaveText('');
    await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`).locator('code')).toHaveText('provider-project');
    await expect(page.locator('[data-screen-id="PRV-15"] .ui-button--primary').first()).toHaveCSS('background-color', 'rgb(15, 74, 59)');
    await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`).getByRole('button', { name: /Edit|تعديل|编辑/u })).toBeEnabled();
    await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`).getByRole('button', { name: /Submit for review|إرسال للمراجعة|提交审核/u })).toBeEnabled();
    await expect(page.locator('body')).not.toContainText(/aaaaaaaaaaaaaaaaaaaaaaaa|reviewedBy|assignedTo|auditData|storageKey|accessToken|refreshToken/u);

    await page.getByRole('searchbox').fill('published');
    await page.getByRole('button', { name: /Apply|تطبيق|应用/u }).click();
    await expect(page.getByTestId('provider-projects-count')).toContainText(/1|١|一/u);
    await expect(page.getByTestId(`provider-project-${PUBLISHED_PROJECT_ID}`)).toBeVisible();
    await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`)).toHaveCount(0);

    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: /Apply|تطبيق|应用/u }).click();
    await page.getByRole('button', { name: /Edit:|تعديل:|编辑:/u }).first().focus();
    await expect(page.getByRole('button', { name: /Edit:|تعديل:|编辑:/u }).first()).toBeFocused();
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`provider-projects-${locale}.png`, { fullPage: true });
  });

  test('runs create, update, and submit through server-owned actions', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeProjects(page);
    await page.goto(`/provider/projects?lang=${encodeURIComponent(locale)}`);
    await expect(page.getByTestId(`provider-project-${DRAFT_PROJECT_ID}`)).toBeVisible();

    await page.getByRole('button', { name: /Add new project|إضافة مشروع جديد|添加新项目/u }).click();
    await page.getByLabel(/Project name.*English|اسم المشروع.*English|项目名称.*英语/u).fill('New provider project');
    await page.getByLabel(/Slug|الرابط المختصر|短链接/u).fill('new-provider-project');
    await page.getByLabel(/Change reason|سبب التغيير|变更原因/u).fill('Create project');
    await page.getByRole('button', { name: /Save|حفظ|保存/u }).click();
    await expect(page.getByRole('status').filter({ hasText: /created|تم إنشاء|已创建/u })).toBeVisible();

    await page.getByRole('button', { name: /Edit:|تعديل:|编辑:/u }).first().click();
    await page.getByLabel(/Change reason|سبب التغيير|变更原因/u).fill('Update project');
    await page.getByRole('button', { name: /Save|حفظ|保存/u }).click();
    await expect(page.getByRole('status').filter({ hasText: /updated|تم تحديث|已更新/u })).toBeVisible();

    await page.getByRole('button', { name: /Submit for review:|إرسال للمراجعة:|提交审核:/u }).first().click();
    await page.getByLabel(/Submission reason|سبب الإرسال|提交原因/u).fill('Submit project');
    await page.getByRole('button', { name: /^(Submit|إرسال|提交)$/u }).click();
    await expect(page.getByRole('status').filter({ hasText: /submitted|تم إرسال|已提交/u })).toBeVisible();
  });

  test('fails closed when the provider session expires', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page, false);
    await page.goto(`/provider/projects?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-15"]')).toHaveCount(0);
  });
});
