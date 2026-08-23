import { expect, test } from '@playwright/test';

const ownRequestId = '4123456789abcdef01234567';
const contactedRequestId = '5123456789abcdef01234567';
const forbiddenRequestId = '6123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function requestData(id: string, status: 'under_review' | 'contacted') {
  return {
    id,
    type: 'contact',
    source: 'seeker',
    seekerId: '0123456789abcdef01234567',
    propertyId: '2123456789abcdef01234567',
    status,
    payload: { message: status === 'contacted' ? 'Please call after 5 PM' : 'Please call me' },
    version: 0,
    availableActions: status === 'contacted' ? ['cancel'] : ['cancel'],
    createdAt: '2026-08-13T10:00:00.000Z',
    updatedAt: '2026-08-13T10:00:00.000Z'
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'requests-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { accessToken: 'seeker.access.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'seeker', status: 'verified' } },
        ...successMeta('requests-refresh')
      })
    });
  });
}

async function routeRequests(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/seeker/requests**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.access.token');
    const url = new URL(route.request().url());
    const requestId = url.pathname.split('/').pop();
    if (requestId === forbiddenRequestId) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { code: 'REQUEST_NOT_FOUND', messageKey: 'errors.requests.notFound', details: [], requestId: 'request-idor-denied' } }) });
      return;
    }
    if (requestId === ownRequestId) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: requestData(ownRequestId, 'under_review'), ...successMeta('request-under-review') }) });
      return;
    }
    if (requestId === contactedRequestId) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: requestData(contactedRequestId, 'contacted'), ...successMeta('request-contacted') }) });
      return;
    }
    const pageNumber = Number(url.searchParams.get('page') ?? '1');
    const items = pageNumber === 2 ? [requestData(contactedRequestId, 'contacted')] : [requestData(ownRequestId, 'under_review')];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items, page: pageNumber, limit: 1, total: 2 }, ...successMeta(`request-list-${pageNumber}`) }) });
  });
}

test.describe('SEK-02/03/04 Seeker Requests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    void page;
    testInfo.annotations.push({ type: 'screen-id', description: 'SEK-02, SEK-03, SEK-04' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/seeker/SEK-02.png; SEK-03.png; SEK-04.png; Figma node 6027-3579' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker dashboard is approved for desktop only.');
  });

  test('lists owned requests, preserves safe projection, and paginates through the API', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeRequests(page);
    await page.goto(`/seeker/requests?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-02"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId(`seeker-request-${ownRequestId}`)).toBeVisible();
    await expect(page.getByText('REQ-4567')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|providerId|seekerId|accessToken|refreshToken/u);
    await page.getByRole('button', { name: '2' }).click();
    await expect(page.getByTestId(`seeker-request-${contactedRequestId}`)).toBeVisible();
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.seeker-request-row__details').first().focus();
    await expect(page.locator('.seeker-request-row__details').first()).toBeFocused();
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`seeker-requests-list-${locale}.png`, { fullPage: true });
  });

  test('renders the under-review detail projection without internal data', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeRequests(page);
    await page.goto(`/seeker/requests/${ownRequestId}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-03"]')).toHaveAttribute('data-request-status', 'under_review');
    await expect(page.locator('.seeker-request-detail h1')).toBeVisible();
    await expect(page.getByText('Please call me')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|dueAt|providerId|seekerId/u);
    await expect(page).toHaveScreenshot(`seeker-request-under-review-${locale}.png`, { fullPage: true });
  });

  test('renders the contacted detail projection', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeRequests(page);
    await page.goto(`/seeker/requests/${contactedRequestId}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-04"]')).toHaveAttribute('data-request-status', 'contacted');
    await expect(page.locator('.seeker-request-detail h1')).toBeVisible();
    await expect(page.getByText('Please call after 5 PM')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|dueAt|providerId|seekerId/u);
    await expect(page).toHaveScreenshot(`seeker-request-contacted-${locale}.png`, { fullPage: true });
  });

  test('fails closed for an IDOR response and for an unavailable session', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeRequests(page);
    await page.goto(`/seeker/requests/${forbiddenRequestId}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-request-state="not_found"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="SEK-03"]')).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await page.unroute('**/api/v1/auth/refresh');
    await routeSession(page, false);
    await page.goto(`/seeker/requests?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="SEK-02"]')).toHaveCount(0);
  });
});
