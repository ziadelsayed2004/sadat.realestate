import { expect, test } from '@playwright/test';
import { adminCommunityPostFixture, adminCommunityReportFixture, adminCommunityCommentId, adminCommunityPostId, adminCommunityReportId, routeAdminCommunityApis } from './admin-community.fixtures.ts';
import { getAdminCommunityCopy } from '../../src/features/admin_community/copy.ts';

function localeForCommunity(): 'ar' | 'en' {
  const project = test.info().project.name;
  return project.endsWith('-en') ? 'en' : 'ar';
}

test('review immediately reveals and focuses the selected report below a long table', async ({ page }) => {
  await routeAdminCommunityApis(page);
  const rows = Array.from({ length: 20 }, (_, index) => ({ ...adminCommunityReportFixture(), id: (index + 1).toString(16).padStart(24, '0'), details: `Report details ${index + 1}` }));
  await page.route('**/api/v1/admin/community/reports**', route => route.fulfill({ json: { data: { items: rows, page: 1, limit: 20, total: 20, summary: { total: 20, open: 20, in_review: 0, resolved: 0, dismissed: 0 } }, meta: { requestId: 'long-report-list' } } }));
  const locale = localeForCommunity();
  const copy = getAdminCommunityCopy(locale);
  await page.goto(`/admin/community/moderation?lang=${locale}`);
  const review = page.getByTestId(`admin-community-report-${rows[0]!.id}`).getByRole('button', { name: copy.action.review });
  await review.click();
  const panel = page.getByTestId('admin-community-resolution');
  await expect(panel).toBeFocused();
  await expect(panel.getByText('Report details 1', { exact: true })).toBeInViewport();
  const bounds = await panel.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(80);
  expect(bounds!.y).toBeLessThan(page.viewportSize()!.height);
  await panel.getByRole('textbox', { name: copy.reason, exact: true }).fill('Keep this draft reason');
  await review.click();
  await expect(panel).toBeFocused();
  await expect(panel.getByText('Report details 1', { exact: true })).toBeInViewport();
  await expect(panel.getByRole('textbox', { name: copy.reason, exact: true })).toHaveValue('Keep this draft reason');
  await page.getByTestId(`admin-community-report-${rows[1]!.id}`).getByRole('button', { name: copy.action.review }).click();
  await expect(panel.getByText('Report details 2', { exact: true })).toBeInViewport();
  await expect(panel.getByRole('textbox', { name: copy.reason, exact: true })).toHaveValue('');
  await page.screenshot({ path: test.info().outputPath('report-review-jump.png') });
});

test('report totals stay visible when filtering to an empty status', async ({ page }) => {
  await routeAdminCommunityApis(page);
  const summary = { total: 2, open: 0, in_review: 0, resolved: 1, dismissed: 1 };
  await page.route('**/api/v1/admin/community/reports**', async route => {
    const status = new URL(route.request().url()).searchParams.get('status');
    const rows = [adminCommunityReportFixture('resolved'), { ...adminCommunityReportFixture('dismissed'), id: 'dddddddddddddddddddddddd' }].filter(row => status === null || row.status === status);
    await route.fulfill({ json: { data: { items: rows, total: rows.length, page: 1, limit: 20, summary }, meta: { requestId: 'report-summary-filter' } } });
  });
  const locale = localeForCommunity();
  const copy = getAdminCommunityCopy(locale);
  await page.goto(`/admin/community/moderation?lang=${locale}`);
  await expect(page.getByTestId('admin-community-summary-total')).toContainText(new Intl.NumberFormat(locale).format(2));
  for (const status of ['open', 'in_review'] as const) {
    await page.getByRole('tab', { name: copy.reportStatus[status], exact: true }).click();
    await expect(page.getByRole('heading', { name: copy.empty.title })).toBeVisible();
    await expect(page.getByTestId('admin-community-summary-total')).toContainText(new Intl.NumberFormat(locale).format(2));
    await expect(page.getByTestId('admin-community-summary-resolved')).toContainText(new Intl.NumberFormat(locale).format(1));
    await expect(page.getByTestId('admin-community-summary-dismissed')).toContainText(new Intl.NumberFormat(locale).format(1));
  }
  await page.screenshot({ path: test.info().outputPath('report-summary-empty-filter.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('tab', { name: copy.all, exact: true }).click();
  await expect(page.locator('[data-testid^="admin-community-report-"]')).toHaveCount(2);
});

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
