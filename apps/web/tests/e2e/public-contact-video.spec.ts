import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { publicOrganizationProfileSchema } from '@sadat-real-estate/contracts';
import { getProviderPropertyCompletionCopy } from '../../src/features/provider_property/completion-copy.ts';
import { getAdminSettingsCopy } from '../../src/features/admin_settings/copy.ts';
import { egyptInstant, egyptLocalDateTime } from '../../src/features/public/egypt-time.ts';

const ownerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const mediaId = 'cccccccccccccccccccccccc';
const videoBytes = readFileSync(new URL('../fixtures/property-tour.mp4', import.meta.url));
const envelope = (data: unknown) => ({ data, meta: { requestId: 'contact-video-browser' } });
const language = () => test.info().project.name.endsWith('-en') ? 'en' : 'ar';
const name = { ar: 'عقار بفيديو', en: 'Property with video' };
const video = { id: mediaId, propertyId, kind: 'video', originalFilename: 'tour.mp4', detectedMime: 'video/mp4', byteSize: videoBytes.length, sortOrder: 0, isCover: false };
const contact = { phone: '+201098765432', whatsappNumber: '+201012345678', facebookUrl: 'https://facebook.com/sadat', instagramUrl: 'https://instagram.com/sadat' };

async function session(page: Page, role: 'provider' | 'admin' | 'seeker' | undefined) {
  if (role) await page.addInitScript(() => localStorage.setItem('sadat-real-estate.auth.session-hint', 'authenticated'));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill(role ? { json: envelope({ accessToken: 'browser.contact.video', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: ownerId, roleType: role, status: 'verified' } }) } : { status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } } }));
  await page.route('**/api/v1/public/bootstrap', route => route.fulfill({ json: envelope({ defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact }) }));
}

