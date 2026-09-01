import { expect, test } from '@playwright/test';
import { adminCommunityCommentId, adminCommunityPostId, adminCommunityReportId, routeAdminCommunityApis } from './admin-community.fixtures.ts';

function localeForCommunity(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test.describe('ADM-27 through ADM-29 community administration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-27, ADM-28, and ADM-29 local final exports; Figma node 6017:61879; desktop scope.' });
    test.skip(!testInfo.project.name.includes('desktop'), 'Admin dashboard is approved for desktop only.');
    await routeAdminCommunityApis(page);
  });

  test('renders posts, comments, and reports with safe projections and server actions', async ({ page }) => {
    const locale = localeForCommunity();
    await page.goto(`/admin/community?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-27"]')).toBeVisible();
    await expect(page.getByTestId(`admin-community-post-${adminCommunityPostId}`)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('body')).not.toContainText(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);

    await page.goto(`/admin/community/comments?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-28"]')).toBeVisible();
    await expect(page.getByTestId(`admin-community-comment-${adminCommunityCommentId}`)).toBeVisible();

    await page.goto(`/admin/community/moderation?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-29"]')).toBeVisible();
    await expect(page.getByTestId(`admin-community-report-${adminCommunityReportId}`)).toBeVisible();
    await page.getByRole('button', { name: /review|مراجعة|审核/iu }).click();
    await page.getByLabel(/decision reason|سبب القرار|决定原因/iu).fill('Moderation decision recorded.');
    await page.getByRole('button', { name: /confirm|تأكيد|确认/iu }).click();
    await expect(page.getByTestId(`admin-community-report-${adminCommunityReportId}`).getByText(/resolved|تم الحل|已解决/iu)).toBeVisible();
  });

  test('fails closed when the administrator session cannot refresh', async ({ page }) => {
    await routeAdminCommunityApis(page, false);
    await page.goto('/admin/community?lang=en');
    await expect(page.locator('[data-state="permission"]')).toBeVisible();
  });
});
