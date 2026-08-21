import { expect, test } from '@playwright/test';

const requestedId = '4123456789abcdef01234567';
const confirmedId = '7123456789abcdef01234567';
const completedId = '9123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function viewingData(id: string, status: 'requested' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled') {
  return {
    id,
    propertyId: id === requestedId ? '5123456789abcdef01234567' : '8123456789abcdef01234567',
    seekerId: '6123456789abcdef01234567',
    status,
    requestedAt: status === 'completed' ? '2026-08-10T12:00:00.000Z' : '2026-08-25T10:00:00.000Z',
    timezone: 'Africa/Cairo',
    note: 'Please call before arriving.',
    version: 0,
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'viewings-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { accessToken: 'seeker.access.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'seeker', status: 'verified' } },
        ...successMeta('viewings-refresh')
      })
    });
  });
}

async function routeViewings(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/seeker/viewings**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.access.token');
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'GET') {
      const status = url.searchParams.get('status');
      const data = status === 'completed'
        ? [viewingData(completedId, 'completed')]
        : status === 'cancelled'
          ? [viewingData(requestedId, 'cancelled')]
          : [viewingData(requestedId, 'requested'), viewingData(confirmedId, 'confirmed')];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: data, page: 1, limit: 100, total: data.length }, ...successMeta(`viewings-${status ?? 'upcoming'}`) }) });
      return;
    }
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON() as { expectedVersion?: number; requestedAt?: string; timezone?: string };
      expect(body.expectedVersion).toBe(0);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...viewingData(requestedId, 'rescheduled'), requestedAt: body.requestedAt ?? '2026-08-27T11:00:00.000Z', timezone: body.timezone ?? 'Africa/Cairo' }, ...successMeta('viewing-reschedule') }) });
      return;
    }
    if (path.endsWith('/cancel')) {
      const body = request.postDataJSON() as { expectedVersion?: number };
      expect(body.expectedVersion).toBe(0);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: viewingData(requestedId, 'cancelled'), ...successMeta('viewing-cancel') }) });
      return;
    }
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: viewingData(requestedId, 'requested'), ...successMeta('viewing-create') }) });
  });
}

test.describe('SEK-05 Seeker Viewing Requests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'SEK-05' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/seeker/SEK-05.png; Figma node 6027-3579' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker dashboard is approved for desktop only.');
    await routeSession(page);
    await routeViewings(page);
  });

  test('renders localized owned appointments, status tabs, safe projection, focus, and visual baseline', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/seeker/viewings?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-05"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`seeker-viewing-${requestedId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-viewing-${confirmedId}`)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/6123456789abcdef01234567|providerId|accessToken|refreshToken/u);
    await page.getByRole('tab', { name: locale === 'ar' ? 'السابقة' : locale === 'zh-CN' ? '已完成' : 'Past' }).click();
    await expect(page.getByTestId(`seeker-viewing-${completedId}`)).toBeVisible();
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.seeker-viewings__tab').first().focus();
    await expect(page.locator('.seeker-viewings__tab').first()).toBeFocused();
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`seeker-viewings-${locale}.png`, { fullPage: true });
  });

  test('validates creation and supports rescheduling and confirmed cancellation', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/seeker/viewings?lang=${encodeURIComponent(locale)}`);
    const requestLabel = locale === 'ar' ? 'طلب موعد معاينة' : locale === 'zh-CN' ? '申请看房' : 'Request a viewing';
    const submitLabel = locale === 'ar' ? 'إرسال الطلب' : locale === 'zh-CN' ? '提交申请' : 'Submit request';
    const rescheduleLabel = locale === 'ar' ? 'إعادة الجدولة' : locale === 'zh-CN' ? '重新安排' : 'Reschedule';
    const saveLabel = locale === 'ar' ? 'حفظ الموعد' : locale === 'zh-CN' ? '保存预约' : 'Save appointment';
    const cancelLabel = locale === 'ar' ? 'إلغاء الموعد' : locale === 'zh-CN' ? '取消预约' : 'Cancel appointment';
    await page.getByRole('button', { name: requestLabel }).click();
    await page.getByRole('button', { name: submitLabel }).click();
    await expect(page.locator('.seeker-viewing-form__errors')).toBeVisible();
    const closeLabel = locale === 'ar' ? 'إغلاق' : locale === 'zh-CN' ? '关闭' : 'Close';
    await page.getByRole('button', { name: closeLabel }).click();
    const requestedCard = page.getByTestId(`seeker-viewing-${requestedId}`);
    const rescheduleButton = requestedCard.getByRole('button', { name: rescheduleLabel });
    await expect(rescheduleButton).toBeVisible();
    await rescheduleButton.dispatchEvent('click');
    await page.getByLabel(locale === 'ar' ? 'موعد المعاينة' : locale === 'zh-CN' ? '看房时间' : 'Viewing time').fill('2026-08-27T11:00');
    await page.getByRole('button', { name: saveLabel }).dispatchEvent('click');
    await expect(page.locator('.seeker-viewings__feedback[data-state="success"]')).toBeVisible();

    const cancelButton = requestedCard.getByRole('button', { name: cancelLabel });
    await expect(cancelButton).toBeVisible();
    await cancelButton.dispatchEvent('click');
    await expect(page.getByRole('group')).toBeVisible();
    await page.getByRole('group').getByRole('button', { name: cancelLabel }).dispatchEvent('click');
    await expect(page.locator('.seeker-viewings__feedback[data-state="success"]')).toBeVisible();
  });

  test('fails closed when the session cannot be refreshed', async ({ page }) => {
    const locale = localeForProject();
    await page.unroute('**/api/v1/auth/refresh');
    await routeSession(page, false);
    await page.goto(`/seeker/viewings?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="SEK-05"]')).toHaveCount(0);
  });
});
