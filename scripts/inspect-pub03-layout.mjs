import { chromium } from '@playwright/test';
import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync('docs/quality/figma_parity/screens/PUB-03/deterministic-state.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1577, height: 720 } });
await page.route('**/api/v1/public/properties/published-home**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.response) }));
await page.goto('http://127.0.0.1:4173/properties/published-home?lang=ar', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => undefined))); });
  const selectors = ['.public-property-details__content','.public-property-details__back','.public-property-details__layout','.public-property-details__gallery','.public-property-details__summary','.public-property-details__source-card','.public-property-details__description','.public-property-details__amenities','.public-property-details__nearby','.public-property-details__advisory','.public-property-details__related','.public-property-details__related .ui-property-card','.public-property-details__actions > .ui-button','.public-property-details__contact','.public-site-footer'];
const result = await page.evaluate(selectors => {
  const describe = element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { tag: element.tagName.toLowerCase(), className: element.className, text: element.textContent?.trim().slice(0, 80), x: rect.x, y: rect.y, width: rect.width, height: rect.height, display: style.display, padding: style.padding, marginTop: style.marginTop, marginBottom: style.marginBottom, color: style.color, background: style.backgroundColor, fontSize: style.fontSize, lineHeight: style.lineHeight };
  };
  return {
    fonts: {
      status: document.fonts.status,
      cairo: document.fonts.check('400 16px Cairo', 'العقار'),
      bodyFamily: getComputedStyle(document.body).fontFamily,
    },
    nearbyItems: [...document.querySelectorAll('.public-property-details__nearby article')].map((article, index) => ({
      index,
      rect: describe(article),
      text: [...article.querySelectorAll('strong, small, b')].map(describe),
    })),
    relatedItems: [...document.querySelectorAll('.public-property-details__related .ui-property-card__body > *')].map(describe),
    selectors: Object.fromEntries(selectors.map(selector => {
    const element = document.querySelector(selector);
    if (!element) return [selector, null];
    return [selector, { outerHTML: element.outerHTML.slice(0, 240), ...describe(element), children: [...element.children].map(describe), ...(element.matches('form, section') ? { formChildren: [...element.querySelectorAll(':scope > form > *')].map(describe) } : {}) }];
    }))
  };
}, selectors);
console.log(JSON.stringify(result, null, 2));
await browser.close();
