import { expect, test } from '@playwright/test';

const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const REQUEST_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function localeForRequests(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function envelope(data: unknown, requestId: string, meta: Record<string, unknown> = {}): string {
  return JSON.stringify({ data, meta: { requestId, ...meta } });
}

function requestFixture(status = 'new', availableActions: string[] = ['contact', 'cancel']) {
  return {
    id: REQUEST_ID,
    type: 'provider_customer',
    source: 'provider',
    providerId: PROVIDER_ID,
    payload: { firstName: 'Mona', lastName: 'Hassan', phone: '01012345678', email: 'mona@example.com', message: 'Interested in a property' },
    status,
    version: status === 'contacted' ? 3 : 2,
    availableActions,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z'
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    if (!allowed) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'customer-requests-auth-denied' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { accessToken: 'provider.customer.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, meta: { requestId: 'customer-requests-refresh' } }) });
  });
}

async function routeRequests(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/provider/customer-requests**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.customer.token');
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      expect(url.searchParams.get('source')).toBe('provider');
      expect(url.searchParams.get('type')).toBe('provider_customer');
      const filtered = url.searchParams.get('status') === 'contacted';
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [requestFixture(filtered ? 'contacted' : 'new', filtered ? ['schedule'] : ['contact', 'cancel'])], page: 1, limit: 5, total: 1 }, 'customer-requests-list', { page: 1, limit: 5, total: 1 }) });
      return;
    }
    const body = route.request().postDataJSON() as Record<string, unknown> | null;
    if (url.pathname.endsWith('/transitions')) {
      expect(body).toMatchObject({ transition: 'contact', expectedVersion: 2 });
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(requestFixture('contacted', ['schedule']), 'customer-requests-transition') });
      return;
    }
    expect(route.request().method()).toBe('POST');
    expect(body).toMatchObject({ firstName: 'New', lastName: 'Customer', phone: '01198765432' });
    await route.fulfill({ status: 201, contentType: 'application/json', body: envelope(requestFixture(), 'customer-requests-create') });
  });
}

test.describe('PRV-16/PRV-17 Provider Customer Requests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-16, PRV-17' });
    testInfo.annotations.push({ type: 'design-source', description: 'PRV-16 docs/design_sources/final_screens/provider/PRV-16.png SHA-256 f40fc7db1a5944ef285eaa885d70ee3c2199bf170daf13a158776fc1827ec083; Figma node 6017:21368; PRV-17 docs/design_sources/final_screens/provider/PRV-17.png SHA-256 c5737bcda9c5771316253f8174c9ea6c372201ff29510a26e2547bfd87f70281; Figma node 6017:21747' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
    void page;
  });

  test('renders the owned request list, locale direction, safe projection, filters, and keyboard/visual evidence', async ({ page }) => {
    const locale = localeForRequests();
    await routeSession(page);
    await routeRequests(page);
    const response = await page.goto(`/provider/customer-requests?lang=${encodeURIComponent(locale)}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="PRV-16"]')).toBeVisible();
    await expect(page.locator('.route-shell--provider')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`provider-customer-request-${REQUEST_ID}`)).toBeVisible();
    await expect(page.getByTestId(`provider-customer-request-${REQUEST_ID}`).locator('.provider-customer-requests__identity strong')).toHaveText('Mona Hassan');
    await expect(page.getByRole('button', { name: /Mark contacted|تم التواصل|标记为已联系/u })).toBeEnabled();
    await expect(page.locator('body')).not.toContainText(new RegExp(PROVIDER_ID));
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|storageKey|accessToken|refreshToken/u);

    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`provider-customer-requests-${locale}.png`, { fullPage: true });

    await page.getByRole('combobox', { name: /Status|الحالة|状态/u }).selectOption('contacted');
    await page.getByRole('button', { name: /Apply|تطبيق|应用/u }).click();
    await expect(page.getByTestId(`provider-customer-request-${REQUEST_ID}`)).toHaveAttribute('data-request-status', 'contacted');
    await page.getByRole('button', { name: /Schedule|تحديد موعد|安排时间/u }).focus();
    await expect(page.getByRole('button', { name: /Schedule|تحديد موعد|安排时间/u })).toBeFocused();
  });

  test('creates a customer request and transitions it through server-owned actions', async ({ page }) => {
    const locale = localeForRequests();
    await routeSession(page);
    await routeRequests(page);
    await page.goto(`/provider/customer-requests?lang=${encodeURIComponent(locale)}`);
    await expect(page.getByTestId(`provider-customer-request-${REQUEST_ID}`)).toBeVisible();
    await page.getByRole('button', { name: /Add customer request|إضافة طلب يدوي|添加客户请求/u }).click();
    await expect(page.locator('[data-screen-id="PRV-17"] .ui-modal')).toBeVisible();
    await expect(page).toHaveScreenshot(`provider-customer-request-modal-${locale}.png`, { fullPage: true });
    await page.getByLabel(/First name|الاسم الأول|名字/u).fill('New');
    await page.getByLabel(/Last name|اسم العائلة|姓氏/u).fill('Customer');
    await page.getByLabel(/Phone number|رقم الهاتف|电话号码/u).fill('01198765432');
    await page.getByRole('button', { name: /Save request|حفظ الطلب|保存请求/u }).click();
    await expect(page.getByRole('status').filter({ hasText: /Customer request created|تم إنشاء طلب العميل|客户请求已创建/u })).toBeVisible();
    await page.getByRole('button', { name: /Mark contacted|تم التواصل|标记为已联系/u }).click();
    await page.getByRole('button', { name: /Confirm action|تأكيد الإجراء|确认操作/u }).click();
    await expect(page.getByRole('status').filter({ hasText: /Request status updated|تم تحديث حالة الطلب|请求状态已更新/u })).toBeVisible();
  });

  test('fails closed when the provider session expires', async ({ page }) => {
    const locale = localeForRequests();
    await routeSession(page, false);
    await page.goto(`/provider/customer-requests?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="PRV-16"]')).toHaveCount(0);
  });
});
