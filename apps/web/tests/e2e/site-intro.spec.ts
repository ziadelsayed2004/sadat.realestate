import { expect, test } from '@playwright/test';

test('homepage logo fills once, dismisses promptly, and never hides the app', async ({ page }) => {
  await page.goto('/?lang=ar', { waitUntil: 'domcontentloaded' });
  const intro = page.locator('#site-intro');
  if (await intro.count()) {
    await expect(intro).toHaveAttribute('aria-hidden', 'true');
    await expect(intro).toHaveCSS('pointer-events', 'none');
    const stylesheet = await page.request.get('/assets/site-intro.css');
    expect(stylesheet.ok()).toBe(true);
    expect(await stylesheet.text()).toContain('animation: intro-fill');
  }
  await expect(intro).toBeHidden({ timeout: 2500 });
  await expect(page.locator('#app')).toHaveCSS('visibility', 'visible');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-intro')).toBeHidden();
});

test('reduced motion skips the introduction', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en');
  await expect(page.locator('#site-intro')).toBeHidden();
  await expect(page.locator('#app')).toBeVisible();
});

test('a failed client bundle cannot leave an introduction covering the page', async ({ page }) => {
  await page.route('**/assets/index-*.js', route => route.abort());
  await page.goto('/?lang=ar', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-intro')).toBeHidden({ timeout: 2500 });
  await expect(page.locator('#app')).toBeVisible();
});

test('private bootstrap never renders the technical platform placeholder', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/auth/refresh', async route => {
    await gate;
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } }) });
  });
  await page.goto('/provider?lang=ar', { waitUntil: 'domcontentloaded' });
  try {
    await expect(page.locator('.session-loading')).toBeVisible();
    await expect(page.locator('.session-loading [role="status"]')).toHaveText('جارٍ تجهيز حسابك…');
    await expect(page.locator('body')).not.toContainText('واجهة المنصة');
    await expect(page.locator('body')).not.toContainText('عقدها الخلفي');
    await expect(page.locator('.route-heading, .ui-skeleton')).toHaveCount(0);
    await expect(page.locator('#site-intro')).toBeHidden();
  } finally { release(); }
  await expect(page.locator('[data-access="authentication-required"]')).toBeVisible();
});
