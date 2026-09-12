import { expect, test } from '@playwright/test';

const ownRequestId = '4123456789abcdef01234567';
const contactedRequestId = '5123456789abcdef01234567';
const forbiddenRequestId = '6123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function requestData(id: string, status: 'under_review' | 'contacted', withProperty = false) {
  return {
    id,
    type: 'contact',
    source: 'seeker',
    seekerId: '0123456789abcdef01234567',
    propertyId: '2123456789abcdef01234567',
    ...(withProperty ? { property: {
      id: '2123456789abcdef01234567',
      slug: 'seeker-property',
      kind: 'property',
      name: { ar: 'شقة في مدينة السادات', en: 'Sadat City apartment' },
      transactionType: 'sale',
      locationName: { ar: 'الحي الثالث', en: 'Third District' },
      sourceName: { ar: 'شركة السادات للتطوير', en: 'Sadat Development Company' },
      sourceType: 'developer_company',
      publicCode: 'SDT-2103'
    } } : {}),
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
    const items = pageNumber === 2 ? [requestData(contactedRequestId, 'contacted', true)] : [requestData(ownRequestId, 'under_review', true)];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items, page: pageNumber, limit: 1, total: 2 }, ...successMeta(`request-list-${pageNumber}`) }) });
  });
}

test('request rows keep status and detail links contained across viewport widths', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'));
  const locale = localeForProject();
  await routeSession(page);
  await routeRequests(page);
  for (const width of [393, 768, 1280, 1551]) {
    await page.setViewportSize({ width, height: 863 });
    await page.goto(`/seeker/requests?lang=${locale}`);
    const row = page.getByTestId(`seeker-request-${ownRequestId}`);
    await expect(row).toBeVisible();
    const geometry = await row.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const children = [...element.querySelectorAll('.seeker-request-row__outcome > *')].map(child => {
        const rect = child.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      return { left: bounds.left, right: bounds.right, children, viewport: innerWidth, document: document.documentElement.scrollWidth };
    });
    expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
    for (const child of geometry.children) {
      expect(child.left).toBeGreaterThanOrEqual(geometry.left);
      expect(child.right).toBeLessThanOrEqual(geometry.right);
    }
    const [badge, link] = geometry.children;
    if (!badge || !link) throw new Error('Request row is missing its status or detail link');
    expect(badge.right <= link.left || link.right <= badge.left || badge.bottom <= link.top || link.bottom <= badge.top).toBe(true);
    await expect(row.locator('.seeker-request-row__details')).toHaveAttribute('href', `/seeker/requests/${ownRequestId}?lang=${locale}`);
  }
});

test('request details keep cards contained and reflow across viewport widths', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'));
  const locale = localeForProject();
  await routeSession(page);
  await routeRequests(page);
  for (const requestId of [ownRequestId, contactedRequestId]) {
    for (const width of [393, 768, 1280, 1551]) {
      await page.setViewportSize({ width, height: 863 });
      await page.goto(`/seeker/requests/${requestId}?lang=${locale}`);
      const detail = page.locator('.seeker-request-detail');
      await expect(detail).toBeVisible();
      const geometry = await detail.evaluate(element => {
        const rectangle = (selector: string) => {
          const target = element.querySelector(selector);
          if (!(target instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
          const { left, right, top, bottom } = target.getBoundingClientRect();
          return { left, right, top, bottom };
        };
        return {
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          detail: rectangle('.seeker-request-detail__grid'),
          timeline: rectangle('.seeker-request-detail__card--timeline'),
          summary: rectangle('.seeker-request-detail__card--summary')
        };
      });
      expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
      for (const card of [geometry.timeline, geometry.summary]) {
        expect(card.left).toBeGreaterThanOrEqual(geometry.detail.left);
        expect(card.right).toBeLessThanOrEqual(geometry.detail.right);
      }
      const cardsOverlap = !(geometry.timeline.right <= geometry.summary.left || geometry.summary.right <= geometry.timeline.left || geometry.timeline.bottom <= geometry.summary.top || geometry.summary.bottom <= geometry.timeline.top);
      expect(cardsOverlap).toBe(false);
      if (width <= 1100) expect(geometry.summary.top).toBeLessThanOrEqual(geometry.timeline.top);
      else expect(Math.abs(geometry.summary.top - geometry.timeline.top)).toBeLessThanOrEqual(1);
    }
  }
});

test.describe('SEK-02/03/04 Seeker Requests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    void page;
    testInfo.annotations.push({ type: 'screen-id', description: 'SEK-02, SEK-03, SEK-04' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/seeker/SEK-02.png; SEK-03.png; SEK-04.png; Figma node 6027-4046' });
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
    await expect(page.getByText(locale === 'ar' ? 'شركة السادات للتطوير' : 'Sadat Development Company')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|providerId|seekerId|accessToken|refreshToken/u);
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.seeker-request-row__details').first().focus();
    await expect(page.locator('.seeker-request-row__details').first()).toBeFocused();
    await page.locator('.seeker-request-row__details').first().evaluate(element => { (element as HTMLElement).blur(); });
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`seeker-requests-list-${locale}.png`, { fullPage: true });
    await page.getByRole('button', { name: '2' }).click();
    await expect(page.getByTestId(`seeker-request-${contactedRequestId}`)).toBeVisible();
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
