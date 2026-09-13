import { expect, test } from '@playwright/test';

const ownRequestId = '000000000000000000004821';
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

const canonicalListRequests = [
  { id: '000000000000000000004821', type: 'property_search', status: 'under_review', createdAt: '2026-08-07T10:00:00.000Z', nameAr: 'شقة 3 غرف', nameEn: '3-bedroom apartment', locationAr: 'الحي الثالث', locationEn: 'Third District' },
  { id: '000000000000000000004798', type: 'viewing', status: 'scheduled', createdAt: '2026-08-03T10:00:00.000Z', nameAr: 'فيلا SDT-2103', nameEn: 'Villa SDT-2103', locationAr: 'حي الكورنيش', locationEn: 'Corniche District', sourceAr: 'شركة السادات للتطوير', sourceEn: 'Sadat Development Company' },
  { id: '000000000000000000004766', type: 'contact', status: 'contacted', createdAt: '2026-07-28T10:00:00.000Z', nameAr: 'دوبلكس SDT-1744', nameEn: 'Duplex SDT-1744', locationAr: 'الحي الأول', locationEn: 'First District', sourceAr: 'مكتب النيل العقاري', sourceEn: 'Al Nile Real Estate' },
  { id: '000000000000000000004733', type: 'contact', status: 'resolved', createdAt: '2026-07-20T10:00:00.000Z', nameAr: 'أرض صناعية', nameEn: 'Industrial land', locationAr: 'المنطقة الصناعية', locationEn: 'Industrial Zone', sourceAr: 'أ. سمير الشرقاوي', sourceEn: 'Samir El Sharkawy' },
  { id: '000000000000000000004701', type: 'viewing', status: 'resolved', createdAt: '2026-07-14T10:00:00.000Z', nameAr: 'شقة SDT-1622', nameEn: 'Apartment SDT-1622', locationAr: 'الحي الثاني', locationEn: 'Second District', sourceAr: 'مكتب وادي النيل', sourceEn: 'Wadi El Nile Office' },
  { id: '000000000000000000004688', type: 'contact', status: 'closed', createdAt: '2026-07-09T10:00:00.000Z', nameAr: 'روف SDT-1590', nameEn: 'Rooftop SDT-1590', locationAr: 'الحي الرابع', locationEn: 'Fourth District', sourceAr: 'شركة السادات للتطوير', sourceEn: 'Sadat Development Company' },
  { id: '000000000000000000004651', type: 'property_search', status: 'new', createdAt: '2026-07-01T10:00:00.000Z', nameAr: 'شقة 2 غرف', nameEn: '2-bedroom apartment', locationAr: 'أي حي', locationEn: 'Any district' }
].map((item, index) => ({
  id: item.id,
  type: item.type,
  source: 'seeker',
  seekerId: '0123456789abcdef01234567',
  propertyId: `2123456789abcdef0123456${index}`,
  property: {
    id: `2123456789abcdef0123456${index}`,
    slug: `canonical-request-property-${index + 1}`,
    kind: 'property',
    name: { ar: item.nameAr, en: item.nameEn },
    transactionType: 'sale',
    locationName: { ar: item.locationAr, en: item.locationEn },
    ...(item.sourceAr === undefined ? {} : { sourceName: { ar: item.sourceAr, en: item.sourceEn }, sourceType: 'developer_company' })
  },
  status: item.status,
  payload: {},
  version: 0,
  availableActions: [],
  createdAt: item.createdAt,
  updatedAt: item.createdAt
}));

const canonicalUnderReviewRequest = {
  id: ownRequestId,
  type: 'property_search',
  source: 'seeker',
  seekerId: '0123456789abcdef01234567',
  propertyId: '2123456789abcdef01234567',
  property: {
    id: '2123456789abcdef01234567',
    slug: 'three-bedroom-third-district',
    kind: 'property',
    name: { ar: 'شقة 3 غرف — الحي الثالث', en: '3-bedroom apartment — Third District' },
    transactionType: 'sale',
    locationName: { ar: 'الحي الثالث، مدينة السادات', en: 'Third District, Sadat City' },
    publicCode: 'REQ-4821'
  },
  status: 'under_review',
  payload: {
    maxBudget: 1_200_000,
    minBedrooms: 3,
    maxBedrooms: 3,
    propertyTypes: ['شقة', 'تشطيب كامل'],
    note: 'دور أول أو ثاني مفضل، لا يوجد اعتراض على بدروم'
  },
  version: 0,
  availableActions: ['cancel'],
  createdAt: '2026-08-07T09:05:00.000Z',
  updatedAt: '2026-08-07T09:05:00.000Z'
};

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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: canonicalUnderReviewRequest, ...successMeta('request-under-review') }) });
      return;
    }
    if (requestId === contactedRequestId) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: requestData(contactedRequestId, 'contacted'), ...successMeta('request-contacted') }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: canonicalListRequests, page: 1, limit: 20, total: 7 }, ...successMeta('request-list-canonical') }) });
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
    const row = page.getByTestId('seeker-request-000000000000000000004821');
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
    await expect(row.locator('.seeker-request-row__details')).toHaveAttribute('href', `/seeker/requests/000000000000000000004821?lang=${locale}`);
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

  test('lists the canonical owned request inventory and preserves the safe projection', async ({ page }) => {
    const locale = localeForProject();
    await page.setViewportSize({ width: 1551, height: 863 });
    await routeSession(page);
    await routeRequests(page);
    await page.goto(`/seeker/requests?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-02"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.locator('.seeker-request-row')).toHaveCount(7);
    await expect(page.getByTestId('seeker-request-000000000000000000004821')).toBeVisible();
    await expect(page.getByText('REQ-4821', { exact: true })).toBeVisible();
    await expect(page.getByText('REQ-4651')).toBeVisible();
    await expect(page.getByText(locale === 'ar' ? 'شركة السادات للتطوير' : 'Sadat Development Company').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|providerId|seekerId|accessToken|refreshToken/u);
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.seeker-request-row__details').first().focus();
    await expect(page.locator('.seeker-request-row__details').first()).toBeFocused();
    await page.locator('.seeker-request-row__details').first().evaluate(element => { (element as HTMLElement).blur(); });
    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`seeker-requests-list-${locale}.png`, { fullPage: true });
    await expect(page.locator('.ui-pagination')).toHaveCount(0);
  });

  test('renders the under-review detail projection without internal data', async ({ page }) => {
    const locale = localeForProject();
    await routeSession(page);
    await routeRequests(page);
    await page.goto(`/seeker/requests/${ownRequestId}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-03"]')).toHaveAttribute('data-request-status', 'under_review');
    await expect(page.locator('.seeker-request-detail h1')).toBeVisible();
    await expect(page.locator('.seeker-request-detail__breadcrumb strong')).toHaveText('REQ-4821');
    await expect(page.getByText(locale === 'ar' ? 'شقة 3 غرف — الحي الثالث' : '3-bedroom apartment — Third District')).toBeVisible();
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
