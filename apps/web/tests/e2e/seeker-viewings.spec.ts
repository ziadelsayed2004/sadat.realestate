import { expect, test } from '@playwright/test';

const requestedId = '4123456789abcdef01234567';
const confirmedId = '7123456789abcdef01234567';
const completedId = '9123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function viewingData(id: string, status: 'requested' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled') {
  const isVilla = id === requestedId;
  const propertyId = isVilla ? '000000000000000000002103' : '000000000000000000001890';
  return {
    id,
    propertyId,
    seekerId: '6123456789abcdef01234567',
    property: {
      id: propertyId,
      slug: isVilla ? 'villa-sdt-2103' : 'apartment-sdt-1890',
      kind: 'property',
      name: isVilla
        ? { ar: 'فيلا SDT-2103 — حي الكورنيش', en: 'Villa SDT-2103 — Corniche District' }
        : { ar: 'شقة SDT-1890 — الحي الأول', en: 'Apartment SDT-1890 — First District' },
      transactionType: 'sale',
      imageUrl: isVilla ? '/assets/canonical/seeker/viewing-sdt-2103.png' : '/assets/canonical/seeker/viewing-sdt-1890.png',
      locationName: isVilla
        ? { ar: 'شارع النيل، القطعة 7، مدينة السادات', en: 'Nile Street, Plot 7, Sadat City' }
        : { ar: 'شارع الوحدة، الدور الثالث، مدينة السادات', en: 'Al Wehda Street, Third Floor, Sadat City' },
      sourceName: isVilla
        ? { ar: 'شركة السادات للتطوير العقاري', en: 'Sadat Real Estate Development' }
        : { ar: 'مكتب النيل العقاري', en: 'Al Nile Real Estate Office' },
      sourceType: isVilla ? 'developer_company' : 'brokerage_office',
      publicCode: isVilla ? 'SDT-2103' : 'SDT-1890'
    },
    status,
    requestedAt: status === 'completed' ? '2026-08-10T12:00:00.000Z' : isVilla ? '2026-08-13T08:00:00.000Z' : '2026-08-11T13:00:00.000Z',
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
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/seeker/SEK-05.png; Figma node 6027:4477' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker dashboard is approved for desktop only.');
    await routeSession(page);
    await routeViewings(page);
  });

  test('renders localized owned appointments, status tabs, safe projection, focus, and visual baseline', async ({ page }) => {
    const locale = localeForProject();
    await page.setViewportSize({ width: 1551, height: 863 });
    await page.goto(`/seeker/viewings?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="SEK-05"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`seeker-viewing-${requestedId}`)).toBeVisible();
    await expect(page.getByTestId(`seeker-viewing-${confirmedId}`)).toBeVisible();
    await expect(page.getByText(locale === 'ar' ? 'شقة SDT-1890 — الحي الأول' : 'Apartment SDT-1890 — First District')).toBeVisible();
    await expect(page.getByText(locale === 'ar' ? 'فيلا SDT-2103 — حي الكورنيش' : 'Villa SDT-2103 — Corniche District')).toBeVisible();
    const desktopGeometry = await page.locator('.seeker-viewings__grid').evaluate(element => {
      const cards = Array.from(element.querySelectorAll<HTMLElement>('.seeker-viewing-card'));
      return {
        columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
        gridWidth: element.getBoundingClientRect().width,
        cardWidths: cards.map(card => card.getBoundingClientRect().width),
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    expect(desktopGeometry.columns).toBe(3);
    expect(desktopGeometry.gridWidth).toBeGreaterThanOrEqual(1000);
    expect(desktopGeometry.gridWidth).toBeLessThanOrEqual(1025);
    expect(desktopGeometry.hasHorizontalOverflow).toBe(false);
    for (const cardWidth of desktopGeometry.cardWidths) {
      expect(cardWidth).toBeGreaterThanOrEqual(300);
      expect(cardWidth).toBeLessThanOrEqual(340);
    }
    await expect(page.locator('body')).not.toContainText(/6123456789abcdef01234567|providerId|accessToken|refreshToken/u);
    await expect(page).toHaveScreenshot(`seeker-viewings-${locale}.png`, { fullPage: true });
    await page.getByRole('tab', { name: locale === 'ar' ? 'السابقة' :'Past' }).click();
    await expect(page.getByTestId(`seeker-viewing-${completedId}`)).toBeVisible();
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.seeker-viewings__tab').first().focus();
    await expect(page.locator('.seeker-viewings__tab').first()).toBeFocused();
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
  });

  test('keeps the viewing cards within the viewport across responsive widths', async ({ page }) => {
    const locale = localeForProject();
    for (const width of [393, 768, 1280]) {
      await page.setViewportSize({ width, height: 863 });
      await page.goto(`/seeker/viewings?lang=${encodeURIComponent(locale)}`);
      await expect(page.getByTestId(`seeker-viewing-${requestedId}`)).toBeVisible();
      const geometry = await page.locator('.seeker-viewings__grid').evaluate(element => {
        const grid = element.getBoundingClientRect();
        const card = element.querySelector<HTMLElement>('.seeker-viewing-card')?.getBoundingClientRect();
        return {
          columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
          gridLeft: grid.left,
          gridRight: grid.right,
          cardWidth: card?.width ?? 0,
          viewportWidth: window.innerWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });
      expect(geometry.hasHorizontalOverflow).toBe(false);
      expect(geometry.gridLeft).toBeGreaterThanOrEqual(-1);
      expect(geometry.gridRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.cardWidth).toBeGreaterThan(0);
      expect(geometry.columns).toBe(width > 1100 ? 3 : 1);
    }
  });

  test('validates creation and supports rescheduling and confirmed cancellation', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/seeker/viewings?lang=${encodeURIComponent(locale)}`);
    const requestLabel = locale === 'ar' ? 'طلب موعد معاينة' :'Request a viewing';
    const submitLabel = locale === 'ar' ? 'إرسال الطلب' :'Submit request';
    const rescheduleLabel = locale === 'ar' ? 'إعادة الجدولة' :'Reschedule';
    const saveLabel = locale === 'ar' ? 'حفظ الموعد' :'Save appointment';
    const cancelLabel = locale === 'ar' ? 'إلغاء الموعد' :'Cancel appointment';
    await page.getByRole('button', { name: requestLabel }).click();
    await page.getByRole('button', { name: submitLabel }).click();
    await expect(page.locator('.seeker-viewing-form__errors')).toBeVisible();
    const closeLabel = locale === 'ar' ? 'إغلاق' :'Close';
    await page.getByRole('button', { name: closeLabel }).click();
    const requestedCard = page.getByTestId(`seeker-viewing-${requestedId}`);
    await requestedCard.getByRole('button', { name: locale === 'ar' ? 'عرض التفاصيل' : 'View details' }).click();
    const rescheduleButton = requestedCard.getByRole('button', { name: rescheduleLabel });
    await expect(rescheduleButton).toBeVisible();
    await rescheduleButton.dispatchEvent('click');
    await page.getByLabel(locale === 'ar' ? 'موعد المعاينة' :'Viewing time').fill('2026-08-27T11:00');
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
