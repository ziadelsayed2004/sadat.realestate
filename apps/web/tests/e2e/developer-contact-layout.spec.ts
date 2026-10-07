import { expect, test, type Locator } from '@playwright/test';
import { publicOrganizationProfileSchema } from '@sadat-real-estate/contracts';

async function below(upper: Locator, lower: Locator) {
  const top = (await upper.boundingBox())!;
  const bottom = (await lower.boundingBox())!;
  expect(bottom.y - (top.y + top.height)).toBeGreaterThanOrEqual(12);
}

for (const withProject of [false, true]) {
  test(`developer inquiry fields and actions stay separate ${withProject ? 'with a project and WhatsApp' : 'without a project or WhatsApp'}`, async ({ page }) => {
    const locale = test.info().project.name.endsWith('-ar') ? 'ar' : 'en';
    const slug = 'contact-layout-builder';
    const organizationId = 'a'.repeat(24);
    const projectId = 'b'.repeat(24);
    const requestId = 'f'.repeat(24);
    const profile = publicOrganizationProfileSchema.parse({
      id: organizationId, kind: 'developer_company', slug, verified: true,
      name: { ar: 'مجموعة دلتا للاستثمار والتطوير العقاري في مدينة السادات', en: 'Delta Real Estate Investment and Development Group in Sadat City' },
      contactPhone: '+201000000000',
      ...(withProject ? { whatsappUrl: 'https://wa.me/201000000000' } : {}),
      projectCount: withProject ? 1 : 0, propertyCount: 0,
      projects: withProject ? [{ id: projectId, slug: 'central-project', name: { ar: 'مشروع وسط المدينة', en: 'Central project' } }] : [],
      properties: [],
      stats: { publishedProjects: withProject ? 1 : 0, availableProperties: 0, saleProperties: 0, rentalProperties: 0 }
    });
    await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } } }));
    await page.route(`**/api/v1/public/developers/${slug}`, route => route.fulfill({ json: { data: profile, meta: { requestId: 'contact-layout' } } }));
    let payload: unknown;
    await page.route('**/api/v1/seeker/contact-requests', async route => {
      payload = route.request().postDataJSON();
      const now = new Date().toISOString();
      await route.fulfill({ json: { data: { id: requestId, type: 'contact', source: 'seeker', status: 'new', payload, version: 0, availableActions: ['cancel'], createdAt: now, updatedAt: now }, meta: { requestId: 'contact-sent' } } });
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/developers/${slug}?lang=${locale}#developer-contact`);
    const form = page.locator('.public-developer-profile__inquiry');
    const message = form.locator('textarea[name="message"]');
    const actions = form.locator('.public-developer-profile__inquiry-actions');
    const submit = actions.locator('button[type="submit"]');
    await expect(submit).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await below(message, actions);
    const formBounds = (await form.boundingBox())!;
    const actionBounds = (await actions.boundingBox())!;
    expect(formBounds.x).toBeGreaterThanOrEqual(0);
    expect(formBounds.x + formBounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(actionBounds.y + actionBounds.height).toBeLessThanOrEqual(formBounds.y + formBounds.height - 12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await expect(actions.locator('a')).toHaveCount(withProject ? 1 : 0);
    await form.locator('input[name="name"]').fill('Example Customer');
    await form.locator('input[name="phone"]').fill('01012345678');
    await message.fill('First line\nI would like more information about your available properties.');
    await submit.click();
    const status = form.getByRole('status');
    await expect(status).toContainText(locale === 'ar' ? 'تم إرسال طلبك بنجاح.' : 'Your inquiry was sent successfully.');
    expect(payload).toMatchObject({ organizationId, contactChannel: 'provider', fullName: 'Example Customer', phone: '01012345678', preferredContactTime: 'morning', locale });
    await below(message, actions);
    await below(actions, status);
    await expect(status.getByRole('link')).toHaveAttribute('href', `/seeker/requests/${requestId}?lang=${locale}`);
    await expect(submit).toBeDisabled();
    await status.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`contact-form-${locale}.png`) });
  });
}
