import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4173';
const ids = ['670000000000000000000007', '670000000000000000000008'];
const outputDirectory = new URL('../docs/quality/public-comparison-tray-2026-09-06/', import.meta.url);
const cases = [
  ['ar', 'desktop', { width: 1440, height: 1000 }],
  ['ar', 'mobile', { width: 390, height: 844 }],
  ['en', 'desktop', { width: 1440, height: 1000 }],
  ['en', 'mobile', { width: 390, height: 844 }]
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const [locale, device, viewport] of cases) {
  const context = await browser.newContext({ viewport, locale });
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  const url = new URL('/compare', baseUrl);
  url.searchParams.set('lang', locale);
  ids.forEach(id => url.searchParams.append('propertyIds', id));
  const response = await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 45_000 });
  const tray = page.locator('.public-property-comparison__sticky-actions');
  await tray.waitFor({ state: 'visible' });
  const metrics = await page.evaluate(() => {
    const trayElement = document.querySelector('.public-property-comparison__sticky-actions');
    const rect = trayElement?.getBoundingClientRect();
    return {
      trayPosition: trayElement === null ? null : getComputedStyle(trayElement).position,
      trayBottom: rect === undefined ? null : Math.round(rect.bottom),
      viewportHeight: innerHeight,
      itemCount: document.querySelectorAll('.public-property-comparison__sticky-item').length,
      compareButtonCount: [...document.querySelectorAll('.public-property-comparison__sticky-actions button')].filter(button => /قارن الآن|Compare now/.test(button.textContent ?? '')).length,
      clearButtonCount: [...document.querySelectorAll('.public-property-comparison__sticky-actions button')].filter(button => /مسح الكل|Clear all/.test(button.textContent ?? '')).length,
      brokenImages: [...document.querySelectorAll('.public-property-comparison__sticky-item img')].filter(image => image.complete && image.naturalWidth === 0).length,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
  await page.screenshot({ path: new URL(`${locale}-${device}.png`, outputDirectory).pathname.slice(1), fullPage: false });
  const passed = response?.status() === 200 && errors.length === 0 && metrics.trayPosition === 'fixed' && metrics.trayBottom === metrics.viewportHeight && metrics.itemCount === 2 && metrics.compareButtonCount === 1 && metrics.clearButtonCount === 1 && metrics.brokenImages === 0 && !metrics.documentOverflow;
  results.push({ locale, device, status: response?.status() ?? null, errors, ...metrics, passed });
  await context.close();
}

await browser.close();
const report = { generatedAt: new Date().toISOString(), baseUrl, cases: results.length, passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length, results };
await writeFile(new URL('results.json', outputDirectory), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ cases: report.cases, passed: report.passed, failed: report.failed, output: 'docs/quality/public-comparison-tray-2026-09-06/results.json' })}\n`);
if (report.failed) process.exitCode = 1;
