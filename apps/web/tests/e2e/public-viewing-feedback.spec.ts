import { expect, test } from '@playwright/test';
import { getPublicPropertyDetailsCopy } from '../../src/features/public/details-copy.ts';

test.use({ timezoneId: 'Africa/Cairo' });

for (const outcome of ['success', 'error'] as const) {
  test(`viewing ${outcome} uses the device time zone and retains the form`, async ({ page }) => {
    const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
    const copy = getPublicPropertyDetailsCopy(locale);
    const propertyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const seekerId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    await page.addInitScript(() => localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
    await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: {
      data: { accessToken: 'viewing.seeker.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: seekerId, roleType: 'seeker', status: 'verified' } }, meta: { requestId: 'viewing-session' }
    } }));
    let authorizedRead = false;
    await page.route('**/api/v1/public/properties/demo-rental-apartment', route => {
      if (route.request().headers().authorization === 'Bearer viewing.seeker.token') authorizedRead = true;
      return route.fulfill({ json: { data: {
        id: propertyId, slug: 'demo-rental-apartment', kind: 'property', transactionType: 'rent',
        name: { ar: 'شقة للإيجار', en: 'Apartment for rent' },
        imageUrl: '/assets/canonical/public/listing-property-rental.png',
        source: { sourceType: 'developer_company' }, seo: { slug: 'demo-rental-apartment', title: { en: 'Apartment for rent' } },
        project: null, media: [], features: [], services: [], relatedProperties: []
      }, meta: { requestId: 'viewing-property' } } });
    });
    let sends = 0;
    let expectedIso = '';
    let releaseSend: (() => void) | undefined;
    const gate = new Promise<void>(resolve => { releaseSend = resolve; });
    await page.route('**/api/v1/seeker/viewings', async route => {
      sends += 1;
      expect(route.request().headers().authorization).toBe('Bearer viewing.seeker.token');
      expect(route.request().postDataJSON()).toEqual({ propertyId, requestedAt: expectedIso, timezone: 'Africa/Cairo', note: 'Keep my viewing note' });
      await gate;
      await route.fulfill(outcome === 'error' ? { status: 500, json: { error: { code: 'INTERNAL_ERROR', messageKey: 'errors.internalError', details: [], requestId: 'viewing-error' } } } : {
        status: 201, json: { data: { id: 'cccccccccccccccccccccccc', propertyId, seekerId, status: 'requested', requestedAt: expectedIso, timezone: 'Africa/Cairo', note: 'Keep my viewing note', version: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, meta: { requestId: 'viewing-created' } }
      });
    });
    await page.goto(`/properties/demo-rental-apartment?lang=${locale}`);
    await expect.poll(() => authorizedRead).toBe(true);
    await page.getByRole('button', { name: copy.requestViewing, exact: true }).click();
    const dialog = page.getByRole('dialog');
    const submit = dialog.locator('button[type="submit"]');
    await expect(dialog.getByLabel(copy.timezone)).toHaveAttribute('readonly');
    await expect(dialog.getByLabel(copy.timezone)).not.toHaveValue('');
    await dialog.getByLabel(copy.requestedAt).fill('2000-01-01T10:00');
    await dialog.getByLabel(copy.note).fill('Keep my viewing note');
    await submit.click();
    await expect(dialog.getByRole('alert')).toHaveText(copy.viewingValidation);
    expect(sends).toBe(0);
    const appointment = await page.evaluate(() => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(10, 0, 0, 0);
      const pad = (value: number) => String(value).padStart(2, '0');
      return { local: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T10:00`, iso: date.toISOString() };
    });
    expectedIso = appointment.iso;
    await dialog.getByLabel(copy.requestedAt).fill(appointment.local);
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await dialog.locator('form').evaluate(form => form.setAttribute('data-retained-form', 'true'));
    await submit.click();
    await expect.poll(() => sends).toBe(1);
    await expect(submit).toBeDisabled();
    releaseSend?.();
    if (outcome === 'success') {
      await expect(dialog.getByRole('status')).toContainText(copy.actionSuccessTitle);
      await expect(dialog.getByRole('status')).toBeInViewport();
      await expect(submit).toBeDisabled();
    } else {
      await expect(dialog.getByRole('alert')).toContainText(copy.actionErrorTitle);
      await expect(dialog.getByRole('alert')).toBeInViewport();
      await expect(submit).toBeEnabled();
    }
    await expect(dialog.locator('form')).toHaveAttribute('data-retained-form', 'true');
    await expect(dialog.getByLabel(copy.requestedAt)).toHaveValue(appointment.local);
    await expect(dialog.getByLabel(copy.note)).toHaveValue('Keep my viewing note');
    await expect(submit).toBeInViewport();
    const bounds = await dialog.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await dialog.screenshot({ path: test.info().outputPath(`viewing-${outcome}.png`) });
  });
}
