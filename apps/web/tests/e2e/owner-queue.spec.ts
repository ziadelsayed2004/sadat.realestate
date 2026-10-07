import { expect, test } from '@playwright/test';
import { ADMIN_USER_ID, adminUserFixture, routeAdminAccounts } from './admin-accounts.fixtures.ts';
import { adminAdsRequestId, routeAdminAdsApis } from './admin-ads.fixtures.ts';
import { adminViewingFixture, adminViewingId, routeAdminRequestApis } from './admin-requests.fixtures.ts';

const localeFor = () => test.info().project.name.endsWith('-en') ? 'en' : 'ar';
const envelope = (data: unknown) => ({ data, meta: { requestId: 'owner-queue-browser' } });

test('shares a published property notification and requires confirmation for session revocation', async ({ page }) => {
  const locale = localeFor(); await routeAdminAccounts(page);
  await page.route(`**/api/v1/admin/users/${ADMIN_USER_ID}`, route => route.fulfill({ json: envelope({ ...adminUserFixture(), canManage: true }) }));
  const writes: Record<string, unknown>[] = [];
  await page.route(`**/api/v1/admin/users/${ADMIN_USER_ID}/communication`, async route => { writes.push(route.request().postDataJSON()); await route.fulfill({ json: envelope({ id: 'a'.repeat(24), action: writes.at(-1)?.action }) }); });
  await page.goto(`/admin/users/${ADMIN_USER_ID}?lang=${locale}`);
  const actions = page.locator('.admin-account-reports'); await expect(actions).toBeVisible();
  await actions.locator('textarea').fill('Please review the suggested apartment');
  await actions.locator('input[placeholder="SDT-1234"]').fill('SDT-1234');
  await actions.getByRole('button', { name: locale === 'ar' ? 'إرسال إشعار' : 'Send notification', exact: true }).click();
  await expect.poll(() => writes.length).toBe(1); expect(writes[0]?.propertyCode).toBe('SDT-1234');
  const logout = actions.getByRole('button', { name: locale === 'ar' ? 'إنهاء الجلسات الحالية' : 'End current sessions' });
  await actions.locator('textarea').fill('Customer asked to reset sessions'); await expect(logout).toBeDisabled();
  await actions.locator('input[type="checkbox"]').check(); await logout.click();
  await expect.poll(() => writes.length).toBe(2); expect(writes[1]?.action).toBe('logout'); expect(writes[1]?.propertyCode).toBeUndefined();
  if (test.info().project.name === 'safari-ar') await page.screenshot({ path: '.local/owner-queue-safari-account.png', fullPage: true });
});

test('replaces an expired advertisement period and records a free activation', async ({ page }) => {
  const locale = localeFor(); await routeAdminAdsApis(page);
  let input: Record<string, unknown> | undefined;
  await page.route(`**/api/v1/admin/ad-requests/${adminAdsRequestId}/schedule`, async route => { input = route.request().postDataJSON(); await route.fulfill({ status: 409, json: { error: { code: 'PLACEMENT_CONFLICT', messageKey: 'errors.ads.placementConflict', details: [], requestId: 'queue' } } }); });
  await page.goto(`/admin/ads/requests?requestId=${adminAdsRequestId}&lang=${locale}`);
  const panel = page.locator('form.admin-ads__review-card'); await expect(panel).toBeVisible();
  await panel.locator('input[type="datetime-local"]').nth(0).fill('2027-01-10T16:00');
  await panel.locator('input[type="datetime-local"]').nth(1).fill('2027-01-11T16:00');
  await expect(panel.locator('[role="status"]')).toContainText(locale === 'ar' ? 'مدة العرض' : 'Display duration');
  await panel.locator('input[type="checkbox"]').check(); await expect(panel.locator('button[type="submit"]')).toBeDisabled();
  await panel.locator('textarea').fill('Complimentary promotion approved by owner'); await panel.locator('button[type="submit"]').click();
  await expect.poll(() => input?.waiverReason).toBe('Complimentary promotion approved by owner');
  expect(input?.interval).toEqual({ start: '2027-01-10T14:00:00.000Z', end: '2027-01-11T14:00:00.000Z' });
  await expect(panel.locator('[role="alert"]')).toBeVisible(); await expect(panel.locator('textarea')).toHaveValue('Complimentary promotion approved by owner');
});

