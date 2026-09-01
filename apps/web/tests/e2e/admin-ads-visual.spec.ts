import { expect, test } from '@playwright/test';
import { routeAdminAdsApis } from './admin-ads.fixtures.ts';

function localeForProject(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

const visualRoutes = [
  ['requests', '/admin/ads/requests', 'ADM-33'],
  ['pending-proofs', '/admin/ads/payment-proofs/pending', 'ADM-34'],
  ['approved-proofs', '/admin/ads/payment-proofs/approved', 'ADM-35'],
  ['calendar', '/admin/ads/calendar', 'ADM-36'],
  ['pending-review', '/admin/ads/payments/pending-review', 'ADM-37'],
  ['financial-review', '/admin/ads/financial-review', 'ADM-38']
] as const;

test('ADM-33 through ADM-38 match the approved desktop visual matrix', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  test.info().annotations.push({ type: 'design-source', description: 'Local final exports docs/design_sources/final_screens/admin/ADM-33.png through ADM-38.png; shared Figma node 6017:61879' });
  await routeAdminAdsApis(page);
  const locale = localeForProject();
  for (const [name, path, screenId] of visualRoutes) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-ads-${locale}-${name}.png`, { fullPage: true });
  }
});
