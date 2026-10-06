import { expect, test } from '@playwright/test';
import { getPublicPropertyDetailsCopy } from '../../src/features/public/details-copy.ts';

for (const outcome of ['success', 'error'] as const) {
  test(`property contact ${outcome} keeps the page and entered fields in place`, async ({ page }) => {
    const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
    const copy = getPublicPropertyDetailsCopy(locale);
    const propertyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const seekerId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    await page.addInitScript(() => localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
    await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: {
      data: { accessToken: 'contact.seeker.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: seekerId, roleType: 'seeker', status: 'verified' } }, meta: { requestId: 'contact-session' }
    } }));
    let sent = false;
    let authorizedRead = false;
    let refreshStarted = false;
    let releaseRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>(resolve => { releaseRefresh = resolve; });
    const details = {
      id: propertyId, slug: 'demo-open-view-apartment', kind: 'property', transactionType: 'rent',
      name: { ar: 'شقة للإيجار', en: 'Apartment for rent' },
      imageUrl: '/assets/canonical/public/listing-property-rental.png',
      source: { sourceType: 'developer_company' }, seo: { slug: 'demo-open-view-apartment', title: { en: 'Apartment for rent' } },
      project: null, media: [], features: [], services: [], relatedProperties: []
    };
    await page.route('**/api/v1/public/properties/demo-open-view-apartment', async route => {
      if (route.request().headers().authorization === 'Bearer contact.seeker.token') authorizedRead = true;
      if (sent) { refreshStarted = true; await refreshGate; }
      await route.fulfill({ json: { data: { ...details, ...(sent ? { contact: { phone: '+201234567890' } } : {}) }, meta: { requestId: 'contact-property' } } });
    });
    let sends = 0;
    let releaseSend: (() => void) | undefined;
    const sendGate = new Promise<void>(resolve => { releaseSend = resolve; });
    await page.route('**/api/v1/seeker/contact-requests', async route => {
      sends += 1;
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers().authorization).toBe('Bearer contact.seeker.token');
      expect(route.request().postDataJSON()).toMatchObject({ propertyId, fullName: 'Example Seeker', phone: '01001234567', preferredContactTime: 'morning', message: 'Please contact me.', locale });
      await sendGate;
      if (outcome === 'error') {
        await route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', messageKey: 'errors.internalError', details: [], requestId: 'contact-error' } } });
      } else {
        sent = true;
        await route.fulfill({ status: 201, json: { data: { id: 'cccccccccccccccccccccccc', type: 'contact', source: 'seeker', seekerId, propertyId, status: 'new', payload: { message: 'Please contact me.' }, version: 0, availableActions: [], createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z' }, meta: { requestId: 'contact-success' } } });
      }
    });
    await page.goto(`/properties/demo-open-view-apartment?lang=${locale}`);
    const form = page.getByRole('form', { name: copy.contactTitle });
    await expect.poll(() => authorizedRead).toBe(true);
    await form.getByLabel(copy.fullName).fill('Example Seeker');
    await form.getByLabel(copy.phoneNumber).fill('01001234567');
    await form.locator('.custom-select-trigger').click();
    await page.getByRole('listbox').getByRole('option', { name: copy.morning, exact: true }).click();
    await form.getByLabel(copy.messageLabel).fill('Please contact me.');
    await form.locator('button[type="submit"]').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await form.evaluate(element => { element.setAttribute('data-retained-form', 'true'); });
    const previousY = await page.evaluate(() => window.scrollY);
    const originalUrl = page.url();
    let navigations = 0;
    page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations += 1; });
    await form.locator('button[type="submit"]').click();
    await expect.poll(() => sends).toBe(1);
    await expect(form.locator('button[type="submit"]')).toBeDisabled();
    await expect(form.locator('.public-property-details__contact-success')).toHaveCount(0);
    releaseSend?.();
    if (outcome === 'success') {
      await expect(form.getByRole('status')).toContainText(locale === 'ar' ? 'تم إرسال طلبك بنجاح' : 'Your request was sent successfully');
      await expect(form.getByRole('status')).toBeInViewport();
      await expect.poll(() => refreshStarted).toBe(true);
      await expect(form).toHaveAttribute('data-retained-form', 'true');
      expect(Math.abs(await page.evaluate(() => window.scrollY) - previousY)).toBeLessThanOrEqual(5);
      releaseRefresh?.();
      await expect(page.getByRole('link', { name: '+201234567890', exact: true })).toBeAttached();
      await expect(form.getByRole('status')).toContainText(copy.actionSuccessTitle);
      expect(Math.abs(await page.evaluate(() => window.scrollY) - previousY)).toBeLessThanOrEqual(5);
    } else {
      releaseRefresh?.();
      await expect(form.getByRole('alert')).toContainText(copy.actionErrorTitle);
      await expect(form.locator('.public-property-details__contact-success')).toHaveCount(0);
    }
    await expect(form).toHaveAttribute('data-retained-form', 'true');
    await expect(form.getByLabel(copy.fullName)).toHaveValue('Example Seeker');
    await expect(form.getByLabel(copy.phoneNumber)).toHaveValue('01001234567');
    await expect(form.locator('select[name="contactTime"]')).toHaveValue('morning');
    await expect(form.getByLabel(copy.messageLabel)).toHaveValue('Please contact me.');
    expect(page.url()).toBe(originalUrl);
    expect(navigations).toBe(0);
    await form.screenshot({ path: test.info().outputPath(`contact-${outcome}.png`) });
  });
}
