import { expect, test } from '@playwright/test';
import { adminCommunityPostFixture, adminCommunityCommentId, adminCommunityPostId, adminCommunityReportId, routeAdminCommunityApis } from './admin-community.fixtures.ts';

function localeForCommunity(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test.describe('ADM-27 through ADM-29 community administration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'design-source', description: 'ADM-27, ADM-28, and ADM-29 local final exports; Figma node 6017:61879; desktop scope.' });
    await routeAdminCommunityApis(page);
  });

  test('renders posts, comments, and reports with safe projections and server actions', async ({ page }) => {
    const locale = localeForCommunity();
    await page.goto(`/admin/community?lang=${encodeURIComponent(locale)}`);
    await expect(page.locator('[data-screen-id="ADM-27"]')).toBeVisible();
    await expect(page.getByTestId(`admin-community-post-${adminCommunityPostId}`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('admin-community.png') });
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

test('publishes, hides, and rejects posts through the administrative moderation form', async ({ page }) => {
  await routeAdminCommunityApis(page);
  let post = { ...adminCommunityPostFixture(), status: 'draft' };
  const decisions: unknown[] = [];
  await page.route('**/api/v1/admin/community/posts**', async route => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON();
      expect(input.expectedVersion).toBe(post.version);
      expect(input.reason).toBe('Reviewed for the community');
      decisions.push(input.action);
      post = { ...post, status: input.action === 'publish' ? 'published' : input.action === 'hide' ? 'hidden' : 'rejected', version: post.version + 1, updatedAt: new Date(Date.parse(post.updatedAt) + 1000).toISOString() };
      await route.fulfill({ json: { data: { id: post.id, status: post.status, version: post.version, createdAt: post.createdAt, updatedAt: post.updatedAt }, meta: { requestId: 'moderation-test' } } });
    } else await route.fulfill({ json: { data: { items: [post], page: 1, limit: 20, total: 1 }, meta: { requestId: 'moderation-list' } } });
  });
  const locale = localeForCommunity();
  await page.goto(`/admin/community?lang=${locale}`);
  for (const action of locale === 'ar' ? ['نشر المنشور', 'إخفاء المنشور', 'رفض المنشور'] : ['Publish post', 'Hide post', 'Reject post']) {
    await page.getByTestId(`admin-community-post-${adminCommunityPostId}`).getByRole('button').click();
    const form = page.locator('.admin-community__resolution');
    await expect(form.getByRole('button', { name: action })).toBeDisabled();
    await form.locator('textarea').fill('Reviewed for the community');
    await form.getByRole('button', { name: action }).click();
    await expect(form).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/app-navigating/);
    await expect(page.getByTestId(`admin-community-post-${adminCommunityPostId}`)).toBeVisible();
  }
  expect(decisions).toEqual(['publish', 'hide', 'reject']);
});

test('recovers from an empty post filter without a page refresh', async ({ page }) => {
  await routeAdminCommunityApis(page);
  let listRequests = 0;
  await page.route('**/api/v1/admin/community/posts**', async route => {
    if (route.request().method() !== 'GET') { await route.fallback(); return; }
    listRequests += 1;
    const empty = new URL(route.request().url()).searchParams.get('search') === 'no-results';
    await route.fulfill({ json: { data: { items: empty ? [] : [adminCommunityPostFixture()], page: 1, limit: 20, total: empty ? 0 : 1 }, meta: { requestId: `filter-${listRequests}` } } });
  });
  const locale = localeForCommunity();
  await page.goto(`/admin/community?lang=${locale}`);
  const form = page.getByRole('search');
  await form.locator('input[type="search"]').fill('no-results');
  await form.getByRole('button', { name: locale === 'ar' ? 'تطبيق' : 'Apply' }).click();
  await expect(page.locator('[data-state="empty"]')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/app-navigating/);
  await form.getByRole('button', { name: locale === 'ar' ? 'مسح' : 'Clear' }).click();
  await expect(page.getByTestId(`admin-community-post-${adminCommunityPostId}`)).toBeVisible();
  expect(listRequests).toBeGreaterThanOrEqual(3);
});
