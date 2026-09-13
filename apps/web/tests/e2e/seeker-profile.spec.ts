import { expect, test } from '@playwright/test';
import { getSeekerProfileCopy } from '../../src/features/seeker/profile-copy.ts';
import { getAccountSessionCopy } from '../../src/features/seeker/session-copy.ts';

const profileId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  if (project.endsWith('-en')) return 'en';
  return 'ar';
}

function successMeta(requestId: string) {
  return { meta: { requestId } };
}

function profileData(locale: 'ar' | 'en', firstName = locale === 'ar' ? 'محمد أحمد' : 'Mohamed Ahmed') {
  return {
    id: profileId,
    roleType: 'seeker',
    status: 'verified',
    email: 'm.salem@email.com',
    firstName,
    lastName: locale === 'ar' ? 'سالم' : 'Salem',
    locale
  };
}

function preferencesData() {
  return {
    preferences: {
      propertyTypes: ['apartment', 'duplex'],
      locations: ['district-1', 'district-3'],
      purpose: 'buy',
      minPrice: 500000,
      maxPrice: 1500000,
      minArea: 100,
      maxArea: 200,
      bedroomsMin: 3,
      bedroomsMax: 3,
      paymentMethod: 'any'
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
  let firstName: string | undefined;
  await page.route('**/api/v1/me**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer seeker.profile.token');
    const request = route.request();
    const url = new URL(request.url());
    const locale = (url.searchParams.get('lang') ?? new URL(page.url()).searchParams.get('lang') ?? 'ar') as 'ar' | 'en';
    if (url.pathname.endsWith('/sessions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [{ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', current: true, authenticationMethod: 'password', createdAt: '2026-08-18T10:00:00.000Z', lastUsedAt: '2026-08-18T10:30:00.000Z', expiresAt: '2026-09-18T10:00:00.000Z' }] }, ...successMeta('profile-sessions') })
      });
      return;
    }
    const isPreferences = url.pathname.endsWith('/preferences');
    if (request.method() === 'GET') {
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
      body: JSON.stringify({ data: isPreferences ? preferencesData() : profileData(locale, firstName), ...successMeta(isPreferences ? 'profile-preferences-update' : 'profile-update') })
    });
  });
}

test.describe('SEK-08/09/10 Seeker profile, preferences, and settings', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'screen-id', description: 'SEK-08, SEK-09, SEK-10' });
    testInfo.annotations.push({ type: 'design-source', description: 'SEK-08.png (Figma node 6027:6850), SEK-09.png (Figma node 6027:5677), SEK-10.png (Figma node 6027:6531)' });
    await routeSession(page);
    await routeProfile(page);
  });

  test('renders localized screens, safe projections, keyboard focus, and visual baselines', async ({ page }) => {
    test.skip(!test.info().project.name.includes('desktop'), 'Canonical visual baselines are desktop-only; responsive and save contracts run on every device.');
    const locale = localeForProject();
    const copy = getSeekerProfileCopy(locale);
    const query = `lang=${encodeURIComponent(locale)}`;

    await page.goto(`/seeker/profile?tab=preferences&${query}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-screen-id="SEK-08"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.route-shell--seeker')).toHaveAttribute('data-device-scope', 'desktop');
    await expect(page.locator('#seeker-preferences-min-price')).toHaveValue('500000');
    await expect(page.locator('#seeker-preferences-max-price')).toHaveValue('1500000');
    await expect(page.locator('#seeker-preferences-min-area')).toHaveValue('100');
    await expect(page.locator('#seeker-preferences-max-area')).toHaveValue('200');
    await expect(page.locator('.seeker-profile__choice--chip[data-selected="true"]')).toHaveCount(4);
    await expect(page.locator('.seeker-profile__choice--bedroom[data-selected="true"]')).toHaveText('3');
    const tabsBox = await page.locator('.seeker-profile__tabs').boundingBox();
    const panelBox = await page.locator('.seeker-profile__panel').boundingBox();
    expect(tabsBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    if (tabsBox !== null && panelBox !== null) {
      const tabsEdge = locale === 'ar' ? tabsBox.x + tabsBox.width : tabsBox.x;
      const panelEdge = locale === 'ar' ? panelBox.x + panelBox.width : panelBox.x;
      expect(Math.abs(tabsEdge - panelEdge)).toBeLessThanOrEqual(2);
    }
    await page.locator('.a11y-skip-link').focus();
    await expect(page.locator('.a11y-skip-link')).toBeFocused();
    await page.getByRole('link', { name: copy.tabs.profile }).focus();
    await expect(page.getByRole('link', { name: copy.tabs.profile })).toBeFocused();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
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
    await expect(page.locator('.seeker-profile__settings-card[aria-labelledby="seeker-profile-sessions-title"]')).toHaveAttribute('data-state', 'success');
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
    await page.locator('#seeker-preferences-max-price').fill('2500000');
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

  for (const tab of ['personal', 'preferences']) test(`preserves ${tab} draft after failed save and retries without reload`, async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerProfileCopy(locale);
    const endpoint = tab === 'personal' ? '/api/v1/me' : '/api/v1/me/preferences';
    let attempts = 0;
    const bodies: unknown[] = [];
    await page.route(`**${endpoint}`, async route => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      attempts += 1;
      bodies.push(route.request().postDataJSON());
      if (attempts === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', details: [], requestId: 'save-retry' } }) });
      return route.fallback();
    });
    await page.goto(`/seeker/profile?tab=${tab}&lang=${locale}`, { waitUntil: 'domcontentloaded' });
    const field = page.locator(tab === 'personal' ? '#seeker-profile-first-name' : '#seeker-preferences-max-price');
    const value = tab === 'personal' ? 'Mariam' : '2500000';
    await field.fill(value);
    const origin = await page.evaluate(() => performance.timeOrigin);
    const save = page.locator('.seeker-profile__form > button');
    await save.click();
    await expect(page.getByRole('alert')).toContainText(copy.states.retry.body);
    await expect(field).toHaveValue(value);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.locator('.seeker-profile__feedback[data-state="success"]')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(attempts).toBe(2);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  });

  for (const tab of ['personal', 'preferences']) test(`hides ${tab} form when save permission is denied`, async ({ page }) => {
    const locale = localeForProject();
    const copy = getSeekerProfileCopy(locale);
    const endpoint = tab === 'personal' ? '/api/v1/me' : '/api/v1/me/preferences';
    await page.route(`**${endpoint}`, async route => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'save-denied' } }) });
    });
    await page.goto(`/seeker/profile?tab=${tab}&lang=${locale}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.seeker-profile__form > button').click();
    await expect(page.getByText(copy.states.permission.title, { exact: true })).toBeVisible();
    await expect(page.locator('.seeker-profile__form')).toHaveCount(0);
  });
});

