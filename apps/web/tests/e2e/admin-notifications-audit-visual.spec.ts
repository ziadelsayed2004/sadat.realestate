import { expect, test } from '@playwright/test';
import { auditId, routeAdminNotificationsAuditApis } from './admin-notifications-audit.fixtures.ts';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-65 and ADM-66 render stable Admin Desktop implementation baselines', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  test.info().annotations.push({ type: 'design-source', description: 'Implementation baseline follows approved Admin design-system and sibling Admin settings patterns; it is not an ADM-65/ADM-66 source export.' });
  await routeAdminNotificationsAuditApis(page);
  const locale = localeForProject();
  for (const [path, name] of [['/admin/notifications', 'admin-notifications'], ['/admin/audit-logs', 'admin-audit-log'], [`/admin/audit-logs/${auditId}`, 'admin-audit-detail']] as const) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-device-scope="desktop"][data-state="success"]')).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(`${name}-${locale}.png`, { fullPage: true, maxDiffPixels: 300 });
  }
});
