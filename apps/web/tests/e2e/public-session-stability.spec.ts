import { expect, test } from '@playwright/test';
import { getPublicPropertyDetailsCopy } from '../../src/features/public/details-copy.ts';

test('session restoration keeps entered property fields mounted without moving the page', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const copy = getPublicPropertyDetailsCopy(locale);
  await page.addInitScript(() => localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
  let releaseSession: (() => void) | undefined;
  const sessionGate = new Promise<void>(resolve => { releaseSession = resolve; });
  await page.route('**/api/v1/auth/refresh', async route => {
    await sessionGate;
    await route.fulfill({ json: { data: { accessToken: 'restored.seeker.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', roleType: 'seeker', status: 'verified' } }, meta: { requestId: 'restored-session' } } });
  });
  let authenticatedRead = false;
  let releaseRead: (() => void) | undefined;
  const readGate = new Promise<void>(resolve => { releaseRead = resolve; });
  await page.route('**/api/v1/public/properties/demo-rental-apartment', async route => {
    if (route.request().headers().authorization) { authenticatedRead = true; await readGate; }
    await route.fulfill({ json: { data: {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa', slug: 'demo-rental-apartment', kind: 'property', transactionType: 'rent',
      name: { ar: 'شقة للإيجار', en: 'Apartment for rent' },
      imageUrl: '/assets/canonical/public/listing-property-rental.png',
      source: { sourceType: 'developer_company' }, seo: { slug: 'demo-rental-apartment', title: { en: 'Apartment for rent' } },
      project: null, media: [], features: [], services: [], relatedProperties: []
    }, meta: { requestId: 'session-property' } } });
  });
  await page.goto(`/properties/demo-rental-apartment?lang=${locale}`);
  const form = page.getByRole('form', { name: copy.contactTitle });
  await form.getByLabel(copy.fullName).fill('Keep my entered name');
  await form.getByLabel(copy.messageLabel).fill('Keep my entered message');
  await form.evaluate(element => element.setAttribute('data-retained-form', 'true'));
  await page.evaluate(() => document.fonts.ready);
  const y = await page.evaluate(() => window.scrollY);
  releaseSession?.();
  await expect.poll(() => authenticatedRead).toBe(true);
  await expect(form).toHaveAttribute('data-retained-form', 'true');
  await expect(form.getByLabel(copy.fullName)).toHaveValue('Keep my entered name');
  expect(Math.abs(await page.evaluate(() => window.scrollY) - y)).toBeLessThanOrEqual(5);
  releaseRead?.();
  await expect(form.getByLabel(copy.messageLabel)).toHaveValue('Keep my entered message');
  await expect(form).toHaveAttribute('data-retained-form', 'true');
  expect(Math.abs(await page.evaluate(() => window.scrollY) - y)).toBeLessThanOrEqual(5);
});
