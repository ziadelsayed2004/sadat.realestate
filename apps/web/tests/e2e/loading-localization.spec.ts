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

  const frames = await page.evaluate(() => window.__localeFrames ?? []);
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.every(frame => frame.lang === 'ar' && frame.dir === 'rtl')).toBe(true);
});

test('same-origin page navigation shows the skeleton immediately', async ({ page }) => {
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

  const navigation = page.waitForURL(/\/properties\?lang=ar/u);
  const transition = await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('#loading-transition-test-link')?.click();
    return {
      className: document.documentElement.className,
      loaderDisplay: getComputedStyle(document.querySelector<HTMLElement>('#app-transition-loader')!).display
    };
  });
  expect(transition.className).toContain('app-navigating');
  expect(transition.loaderDisplay).toBe('grid');
  await navigation;
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});
