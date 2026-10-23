import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173', report = { status: 'RUNNING', checks: [], browserErrors: [] };
let browser;
await mkdir('.tmp/public-sticky-header', { recursive: true });
try {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const rate = await fetch(base + '/api/v1/public/bootstrap');
    if (rate.status === 429 || Number(rate.headers.get('ratelimit-remaining')) < 60) await new Promise(resolve => setTimeout(resolve, 60000));
    browser = await engine.launch();
    const page = await browser.newPage();
    page.on('pageerror', error => report.browserErrors.push(String(error)));
    for (const [locale, width] of [['ar', 390], ['en', 820], ['ar', 1440]]) for (const route of ['/', '/developers', '/articles']) {
      await page.setViewportSize({ width, height: 850 });
      await page.goto(`${base}${route}?lang=${locale}`);
      await expect(page.locator('#site-intro')).toBeHidden();
      const header = page.locator('.public-homepage__header');
      await expect(header).toBeVisible();
      await expect.poll(() => header.evaluate(el => Math.abs(parseFloat(getComputedStyle(el.parentElement).getPropertyValue('--public-header-height')) - el.getBoundingClientRect().height))).toBeLessThanOrEqual(1);
      await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
      await expect.poll(() => header.evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThanOrEqual(1);
      const result = await header.evaluate(el => {
        const rect = el.getBoundingClientRect(), top = document.elementFromPoint(innerWidth / 2, rect.height / 2);
        return { position: getComputedStyle(el).position, scrolled: scrollY, measured: parseFloat(getComputedStyle(el.parentElement).getPropertyValue('--public-header-height')), height: rect.height, onTop: el.contains(top), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      assert(result.scrolled > 100); assert.equal(result.position, 'sticky'); assert.equal(result.onTop, true); assert.equal(result.overflow, false); assert(Math.abs(result.measured - result.height) <= 1);
      if (width < 701) {
        await page.locator('.public-homepage__menu-toggle').click();
        await expect(page.locator('.public-homepage__nav.is-open')).toBeVisible();
        assert(await page.evaluate(() => document.querySelector('.public-homepage__nav').getBoundingClientRect().top >= document.querySelector('.public-homepage__header').getBoundingClientRect().bottom - 1));
        await page.keyboard.press('Escape');
        await expect(page.locator('.public-homepage__nav.is-open')).toHaveCount(0);
        await expect(page.locator('.public-homepage__nav')).toBeHidden();
      }
      await page.screenshot({ path: `.tmp/public-sticky-header/${name}-${width}-${route.replaceAll('/', '') || 'home'}.png` });
      report.checks.push(`${name} ${locale} ${width} ${route}: header pinned above content after scrolling, measured height, mobile drawer placement, no overflow`);
    }
    await browser.close(); browser = undefined;
  }
  assert.deepEqual(report.browserErrors, []); report.status = 'PASS_LOCAL';
} catch (error) { report.status = 'FAIL_LOCAL'; report.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  await browser?.close().catch(() => {});
  await writeFile('docs/quality/guide-runs/public-sticky-header-local-latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
