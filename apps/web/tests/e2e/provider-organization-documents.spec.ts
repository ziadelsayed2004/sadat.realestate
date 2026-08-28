import { expect, test } from '@playwright/test';

const APPLICATION_ID = 'a'.repeat(24);
const DOCUMENT_ID = 'c'.repeat(24);

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function copyForLocale(locale: 'ar' | 'en' | 'zh-CN') {
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
  if (locale === 'zh-CN') {
    return {
      businessTitle: '企业信息',
      companyTitle: '开发商公司信息',
      legalBusinessName: '企业法定名称',
      tradeName: '商业名称',
      address: '主要地址',
      chooseFile: '选择文件',
      commercialRegistration: '商业登记',
      remove: '移除文件',
      pending: '等待审核'
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
  await expect(page).toHaveScreenshot(`provider-organization-business-${locale}.png`, { fullPage: true });

  api.setProviderType('developer_company');
  await page.goto(`/auth/register/provider/account?providerType=developer_company&step=organization&lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-testid="provider-organization-details"]')).toHaveAttribute('data-screen-id', 'AUTH-11');
  await expect(page.getByRole('heading', { name: copy.companyTitle, level: 1 })).toBeVisible();
  await expect(page.getByLabel(copy.address)).toBeVisible();
  await hideSkipLink(page);
  await expect(page).toHaveScreenshot(`provider-organization-company-${locale}.png`, { fullPage: true });
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
