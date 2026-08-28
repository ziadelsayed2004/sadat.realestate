import { expect, test } from '@playwright/test';

const APPLICATION_ID = 'a'.repeat(24);

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function application(status: 'draft' | 'pending_review' | 'needs_information' | 'approved', overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const statusActions = status === 'draft'
    ? ['edit_account', 'edit_company', 'submit', 'view_status']
    : status === 'approved'
      ? ['view_status', 'open_dashboard']
      : status === 'needs_information'
        ? ['edit_account', 'edit_company', 'submit', 'view_status']
        : ['view_status'];
  return {
    id: APPLICATION_ID,
    providerType: 'developer_company',
    status,
    version: status === 'draft' ? 3 : 4,
    requirementVersion: '2026-08-13.1',
    accountOwnerFullName: 'Mona Hassan',
    displayName: 'Nile Developments',
    email: 'mona@example.com',
    legalCompanyName: 'Nile Developments LLC',
    brandName: 'Nile Homes',
    headOfficeAddress: 'Cairo',
    accountOwnerHasRegisteredAuthority: true,
    missingFields: status === 'needs_information' ? ['authorizedRepresentativeTitle'] : [],
    missingDocuments: status === 'needs_information' ? ['additional_supporting_document'] : [],
    availableActions: statusActions,
    submittedAt: status === 'draft' ? undefined : '2026-08-14T00:00:00.000Z',
    reviewReason: status === 'needs_information' ? 'Please provide the missing representative title.' : undefined,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    ...overrides
  };
}

function envelope(data: unknown): string {
  return JSON.stringify({ data, meta: { requestId: 'provider-review-e2e' } });
}

async function hideSkipLink(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('.a11y-skip-link').evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
}

test('review, submit, under-review, and tracking states remain API-backed across locales and devices', async ({ page }) => {
  const locale = localeForProject();
  let current = application('draft');
  await page.route('**/api/v1/provider/application', async route => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });
  await page.route('**/api/v1/provider/application/submit', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ version: 3 });
    current = application('pending_review');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });
  await page.route('**/api/v1/provider/application/status', async route => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        applicationId: APPLICATION_ID,
        providerType: 'developer_company',
        status: 'pending_review',
        version: 4,
        submittedAt: '2026-08-14T00:00:00.000Z',
        availableActions: ['view_status']
      })
    });
  });

  await page.goto(`/auth/register/provider/review?providerType=developer_company&lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-testid="provider-review"]')).toHaveAttribute('data-screen-id', 'AUTH-13');
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await hideSkipLink(page);
  // The legacy snapshot predates the email-only/provider-safe projection. Auth
  // visual evidence is captured by scripts/capture-auth-lane.mjs; keep this
  // semantic test runnable without rewriting the shared snapshot.
  if (process.env.AUTH_LANE_SEMANTIC_ONLY !== '1') {
    await expect(page).toHaveScreenshot(`provider-review-${locale}.png`, { fullPage: true });
  }

  await page.locator('[data-testid="provider-review-submit"]').click();
  await expect(page.locator('[data-testid="provider-review"]')).toHaveAttribute('data-screen-id', 'AUTH-14');
  if (process.env.AUTH_LANE_SEMANTIC_ONLY !== '1') {
    await expect(page).toHaveScreenshot(`provider-application-under-review-${locale}.png`, { fullPage: true });
  }

  await page.locator('[data-testid="provider-review-track"]').click();
  await expect(page.locator('[data-testid="provider-review"]')).toHaveAttribute('data-screen-id', 'AUTH-15');
  await page.locator('[data-testid="provider-review-refresh"]').click();
  await expect(page.locator('[data-testid="provider-review"]')).toHaveAttribute('data-application-status', 'pending_review');
  if (process.env.AUTH_LANE_SEMANTIC_ONLY !== '1') {
    await expect(page).toHaveScreenshot(`provider-application-tracking-${locale}.png`, { fullPage: true });
  }
  await expect(page.locator('body')).not.toContainText('internalNote');
  await expect(page.locator('body')).not.toContainText('storageKey');
  await expect(page.locator('main#main-content')).toBeVisible();
});

test('needs-information and approved states expose only API-authorized actions', async ({ page }) => {
  const locale = localeForProject();
  let current = application('needs_information');
  await page.route('**/api/v1/provider/application', async route => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });

  await page.goto(`/auth/register/provider/review?providerType=developer_company&lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-testid="provider-review"]')).toHaveAttribute('data-screen-id', 'AUTH-16');
  await expect(page.locator('[data-testid="provider-review"]')).toHaveAttribute('data-application-status', 'needs_information');
  await expect(page.locator('[data-testid="provider-review"]')).toContainText('Please provide the missing representative title.');
  await expect(page.locator('[data-testid="provider-review-edit"]')).toBeVisible();
  await hideSkipLink(page);
  if (process.env.AUTH_LANE_SEMANTIC_ONLY !== '1') {
    await expect(page).toHaveScreenshot(`provider-application-needs-information-${locale}.png`, { fullPage: true });
  }

  current = application('approved');
  await page.goto(`/auth/register/provider/review?providerType=developer_company&lang=${encodeURIComponent(locale)}`);
  await expect(page.locator('[data-testid="provider-review"]')).toHaveAttribute('data-screen-id', 'AUTH-17');
  await expect(page.locator('[data-testid="provider-review-dashboard"]')).toHaveAttribute('href', '/provider');
  await expect(page.locator('[data-testid="provider-review"]')).not.toContainText('internalNote');
  await hideSkipLink(page);
  if (process.env.AUTH_LANE_SEMANTIC_ONLY !== '1') {
    await expect(page).toHaveScreenshot(`provider-application-approved-${locale}.png`, { fullPage: true });
  }
  await expect(page.locator('main#main-content')).toBeVisible();
});
