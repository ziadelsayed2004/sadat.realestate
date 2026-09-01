import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

async function routeSeekerSession(page: import('@playwright/test').Page, allowed: boolean = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'seeker-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'seeker.access.token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'seeker', status: 'verified' }
        },
        ...successMeta('seeker-refresh')
      })
    });
  });
}

async function routeOverview(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/seeker/overview', async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer seeker.access.token');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { requests: 2, viewings: 1, savedProperties: 7, notifications: 3, unreadNotifications: 2 },
        ...successMeta('seeker-overview')
      })
    });
  });
}

test.describe('SEK-01 Seeker Overview', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    void page;
    testInfo.annotations.push({ type: 'screen-id', description: 'SEK-01' });
    testInfo.annotations.push({ type: 'design-source', description: 'docs/design_sources/final_screens/seeker/SEK-01.png; Figma node 6027-3579' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker dashboard is approved for desktop only.');
  });

  test('loads real summary data through the authenticated API and preserves the protected shell', async ({ page }) => {
    const locale = localeForProject();
    await routeSeekerSession(page);
    await routeOverview(page);
    const response = await page.goto(`/seeker?lang=${encodeURIComponent(locale)}`);

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('[data-screen-id="SEK-01"]')).toBeVisible();
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByTestId('seeker-summary-requests')).toContainText('2');
    await expect(page.getByTestId('seeker-summary-viewings')).toContainText('1');
    await expect(page.getByTestId('seeker-summary-saved')).toContainText('7');
    await expect(page.getByTestId('seeker-summary-notifications')).toContainText('2');
    await expect(page.locator('.seeker-dashboard__nav a[data-active="true"]')).toHaveAttribute('href', `/seeker?lang=${locale}`);
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|auditData|accessToken|refreshToken/u);

    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.locator('.seeker-dashboard__nav a').nth(1).focus();
    await expect(page.locator('.seeker-dashboard__nav a').nth(1)).toBeFocused();

    await page.locator('.a11y-skip-link').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`seeker-overview-${locale}.png`, { fullPage: true });
  });

  test('fails closed when the refresh session is unavailable', async ({ page }) => {
    const locale = localeForProject();
    await routeSeekerSession(page, false);
    await page.goto(`/seeker?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="SEK-01"]')).toHaveCount(0);
  });
});
