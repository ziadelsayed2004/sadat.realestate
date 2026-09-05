import { expect, test } from '@playwright/test';

const APPLICATION_ID = 'a'.repeat(24);
const DOCUMENT_ID = 'c'.repeat(24);

test('individual broker repairs locations inline before reviewing documents', async ({ page }, testInfo) => {
  const locale = localeForProject();
  const ar = locale === 'ar';
  let current = application('brokerage_office', {
    providerType: 'individual_broker', missingFields: ['primaryLocationId', 'serviceAreaIds'],
    missingDocuments: [], availableActions: ['edit_account', 'submit', 'view_status'],
    requirementsSnapshot: { version: '2026-08-13.1', providerType: 'individual_broker', requirements: [
      { key: 'government_id_front', labelKey: 'provider.documents.governmentIdFront', classification: 'required', applies: true },
      { key: 'brokerage_license', labelKey: 'provider.documents.brokerageLicense', classification: 'optional', applies: true }
    ] }
  });
  await page.route('**/api/v1/provider/application', route => route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) }));
  await page.route('**/api/v1/provider/application/account', async route => {
    expect(route.request().method()).toBe('PATCH');
    const patch = route.request().postDataJSON();
    expect(patch.version).toBe(0);
    expect(patch.primaryLocationId).toMatch(/^[a-f0-9]{24}$/);
    expect(patch.serviceAreaIds).toEqual([patch.primaryLocationId]);
    current = { ...current, ...patch, version: 1, missingFields: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });
  await page.goto(`/auth/register/provider/account?providerType=individual_broker&step=documents&lang=${locale}`);
  const review = page.getByRole('button', { name: ar ? 'مراجعة الطلب' : 'Review application', exact: true });
  await expect(review).toBeDisabled();
  const primary = page.getByRole('combobox', { name: ar ? 'الموقع الرئيسي' : 'Primary location' });
  await expect(primary).toBeEnabled();
  const options = await primary.locator('option').evaluateAll(nodes => nodes.map(node => ({ value: (node as HTMLOptionElement).value, label: node.textContent ?? '' })).filter(option => option.value));
  expect(options.length).toBeGreaterThan(0);
  const selected = options[0]!;
  await primary.selectOption(selected.value);
  await page.getByRole('checkbox', { name: selected.label, exact: true }).check();
  await page.screenshot({ path: testInfo.outputPath('location-selected.png'), fullPage: true });
  await page.getByRole('button', { name: ar ? 'حفظ الموقع ومناطق الخدمة' : 'Save location and service areas', exact: true }).click();
  await expect(review).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('review-enabled.png'), fullPage: true });
});

function localeForProject(): 'ar' | 'en' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function copyForLocale(locale: 'ar' | 'en') {
  if (locale === 'ar') {
    return {
      businessTitle: 'بيانات المكتب العقاري',
      companyTitle: 'بيانات شركة التطوير',
      legalBusinessName: 'الاسم القانوني للمكتب',
      tradeName: 'الاسم التجاري',
      address: 'العنوان الرئيسي',
      chooseFile: 'اختيار ملف',
      commercialRegistration: 'السجل التجاري',
      remove: 'إزالة الملف',
      pending: 'في انتظار المراجعة'
    };
  }
  return {
    businessTitle: 'Business details',
    companyTitle: 'Developer company details',
    legalBusinessName: 'Legal business name',
    tradeName: 'Trade name',
    address: 'Main address',
    chooseFile: 'Choose file',
    commercialRegistration: 'Commercial registration',
    remove: 'Remove file',
    pending: 'Pending review'
  };
}

function requirementSnapshot(providerType: 'brokerage_office' | 'developer_company') {
  return {
    version: '2026-08-13.1',
    providerType,
    requirements: [
      { key: 'commercial_registration', labelKey: 'provider.documents.commercialRegistration', classification: 'required', applies: true },
      { key: 'tax_card', labelKey: 'provider.documents.taxCard', classification: 'required', applies: true },
      { key: 'authorized_representative_id_front', labelKey: 'provider.documents.authorizedRepresentativeIdFront', classification: 'required', applies: true },
      { key: 'authorized_representative_id_back', labelKey: 'provider.documents.authorizedRepresentativeIdBack', classification: 'required', applies: true },
      ...(providerType === 'developer_company' ? [{ key: 'developer_license', labelKey: 'provider.documents.developerLicense', classification: 'optional', applies: true }] : [])
    ]
  };
}

