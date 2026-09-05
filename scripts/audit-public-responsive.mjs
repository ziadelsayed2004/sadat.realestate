import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4173';
const routes = [
  ['PUB-01', '/?lang=ar'],
  ['PUB-02', '/properties?lang=ar'],
  ['PUB-03', '/properties/demo-garden-duplex?lang=ar'],
  ['PUB-04', '/compare?lang=ar&propertyIds=670000000000000000000007&propertyIds=670000000000000000000008'],
  ['PUB-05', '/developers?lang=ar'],
  ['PUB-06', '/developers/sadat-demo-developer?lang=ar'],
  ['PUB-07', '/articles?lang=ar'],
  ['PUB-08', '/articles/buying-in-sadat?lang=ar'],
  ['PUB-09', '/community?lang=ar'],
  ['PUB-10', '/community?create=1&lang=ar'],
  ['PUB-11', '/about?lang=ar'],
  ['PUB-12', '/team?lang=ar']
];
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }]
];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const [device, viewport] of viewports) {
  const context = await browser.newContext({ viewport, locale: 'ar' });
  for (const [screenId, route] of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 });
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
    results.push({ screenId, device, status: response?.status() ?? null, errors, ...metrics });
    await page.close();
  }
  await context.close();
}
await browser.close();
process.stdout.write(`${JSON.stringify({ baseUrl, results }, null, 2)}\n`);
