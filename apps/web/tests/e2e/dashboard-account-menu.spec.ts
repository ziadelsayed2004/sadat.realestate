import { expect, test, type Page } from '@playwright/test';
import { routeAdminSettingsApis } from './admin-settings.fixtures';

const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const envelope = (data: unknown) => ({ data, meta: { requestId: 'dashboard-account-menu' } });
const accounts = ['seeker', 'individual_broker', 'brokerage_office', 'developer_company', 'admin'] as const;

async function setup(page: Page, account: typeof accounts[number], locale: 'ar' | 'en') {
  const role = account === 'seeker' || account === 'admin' ? account : 'provider';
  if (role === 'admin') await routeAdminSettingsApis(page);
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: envelope({ accessToken: 'account.menu.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id, roleType: role, status: 'verified' } }) }));
  await page.route('**/api/v1/me**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/sessions') ? { items: [] } : path.endsWith('/preferences') ? { preferences: {}, updatedAt: '2026-10-07T10:00:00.000Z' } : { id, roleType: 'seeker', status: 'verified', email: 'customer@example.com', firstName: locale === 'ar' ? 'أحمد' : 'Ahmed', lastName: 'Customer', locale };
    return route.fulfill({ json: envelope(data) });
  });
  await page.route('**/api/v1/seeker/notifications**', route => route.fulfill({ json: envelope({ items: [], unreadCount: 0, page: 1, limit: 20, total: 0 }) }));
  await page.route('**/api/v1/provider/application/status', route => route.fulfill({ json: envelope({ applicationId: id, providerType: account, status: 'approved', version: 1, availableActions: ['open_dashboard'] }) }));
  await page.route('**/api/v1/provider/settings', route => route.fulfill({ json: envelope({ version: 1, email: 'provider@example.com', whatsappNumber: '+201000000000', officeAddress: 'Sadat City', website: 'https://example.com', availableActions: ['update_email', 'update_contact'] }) }));
  return role;
}

for (const account of accounts) {
  test(`${account} has a guide icon, a working account dropdown and readable settings`, async ({ page }) => {
    const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
    const role = await setup(page, account, locale);
    let logouts = 0;
    await page.route('**/api/v1/auth/logout', async route => { logouts += 1; expect(route.request().method()).toBe('POST'); await route.fulfill({ json: envelope({ loggedOut: true }) }); });
    const paths = role === 'seeker' ? ['/seeker/settings', '/seeker/profile?tab=personal'] : role === 'provider' ? ['/provider/settings', '/provider/settings?tab=contact', '/provider/settings?tab=security'] : ['/admin/settings/platform', '/admin/settings/contact', '/admin/settings/requests'];
    for (const path of paths) {
      await page.goto(`${path}${path.includes('?') ? '&' : '?'}lang=${locale}`);
      const surface = page.locator(role === 'seeker' ? '.seeker-profile__settings, .seeker-profile__panel' : role === 'provider' ? '.provider-settings__panel' : '.admin-settings__editor').first();
      await expect(surface).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      if (page.viewportSize()!.width <= 700) {
        const fields = surface.locator('input:not([type=checkbox]), select, textarea');
        for (let index = 0; index < await fields.count(); index += 1) {
          const field = fields.nth(index);
          expect(await field.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
          const bounds = await field.boundingBox();
          expect(bounds!.height).toBeGreaterThanOrEqual(44);
          expect(bounds!.x).toBeGreaterThanOrEqual(0);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
        }
      }
      if (path === paths[0]) await page.screenshot({ path: test.info().outputPath('settings-primary.png'), fullPage: true });
    }
    await page.screenshot({ path: test.info().outputPath('settings.png'), fullPage: true });
    const trigger = page.getByRole('button', { name: locale === 'ar' ? 'قائمة الحساب' : 'Account menu', exact: true });
    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await expect(menu.getByRole('menuitem', { name: locale === 'ar' ? 'دليل الاستخدام' : 'User guide' })).toHaveAttribute('href', `/${role}/user-guide?lang=${locale}`);
    await page.screenshot({ path: test.info().outputPath('account-menu.png') });
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.mouse.click(page.viewportSize()!.width - 4, page.viewportSize()!.height - 120);
    await expect(menu).toHaveCount(0);
    const sidebar = page.locator(role === 'admin' ? '.admin-dashboard__navigation' : role === 'provider' ? '.provider-dashboard__navigation' : '.seeker-dashboard__nav');
    await expect(sidebar.locator(`a[href="/${role}/user-guide?lang=${locale}"] [data-user-guide-icon]`)).toHaveCount(1);
    if (page.viewportSize()!.width <= 620) {
      const toggle = page.locator(role === 'admin' ? '[data-testid="admin-sidebar-toggle"]' : role === 'provider' ? '.provider-dashboard__menu-button' : '.seeker-dashboard__menu-button');
      await toggle.click();
      await expect(sidebar.locator(`a[href="/${role}/user-guide?lang=${locale}"] [data-user-guide-icon]`)).toBeVisible();
      await (role === 'seeker' ? sidebar.locator('.seeker-dashboard__nav-close') : toggle).click();
    }
    if (page.viewportSize()!.width <= 700) {
      await page.setViewportSize({ width: 320, height: 800 });
      const header = page.locator(role === 'admin' ? '.route-shell__header' : `.${role}-dashboard__topbar`);
      const controls = header.locator('button:visible');
      const boxes = [];
      for (let index = 0; index < await controls.count(); index += 1) {
        const box = (await controls.nth(index).boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(321);
        for (const other of boxes) expect(box.x >= other.x + other.width - 1 || other.x >= box.x + box.width - 1 || box.y >= other.y + other.height - 1 || other.y >= box.y + box.height - 1).toBe(true);
        boxes.push(box);
      }
    }
    await trigger.click();
    await menu.getByRole('menuitem', { name: locale === 'ar' ? 'تسجيل الخروج' : 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/auth/login\\?lang=${locale}$`, 'u'));
    expect(logouts).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('sadat-real-estate.auth.session-hint'))).toBe('anonymous');
  });
}
