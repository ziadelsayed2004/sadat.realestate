import { chromium, devices } from '@playwright/test';

const [url, outputPath, deviceName = 'Pixel 5'] = process.argv.slice(2);
if (!url) throw new Error('Usage: node scripts/inspect-responsive.mjs <url> [screenshot] [device]');

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext(deviceName === 'desktop'
    ? { viewport: { width: 1440, height: 1000 } }
    : devices[deviceName]);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map(element => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName.toLowerCase(), className: element.className, left: rect.left, right: rect.right, width: rect.width };
      })
      .filter(item => item.left < -1 || item.right > viewportWidth + 1)
      .slice(0, 30);
    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      offenders
    };
  });
  console.log(JSON.stringify(result, null, 2));
  if (outputPath) await page.screenshot({ path: outputPath, fullPage: true });
} finally {
  await browser.close();
}
