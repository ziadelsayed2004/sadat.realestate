import { expect, test, type Page } from '@playwright/test';

const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const reportId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const propertyId = 'cccccccccccccccccccccccc';
const projectId = 'dddddddddddddddddddddddd';
const commissionAccountId = 'eeeeeeeeeeeeeeeeeeeeeeee';
const roleId = 'ffffffffffffffffffffffff';

type QaLocale = 'ar' | 'en' | 'zh-CN';
type SessionRole = 'admin' | 'seeker';

function localeForProject(): QaLocale {
  const project = test.info().project.name;
  if (project.endsWith('-zh')) return 'zh-CN';
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function localizedPath(path: string, locale: QaLocale): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}`;
}

function envelope(data: unknown, requestId: string): string {
  return JSON.stringify({ data, meta: { requestId } });
}

const adminRoutes = [
  ['ADM-01', '/admin'],
  ['ADM-02', '/admin/users'],
  ['ADM-03', '/admin/property-seekers'],
  ['ADM-04', '/admin/providers'],
  ['ADM-05', '/admin/verification'],
  ['ADM-06', '/admin/account-reports'],
  ['ADM-07', `/admin/account-reports?reportId=${reportId}`],
  ['ADM-08', `/admin/account-restrictions?accountId=${accountId}`],
  ['ADM-09', '/admin/property-categories'],
  ['ADM-10', '/admin/locations'],
  ['ADM-11', '/admin/features'],
  ['ADM-12', '/admin/projects'],
  ['ADM-13', `/admin/projects/review?projectId=${projectId}`],
  ['ADM-14', '/admin/properties'],
  ['ADM-15', `/admin/properties/review?propertyId=${propertyId}`],
  ['ADM-16', `/admin/properties/possible-duplicates?propertyId=${propertyId}`],
  ['ADM-17', `/admin/property-reports?reportId=${reportId}`],
  ['ADM-18', '/admin/requests'],
  ['ADM-19', '/admin/customer-requests'],
  ['ADM-20', '/admin/overdue-requests'],
  ['ADM-21', '/admin/contact-requests'],
  ['ADM-22', '/admin/viewing-requests'],
  ['ADM-23', '/admin/search-requests'],
  ['ADM-24', '/admin/request-issues'],
  ['ADM-25', '/admin/articles'],
  ['ADM-26', '/admin/article-categories'],
  ['ADM-27', '/admin/community'],
  ['ADM-28', '/admin/community/comments'],
  ['ADM-29', '/admin/community/moderation'],
  ['ADM-30', '/admin/content/about'],
  ['ADM-31', '/admin/content/team'],
  ['ADM-32', '/admin/content/population-counter'],
  ['ADM-33', '/admin/ads/requests'],
  ['ADM-34', '/admin/ads/payment-proofs/pending'],
  ['ADM-35', '/admin/ads/payment-proofs/approved'],
  ['ADM-36', '/admin/ads/calendar'],
  ['ADM-37', '/admin/ads/payments/pending-review'],
  ['ADM-38', '/admin/ads/financial-review'],
  ['ADM-39', '/admin/commissions'],
  ['ADM-40', '/admin/commissions/new'],
  ['ADM-41', '/admin/commissions/history'],
  ['ADM-42', `/admin/commissions/account?accountId=${commissionAccountId}`],
  ['ADM-43', '/admin/commissions/exceptions'],
  ['ADM-44', '/admin/commissions/exceptions/new'],
  ['ADM-45', '/admin/commissions/confirmations'],
  ['ADM-46', '/admin/banners'],
  ['ADM-47', '/admin/banners/new'],
  ['ADM-48', '/admin/content/tips'],
  ['ADM-49', '/admin/content/homepage'],
  ['ADM-50', '/admin/settings/platform'],
  ['ADM-51', '/admin/settings/contact'],
  ['ADM-52', '/admin/settings/social'],
  ['ADM-53', '/admin/settings/properties'],
  ['ADM-54', '/admin/settings/requests'],
  ['ADM-55', '/admin/settings/advertising'],
  ['ADM-56', '/admin/settings/seo'],
  ['ADM-57', '/admin/settings/privacy-security'],
  ['ADM-58', '/admin/settings/display'],
  ['ADM-59', '/admin/admin-users'],
  ['ADM-60', '/admin/admin-users/new'],
  ['ADM-61', `/admin/admin-users/${accountId}`],
  ['ADM-62', `/admin/admin-users/${accountId}?accessLevel=standard_admin`],
  ['ADM-63', '/admin/roles'],
  ['ADM-64', `/admin/roles/${roleId}`],
  ['ADM-65', '/admin/notifications'],
  ['ADM-66', '/admin/audit-logs']
] as const;

interface QaMode {
  role: SessionRole;
  adminStatus: number;
}

async function routeAdminApi(page: Page, mode: QaMode): Promise<void> {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === '/api/v1/auth/refresh') {
      if (mode.role !== 'admin') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: envelope({ accessToken: 'seeker.dashboard.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: accountId, roleType: mode.role, status: 'verified' } }, 'admin-dashboard-qa-refresh')
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ accessToken: 'admin.dashboard.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: accountId, roleType: 'admin', status: 'verified' } }, 'admin-dashboard-qa-refresh')
      });
      return;
    }

    if (pathname.startsWith('/api/v1/admin/') && mode.adminStatus !== 200) {
      await route.fulfill({
        status: mode.adminStatus,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'admin-dashboard-qa-forbidden' } })
      });
      return;
    }

    if (pathname === '/api/v1/admin/overview') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ range: { from: '2026-07-22T09:00:00.000Z', to: '2026-08-21T09:00:00.000Z' }, metrics: { users: 0, seekers: 0, providers: 0, verifiedProviders: 0, publishedProperties: 0, openRequests: 0, pendingReviews: 0 }, generatedAt: '2026-08-21T09:00:00.000Z' }, 'admin-dashboard-qa-overview')
      });
      return;
    }

    if (/\/api\/v1\/admin\/admin-users\/[a-f0-9]{24}$/u.test(pathname)) {
      const standardRole = new URL(page.url(), 'http://sadat-real-estate.local').searchParams.get('accessLevel') === 'standard_admin';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ id: accountId, email: 'qa-admin@example.com', displayName: 'QA Admin', accessLevel: standardRole ? 'standard_admin' : 'super_admin', status: 'active', version: 1, createdAt: '2026-08-21T09:00:00.000Z', updatedAt: '2026-08-21T09:00:00.000Z', availableActions: [] }, 'admin-dashboard-qa-admin-detail')
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({}, 'admin-dashboard-qa-empty-projection')
    });
  });
}

test.describe('F5 Admin Dashboard QA', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-01 through ADM-66 approved local Admin exports and shared Admin Desktop patterns recorded in DESIGN_SOURCE_MANIFEST.json; ADM-54 uses the owner-approved DESIGN-EXCEPTION-ADM-54 waiver and is never claimed as direct pixel comparison.' });
    test.skip(!testInfo.project.name.startsWith('desktop-'), 'Admin Dashboard is approved for desktop only.');
    await routeAdminApi(page, { role: 'admin', adminStatus: 200 });
  });

  test('covers every Admin route with locale direction, Desktop scope, keyboard focus, safe projection, and screen identity', async ({ page }) => {
    const locale = localeForProject();
    for (const [screenId, path] of adminRoutes) {
      const response = await page.goto(localizedPath(path, locale));
      expect(response?.status(), `${screenId} ${path}`).toBe(200);
      await expect(page.locator('html'), screenId).toHaveAttribute('lang', locale);
      await expect(page.locator('html'), screenId).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.route-shell--admin'), screenId).toHaveAttribute('data-device-scope', 'desktop');
      await expect(page.locator('#main-content'), screenId).toBeVisible();
      await expect(page.locator(`[data-screen-id="${screenId}"]`), `${screenId} screen marker`).toBeVisible();
      await expect(page.locator(`[data-screen-id="${screenId}"][data-device-scope="desktop"]`), `${screenId} device marker`).toHaveCount(1);
      await expect(page.locator('.admin-dashboard__navigation'), screenId).toHaveAttribute('aria-label', /.+/u);
      await expect(page.locator('body'), screenId).not.toContainText(/\b(?:internalNotes|assignedTo|auditData|storageKey|temporaryUrl|privateUrl|paymentProof|accessToken|refreshToken|secret|password)\b/u);

      const skipLink = page.locator('.a11y-skip-link');
      await skipLink.focus();
      await expect(skipLink, `${screenId} skip link`).toBeFocused();
      const firstNavigationLink = page.locator('.admin-dashboard__navigation a').first();
      await firstNavigationLink.focus();
      await expect(firstNavigationLink, `${screenId} first navigation link`).toBeFocused();
    }
  });

  test('fails closed for non-admin sessions and preserves permission states when Admin APIs deny access', async ({ page }) => {
    const locale = localeForProject();
    await page.unroute('**/api/v1/**');
    const seekerMode: QaMode = { role: 'seeker', adminStatus: 200 };
    await routeAdminApi(page, seekerMode);
    await page.goto(localizedPath('/admin/settings/requests', locale));
    await expect(page.locator('[data-access="forbidden"]')).toBeVisible();
    await expect(page.locator('[data-screen-id]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|internalNotes|assignedTo|auditData|storageKey/u);

    await page.unroute('**/api/v1/**');
    const adminDeniedMode: QaMode = { role: 'admin', adminStatus: 403 };
    await routeAdminApi(page, adminDeniedMode);
    await page.goto(localizedPath('/admin/ads/payment-proofs/pending', locale));
    await expect(page.locator('[data-screen-id="ADM-34"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="ADM-34"] [data-state="permission"]').first()).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/storageKey|temporaryUrl|privateUrl|paymentProof|bankVerified|internalNotes|assignedTo/u);
  });
});
