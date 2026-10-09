import { expect, test } from '@playwright/test';
import { publicOrganizationProfileSchema } from '@sadat-real-estate/contracts';
import { getPublicPropertyDetailsCopy } from '../../src/features/public/details-copy.ts';

const providerId = 'a'.repeat(24);
const organizationId = 'b'.repeat(24);
const propertyId = 'c'.repeat(24);
const requestId = 'd'.repeat(24);
const envelope = (data: unknown) => ({ data, meta: { requestId: 'provider-inquiry-browser' } });

for (const target of ['company', 'property'] as const) {
  test(`provider sends a ${target} inquiry after session renewal and tracks it without changing account role`, async ({ page }, info) => {
    const locale = info.project.name.endsWith('-en') ? 'en' : 'ar';
    const copy = getPublicPropertyDetailsCopy(locale);
    const now = new Date().toISOString();
    let refreshes = 0;
    let posts = 0;
    let body: Record<string, unknown> = {};
    const request = () => ({ id: requestId, type: 'contact', source: 'provider', creatorId: providerId,
      payload: body, status: 'new', version: 0, availableActions: ['cancel'], createdAt: now, updatedAt: now });
    await page.addInitScript(() => localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
    await page.route('**/api/v1/auth/refresh', route => {
      refreshes += 1;
      return route.fulfill({ json: envelope({ accessToken: `provider.token_${refreshes}.signature`, tokenType: 'Bearer', expiresInSeconds: 900,
        user: { id: providerId, roleType: 'provider', status: 'verified' } }) });
    });
    await page.route('**/api/v1/public/bootstrap', route => route.fulfill({ json: envelope({ defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact: {} }) }));
    await page.route('**/api/v1/public/developers/inquiry-company', route => route.fulfill({ json: envelope(publicOrganizationProfileSchema.parse({
      id: organizationId, slug: 'inquiry-company', kind: 'developer_company', verified: true, name: { ar: 'شركة العقارات', en: 'Property company' },
      projectCount: 0, propertyCount: 0, projects: [], properties: [], stats: { publishedProjects: 0, availableProperties: 0, saleProperties: 0, rentalProperties: 0 }
    })) }));
    await page.route('**/api/v1/public/properties/inquiry-property', route => route.fulfill({ json: envelope({
      id: propertyId, slug: 'inquiry-property', kind: 'property', transactionType: 'sale', name: { ar: 'عقار منشور', en: 'Published property' },
      source: { sourceType: 'developer_company', organizationId }, seo: { slug: 'inquiry-property', title: { en: 'Published property' } },
      project: null, media: [], features: [], services: [], relatedProperties: []
    }) }));
    await page.route('**/api/v1/seeker/contact-requests', async route => {
      posts += 1;
      const next = route.request().postDataJSON() as Record<string, unknown>;
      if (posts === 1) {
        body = next;
        await route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'expired' } } });
        return;
      }
      expect(next).toEqual(body);
      expect(route.request().headers().authorization).toBe('Bearer provider.token_2.signature');
      await route.fulfill({ status: 201, json: envelope(request()) });
    });
    await page.route('**/api/v1/provider/customer-requests?**', async route => {
      expect(new URL(route.request().url()).searchParams.get('search')).toBe(requestId);
      await route.fulfill({ json: envelope({ items: [request()], total: 1, page: 1, limit: 5 }) });
    });
    await page.goto(target === 'company' ? `/developers/inquiry-company?lang=${locale}#developer-contact` : `/properties/inquiry-property?lang=${locale}`);
    await expect.poll(() => refreshes).toBe(1);
    if (target === 'company') {
      const form = page.locator('.public-developer-profile__inquiry');
      await form.locator('[name=name]').fill('Example Provider');
      await form.locator('[name=phone]').fill('01012345678');
      await form.locator('[name=message]').fill('Please send the project information');
      await form.locator('button[type=submit]').click();
    } else {
      const form = page.getByRole('form', { name: copy.contactTitle });
      await form.getByLabel(copy.fullName).fill('Example Provider');
      await form.getByLabel(copy.phoneNumber).fill('01012345678');
      await form.getByRole('button', { name: copy.contactTime, exact: true }).click();
      await page.getByRole('listbox', { name: copy.contactTime, exact: true }).getByRole('option', { name: copy.morning, exact: true }).click();
      await form.getByLabel(copy.messageLabel).fill('Please send the property information');
      await form.getByRole('button', { name: copy.submitContact }).click();
    }
    const track = page.getByRole('link', { name: locale === 'ar' ? 'متابعة الطلب' : 'Track inquiry', exact: true });
    await expect(track).toHaveAttribute('href', `/provider/customer-requests?search=${requestId}&lang=${locale}`);
    expect(refreshes).toBe(2);
    expect(posts).toBe(2);
    expect(body.fullName).toBe('Example Provider');
    await track.click();
    await expect(page.getByText(locale === 'ar' ? 'استفسار أرسلته' : 'Sent inquiry', { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`provider-${target}-inquiry-tracking.png`) });
  });
}
