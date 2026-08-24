import { expect, test } from '@playwright/test';
import { adminCommissionAccountId, routeAdminCommissionApis } from './admin-commissions.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

const visualRoutes = [
  ['policies', '/admin/commissions', 'ADM-39'],
  ['new-policy', '/admin/commissions/new', 'ADM-40'],
  ['history', '/admin/commissions/history', 'ADM-41'],
  ['account', `/admin/commissions/account?accountId=${adminCommissionAccountId}`, 'ADM-42'],
  ['exceptions', '/admin/commissions/exceptions', 'ADM-43'],
  ['new-exception', '/admin/commissions/exceptions/new', 'ADM-44'],
  ['confirmations', '/admin/commissions/confirmations', 'ADM-45']
] as const;

for (const [name, path, screenId] of visualRoutes) {
  test(`${screenId} matches the approved desktop visual matrix`, async ({ page }) => {
    test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    test.info().annotations.push({ type: 'design-source', description: `Checked-in local final export docs/design_sources/final_screens/admin/${screenId}.png; per-screen Drive reference in DESIGN_SOURCE_MANIFEST.json; shared Figma prototype node 6017:61879.` });
    await routeAdminCommissionApis(page);
    const locale = localeForProject();
    await page.goto(`${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
    await page.evaluate(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      for (const select of document.querySelectorAll('select')) select.blur();
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`admin-commissions-${locale}-${name}.png`, { fullPage: true, maxDiffPixels: 256 });
  });
}
