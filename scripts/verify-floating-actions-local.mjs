import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { routePublicHomepageApi } from '../apps/web/tests/e2e/public-fixtures.ts';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');
const base = process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4188';
assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/u);
const output = '.local/floating-actions-qa';
await mkdir(output, { recursive: true });
const evidence = { status: 'RUNNING', checks: [], errors: [] };
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    for (const [width, height, locale] of [[390, 844, 'ar'], [820, 1000, 'ar'], [1440, 900, 'en']]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE_ERROR', name, width, msg.text().slice(0, 240)); });
      page.on('pageerror', error => { evidence.errors.push(error.message); console.log('BROWSER_ERROR', error.message); });
      await routePublicHomepageApi(page);
      await page.route('**/api/v1/public/bootstrap', route => route.fulfill({ json: {
        data: { defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact: { whatsappNumber: '+201012345678' } }, meta: { requestId: 'floating-local' }
      } }));
      await page.goto(`${base}/?lang=${locale}`);
      const whatsapp = page.locator('.public-floating-actions__whatsapp');
      await whatsapp.waitFor().catch(async error => {
        await page.screenshot({ path: `${output}/failed-${name}-${width}.png` });
        console.log('PAGE_FAILURE', name, width, (await page.locator('body').innerText()).slice(-600));
        throw error;
      });
      await page.evaluate(() => document.fonts.ready);
      const top = page.locator('.public-floating-actions__top');
      assert.equal(await top.isVisible(), false);
      await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2));
      await top.waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        const expected = 100 - Math.min(100, Math.max(0, window.scrollY) / (document.documentElement.scrollHeight - innerHeight) * 100);
        return Math.abs(Number(document.querySelector('.public-floating-actions__value').getAttribute('stroke-dashoffset')) - expected) < 1;
      });
      const waBounds = await whatsapp.boundingBox(), topBounds = await top.boundingBox();
      assert(waBounds.y + waBounds.height < topBounds.y);
      assert(topBounds.x >= 0 && topBounds.x + topBounds.width <= width);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForFunction(() => Number(document.querySelector('.public-floating-actions__value').getAttribute('stroke-dashoffset')) < 1);
      const credit = page.locator('.public-site-footer__credit a');
      assert.equal(await credit.getAttribute('href'), 'https://codzhub.com/');
      assert(await credit.locator('img').evaluate(image => image.complete && image.naturalWidth > 0));
      assert.equal(await credit.locator('strong span:last-child').evaluate(element => getComputedStyle(element).color), 'rgb(18, 216, 255)');
      await page.evaluate(() => document.fonts.ready);
      assert(await credit.locator('strong').evaluate(element => getComputedStyle(element).fontFamily.includes('CodzhubWordmark')));
      await page.evaluate(() => document.fonts.load('600 14px CodzhubWordmark', 'CodzHub'));
      assert(await page.evaluate(() => document.fonts.check('600 14px CodzhubWordmark', 'CodzHub')));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `${output}/${name}-${width}-${locale}-footer.png` });
      await page.locator('.public-floating-actions').screenshot({ path: `${output}/${name}-${width}-controls.png` });
      await top.click();
      await page.waitForFunction(() => window.scrollY < 1);
      await top.waitFor({ state: 'hidden' });
      if (width <= 820) {
        await page.locator('footer').evaluate(element => {
          const wrapper = document.createElement('div'); wrapper.className = 'public-developer-profile';
          element.parentElement.insertBefore(wrapper, element); wrapper.appendChild(element);
        });
        await page.evaluate(() => window.scrollTo(0, 500));
        await top.waitFor({ state: 'visible' });
        const bounds = await top.boundingBox();
        assert(bounds.y + bounds.height <= height - 90, 'floating controls must clear profile bottom navigation');
      }
      evidence.checks.push(`${name} ${width} ${locale}: scroll progress, top action, WhatsApp order, hosted font, footer link and viewport fit`);
      await context.close();
    }
  } finally { await browser.close(); }
}
assert.deepEqual(evidence.errors, []);
evidence.status = 'PASS';
await writeFile(`${output}/result.json`, JSON.stringify(evidence, null, 2) + '\n');
console.log(`FLOATING_ACTIONS_BROWSER_PASS checks=${evidence.checks.length}`);
