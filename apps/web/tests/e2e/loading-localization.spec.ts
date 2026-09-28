import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __localeFrames?: Array<{ lang: string; dir: string }>;
  }
}

test('Arabic is established before the first rendered frame and remains stable', async ({ context, page }) => {
  await context.addCookies([{ name: 'sadat-real-estate.locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript(() => {
    window.__localeFrames = [];
    const sample = () => {
      window.__localeFrames?.push({ lang: document.documentElement.lang, dir: document.documentElement.dir });
      if ((window.__localeFrames?.length ?? 0) < 12) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  await page.goto('/?lang=ar', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).not.toHaveClass(/app-booting|app-navigating/);
  await expect.poll(() => page.evaluate(() => window.__localeFrames?.length ?? 0)).toBeGreaterThan(0);

  const frames = await page.evaluate(() => window.__localeFrames ?? []);
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.every(frame => frame.lang === 'ar' && frame.dir === 'rtl')).toBe(true);
});

test('public navigation keeps the current page visible and preserves the document', async ({ page }) => {
  await page.goto('/?lang=ar', { waitUntil: 'networkidle' });
  await page.route('**/properties?lang=ar', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.continue();
  });
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '/properties?lang=ar';
    link.textContent = 'open';
    link.id = 'loading-transition-test-link';
    document.body.append(link);
  });

  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  const navigation = page.waitForURL(/\/properties\?lang=ar/u);
  const transition = await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('#loading-transition-test-link')?.click();
    return {
      className: document.documentElement.className,
      appVisibility: getComputedStyle(document.querySelector<HTMLElement>('#app')!).visibility
    };
  });
  expect(transition.className).not.toContain('app-navigating');
  expect(transition.appVisibility).toBe('visible');
  await navigation;
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
});