test('configured contacts remain aligned on mobile and video plays inside the published property', async ({ page, browserName }) => {
  const locale = language();
  await session(page, undefined);
  await page.route('**/api/v1/public/properties/tour-property', route => route.fulfill({ json: envelope({ id: propertyId, slug: 'tour-property', kind: 'property', name, transactionType: 'sale', source: { sourceType: 'individual_broker' }, seo: { title: name, slug: 'tour-property' }, project: null, media: [{ ...video, imageUrl: `/api/v1/public/properties/${propertyId}/media/${mediaId}/content` }], features: [], services: [], relatedProperties: [] }) }));
  await page.route(`**/api/v1/public/properties/${propertyId}/media/${mediaId}/content`, route => route.fulfill({ body: videoBytes, contentType: 'video/mp4', headers: { 'accept-ranges': 'bytes' } }));
  await page.goto(`/properties/tour-property?lang=${locale}`);
  const player = page.locator('.public-property-details__gallery-main video');
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute('controls', '');
  await expect(player).toHaveAttribute('playsinline', '');
  // Windows WebKit does not ship an H.264 decoder. Playback is verified in Chromium; Safari still verifies the accessible controls and layout.
  if (browserName !== 'webkit') {
    await player.evaluate(async node => { const video = node as HTMLVideoElement; video.muted = true; await video.play(); });
    await expect.poll(() => player.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    await player.evaluate(node => (node as HTMLVideoElement).pause());
  }
  const whatsapp = page.locator('.public-property-details__whatsapp');
  await expect(whatsapp).toHaveAttribute('href', /https:\/\/wa\.me\/201012345678\?text=/);
  await expect(whatsapp).toHaveAttribute('target', '_blank');
  const footer = page.locator('.public-site-footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.locator('.public-site-footer__social a')).toHaveCount(3);
  await expect(footer.getByRole('link', { name: 'Facebook', exact: true })).toHaveAttribute('href', contact.facebookUrl);
  await expect(footer.getByRole('link', { name: 'Instagram', exact: true })).toHaveAttribute('href', contact.instagramUrl);
  await expect(footer.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveAttribute('href', 'https://wa.me/201012345678');
  const socialButtons = footer.locator('.public-site-footer__social a');
  for (const button of await socialButtons.all()) {
    const box = await button.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
    await button.focus(); await expect(button).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`footer-${locale}.png`), fullPage: false });
});

test('company inquiry stays in place, preserves entries and sends to the selected recipient', async ({ page }) => {
  const locale = language();
  await session(page, 'seeker');
  const organizationId = 'dddddddddddddddddddddddd';
  const profile = publicOrganizationProfileSchema.parse({ id: organizationId, kind: 'developer_company', slug: 'approved-builder', name: { ar: 'شركة معتمدة', en: 'Approved builder' }, verified: true, projectCount: 0, propertyCount: 0, stats: { publishedProjects: 0, availableProperties: 0, saleProperties: 0, rentalProperties: 0 }, projects: [], properties: [] });
  await page.route('**/api/v1/public/developers/approved-builder', route => route.fulfill({ json: envelope(profile) }));
  const payloads: Record<string, unknown>[] = [];
  await page.route('**/api/v1/seeker/contact-requests', async route => {
    const payload = route.request().postDataJSON(); payloads.push(payload);
    await route.fulfill({ status: 201, json: envelope({ id: mediaId, type: 'contact', source: 'seeker', status: 'new', payload, version: 0, availableActions: ['cancel'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }) });
  });
  await page.goto(`/developers/approved-builder?lang=${locale}#developer-contact`);
  const form = page.locator('form.public-developer-profile__inquiry');
  await form.locator('[name=name]').fill('Example Customer');
  await form.locator('[name=phone]').fill('01012345678');
  await form.locator('[name=message]').fill('Please contact me.\nI need an apartment.');
  await expect(form.locator('[name=message]')).toHaveValue('Please contact me.\nI need an apartment.');
  await form.getByRole('button', { name: locale === 'ar' ? 'إرسال الاستفسار' : 'Send inquiry', exact: true }).click();
  await expect(form.getByRole('status')).toBeVisible();
  await expect(form.getByRole('status')).toBeInViewport();
  expect(payloads[0]).toMatchObject({ organizationId, contactChannel: 'provider', fullName: 'Example Customer' });
  await expect(form.locator('[name=message]')).toHaveValue('Please contact me.\nI need an apartment.');
  await expect(page).toHaveURL(/\/developers\/approved-builder/);
  await form.locator('[name=message]').fill('Please let the platform arrange a viewing.');
  await form.getByRole('combobox', { name: locale === 'ar' ? 'جهة التواصل' : 'Send inquiry to' }).selectOption('platform');
  await form.getByRole('button', { name: locale === 'ar' ? 'إرسال الاستفسار' : 'Send inquiry', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(2);
  await expect(form.getByRole('status')).toBeInViewport();
  expect(payloads[1]!.contactChannel).toBe('platform');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`company-inquiry-${locale}.png`) });
});

test('viewing uses Egypt time even when the device is in America, and shows confirmation without clearing the form', async ({ browser }) => {
  const locale = language();
  const context = await browser.newContext({ timezoneId: 'America/New_York', viewport: { width: 390, height: 844 }, baseURL: 'http://127.0.0.1:4173' });
  const page = await context.newPage();
  try {
    await session(page, 'seeker');
    await page.route('**/api/v1/public/properties/tour-property', route => route.fulfill({ json: envelope({ id: propertyId, slug: 'tour-property', kind: 'property', name, transactionType: 'sale', source: { sourceType: 'individual_broker' }, seo: { title: name, slug: 'tour-property' }, project: null, media: [], features: [], services: [], relatedProperties: [] }) }));
    let submitted: Record<string, unknown> | undefined;
    await page.route('**/api/v1/seeker/viewings', async route => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: envelope({ id: mediaId, ...submitted, seekerId: ownerId, status: 'requested', version: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }) });
    });
    await page.goto(`/properties/tour-property?lang=${locale}`);
    await page.locator('[data-action=request-viewing]').click();
    const appointment = egyptLocalDateTime(new Date(Date.now() + 86_400_000));
    await page.locator('#public-property-viewing-requested-at').fill(appointment);
    await expect(page.locator('#public-property-viewing-timezone')).toHaveValue(/(?:توقيت مصر|Egypt time) \(GMT\+[23]\)/);
    await page.locator('#public-property-viewing-note').fill('Call before arrival');
    await page.getByRole('dialog').getByRole('button', { name: locale === 'ar' ? 'إرسال طلب المعاينة' : 'Send viewing request', exact: true }).click();
    await expect(page.locator('.public-property-details__contact-success')).toBeVisible();
    expect(submitted).toMatchObject({ timezone: 'Africa/Cairo', requestedAt: egyptInstant(appointment)!.toISOString() });
    await expect(page.locator('#public-property-viewing-note')).toHaveValue('Call before arrival');
    await expect(page).toHaveURL(/\/properties\/tour-property/);
    await page.screenshot({ path: test.info().outputPath(`egypt-viewing-${locale}.png`) });
  } finally { await context.close(); }
});

