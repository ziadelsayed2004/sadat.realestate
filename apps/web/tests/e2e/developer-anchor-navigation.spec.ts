import { expect, test, type Page } from '@playwright/test';

const slug = 'anchor-builder';
const profile = {
  id: 'a'.repeat(24), kind: 'developer_company', slug,
  name: { ar: 'شركة المطور', en: 'Developer company' }, verified: true,
  description: { ar: 'معلومات الشركة', en: 'Company information' },
  contactPhone: '+201000000000',
  projectCount: 0, propertyCount: 0, projects: [], properties: [],
  stats: { publishedProjects: 0, availableProperties: 0, saleProperties: 0, rentalProperties: 0 }
};
const locale = () => test.info().project.name.endsWith('-en') ? 'en' : 'ar';
async function atSection(page: Page, id: string) {
  await expect.poll(() => page.locator(`#${id}`).evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const tabsBottom = document.querySelector('.public-developer-profile__tabs')?.getBoundingClientRect().bottom ?? 0;
    const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
    const room = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    const destination = Math.max(0, Math.min(room, window.scrollY + bounds.top - margin));
    return bounds.top >= tabsBottom - 2 && bounds.top < window.innerHeight - 40 && Math.abs(window.scrollY - destination) < 2;
  })).toBe(true);
}
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } } }));
  await page.route(`**/api/v1/public/developers/${slug}`, async route => {
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.fulfill({ json: { data: profile, meta: { requestId: 'developer-anchor' } } });
  });
});

test('developer tabs and inquiry link reach their sections without reloading or erasing typed fields', async ({ page }) => {
  let documents = 0;
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents += 1; });
  await page.goto(`/developers/${slug}?lang=${locale()}`);
  await page.locator('.public-developer-profile__inquiry input[name="name"]').waitFor();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('smooth');
  for (const id of ['developer-properties', 'developer-contact']) {
    await page.locator(`.public-developer-profile__tabs a[href="#${id}"]`).click();
    await atSection(page, id);
  }
  await page.locator('.public-developer-profile__inquiry input[name="name"]').fill('Customer draft');
  await page.locator('.public-developer-profile__tabs a[href="#developer-projects"]').click();
  await atSection(page, 'developer-projects');
  await page.goBack();
  await atSection(page, 'developer-contact');
  await expect(page.locator('.public-developer-profile__inquiry input[name="name"]')).toHaveValue('Customer draft');
  await page.goForward();
  await atSection(page, 'developer-projects');
  await page.goBack();
  await atSection(page, 'developer-contact');
  await page.locator('.public-developer-profile__tabs a[href="#developer-overview"]').click();
  await atSection(page, 'developer-overview');
  await page.locator('.public-developer-profile__aside-cta').click();
  await atSection(page, 'developer-contact');
  await expect(page.locator('.public-developer-profile__inquiry input[name="name"]')).toHaveValue('Customer draft');
  expect(documents).toBe(1);
});

test('a direct contact hash waits for profile data and reaches the contact section', async ({ page }) => {
  await page.goto(`/developers/${slug}?lang=${locale()}#developer-contact`);
  await page.locator('.public-developer-profile__inquiry input[name="name"]').waitFor();
  await atSection(page, 'developer-contact');
});

test('repeated section links stay at the section instead of jumping back to their starting position', async ({ page }) => {
  await page.route(`**/api/v1/public/developers/${slug}`, route => route.fulfill({ json: { data: { ...profile, contactPhone: undefined }, meta: { requestId: 'developer-repeat-contact' } } }));
  await page.goto(`/developers/${slug}?lang=${locale()}#developer-contact`);
  await atSection(page, 'developer-contact');
  // The sidebar link already points to the current fragment. Clicking it must
  // not let popstate restore the position from before the native anchor jump.
  await page.locator('.public-developer-profile__aside-cta').click();
  await atSection(page, 'developer-contact');
  await page.waitForTimeout(1000);
  await atSection(page, 'developer-contact');
  const properties = page.locator('.public-developer-profile__tabs a[href="#developer-properties"]');
  await properties.click();
  await atSection(page, 'developer-properties');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await properties.click();
  await atSection(page, 'developer-properties');
  await page.waitForTimeout(1000);
  await atSection(page, 'developer-properties');
  await expect(page).toHaveURL(new RegExp(`#developer-properties$`, 'u'));
});

test('contact navigation animates through intermediate positions and respects reduced motion', async ({ page }) => {
  await page.goto(`/developers/${slug}?lang=${locale()}`);
  await page.locator('.public-developer-profile__inquiry input[name="name"]').waitFor();
  // Observe actual animation frames, rather than relying only on the CSS value.
  const positions = page.evaluate(() => new Promise<number[]>(resolve => {
    const values: number[] = [];
    const start = performance.now();
    const sample = () => {
      values.push(window.scrollY);
      if (performance.now() - start < 1500) requestAnimationFrame(sample);
      else resolve(values);
    };
    requestAnimationFrame(sample);
  }));
  await page.locator('.public-developer-profile__identity-action[href="#developer-contact"]').click();
  await atSection(page, 'developer-contact');
  const samples = await positions;
  const end = samples.at(-1)!;
  expect(end).toBeGreaterThan(100);
  expect(samples.some(value => value > 20 && value < end - 20)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.locator('.public-developer-profile__tabs a[href="#developer-overview"]').click();
  await atSection(page, 'developer-overview');
});

test('an organization without a public phone keeps platform inquiries available', async ({ page }) => {
  await page.route(`**/api/v1/public/developers/${slug}`, route => route.fulfill({ json: { data: { ...profile, contactPhone: undefined }, meta: { requestId: 'developer-no-contact' } } }));
  await page.goto(`/developers/${slug}?lang=${locale()}`);
  const contact = page.locator('.public-developer-profile__aside-cta');
  await expect(contact).toHaveText(locale() === 'ar' ? 'التواصل' : 'Contact');
  await contact.click();
  await atSection(page, 'developer-contact');
  await expect(page.locator('.public-developer-profile__contact-card a[href^="tel:"]')).toHaveCount(0);
  await expect(page.locator('.public-developer-profile__inquiry')).toBeVisible();
  await expect(page.locator('.public-developer-profile__inquiry input[name="name"]')).toBeVisible();
});