test('administrator can confirm and reschedule the viewing with the current version', async ({ page }) => {
  const locale = localeFor(); await routeAdminRequestApis(page);
  let viewing = { ...adminViewingFixture(), status: 'requested', requestedAt: '2027-01-10T14:00:00.000Z', availableActions: ['confirm', 'reschedule', 'cancel'] };
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/viewings?**', route => route.fulfill({ json: envelope({ items: [viewing], page: 1, limit: 20, total: 1 }) }));
  await page.route(`**/api/v1/admin/viewings/${adminViewingId}/transitions`, async route => { const body = route.request().postDataJSON(); writes.push(body); viewing = { ...viewing, version: viewing.version + 1, status: body.action === 'confirm' ? 'confirmed' : 'rescheduled', requestedAt: body.requestedAt ?? viewing.requestedAt, availableActions: ['reschedule', 'cancel', 'complete'] }; await route.fulfill({ json: envelope(viewing) }); });
  await page.goto(`/admin/viewing-requests?lang=${locale}`);
  const open = () => page.getByTestId(`admin-viewing-${adminViewingId}`).getByRole('button').click();
  await open(); const dialog = page.getByRole('dialog'); await expect(dialog.locator('form.admin-requests__actions')).toBeVisible();
  await dialog.locator('textarea').fill('Appointment confirmed with customer'); await dialog.locator('button[type="submit"]').click();
  await expect.poll(() => writes.length).toBe(1); expect(writes[0]?.expectedVersion).toBe(1);
  await expect(dialog).toBeVisible(); await expect(dialog.locator('textarea')).toHaveValue('');
  await dialog.locator('select').selectOption('reschedule'); await dialog.locator('input[type="datetime-local"]').fill('2027-01-11T17:00');
  await dialog.locator('textarea').fill('Customer requested a later appointment'); await dialog.locator('button[type="submit"]').click();
  await expect.poll(() => writes.length).toBe(2); expect(writes[1]?.expectedVersion).toBe(2); expect(writes[1]?.requestedAt).toBe('2027-01-11T15:00:00.000Z');
});

test('footer exposes configured contact links and both price limits remain optional on phones', async ({ page }) => {
  const locale = localeFor();
  await page.route('**/api/v1/public/bootstrap', route => route.fulfill({ json: envelope({ defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact: { phone: '+201012345678', whatsappNumber: '+201012345678', facebookUrl: 'https://www.facebook.com/example', instagramUrl: 'https://www.instagram.com/example', mapUrl: 'https://www.google.com/maps/search/?api=1&query=Sadat' } }) }));
  const searches: string[] = [];
  await page.route('**/api/v1/public/properties?**', route => { searches.push(route.request().url()); return route.fulfill({ json: envelope({ items: [], categories: [], locations: [], propertyTypes: [], page: 1, limit: 20, total: 0 }) }); });
  await page.goto(`/properties?lang=${locale}`);
  await expect(page.locator('.public-site-footer__floating-whatsapp')).toHaveAttribute('href', /wa\.me\/201012345678/);
  await expect(page.locator('.public-site-footer__social a[aria-label="Facebook"]')).toHaveAttribute('href', 'https://www.facebook.com/example');
  await expect(page.locator('.public-site-footer a[href*="google.com/maps"]')).toBeAttached();
  const min = page.locator('#public-property-min-price'); const max = page.locator('#public-property-max-price');
  await expect(min).not.toHaveAttribute('required'); await expect(max).not.toHaveAttribute('required');
  expect(new URL(searches.at(-1)!).searchParams.has('minPrice')).toBe(false); expect(new URL(searches.at(-1)!).searchParams.has('maxPrice')).toBe(false);
  const toggle = page.locator('.public-property-listing__filters-toggle'); if (await toggle.isVisible()) await toggle.click();
  await min.fill('5000'); await max.fill(''); await page.locator('.public-property-listing__apply').click();
  await expect.poll(() => new URL(searches.at(-1)!).searchParams.get('minPrice')).toBe('5000');
  expect(new URL(searches.at(-1)!).searchParams.has('maxPrice')).toBe(false);
  if (!(await min.isVisible())) await toggle.click();
  await min.fill(''); await page.locator('.public-property-listing__apply').click();
  await expect.poll(() => new URL(searches.at(-1)!).searchParams.has('minPrice')).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  if (test.info().project.name === 'mobile-en') await page.screenshot({ path: '.local/owner-queue-mobile-footer.png', fullPage: true });
});
