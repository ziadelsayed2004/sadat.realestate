import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { chromium, devices, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const browser = await chromium.launch();
const report = {
  status: 'RUNNING', journeys: ['GUIDE-03'], environment: 'local-built-web-real-API', mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), runs: []
};
const profiles = [
  { device: 'desktop', options: { viewport: { width: 1440, height: 1000 } } },
  { device: 'tablet', options: { viewport: { width: 834, height: 1112 } } },
  { device: 'mobile', options: { ...devices['Pixel 5'] } }
];
const articleResponse = await fetch(`${base}/api/v1/public/articles?page=1&limit=1`);
assert.equal(articleResponse.status, 200);
const articleSlug = (await articleResponse.json()).data?.[0]?.slug;
assert.equal(typeof articleSlug, 'string');
const routes = [
  { id: 'PUB-07', path: '/articles', selector: '[data-page="public-articles"][data-articles-state="success"]' },
  { id: 'PUB-08', path: `/articles/${encodeURIComponent(articleSlug)}`, selector: '[data-page="public-article-details"][data-article-details-state="success"]' },
  { id: 'PUB-11', path: '/about', selector: '[data-page="public-about"][data-about-state="success"]' },
  { id: 'PUB-12', path: '/team', selector: '[data-page="public-team"][data-team-state="success"]' }
];

try {
  for (const profile of profiles) for (const locale of ['ar', 'en']) {
    const context = await browser.newContext(profile.options);
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', error => errors.push(error.message));
      const checked = [];
      for (const route of routes) {
        const response = await page.goto(`${base}${route.path}?lang=${locale}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, `${route.id} document status`);
        await expect(page.locator(route.selector)).toBeVisible();
        await expect(page.locator('main')).toBeVisible();
        const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.equal(dimensions.scrollWidth, dimensions.innerWidth, `${route.id} horizontal overflow`);
        checked.push({ screenId: route.id, documentStatus: 200, ...dimensions });
      }
      assert.deepEqual(errors, [], `${profile.device}/${locale} console errors`);
      report.runs.push({ device: profile.device, locale, status: 'PASS', screens: checked, consoleErrors: 0 });
    } finally {
      await context.close();
    }
  }
  report.status = 'PASS_LOCAL';
} finally {
  await browser.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/guide03-content-browser-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`GUIDE03_CONTENT_BROWSER_${report.status} runs=${report.runs.length}`);