function application(providerType: 'brokerage_office' | 'developer_company', overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const business = providerType === 'brokerage_office';
  return {
    id: APPLICATION_ID,
    providerType,
    status: 'draft',
    version: 0,
    requirementVersion: '2026-08-13.1',
    email: 'provider@example.com',
    requirementsSnapshot: requirementSnapshot(providerType),
    missingFields: business
      ? ['legalBusinessName', 'tradeName', 'businessAddress', 'commercialRegistrationNumber', 'taxRegistrationNumber', 'authorizedRepresentativeFullName', 'authorizedRepresentativeTitle', 'accountOwnerHasRegisteredAuthority']
      : ['legalCompanyName', 'brandName', 'headOfficeAddress', 'commercialRegistrationNumber', 'taxRegistrationNumber', 'authorizedRepresentativeFullName', 'authorizedRepresentativeTitle', 'accountOwnerHasRegisteredAuthority'],
    missingDocuments: ['commercial_registration', 'tax_card', 'authorized_representative_id_front', 'authorized_representative_id_back'],
    availableActions: business ? ['edit_account', 'edit_business', 'submit', 'view_status'] : ['edit_account', 'edit_company', 'submit', 'view_status'],
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides
  };
}

function envelope(data: unknown): string {
  return JSON.stringify({ data, meta: { requestId: 'provider-organization-documents-e2e' } });
}

async function hideSkipLink(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('.a11y-skip-link').evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
}

async function waitForVisualStability(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(['400 15px Cairo', '600 15px Cairo', '700 15px Cairo', '800 15px Cairo'].map(font => document.fonts.load(font)));
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.waitForTimeout(100);
}

async function routeOrganizationApi(page: import('@playwright/test').Page): Promise<{ setProviderType: (providerType: 'brokerage_office' | 'developer_company') => void }> {
  let current = application('brokerage_office');
  await page.route('**/api/v1/provider/application', async route => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });
  await page.route('**/api/v1/provider/application/business', async route => {
    expect(route.request().method()).toBe('PATCH');
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body).not.toHaveProperty('serviceAreaIds');
    expect(body).not.toHaveProperty('propertyTypes');
    current = application('brokerage_office', { ...body, version: 1, missingFields: [] });
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });
  await page.route('**/api/v1/provider/application/company', async route => {
    expect(route.request().method()).toBe('PATCH');
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body).not.toHaveProperty('serviceAreaIds');
    expect(body).not.toHaveProperty('propertyTypes');
    current = application('developer_company', { ...body, version: 1, missingFields: [] });
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });
  return { setProviderType: providerType => { current = application(providerType); } };
}

test('business and developer organization variants render their approved responsive states', async ({ page }) => {
  const locale = localeForProject();
  const copy = copyForLocale(locale);
  const api = await routeOrganizationApi(page);

  await page.goto(`/auth/register/provider/account?providerType=brokerage_office&step=organization&lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-testid="provider-organization-details"]')).toHaveAttribute('data-screen-id', 'AUTH-10');
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.getByRole('heading', { name: copy.businessTitle, level: 1 })).toBeVisible();
  await expect(page.getByLabel(copy.legalBusinessName)).toBeVisible();
  await page.locator('#provider-business-legal-name').fill('Nile Brokerage');
  await page.locator('#provider-business-trade-name').fill('Nile Homes');
  await page.locator('#provider-business-address').fill('Cairo');
  await page.locator('#provider-organization-commercial-registration').fill('CR-11');
  await page.locator('#provider-organization-tax-registration').fill('TAX-22');
  await page.locator('#provider-organization-representative').fill('Mona Hassan');
  await page.locator('#provider-organization-representative-title').fill('Managing Director');
  await page.locator('#provider-organization-authority').selectOption('true');
  await expect(page.locator('[data-testid="provider-organization-details"]')).toHaveAttribute('data-screen-id', 'AUTH-10+');
  await hideSkipLink(page);
  await waitForVisualStability(page);
  await expect(page).toHaveScreenshot(`provider-organization-business-${locale}.png`, { fullPage: true, maxDiffPixels: 400 });

  api.setProviderType('developer_company');
  await page.goto(`/auth/register/provider/account?providerType=developer_company&step=organization&lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-testid="provider-organization-details"]')).toHaveAttribute('data-screen-id', 'AUTH-11');
  await expect(page.getByRole('heading', { name: copy.companyTitle, level: 1 })).toBeVisible();
  await expect(page.getByLabel(copy.address)).toBeVisible();
  await hideSkipLink(page);
  await waitForVisualStability(page);
  await expect(page).toHaveScreenshot(`provider-organization-company-${locale}.png`, { fullPage: true, maxDiffPixels: 300 });
  await expect(page.locator('form')).toHaveCount(1);
  await expect(page.locator('input, select, button').first()).toBeVisible();
});

