import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { getUserGuideCopy } from '../../src/features/admin_user_guide/copy.ts';
import { adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

for (const role of ['seeker', 'provider'] as const) {
  test(`${role} can read the matching guide and download the selected instructions`, async ({ page }, testInfo) => {
    const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
    const copy = getUserGuideCopy(locale);
    await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { data: { accessToken: 'guide.local.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: role, status: 'verified' } }, meta: { requestId: 'guide-session' } } }));
    await page.route('**/api/v1/provider/application/status', route => route.fulfill({ json: { data: { applicationId: 'cccccccccccccccccccccccc', providerType: 'brokerage_office', status: 'approved', version: 1, availableActions: ['open_dashboard'] }, meta: { requestId: 'guide-provider' } } }));
    await page.goto(`/${role}/user-guide?lang=${locale}`);
    await expect(page.getByTestId('admin-user-guide')).toBeVisible();
    const type = page.getByLabel(copy.accountType, { exact: true });
    await expect(type).toHaveValue(role === 'seeker' ? 'seeker' : 'brokerage_office');
    await expect(page.locator('.user-guide a[href^="/admin"]')).toHaveCount(0);
    if (role === 'provider') {
      await expect(page.locator('#guide-office-journey')).toBeVisible();
      await expect(page.locator('#guide-individual-journey')).toHaveCount(0);
      await type.selectOption('developer');
      await expect(page.locator('#guide-developer-journey')).toBeVisible();
    }
    await page.getByRole('button', { name: copy.maximize, exact: true }).click();
    await expect(page.getByRole('dialog', { name: copy.title })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: copy.minimize, exact: true }).click();
    await expect(page.locator('#user-guide-reading')).toBeHidden();
    await page.getByRole('button', { name: copy.expand, exact: true }).click();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: copy.download, exact: true }).click();
    const download = await downloadEvent;
    const contents = await readFile((await download.path())!, 'utf8');
    expect(contents).toContain('https://elsadatrealestate.com/');
    expect(contents).not.toContain('/admin/');
    expect(contents).toContain(role === 'provider' ? 'دليل شركة التطوير العقاري' : 'الزائر والباحث عن عقار');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.user-guide')).toBeVisible();
    for (const navigation of await page.locator('nav').all()) await expect(navigation).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${role}-guide.png`), fullPage: true });
  });
}

test('admin deletion renews an expired session without losing the reason or performing extra mutations', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('desktop'), 'CMS actions are verified in the desktop administration surface.');
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  let refreshes = 0;
  const deletions: Array<{ authorization: string | undefined; body: unknown }> = [];
  await page.route('**/api/v1/auth/refresh', route => {
    refreshes += 1;
    return route.fulfill({ json: adminCmsEnvelope({ accessToken: refreshes === 1 ? 'admin.expired.qa' : 'admin.renewed.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'cms-renewal') });
  });
  await page.route('**/api/v1/admin/content/team', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: adminCmsEnvelope(adminCmsContentFor('team'), 'cms-read') });
    deletions.push({ authorization: route.request().headers().authorization, body: route.request().postDataJSON() });
    if (deletions.length === 1) return route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'cms-expired' } } });
    return route.fulfill({ json: adminCmsEnvelope({ namespace: 'team', items: [] }, 'cms-deleted') });
  });
  await page.goto(`/admin/content/team?lang=${locale}`);
  await page.getByRole('button', { name: locale === 'ar' ? 'حذف' : 'Delete', exact: true }).click();
  const panel = page.getByTestId('admin-cms-team-delete');
  await panel.getByRole('textbox').fill('Member left the team');
  await panel.getByRole('button', { name: locale === 'ar' ? 'حذف' : 'Delete', exact: true }).click();
  await expect(panel).toHaveCount(0);
  expect(refreshes).toBe(2);
  expect(deletions).toHaveLength(2);
  expect(deletions[0]?.authorization).toBe('Bearer admin.expired.qa');
  expect(deletions[1]?.authorization).toBe('Bearer admin.renewed.qa');
  expect(deletions[1]?.body).toEqual(deletions[0]?.body);
  expect(deletions[1]?.body).toMatchObject({ reason: 'Member left the team' });
});
