import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4173';
const routes = [
  ['PUB-01', '/'],
  ['PUB-02', '/properties'],
  ['PUB-03', '/properties/demo-garden-duplex'],
  ['PUB-04', '/compare?propertyIds=670000000000000000000007&propertyIds=670000000000000000000008'],
  ['PUB-05', '/developers'],
  ['PUB-06', '/developers/sadat-demo-developer'],
  ['PUB-07', '/articles'],
  ['PUB-08', '/articles/buying-in-sadat'],
  ['PUB-09', '/community'],
  ['PUB-10', '/community?create=1'],
  ['PUB-11', '/about'],
  ['PUB-12', '/team']
];
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['tablet', { width: 768, height: 1024 }],
  ['mobile', { width: 390, height: 844 }]
];
const locales = ['ar', 'en'];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const locale of locales) {
  for (const [device, viewport] of viewports) {
    const context = await browser.newContext({ viewport, locale });
    for (const [screenId, route] of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    const url = new URL(route, baseUrl);
    url.searchParams.set('lang', locale);
    const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(750);
    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const overflow = [...document.querySelectorAll('body *')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
      }).slice(0, 12).map(element => {
        const rect = element.getBoundingClientRect();
        return { selector: element.className || element.tagName.toLowerCase(), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
      });
      return {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        scrollHeight: root.scrollHeight,
        h1Count: document.querySelectorAll('h1').length,
        brokenImages: [...document.images].filter(image => image.complete && image.naturalWidth === 0).map(image => image.currentSrc || image.src),
        overflow
      };
    });
    results.push({ screenId, locale, device, status: response?.status() ?? null, errors, ...metrics });
    await page.close();
    }
    await context.close();
  }
}
await browser.close();
const failures = results.filter(result => result.status !== 200 || result.errors.length || result.brokenImages.length || result.overflow.length || result.scrollWidth > result.clientWidth + 1);
const report = { generatedAt: new Date().toISOString(), baseUrl, cases: results.length, passed: results.length - failures.length, failed: failures.length, failures, results };
const outputDirectory = new URL('../docs/quality/public-responsive-2026-09-06/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL('results.json', outputDirectory), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ cases: report.cases, passed: report.passed, failed: report.failed, output: 'docs/quality/public-responsive-2026-09-06/results.json' })}\n`);
if (failures.length) process.exitCode = 1;
