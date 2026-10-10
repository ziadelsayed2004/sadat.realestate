import { expect, test } from '@playwright/test';
import { adminRequestFixture, adminRequestId, adminViewingId, routeAdminRequestApis } from './admin-requests.fixtures.ts';

test('request type filters retain all requests and acknowledge only opened details', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  await routeAdminRequestApis(page);
  const requestIds = { contact: adminRequestId, property_search: 'aaaaaaaaaaaaaaaaaaaaaaa1', provider_customer: 'aaaaaaaaaaaaaaaaaaaaaaa2' };
  await page.route('**/api/v1/admin/requests?**', async route => {
    const type = new URL(route.request().url()).searchParams.get('type');
    const items = Object.entries(requestIds).filter(([key]) => type === null || key === type).map(([type, id]) => ({ ...adminRequestFixture(), type, id }));
    await route.fulfill({ json: { data: { items, total: items.length, page: 1, limit: 20 }, meta: { requestId: 'requests-by-type' } } });
  });
  const counts = { 'contact-requests': 2, 'viewing-requests': 3, 'search-requests': 4, 'customer-requests': 5 };
  const reads: unknown[] = [];
  await page.route('**/api/v1/admin/notifications**', async route => {
    if (route.request().method() === 'POST') {
      reads.push(route.request().postDataJSON());
      counts['contact-requests'] = 1;
      await route.fulfill({ json: { data: { updatedCount: 1 }, meta: { requestId: 'filter-detail-read' } } });
    } else {
      await route.fulfill({ json: { data: { items: [], unreadCount: 0, total: 0, page: 1, limit: 1, attention: { counts, total: Object.values(counts).reduce((a, b) => a + b, 0) } }, meta: { requestId: 'filter-alerts' } } });
    }
  });
  await page.goto(`/admin/requests?lang=${locale}`);
  await expect(page.getByTestId('admin-attention-filter-requests')).toHaveText('14');
  await expect(page.getByTestId('request-type-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(locale === 'ar' ? /الأرقام الحمراء للطلبات غير المقروءة/ : /Red badges show unread requests/)).toBeVisible();
  for (const type of ['all', 'contact', 'viewing', 'property_search', 'provider_customer']) {
    const bounds = await page.getByTestId(`request-type-${type}`).boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await page.screenshot({ path: testInfo.outputPath('request-type-filters.png'), fullPage: true });
  for (const type of ['contact', 'property_search', 'provider_customer'] as const) {
    const response = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === '/api/v1/admin/requests' && url.searchParams.get('type') === type && url.searchParams.get('page') === '1';
    });
    await page.getByTestId(`request-type-${type}`).click();
    await response;
    await expect(page.getByTestId(`request-type-${type}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.admin-requests__table--requests tbody tr')).toHaveCount(1);
    await expect(page.getByTestId(`admin-request-${requestIds[type]}`)).toBeVisible();
  }
  const viewings = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/admin/viewings');
  await page.getByTestId('request-type-viewing').click();
  await viewings;
  await expect(page.getByTestId(`admin-viewing-${adminViewingId}`)).toBeVisible();
  await expect(page.getByTestId(`admin-request-${adminRequestId}`)).toHaveCount(0);
  expect(reads).toEqual([]);
  await expect(page.getByTestId('admin-attention-filter-requests')).toHaveText('14');
  await page.getByTestId('request-type-all').click();
  await expect(page.getByTestId(`admin-request-${adminRequestId}`)).toBeVisible();
  expect(page.url()).toContain('/admin/requests?');
  await page.getByTestId(`admin-request-${adminRequestId}`).getByRole('button').click();
  await expect.poll(() => reads).toEqual([{ queueKey: 'contact-requests', itemId: adminRequestId }]);
  await expect(page.getByTestId('admin-attention-filter-requests')).toHaveText('13');
  await expect(page.getByTestId('admin-attention-filter-viewing-requests')).toHaveText('3');
  await expect(page.getByRole('dialog')).toBeVisible();
});
