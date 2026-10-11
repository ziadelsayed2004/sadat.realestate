import { expect, test } from '@playwright/test';
import { adminCommunityPostFixture, adminCommunityReportFixture, routeAdminCommunityApis } from './admin-community.fixtures.ts';

test('reporter name links to the same admin account from the list and report review', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminCommunityApis(page);
  const report = { ...adminCommunityReportFixture(), reporterName: 'Real reporter account', reporterAccountAvailable: true };
  await page.route('**/api/v1/admin/community/reports**', route => route.fulfill({ json: { data: { items: [report], page: 1, limit: 20, total: 1, summary: { total: 1, open: 1, in_review: 0, resolved: 0, dismissed: 0 } }, meta: { requestId: 'reporter-name' } } }));
  await page.goto(`/admin/community/moderation?lang=${locale}`);
  const link = page.getByRole('link', { name: report.reporterName });
  await expect(link).toHaveAttribute('href', `/admin/users/${report.reporterId}?lang=${locale}`);
  await page.getByRole('button', { name: locale === 'ar' ? 'مراجعة' : 'Review', exact: true }).click();
  await expect(link).toHaveCount(2);
  await expect(page.getByTestId('admin-community-resolution').getByRole('link', { name: report.reporterName })).toBeInViewport();
});

test('deleting a community post requires explicit reason and retains input after a version conflict', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminCommunityApis(page);
  let post = adminCommunityPostFixture();
  let reject = true;
  let mutations = 0;
  await page.route('**/api/v1/admin/community/posts**', async route => {
    if (route.request().method() === 'POST') {
      mutations++;
      const body = route.request().postDataJSON();
      expect(body).toEqual({ action: 'remove', expectedVersion: post.version, reason: 'Remove duplicate community content' });
      if (reject) return route.fulfill({ status: 409, json: { error: { code: 'VERSION_CONFLICT', messageKey: 'errors.versionConflict', details: [], requestId: 'stale-delete' } } });
      post = { ...post, status: 'removed', version: post.version + 1 };
      return route.fulfill({ json: { data: { id: post.id, status: 'removed', version: post.version, createdAt: post.createdAt, updatedAt: post.updatedAt }, meta: { requestId: 'delete-success' } } });
    }
    await route.fulfill({ json: { data: { items: [post], page: 1, limit: 20, total: 1 }, meta: { requestId: 'posts' } } });
  });
  await page.goto(`/admin/community?lang=${locale}`);
  const label = locale === 'ar' ? 'حذف المنشور' : 'Delete post';
  await page.getByRole('button', { name: label, exact: true }).click();
  const panel = page.getByRole('region', { name: label, exact: true });
  await expect(panel).toBeFocused();
  await expect(panel.getByRole('button', { name: label, exact: true })).toBeDisabled();
  expect(mutations).toBe(0);
  await panel.getByRole('textbox').fill('Remove duplicate community content');
  await panel.getByRole('button', { name: label, exact: true }).click();
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(panel.getByRole('textbox')).toHaveValue('Remove duplicate community content');
  reject = false;
  await panel.getByRole('button', { name: locale === 'ar' ? 'إعادة المحاولة' : 'Retry', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: label, exact: true }).click();
  await panel.getByRole('textbox').fill('Remove duplicate community content');
  await panel.getByRole('button', { name: label, exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  expect(mutations).toBe(2);
});
