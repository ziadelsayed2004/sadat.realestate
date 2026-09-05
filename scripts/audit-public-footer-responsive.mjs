import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4173';
const evidenceDirectory = new URL('../docs/quality/public-footer-responsive-2026-09-06/', import.meta.url);
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

await mkdir(evidenceDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const locale of locales) {
    for (const [device, viewport] of viewports) {
      const context = await browser.newContext({ viewport, locale });
      for (const [screenId, path] of routes) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        const target = new URL(path, baseUrl);
        target.searchParams.set('lang', locale);
        const response = await page.goto(target.toString(), { waitUntil: 'networkidle', timeout: 45_000 });
        const measurement = await page.locator('.public-site-footer').evaluate((footer, input) => {
          const visible = element => {
            const style = getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden' && element.getBoundingClientRect().width > 0;
          };
          const rect = footer.getBoundingClientRect();
          const main = footer.querySelector(':scope > .public-site-footer__main');
          const follow = footer.querySelector(':scope > .public-site-footer__follow');
          const bottom = footer.querySelector(':scope > .public-site-footer__bottom');
          const links = [...footer.querySelectorAll('a[href^="/"]')];
          const social = [...footer.querySelectorAll('.public-site-footer__social a')];
          return {
            footerWidth: Math.round(rect.width),
            footerHeight: Math.round(rect.height),
            viewportWidth: innerWidth,
            overflow: rect.left < -1 || rect.right > innerWidth + 1 || footer.scrollWidth > footer.clientWidth + 1,
            threeRows: Boolean(main && follow && bottom),
            mainDisplay: main ? getComputedStyle(main).display : null,
            mainColumns: main ? getComputedStyle(main).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
            mobileDescriptionVisible: Boolean(footer.querySelector('.public-site-footer__mobile-description') && visible(footer.querySelector('.public-site-footer__mobile-description'))),
            followCopyVisible: Boolean(footer.querySelector('.public-site-footer__follow-copy') && visible(footer.querySelector('.public-site-footer__follow-copy'))),
            visibleSocialLinks: social.filter(visible).length,
            localLinksPreserveLocale: links.every(link => new URL(link.href).searchParams.get('lang') === input.locale),
            brokenImages: [...footer.querySelectorAll('img')].filter(image => image.complete && image.naturalWidth === 0).length
          };
        }, { locale });
        const expectedLayout = device === 'desktop'
          ? measurement.mainDisplay === 'grid' && measurement.mainColumns === 4 && !measurement.mobileDescriptionVisible && measurement.followCopyVisible && measurement.visibleSocialLinks === 6
          : device === 'tablet'
            ? measurement.mainDisplay === 'grid' && measurement.mainColumns === 2 && !measurement.mobileDescriptionVisible && measurement.followCopyVisible && measurement.visibleSocialLinks === 6
            : measurement.mainDisplay === 'flex' && measurement.mobileDescriptionVisible && !measurement.followCopyVisible && measurement.visibleSocialLinks === 3;
        const result = {
          screenId, locale, device, status: response?.status() ?? null, ...measurement,
          expectedLayout,
          browserErrors: errors
        };
        results.push(result);
        if (screenId === 'PUB-01') {
          await page.locator('.public-site-footer').screenshot({ path: new URL(`${screenId}-${locale}-${device}.png`, evidenceDirectory).pathname.slice(1) });
        }
        await page.close();
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const failures = results.filter(result => result.status !== 200 || result.overflow || !result.threeRows || !result.expectedLayout || !result.localLinksPreserveLocale || result.brokenImages > 0 || result.browserErrors.length > 0);
const evidence = {
  generatedAt: new Date().toISOString(),
  scope: 'Shared public footer across 12 public screens, AR/EN, desktop/tablet/mobile; real loopback APIs. Functional responsive geometry, not pixel-parity scoring.',
  cases: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  results
};
await writeFile(new URL('results.json', evidenceDirectory), `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ cases: results.length, passed: results.length - failures.length, failed: failures.length, failures }, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
