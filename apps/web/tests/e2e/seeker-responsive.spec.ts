import { expect, test } from '@playwright/test';

const seekerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const requestId = '4123456789abcdef01234567';
const contactedRequestId = '5123456789abcdef01234567';

function localeForProject(): 'ar' | 'en' {
  return test.info().project.name.endsWith('-en') ? 'en' : 'ar';
}

function meta(requestIdValue: string) {
  return { meta: { requestId: requestIdValue } };
}

async function routeSession(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'seeker.responsive.token',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: { id: seekerId, roleType: 'seeker', status: 'verified' }
        },
        ...meta('seeker-responsive-refresh')
      })
    });
  });
}

async function routeSeekerApis(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/seeker/overview', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { requests: 1, viewings: 1, savedProperties: 1, notifications: 1, unreadNotifications: 1 }, ...meta('seeker-responsive-overview') }) });
  });
  await page.route('**/api/v1/seeker/requests**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const detail = pathname.endsWith(`/${requestId}`) || pathname.endsWith(`/${contactedRequestId}`);
    const contacted = pathname.endsWith(`/${contactedRequestId}`);
    const data = detail
      ? { id: contacted ? contactedRequestId : requestId, type: 'contact', source: 'seeker', propertyId: 'bbbbbbbbbbbbbbbbbbbbbbbb', status: contacted ? 'contacted' : 'under_review', payload: { message: 'Responsive test request' }, version: 0, availableActions: [], createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z' }
      : { items: [], page: 1, limit: 20, total: 0 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, ...meta('seeker-responsive-requests') }) });
  });
  await page.route('**/api/v1/seeker/viewings**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], page: 1, limit: 20, total: 0 }, ...meta('seeker-responsive-viewings') }) });
  });
  await page.route('**/api/v1/seeker/favorites**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], page: 1, limit: 20, total: 0 }, ...meta('seeker-responsive-favorites') }) });
  });
  await page.route('**/api/v1/seeker/notifications**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], unreadCount: 0, page: 1, limit: 20, total: 0 }, ...meta('seeker-responsive-notifications') }) });
  });
  await page.route('**/api/v1/me**', async route => {
    const preferences = new URL(route.request().url()).pathname.endsWith('/preferences');
    const data = preferences
      ? { preferences: {}, updatedAt: '2026-08-18T10:00:00.000Z' }
      : { id: seekerId, roleType: 'seeker', status: 'verified', email: 'responsive@example.com', firstName: 'Responsive', lastName: 'Seeker', locale: localeForProject() };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, ...meta('seeker-responsive-me') }) });
  });
}

const seekerRoutes = [
  '/seeker',
  '/seeker/requests',
  `/seeker/requests/${requestId}`,
  `/seeker/requests/${contactedRequestId}`,
  '/seeker/viewings',
  '/seeker/saved',
  '/seeker/notifications',
  '/seeker/profile?tab=preferences',
  '/seeker/profile?tab=personal',
  '/seeker/settings'
] as const;

function localizedPath(path: string, locale: 'ar' | 'en'): string {
  return `${path}${path.includes('?') ? '&' : '?'}lang=${locale}`;
}

test.describe('Seeker responsive shell', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile') && !testInfo.project.name.includes('tablet'), 'Responsive shell checks run on mobile and tablet projects.');
    await routeSession(page);
    await routeSeekerApis(page);
  });

  for (const path of seekerRoutes) {
    test(`keeps ${path} inside the viewport with a logical drawer`, async ({ page }) => {
      const locale = localeForProject();
      await page.goto(localizedPath(path, locale), { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.seeker-dashboard')).toBeVisible();
      await expect(page.locator('.seeker-dashboard__nav')).toHaveCount(1);
      await expect(page.locator('.seeker-dashboard__nav-icon .seeker-dashboard__icon')).toHaveCount(7);

      const initial = await page.evaluate(() => ({
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        search: document.querySelector<HTMLElement>('.seeker-dashboard__search')?.getBoundingClientRect().toJSON(),
        navTransform: getComputedStyle(document.querySelector<HTMLElement>('.seeker-dashboard__nav') as HTMLElement).transform
      }));
      expect(initial.documentWidth).toBeLessThanOrEqual(initial.viewport + 1);
      expect(initial.search?.left ?? -1).toBeGreaterThanOrEqual(-1);
      expect((initial.search?.right ?? initial.viewport + 1)).toBeLessThanOrEqual(initial.viewport + 1);
      expect(initial.navTransform).not.toBe('none');

      const menu = page.locator('.seeker-dashboard__menu-button');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('.seeker-dashboard__nav')).toHaveClass(/is-open/u);
      await expect(page.locator('.seeker-dashboard__backdrop')).toHaveClass(/is-open/u);
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
      await expect(page.locator('.seeker-dashboard__nav-close')).toBeVisible();
      await page.waitForTimeout(260);

      const openNav = await page.locator('.seeker-dashboard__nav').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, viewport: window.innerWidth };
      });
      if (locale === 'ar') expect(openNav.right).toBeGreaterThanOrEqual(openNav.viewport - 1);
      else expect(openNav.left).toBeLessThanOrEqual(1);

      await page.keyboard.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('.seeker-dashboard__nav')).not.toHaveClass(/is-open/u);
      await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    });
  }

  test('releases the mobile drawer lock when the viewport crosses to desktop', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(localizedPath('/seeker', locale), { waitUntil: 'domcontentloaded' });

    const menu = page.locator('.seeker-dashboard__menu-button');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.seeker-dashboard__nav')).not.toHaveClass(/is-open/u);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expect(page.locator('.seeker-dashboard__nav')).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
});

