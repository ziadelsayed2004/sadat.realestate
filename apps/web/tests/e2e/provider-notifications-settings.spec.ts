import { expect, test } from '@playwright/test';

const PROVIDER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const NOTIFICATION_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function envelope(data: unknown, requestId: string): string {
  return JSON.stringify({ data, meta: { requestId } });
}

async function routeProviderSession(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ accessToken: 'provider.settings.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: PROVIDER_ID, roleType: 'provider', status: 'verified' } }, 'provider-settings-refresh') });
  });
}

async function routeProviderData(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/provider/notifications**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.settings.token');
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/read-all')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ updatedCount: 1 }, 'provider-notifications-read-all') });
      return;
    }
    if (url.pathname.endsWith('/read')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ id: NOTIFICATION_ID, readAt: '2026-08-19T09:00:00.000Z' }, 'provider-notification-read') });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ items: [{ id: NOTIFICATION_ID, type: 'request.updated', title: { ar: 'تحديث على طلب', en: 'Request update', 'zh-CN': '请求更新' }, message: { ar: 'تم تحديث حالة الطلب.', en: 'A request status was updated.', 'zh-CN': '请求状态已更新。' }, link: '/provider/customer-requests', readAt: null, createdAt: '2026-08-19T08:00:00.000Z' }], unreadCount: 1, page: 1, limit: 20, total: 1 }, 'provider-notifications-list') });
  });
  await page.route('**/api/v1/provider/settings', async route => {
    expect(route.request().headers().authorization).toBe('Bearer provider.settings.token');
    if (route.request().method() === 'PATCH') {
      expect(JSON.parse(route.request().postData() ?? '{}')).toHaveProperty('expectedVersion', 3);
      await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ version: 4, email: 'provider@example.test', phone: '+2010998765432', whatsappNumber: '+2010998765433', officeAddress: '12 Nile Street', website: 'https://provider.example.test', availableActions: ['update_email', 'update_contact'] }, 'provider-settings-update') });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ version: 3, email: 'provider@example.test', phone: '+2010998765432', whatsappNumber: '+2010998765433', officeAddress: '12 Nile Street', website: 'https://provider.example.test', availableActions: ['update_email', 'update_contact'] }, 'provider-settings-read') });
  });
}

test.describe('PRV-21 and PRV-22 Provider notifications and settings', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'PRV-21, PRV-22-1, PRV-22-2, PRV-22-3' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/provider/PRV-21.png; PRV-22-1.png; PRV-22-2.png; PRV-22-3.png; Figma prototype node 6017:19032; Drive references are recorded in DESIGN_SOURCE_MANIFEST.json' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Provider Dashboard approved device scope is desktop only.');
    await routeProviderSession(page);
    await routeProviderData(page);
  });

  test('renders the provider notification inbox with safe actions and visual evidence', async ({ page }) => {
    const locale = localeForProject();
    const response = await page.goto(`/provider/notifications?lang=${encodeURIComponent(locale)}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('[data-screen-id="PRV-21"]')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.getByTestId('provider-notification-bbbbbbbbbbbbbbbbbbbbbbbb')).toBeVisible();
    await expect(page.getByTestId('provider-notifications-unread-count')).toContainText('1');
    const markRead = page.getByTestId('provider-notification-bbbbbbbbbbbbbbbbbbbbbbbb').getByRole('button', { name: /Mark as read|تحديد كمقروء|标为已读/u });
    await markRead.focus();
    await expect(markRead).toBeFocused();
    await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken/u);
    await expect(page).toHaveScreenshot(`provider-notifications-${locale}.png`, { fullPage: true });
  });

  test('renders all settings frames, safe contact update, and unavailable security actions', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/provider/settings?tab=account&lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-22-1"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save email address|حفظ البريد الإلكتروني|保存电子邮箱/u })).toBeVisible();
    await page.getByRole('button', { name: /Save email address|حفظ البريد الإلكتروني|保存电子邮箱/u }).click();
    await expect(page.locator('.provider-settings__feedback[data-state="success"]')).toBeVisible();
    await expect(page).toHaveScreenshot(`provider-settings-account-${locale}.png`, { fullPage: true });

    await page.goto(`/provider/settings?tab=contact&lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-22-2"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save contact data|حفظ بيانات التواصل|保存联系资料/u })).toBeVisible();
    await expect(page).toHaveScreenshot(`provider-settings-contact-${locale}.png`, { fullPage: true });

    await page.goto(`/provider/settings?tab=security&lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="PRV-22-3"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Update password|تحديث كلمة المرور|更新密码/u })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Request account deletion|طلب حذف الحساب|请求删除账户/u })).toBeDisabled();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page).toHaveScreenshot(`provider-settings-security-${locale}.png`, { fullPage: true });
  });
});
