import { expect, test } from '@playwright/test';
import { getUserGuideCopy } from '../../src/features/admin_user_guide/copy.ts';

test('dashboard guide shortcuts select an audience, open the matching chapter and keep its deep link', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  const copy = getUserGuideCopy(locale);
  let role = 'admin';
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { data: { accessToken: 'guide.shortcuts.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: role, status: 'verified' } }, meta: { requestId: 'guide-auth' } } }));
  await page.route('**/api/v1/provider/application/status', route => route.fulfill({ json: { data: { applicationId: 'cccccccccccccccccccccccc', providerType: 'developer_company', status: 'approved', version: 1, availableActions: ['open_dashboard'] }, meta: { requestId: 'guide-company' } } }));
  for (const item of [
    { role: 'admin', audience: 'owner-admin', task: 'viewing-administration', path: '/admin/viewing-requests' },
    { role: 'seeker', audience: 'seeker', task: 'seeker-requests', path: '/seeker/requests' },
    { role: 'provider', audience: 'developer', task: 'developer-journey', path: '/provider/projects' }
  ]) {
    role = item.role;
    await page.goto(`/${role}/user-guide?lang=${locale}`);
    await expect(page.getByTestId('admin-user-guide')).toBeVisible();
    if (role === 'admin') await page.getByLabel(copy.accountType, { exact: true }).selectOption(item.audience);
    else await expect(page.getByLabel(copy.accountType, { exact: true })).toHaveValue(item.audience);
    const card = page.locator(`[data-guide-task="${item.task}"]`);
    await expect(card).toBeVisible();
    await expect(card.getByRole('link', { name: new RegExp(copy.openScreen) })).toHaveAttribute('href', `${item.path}?lang=${locale}`);
    await card.getByRole('link', { name: copy.readSteps, exact: true }).click();
    await expect(page.locator(`#guide-toggle-${item.task}`)).toBeFocused();
    await expect(page.locator(`#guide-body-${item.task}`)).toBeVisible();
    await page.reload();
    await expect(page.locator(`#guide-body-${item.task}`)).toBeVisible();
    if (role === 'admin') await expect(page.getByLabel(copy.accountType, { exact: true })).toHaveValue('owner-admin');
    else await expect(page.locator('.user-guide a[href^="/admin"]')).toHaveCount(0);
    await page.locator('.user-guide__quick').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${role}-quick-actions.png`) });
  }
});