test.describe('Seeker adaptive desktop shell', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-ar', 'Adaptive desktop coverage runs once in the Arabic desktop project.');
    await routeSession(page);
    await routeSeekerApis(page);
  });

  for (const viewportWidth of [1024, 1551, 1920]) {
    test(`keeps every seeker page usable at ${viewportWidth}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewportWidth, height: 900 });
      for (const path of seekerRoutes) {
        await page.goto(localizedPath(path, 'ar'), { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.seeker-dashboard')).toBeVisible();
        if (viewportWidth === 1024) {
          const menu = page.locator('.seeker-dashboard__menu-button');
          await menu.click();
          await expect(menu).toHaveAttribute('aria-expanded', 'true');
          await expect(page.locator('.seeker-dashboard__nav')).toHaveClass(/is-open/u);
          await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
          await page.keyboard.press('Escape');
          await expect(menu).toHaveAttribute('aria-expanded', 'false');
          await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
        }
        const geometry = await page.evaluate(() => {
          const content = document.querySelector<HTMLElement>('.seeker-dashboard__content');
          const nav = document.querySelector<HTMLElement>('.seeker-dashboard__nav');
          const contentRect = content?.getBoundingClientRect();
          return {
            viewport: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            contentLeft: contentRect?.left ?? -1,
            contentRight: contentRect?.right ?? window.innerWidth + 1,
            contentWidth: contentRect?.width ?? 0,
            navTransform: nav === null ? 'missing' : getComputedStyle(nav).transform
          };
        });
        expect(geometry.documentWidth, path).toBeLessThanOrEqual(geometry.viewport + 1);
        expect(geometry.contentLeft, path).toBeGreaterThanOrEqual(-1);
        expect(geometry.contentRight, path).toBeLessThanOrEqual(geometry.viewport + 1);
        if (viewportWidth === 1024) expect(geometry.navTransform, path).not.toBe('none');
        else {
          expect(geometry.navTransform, path).toBe('none');
          expect(geometry.contentWidth, path).toBeGreaterThanOrEqual(1023);
          expect(geometry.contentWidth, path).toBeLessThanOrEqual(1025);
          await expect(page.locator('.seeker-dashboard__logout')).toBeVisible();
          await expect(page.locator('.seeker-dashboard__topbar-notifications')).toBeVisible();
        }
      }
    });
  }

  test('matches the SEK-01 desktop frame geometry at the Figma viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1551, height: 1033 });
    await page.goto(localizedPath('/seeker', 'ar'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.seeker-dashboard__nav')).toBeVisible();
    await expect(page.locator('.seeker-dashboard__summary-card')).toHaveCount(4);

    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
      const nav = rect('.seeker-dashboard__nav');
      const topbar = rect('.seeker-dashboard__topbar');
      const content = rect('.seeker-dashboard__content');
      const search = rect('.seeker-dashboard__search');
      const firstLink = rect('.seeker-dashboard__nav ul a');
      const cards = [...document.querySelectorAll<HTMLElement>('.seeker-dashboard__summary-card')].map(card => card.getBoundingClientRect());
      return {
        nav: nav && { width: nav.width },
        topbar: topbar && { height: topbar.height },
        content: content && { width: content.width },
        search: search && { width: search.width, height: search.height },
        firstLink: firstLink && { height: firstLink.height },
        cards: cards.map(card => ({ width: card.width, height: card.height }))
      };
    });

    expect(geometry.nav?.width).toBeCloseTo(256, 0);
    expect(geometry.topbar?.height).toBeCloseTo(64, 0);
    expect(geometry.content?.width).toBeCloseTo(1024, 0);
    expect(geometry.search?.width).toBeCloseTo(448, 0);
    expect(geometry.search?.height).toBeCloseTo(38, 0);
    expect(geometry.firstLink?.height).toBeCloseTo(44, 0);
    expect(geometry.cards).toHaveLength(4);
    for (const card of geometry.cards) {
      expect(card.width).toBeCloseTo(247, 0);
      expect(card.height).toBeCloseTo(128, 0);
    }
  });

  test('signs out from the Figma footer action and returns to login', async ({ page }) => {
    await page.route('**/api/v1/auth/logout', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { loggedOut: true }, ...meta('seeker-responsive-logout') })
    }));
    await page.goto(localizedPath('/seeker', 'ar'), { waitUntil: 'domcontentloaded' });
    const logout = page.locator('.seeker-dashboard__logout');
    await expect(logout).toBeVisible();
    await logout.click();
    await page.waitForURL(url => url.pathname === '/auth/login' && url.searchParams.get('lang') === 'ar');
  });
});