test('provider uploads MP4 beside photos, saved video survives reload and can be removed', async ({ page, browserName }) => {
  const locale = language();
  await session(page, 'provider');
  let media: Record<string, unknown>[] = [];
  const saved = { ...video, sha256: 'd'.repeat(64), processingState: 'ready', active: true, version: 1, createdAt: '2026-10-07T10:00:00.000Z', updatedAt: '2026-10-07T10:00:00.000Z' };
  await page.route(`**/api/v1/provider/properties/${propertyId}`, route => route.fulfill({ json: envelope({ id: propertyId, slug: 'tour-property', kind: 'property', name, transactionType: 'sale', source: { providerId: ownerId, sourceType: 'individual_broker' }, status: 'draft', active: true, version: 1, createdAt: '2026-10-07T10:00:00.000Z', updatedAt: '2026-10-07T10:00:00.000Z', availableActions: ['update'] }) }));
  await page.route(`**/api/v1/provider/properties/${propertyId}/media`, async route => {
    if (route.request().method() === 'GET') { await route.fulfill({ json: envelope({ items: media }) }); return; }
    expect(route.request().headers()['x-media-kind']).toBe('video');
    expect(route.request().headers()['content-type']).toBe('video/mp4');
    if (browserName !== 'webkit') expect(route.request().postDataBuffer()).toEqual(videoBytes);
    media = [saved]; await route.fulfill({ status: 201, json: envelope(saved) });
  });
  await page.route(`**/api/v1/provider/properties/${propertyId}/media/${mediaId}`, async route => { expect(route.request().method()).toBe('DELETE'); media = []; await route.fulfill({ json: envelope({ ...saved, active: false, processingState: 'deleted' }) }); });
  await page.goto(`/provider/properties/${propertyId}/media?lang=${locale}`);
  const input = page.locator('#provider-property-media-video');
  await expect(input).toBeEnabled();
  await input.setInputFiles({ name: 'tour.mp4', mimeType: 'video/mp4', buffer: videoBytes });
  await expect(page.locator('.provider-property-completion__media-item')).toContainText('tour.mp4');
  await page.reload();
  await expect(page.locator('.provider-property-completion__media-item')).toContainText('tour.mp4');
  await page.getByRole('button', { name: getProviderPropertyCompletionCopy(locale).media.remove, exact: true }).click();
  await expect(page.locator('.provider-property-completion__media-item')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('admin can save the WhatsApp number and only Facebook and Instagram links and the footer uses them', async ({ page }) => {
  const locale = language();
  await session(page, 'admin');
  const settings: Record<string, Record<string, string>> = { contact: { whatsapp_number: '+201012345678' }, social: { facebook_url: 'https://facebook.com/sadat', instagram_url: 'https://instagram.com/sadat', linkedin_url: 'https://linkedin.com/company/legacy' } };
  await page.route('**/api/v1/admin/settings/**', async route => {
    const namespace = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (route.request().method() === 'PUT') settings[namespace] = route.request().postDataJSON().values;
    await route.fulfill({ json: envelope({ namespace, schemaVersion: 1, values: settings[namespace], version: route.request().method() === 'PUT' ? 2 : 1, updatedBy: ownerId, updatedAt: '2026-10-07T10:00:00.000Z' }) });
  });
  await page.route('**/api/v1/public/bootstrap', route => route.fulfill({ json: envelope({ defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact: { whatsappNumber: settings.contact!.whatsapp_number, facebookUrl: settings.social!.facebook_url, instagramUrl: settings.social!.instagram_url } }) }));
  await page.goto(`/admin/settings/contact?lang=${locale}`);
  await page.locator('#admin-settings-whatsapp_number').fill('+201055555555');
  await page.locator('#admin-settings-contact-reason').fill('Update public WhatsApp contact');
  await page.getByRole('button', { name: getAdminSettingsCopy(locale).save, exact: true }).click();
  await expect.poll(() => settings.contact!.whatsapp_number).toBe('+201055555555');
  await page.goto(`/admin/settings/social?lang=${locale}`);
  await expect(page.locator('#admin-settings-linkedin_url')).toHaveCount(0);
  await page.locator('#admin-settings-instagram_url').fill('https://instagram.com/new-sadat');
  await page.locator('#admin-settings-social-reason').fill('Update Instagram page');
  await page.getByRole('button', { name: getAdminSettingsCopy(locale).save, exact: true }).click();
  await expect.poll(() => settings.social!.instagram_url).toBe('https://instagram.com/new-sadat');
  await page.goto(`/developers?lang=${locale}`);
  const footer = page.locator('.public-site-footer');
  await expect(footer.getByRole('link', { name: 'Instagram', exact: true })).toHaveAttribute('href', 'https://instagram.com/new-sadat');
  await expect(footer.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveAttribute('href', 'https://wa.me/201055555555');
});
