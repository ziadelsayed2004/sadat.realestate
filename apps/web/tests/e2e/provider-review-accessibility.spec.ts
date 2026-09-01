import { expect, test } from '@playwright/test';

const APPLICATION_ID = 'a'.repeat(24);

function localeForProject(): 'ar' | 'en' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function application(status: 'draft' | 'needs_information' | 'approved'): Record<string, unknown> {
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
    availableActions: status === 'draft'
      ? ['edit_account', 'edit_company', 'submit', 'view_status']
      : status === 'needs_information'
        ? ['edit_account', 'edit_company', 'submit', 'view_status']
        : ['view_status', 'open_dashboard'],
    submittedAt: status === 'draft' ? undefined : '2026-08-14T00:00:00.000Z',
    reviewReason: status === 'needs_information' ? 'Please provide the missing representative title.' : undefined,
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z'
  };
}

function envelope(data: unknown): string {
  return JSON.stringify({ data, meta: { requestId: 'provider-review-a11y' } });
}

test('review controls and landmarks are keyboard reachable and labeled', async ({ page }) => {
  const locale = localeForProject();
  await page.route('**/api/v1/provider/application', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(application('draft')) });
  });

  await page.goto(`/auth/register/provider/review?providerType=developer_company&lang=${encodeURIComponent(locale)}`);
  const review = page.locator('[data-testid="provider-review"]');
  await expect(review).toHaveAttribute('data-screen-id', 'AUTH-13');
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('main#main-content main')).toHaveCount(0);
  await expect(review.locator('h1')).toHaveCount(1);
  await expect(review.locator('button')).toHaveCount(2);

  const submit = page.locator('[data-testid="provider-review-submit"]');
  await submit.focus();
  await expect(submit).toBeFocused();
  await expect(submit).toBeEnabled();
  await page.keyboard.press('Shift+Tab');
  await expect(review.locator('.provider-review-card__footer button').first()).toBeFocused();
});

test('needs-information and approved actions expose accessible state and permission boundaries', async ({ page }) => {
  const locale = localeForProject();
  let current = application('needs_information');
  await page.route('**/api/v1/provider/application', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(current) });
  });

  await page.goto(`/auth/register/provider/review?providerType=developer_company&lang=${encodeURIComponent(locale)}`);
  const review = page.locator('[data-testid="provider-review"]');
  await expect(review).toHaveAttribute('data-screen-id', 'AUTH-16');
  await expect(review.locator('[data-testid="provider-review-edit"]')).toBeEnabled();
  await expect(review.locator('aside[role="note"]')).toHaveCount(2);
  await expect(page.locator('main#main-content')).toBeVisible();

  current = application('approved');
  await page.goto(`/auth/register/provider/review?providerType=developer_company&lang=${encodeURIComponent(locale)}`);
  await expect(review).toHaveAttribute('data-screen-id', 'AUTH-17');
  const dashboard = page.locator('[data-testid="provider-review-dashboard"]');
  await expect(dashboard).toHaveAttribute('href', '/provider');
  await dashboard.focus();
  await expect(dashboard).toBeFocused();
  await expect(review).not.toContainText('internalNote');
  await expect(review).not.toContainText('storageKey');
});