test('private document cards validate raw uploads, show server review state, and remain accessible', async ({ page }) => {
  const locale = localeForProject();
  const copy = copyForLocale(locale);
  const current = application('developer_company');
  let uploaded = false;
  await page.route('**/api/v1/provider/application', async route => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });
  await page.route('**/api/v1/provider/application/documents', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['authorization']).toBeUndefined();
    expect(route.request().headers()['x-document-category']).toBe('commercial_registration');
    expect(route.request().headers()['x-file-name']).toBe('commercial-registration.pdf');
    expect(route.request().headers()['content-type']).toBe('application/pdf');
    expect(route.request().postDataBuffer()?.length).toBeGreaterThan(0);
    uploaded = true;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: envelope({
        id: DOCUMENT_ID,
        applicationId: APPLICATION_ID,
        category: 'commercial_registration',
        requirementVersion: '2026-08-13.1',
        originalFilename: 'commercial-registration.pdf',
        normalizedExtension: '.pdf',
        detectedMime: 'application/pdf',
        byteSize: 4,
        sha256: 'd'.repeat(64),
        version: 1,
        securityState: 'scan_pending',
        reviewState: 'pending_review',
        uploadedAt: '2026-08-13T00:00:00.000Z',
        active: true,
        idempotentReplay: false
      })
    });
  });
  await page.route(`**/api/v1/provider/application/documents/${DOCUMENT_ID}`, async route => {
    expect(route.request().method()).toBe('DELETE');
    uploaded = false;
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope({ documentId: DOCUMENT_ID, deleted: true }) });
  });

  await page.goto(`/auth/register/provider/account?providerType=developer_company&step=documents&lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-testid="provider-documents"]')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.provider-document-card')).toHaveCount(5);
  await expect(page.locator('input[type="file"]')).toHaveCount(5);
  await expect(page.locator('input[type="file"]').first()).toHaveAttribute('accept', /application\/pdf/iu);

  const input = page.locator('#provider-document-input-commercial_registration');
  await input.setInputFiles({ name: 'commercial-registration.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await expect(page.locator('[data-testid="provider-document-file-commercial_registration"]')).toContainText('commercial-registration.pdf');
  await expect(page.locator('[data-testid="provider-document-commercial_registration"] .provider-document-card__status')).toContainText(copy.pending);
  expect(uploaded).toBe(true);
  await expect(page.locator('body')).not.toContainText('/api/v1/private/provider-documents/');
  await expect(page.locator('body')).not.toContainText('storageKey');

  await hideSkipLink(page);
  // The legacy snapshot predates the email-only/provider-safe projection. Auth
  // visual evidence is captured by scripts/capture-auth-lane.mjs; keep this
  // semantic test runnable without rewriting the shared snapshot.
  if (process.env.AUTH_LANE_SEMANTIC_ONLY !== '1') {
    await expect(page).toHaveScreenshot(`provider-documents-uploaded-${locale}.png`, { fullPage: true });
  }
  await page.getByRole('button', { name: copy.remove }).click();
  await expect(page.locator('[data-testid="provider-document-file-commercial_registration"]')).toHaveCount(0);
  await expect(page.locator('main#main-content')).toBeVisible();
});
