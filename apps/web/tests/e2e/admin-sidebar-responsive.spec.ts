import { expect, test, type Page } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  return test.info().project.name.endsWith('-en') ? 'en' : 'ar';
}

async function openCompactSidebar(page: Page) {
  if ((page.viewportSize()?.width ?? 0) <= 1100) {
    const toggle = page.getByTestId('admin-sidebar-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
}

test.describe('Admin sidebar responsive shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            accessToken: 'admin.sidebar.responsive',
            tokenType: 'Bearer',
            expiresInSeconds: 900,
            user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'admin', status: 'verified' }
          },
          meta: { requestId: 'admin-sidebar-responsive-refresh' }
        })
      });
    });
    await page.route('**/api/v1/admin/overview**', async route => {
      const url = new URL(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            range: { from: url.searchParams.get('from'), to: url.searchParams.get('to') },
            metrics: { users: 1, seekers: 1, providers: 1, verifiedProviders: 1, publishedProperties: 1, openRequests: 1, pendingReviews: 1 },
            generatedAt: '2026-08-19T09:00:00.000Z'
          },
          meta: { requestId: 'admin-sidebar-responsive-data' }
        })
      });
    });
  });

  test('keeps the detailed navigation usable without page overflow', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);
    await openCompactSidebar(page);
    await expect(page.getByTestId('admin-sidebar')).toBeVisible();
    await expect(page.getByTestId('admin-sidebar').locator('a')).toHaveCount(53);
    await expect(page.getByTestId('admin-sidebar').locator('.admin-dashboard__navigation-scroll')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewport);
    await page.screenshot({ path: test.info().outputPath('admin-overview.png') });
  });

  test('keeps the admin logout action visible and functional', async ({ page }) => {
    const locale = localeForProject();
    await page.route('**/api/v1/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { loggedOut: true }, meta: { requestId: 'admin-sidebar-logout' } })
      });
    });
    await page.goto(`/admin?lang=${encodeURIComponent(locale)}`);
    await openCompactSidebar(page);
    const logout = page.locator('[data-testid="admin-logout-button"]:visible');
    await expect(logout).toHaveCount(1);
    await expect(logout).toBeEnabled();
    if ((page.viewportSize()?.width ?? 0) > 1100) {
      const box = await logout.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    }
    await logout.click();
    await expect(page).toHaveURL(new RegExp(`/auth/login\\?lang=${locale}$`, 'u'));
  });

  test('collapses each category independently and restores the active route on reload', async ({ page }) => {
    await page.goto(`/admin?lang=${localeForProject()}`);
    await openCompactSidebar(page);
    const sidebar = page.getByTestId('admin-sidebar');
    const toggles = sidebar.locator('button[aria-controls]');
    await expect(toggles).toHaveCount(8);
    for (const toggle of await toggles.all()) {
      const id = await toggle.getAttribute('aria-controls');
      if (id === 'admin-navigation-home') {
        await toggle.press('Enter');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        continue;
      }
      await toggle.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator(`#${id}`)).toBeHidden();
      await toggle.press('Enter');
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await sidebar.locator('[aria-controls="admin-navigation-content"]').click();
    await sidebar.locator('[aria-controls="admin-navigation-home"]').click();
    await page.reload();
    await openCompactSidebar(page);
    await expect(page.locator('#admin-navigation-content')).toBeHidden();
    await expect(sidebar.locator('a[aria-current="page"]')).toBeVisible();
  });

  test('keeps navigation pinned during page scroll and card spacing bounded', async ({ page }) => {
    await page.goto(`/admin?lang=${localeForProject()}`);
    const sidebar = page.getByTestId('admin-sidebar');
    await expect(page.locator('.admin-dashboard__metric').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 650));
    if ((page.viewportSize()?.width ?? 0) <= 1100) await openCompactSidebar(page);
    await expect.poll(async () => Math.round((await sidebar.boundingBox())?.y ?? -1)).toBe(64);
    if ((page.viewportSize()?.width ?? 0) > 1100) {
      const box = await sidebar.boundingBox();
      expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      const gap = await page.locator('.admin-dashboard__metric-grid').first().evaluate(element => getComputedStyle(element).gap);
      expect(gap).toBe('12px');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('uses a rounded focus ring for native selects on touch screens', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 1100, 'Touch focus regression applies to compact layouts.');
    await page.goto(`/admin?lang=${localeForProject()}`);
    await page.locator('main').evaluate(main => {
      const select = document.createElement('select');
      select.id = 'touch-focus-regression-select';
      select.setAttribute('aria-label', 'Touch focus regression');
      select.innerHTML = '<option>One</option><option>Two</option>';
      main.prepend(select);
    });
    const select = page.locator('#touch-focus-regression-select');
    await select.focus();
    const style = await select.evaluate(element => {
      const computed = getComputedStyle(element);
      return {
        outlineStyle: computed.outlineStyle,
        boxShadow: computed.boxShadow,
        borderRadius: computed.borderRadius,
        tapHighlight: computed.getPropertyValue('-webkit-tap-highlight-color')
      };
    });
    expect(style.outlineStyle).toBe('none');
    expect(style.boxShadow).not.toBe('none');
    expect(style.borderRadius).not.toBe('0px');
    expect(style.tapHighlight).toBe('rgba(0, 0, 0, 0)');
  });

  test('brings the active route into view in the compact navigation rail', async ({ page }) => {
    const locale = localeForProject();
    await page.goto(`/admin/settings/seo?lang=${locale}`);
    await openCompactSidebar(page);
    const sidebar = page.getByTestId('admin-sidebar');
    const scroll = sidebar.locator('.admin-dashboard__navigation-scroll');
    const active = sidebar.locator('a[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect.poll(async () => active.evaluate(element => {
      const item = element.getBoundingClientRect();
      const container = element.closest('.admin-dashboard__navigation-scroll')!.getBoundingClientRect();
      const tolerance = 1;
      return item.left >= container.left - tolerance && item.right <= container.right + tolerance && item.top >= container.top - tolerance && item.bottom <= container.bottom + tolerance;
    })).toBe(true);
    if ((page.viewportSize()?.width ?? 0) <= 1100) {
      await expect(scroll).toBeVisible();
    }
  });

  test('opens from the logical edge with a bounded toggle and animated backdrop', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 1100, 'Drawer behavior applies to tablet and mobile widths.');
    const locale = localeForProject();
    await page.goto(`/admin?lang=${locale}`);
    const viewport = page.viewportSize()!;
    const toggle = page.getByTestId('admin-sidebar-toggle');
    const sidebar = page.getByTestId('admin-sidebar');
    const backdrop = page.getByTestId('admin-sidebar-backdrop');
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(toggleBox!.x).toBeGreaterThanOrEqual(0);
    expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(viewport.width);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar).toBeHidden();
    await toggle.click();
    await expect(sidebar).toBeVisible();
    await expect(backdrop).toBeVisible();
    await expect.poll(async () => sidebar.evaluate(element => {
      const box = element.getBoundingClientRect();
      const shell = element.closest('.route-shell')!;
      return shell.getAttribute('dir') === 'rtl' ? Math.round(innerWidth - box.right) : Math.round(box.left);
    })).toBe(0);
    const geometry = await sidebar.evaluate(element => {
      const box = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), transitionProperty: styles.transitionProperty };
    });
    expect(geometry.top).toBe(64);
    expect(geometry.transitionProperty).toContain('transform');
    expect(locale === 'ar' ? geometry.right : geometry.left).toBe(locale === 'ar' ? viewport.width : 0);
    await backdrop.click({ position: { x: locale === 'ar' ? 2 : viewport.width - 2, y: 2 } });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar).toBeHidden();
    await toggle.click();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });
});
