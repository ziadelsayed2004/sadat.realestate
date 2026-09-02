import { expect, test } from '@playwright/test';
import { getSeekerProfileCopy } from '../../src/features/seeker/profile-copy.ts';

const profileId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function profileData(locale: 'ar' | 'en', firstName = 'Mohamed') {
  return {
    id: profileId,
    roleType: 'seeker',
    status: 'verified',
    email: 'seeker@example.com',
    firstName,
    lastName: 'Salem',
    locale
  };
}

function preferencesData() {
  return {
    preferences: {
      propertyTypes: ['apartment'],
      locations: ['new-cairo'],
      purpose: 'buy',
      minPrice: 500000,
      maxPrice: 1500000,
      bedroomsMin: 2,
      bedroomsMax: 4
    },
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

async function routeSession(page: import('@playwright/test').Page, allowed = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    if (!allowed) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'profile-refresh-denied' } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { accessToken: 'seeker.profile.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: profileId, roleType: 'seeker', status: 'verified' } }, ...successMeta('profile-refresh') })
    });
  });
}

async function routeProfile(page: import('@playwright/test').Page): Promise<void> {
  let firstName = 'Mohamed';
  await page.route('**/api/v1/me**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.profile.token');
    const request = route.request();
    const url = new URL(request.url());
    const isPreferences = url.pathname.endsWith('/preferences');
    if (request.method() === 'GET') {
      const locale = (url.searchParams.get('lang') ?? 'ar') as 'ar' | 'en';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: isPreferences ? preferencesData() : profileData(locale, firstName), ...successMeta(isPreferences ? 'profile-preferences' : 'profile-read') })
      });
      return;
    }
    expect(request.method()).toBe('PATCH');
    const body = request.postDataJSON() as Record<string, unknown>;
    if (!isPreferences && typeof body.firstName === 'string') firstName = body.firstName;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: isPreferences ? preferencesData() : profileData('en', firstName), ...successMeta(isPreferences ? 'profile-preferences-update' : 'profile-update') })
    });
  });
}

test.describe('SEK-08/09/10 Seeker profile, preferences, and settings', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'SEK-08, SEK-09, SEK-10' });
    testInfo.annotations.push({ type: 'design-source', description: 'SEK-08.png, SEK-09.png, SEK-10.png; Figma node 6027-3579' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Seeker dashboard is approved for desktop only.');
    await routeSession(page);
    await routeProfile(page);
  });

  test('renders localized screens, safe projections, keyboard focus, and visual baselines', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerProfileCopy(locale);
    const query = `lang=${encodeURIComponent(locale)}`;

    await page.goto(`/seeker/profile?tab=preferences&${query}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-08"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.getByLabel(copy.preferences.minPrice)).toHaveValue('500000');
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.getByRole('link', { name: copy.tabs.profile }).focus();
    await expect(page.getByRole('link', { name: copy.tabs.profile })).toBeFocused();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`seeker-profile-preferences-${locale}.png`, { fullPage: true });

    await page.goto(`/seeker/profile?tab=personal&${query}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-09"]')).toBeVisible();
    await expect(page.locator('#seeker-profile-email')).toBeDisabled();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`seeker-profile-personal-${locale}.png`, { fullPage: true, maxDiffPixels: 300 });

    await page.goto(`/seeker/settings?${query}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-10"]')).toBeVisible();
    await expect(page.locator('.seeker-profile__settings-card[data-state="unavailable"]')).toHaveCount(3);
    await expect(page.locator('body')).not.toContainText(/accessToken|refreshToken|internalNote|providerDocument|m\.salem@email\.com/u);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`seeker-profile-settings-${locale}.png`, { fullPage: true, maxDiffPixels: 300 });
  });

  test('saves only contract-shaped profile and preference changes', async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerProfileCopy(locale);
    await page.goto(`/seeker/profile?tab=preferences&lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel(copy.preferences.maxPrice).fill('2500000');
    await page.getByRole('button', { name: copy.preferences.save }).click();
    await expect(page.locator('.seeker-profile__feedback[data-state="success"]')).toContainText(copy.preferences.saved);

    await page.goto(`/seeker/profile?tab=personal&lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel(copy.profile.firstName).fill('Mariam');
    await page.getByRole('button', { name: copy.profile.save }).click();
    await expect(page.locator('.seeker-profile__feedback[data-state="success"]')).toContainText(copy.profile.saved);
    await expect(page.locator('body')).not.toContainText(/assignedTo|internalNotes|refreshToken/u);
  });

  test('fails closed when the authenticated session cannot be refreshed', async ({ page }) => {
    const locale = localeForProject();
    await page.unroute('**/api/v1/auth/refresh');
    await routeSession(page, false);
    await page.goto(`/seeker/settings?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
    await expect(page.locator('[data-screen-id="SEK-10"]')).toHaveCount(0);
  });
});
