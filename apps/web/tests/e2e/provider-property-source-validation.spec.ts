import { expect, test } from '@playwright/test';
import { getProviderPropertyCopy } from '../../src/features/provider_property/copy.ts';

test('validates the source fields and updates the same saved draft', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const copy = getProviderPropertyCopy(locale).wizard;
  const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { data: {
    accessToken: 'provider.source.token', tokenType: 'Bearer', expiresInSeconds: 900,
    user: { id: providerId, roleType: 'provider', status: 'verified' }
  }, meta: { requestId: 'source-session' } } }));
  let creates = 0;
  let updates = 0;
  const result = (input: Record<string, unknown>, version: number) => ({
    data: { id: propertyId, kind: 'property', name: input.name, slug: 'generated-property-link', transactionType: 'sale', source: { providerId, sourceType: 'individual_broker' },
      status: 'draft', active: true, version, availableActions: ['update', 'submit'], createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z' },
    meta: { requestId: 'source-draft' }
  });
  await page.route('**/api/v1/provider/properties', async route => {
    const input = route.request().postDataJSON();
    expect(route.request().headers().authorization).toBe('Bearer provider.source.token');
    expect(input.source).toEqual({ providerId, sourceType: 'individual_broker' });
    creates += 1;
    await route.fulfill({ status: 201, json: result(input, 0) });
  });
  await page.route(`**/api/v1/provider/properties/${propertyId}/steps/basic`, async route => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON().version).toBe(0);
    updates += 1;
    await route.fulfill({ json: result(route.request().postDataJSON(), 1) });
  });
  await page.goto(`/provider/properties/new/basic?lang=${locale}`);
  const form = page.locator('[data-form-step="basic"]');
  await form.locator('#provider-property-name').fill('My apartment');
  const source = form.locator('#provider-property-source-type');
  await source.selectOption('brokerage_office');
  await form.locator('#provider-property-organization').fill('3'.repeat(60));
  await form.getByRole('button', { name: copy.saveDraft, exact: true }).click();
  await expect(form.locator('#provider-property-organization')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('#provider-property-organization')).toBeFocused();
  await expect(form.locator('#provider-property-organization-message')).toHaveText(copy.validationMessages.organizationId);
  expect(creates).toBe(0);
  await form.screenshot({ path: test.info().outputPath('provider-source-error.png') });
  await source.selectOption('individual_broker');
  await expect(form.locator('#provider-property-organization')).toHaveCount(0);
  await expect(form.locator('#provider-property-name')).toHaveValue('My apartment');
  await form.getByRole('button', { name: copy.saveDraft, exact: true }).click();
  await expect(form.locator('.provider-property-wizard__form-message--success')).toHaveText(copy.saved);
  await expect(source).toBeDisabled();
  await form.locator('#provider-property-name').fill('Updated apartment');
  await form.getByRole('button', { name: copy.saveDraft, exact: true }).click();
  await expect.poll(() => updates).toBe(1);
  await expect(form.locator('.provider-property-wizard__form-message--success')).toHaveText(copy.saved);
  expect(creates).toBe(1);
  await expect(page).toHaveURL(new RegExp(`/provider/properties/${propertyId}/basic`));
  await form.screenshot({ path: test.info().outputPath('provider-saved-draft.png') });
});