test('recovers session inventory and failed revocation without navigation', async ({ page }) => {
  await routeSession(page);
  await routeProfile(page);
  const locale = localeForProject();
  const copy = getAccountSessionCopy(locale);
  const otherId = 'cccccccccccccccccccccccc';
  let reads = 0;
  let deletes = 0;
  let revoked = false;
  await page.route('**/api/v1/me/sessions**', async route => {
    const request = route.request();
    const fail = () => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', messageKey: 'errors.serviceUnavailable', details: [], requestId: 'sessions-recovery' } }) });
    if (request.method() === 'DELETE') {
      expect(new URL(request.url()).pathname).toBe(`/api/v1/me/sessions/${otherId}`);
      deletes += 1;
      if (deletes === 1) return fail();
      revoked = true;
      return route.fulfill({ json: { data: { sessionId: otherId, revoked: true }, ...successMeta('sessions-revoked') } });
    }
    reads += 1;
    if (reads === 1) return fail();
    const item = (id: string, current: boolean) => ({ id, current, authenticationMethod: 'password', createdAt: '2026-09-10T08:00:00.000Z', lastUsedAt: null, expiresAt: '2026-10-10T08:00:00.000Z' });
    return route.fulfill({ json: { data: { items: [item('bbbbbbbbbbbbbbbbbbbbbbbb', true), ...(revoked ? [] : [item(otherId, false)])] }, ...successMeta('sessions-read') } });
  });
  await page.goto(`/seeker/settings?lang=${locale}`, { waitUntil: 'domcontentloaded' });
  const card = page.locator('[aria-labelledby="seeker-profile-sessions-title"]');
  await expect(card).toHaveAttribute('data-state', 'error');
  const origin = await page.evaluate(() => performance.timeOrigin);
  await card.getByRole('button', { name: copy.retry, exact: true }).click();
  await expect(card).toHaveAttribute('data-state', 'success');
  await expect(card.locator('.seeker-profile__session')).toHaveCount(2);
  await card.getByRole('button', { name: copy.revoke, exact: true }).click();
  await expect(card.getByRole('status')).toHaveText(copy.error);
  await expect(card.locator('.seeker-profile__session')).toHaveCount(2);
  await card.getByRole('button', { name: copy.revoke, exact: true }).click();
  await expect(card.getByRole('status')).toHaveText(copy.revoked);
  await expect(card.locator('.seeker-profile__session')).toHaveCount(1);
  await expect(card.locator('.seeker-profile__session')).toHaveAttribute('data-current', 'true');
  await expect(card.getByRole('button', { name: copy.revokeOthers, exact: true })).toBeDisabled();
  expect(deletes).toBe(2);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  expect(await page.evaluate(() => innerWidth)).toBe(page.viewportSize()!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test.describe('SEK-08/09 profile responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await routeSession(page);
    await routeProfile(page);
  });

  for (const tab of ['preferences', 'personal']) test(`keeps ${tab} headings, tabs and save control inside the content surface`, async ({ page }, testInfo) => {
    const locale = localeForProject();
    await page.goto(`/seeker/profile?tab=${tab}&lang=${locale}`, { waitUntil: 'domcontentloaded' });

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(page.viewportSize()!.width);
    const save = page.locator('.seeker-profile__form > button');
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
    const saveBox = await save.boundingBox();
    expect(saveBox).not.toBeNull();
    expect(saveBox!.x).toBeGreaterThanOrEqual(0);
    expect(saveBox!.x + saveBox!.width).toBeLessThanOrEqual(viewportWidth);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const heading = await page.locator('.seeker-dashboard__heading-row h1').boundingBox();
    const description = await page.locator('.seeker-dashboard__heading-row p:last-child').boundingBox();
    const tabs = await page.locator('.seeker-profile__tabs').boundingBox();
    const panel = await page.locator('.seeker-profile__panel').boundingBox();
    expect(heading).not.toBeNull();
    expect(description).not.toBeNull();
    expect(tabs).not.toBeNull();
    expect(panel).not.toBeNull();
    if (heading !== null && description !== null) {
      const gap = description.y - (heading.y + heading.height);
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(16);
    }
    if (tabs !== null && panel !== null) {
      expect(tabs.x).toBeGreaterThanOrEqual(-1);
      expect(tabs.x + tabs.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      if (testInfo.project.name.includes('desktop')) {
        const tabsEdge = locale === 'ar' ? tabs.x + tabs.width : tabs.x;
        const panelEdge = locale === 'ar' ? panel.x + panel.width : panel.x;
        expect(Math.abs(tabsEdge - panelEdge)).toBeLessThanOrEqual(2);
      }
    }
  });

  test('keeps SEK-08 source controls contained at desktop, tablet, and Pixel 5 widths', async ({ page }) => {
    const locale = localeForProject();
    for (const viewport of [{ width: 1551, height: 862 }, { width: 768, height: 900 }, { width: 393, height: 851 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/seeker/profile?tab=preferences&lang=${locale}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.seeker-profile__choice--chip[data-selected="true"]')).toHaveCount(4);
      const geometry = await page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>('.seeker-profile__panel')?.getBoundingClientRect();
        const save = document.querySelector<HTMLElement>('.seeker-profile__form > button')?.getBoundingClientRect();
        return {
          viewport: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          panelLeft: panel?.left ?? -1,
          panelRight: panel?.right ?? innerWidth + 1,
          saveLeft: save?.left ?? -1,
          saveRight: save?.right ?? innerWidth + 1
        };
      });
      expect(geometry.documentWidth, `${locale} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.panelLeft, `${locale} at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(geometry.panelRight, `${locale} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.saveLeft, `${locale} at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(geometry.saveRight, `${locale} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
    }
  });

  test('keeps SEK-09 identity fields contained at desktop, tablet, and Pixel 5 widths', async ({ page }) => {
    const locale = localeForProject();
    for (const viewport of [{ width: 1551, height: 862 }, { width: 768, height: 900 }, { width: 393, height: 851 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/seeker/profile?tab=personal&lang=${locale}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#seeker-profile-first-name')).toHaveValue(locale === 'ar' ? 'محمد أحمد' : 'Mohamed Ahmed');
      await expect(page.locator('#seeker-profile-email')).toHaveValue('m.salem@email.com');
      const geometry = await page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>('.seeker-profile__panel')?.getBoundingClientRect();
        const save = document.querySelector<HTMLElement>('.seeker-profile__form > button')?.getBoundingClientRect();
        return {
          viewport: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          panelLeft: panel?.left ?? -1,
          panelRight: panel?.right ?? innerWidth + 1,
          saveLeft: save?.left ?? -1,
          saveRight: save?.right ?? innerWidth + 1
        };
      });
      expect(geometry.documentWidth, `${locale} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.panelLeft, `${locale} at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(geometry.panelRight, `${locale} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.saveLeft, `${locale} at ${viewport.width}px`).toBeGreaterThanOrEqual(-1);
      expect(geometry.saveRight, `${locale} at ${viewport.width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
    }
  });
});
