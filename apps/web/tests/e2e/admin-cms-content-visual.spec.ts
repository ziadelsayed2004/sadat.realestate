import { expect, test } from '@playwright/test';
import { adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

function localeForAdminCms(): 'ar' | 'en' | 'zh-CN' {
  const project = test.info().project.name;
  return project.endsWith('-zh') ? 'zh-CN' : project.endsWith('-en') ? 'en' : 'ar';
}

test('ADM-30, ADM-31, and ADM-32 match the approved desktop visual baselines', async ({ page }) => {
  test.skip(!test.info().project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
  test.info().annotations.push({ type: 'design-source', description: 'ADM-30/31/32 local final admin exports with recorded SHA values in the frontend_069 completion evidence; Figma node 6017:61879; Drive folders 1T4o9bQ0ebHJpX-fNIpRKDczlk3F37daH, 1k7lhpKe1sM8O1hQoLs6fTgY-88f_dlTf, and 1JWQ-qEIvxxqHBPnsGz2xDA2_kMG_sq7s.' });
  const locale = localeForAdminCms();
  await page.route('**/api/v1/auth/refresh', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ accessToken: 'admin.cms.visual', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'admin-cms-visual-refresh')) }));
  await page.route('**/api/v1/admin/content/**', async route => {
    const url = new URL(route.request().url());
    const namespace = url.pathname.endsWith('/team') ? 'team' : url.pathname.endsWith('/population') ? 'population' : 'about';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope(adminCmsContentFor(namespace), `admin-cms-visual-${namespace}`)) });
  });

  for (const [path, screenId, snapshot] of [
    ['/admin/content/about', 'ADM-30', `admin-cms-content-${locale}-about.png`],
    ['/admin/content/team', 'ADM-31', `admin-cms-content-${locale}-team.png`],
    ['/admin/content/population-counter', 'ADM-32', `admin-cms-content-${locale}-population.png`]
  ] as const) {
    await page.goto(`${path}?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();
    await expect(page).toHaveScreenshot(snapshot, { fullPage: true, maxDiffPixels: 300 });
  }
});
